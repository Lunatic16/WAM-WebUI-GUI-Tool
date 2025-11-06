"""FastAPI application for WAM speaker management with discovery and remote control."""

import asyncio
import json
import logging
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from pywam.speaker import Speaker
from pywam.lib.api_call import ApiCall
from pywam.lib.api_response import ApiResponse

from web_ui.discovery import discover_wam_speakers
from app import App

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to hold discovered speakers
discovered_speakers: Dict[str, Speaker] = {}
speaker_states: Dict[str, dict] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for the application."""
    yield
    # Cleanup if needed
    for speaker in discovered_speakers.values():
        try:
            if speaker and speaker.client:
                await speaker.client.disconnect()
        except:
            pass


# Create FastAPI app with lifespan
app = FastAPI(
    title="WAM Speaker Manager",
    description="Web interface for discovering and managing Samsung WAM speakers",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="wam_manager/static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main WAM manager web UI page."""
    with open("wam_manager/templates/index.html", "r") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/discover")
async def discover_speakers():
    """Discover WAM speakers on the network."""
    try:
        speakers = await discover_wam_speakers()
        return {"speakers": speakers}
    except Exception as e:
        detail_msg = f"Speaker discovery failed: {str(e)}"
        logger.error(detail_msg)
        raise HTTPException(status_code=500, detail=detail_msg)


@app.post("/api/speakers/{speaker_ip}/connect")
async def connect_speaker(speaker_ip: str):
    """Connect to a specific speaker."""
    try:
        # Create a temporary app instance to connect to the speaker
        temp_app = App()
        temp_app.settings.load_settings()  # Load default settings
        
        # Connect to the speaker on port 55001 (the API port)
        await temp_app.async_connect(speaker_ip, 55001)
        
        # Store the speaker instance
        discovered_speakers[speaker_ip] = temp_app.speaker
        
        # Get initial state
        await temp_app.speaker.update()
        
        # Get all attributes using WamAttributes
        from pywam.attributes import WamAttributes
        ws = WamAttributes()
        all_attrs = ws.get_state_copy()
        
        speaker_states[speaker_ip] = all_attrs
        
        # Try to get model and name from the attributes
        model = all_attrs.get('model', 'Samsung WAM Speaker')
        name = all_attrs.get('friendlyName', all_attrs.get('modelName', f"WAM Speaker at {speaker_ip}"))
        
        return {
            "status": "connected", 
            "ip": speaker_ip, 
            "port": 55001,
            "model": model,
            "name": name
        }
    except Exception as e:
        detail_msg = f"Connection failed: {str(e)}"
        logger.error(detail_msg)
        raise HTTPException(status_code=500, detail=detail_msg)


@app.get("/api/speakers/{speaker_ip}/properties")
async def get_speaker_properties(speaker_ip: str):
    """Get properties for a specific speaker."""
    if speaker_ip not in discovered_speakers or speaker_ip not in speaker_states:
        raise HTTPException(status_code=404, detail="Speaker not connected")
    
    return {"properties": speaker_states[speaker_ip]}


@app.get("/api/speakers/{speaker_ip}/info")
async def get_speaker_info(speaker_ip: str):
    """Get detailed speaker information including name and model."""
    if speaker_ip not in discovered_speakers or speaker_ip not in speaker_states:
        raise HTTPException(status_code=404, detail="Speaker not connected")
    
    properties = speaker_states[speaker_ip]
    
    # Extract speaker information from properties
    info = {
        "name": properties.get('friendlyName', properties.get('modelName', f"WAM Speaker at {speaker_ip}")),
        "model": properties.get('model', 'Samsung WAM Speaker'),
        "mac": properties.get('mac', 'Unknown'),
        "version": properties.get('version', 'Unknown'),
        "power": properties.get('power', 'Unknown'),
        "volume": properties.get('volume', 'Unknown'),
        "input": properties.get('input', 'Unknown'),
    }
    
    return {"info": info}


@app.post("/api/speakers/{speaker_ip}/command")
async def send_command(speaker_ip: str, command: str, value: Optional[str] = None):
    """Send a command to a specific speaker."""
    if speaker_ip not in discovered_speakers:
        raise HTTPException(status_code=404, detail="Speaker not connected")
    
    try:
        # Create API call based on the command
        api_call = None
        
        if command == "power":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.SetPower",
                pwron=False,
                args=[["strValue", value or "on", "str"]],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "volume":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.SetVolume",
                pwron=False,
                args=[["nVolume", int(value or 10), "dec"]],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "mute":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.SetMute",
                pwron=False,
                args=[["strValue", value or "on", "str"]],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "play":
            api_call = ApiCall(
                api_type="UIC", 
                method="N2X.Speaker.Play",
                pwron=False,
                args=[],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "pause":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.Pause", 
                pwron=False,
                args=[],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "stop":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.Stop",
                pwron=False,
                args=[],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "next":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.Next",
                pwron=False,
                args=[],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "prev":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.Prev",
                pwron=False,
                args=[],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        elif command == "set_input":
            api_call = ApiCall(
                api_type="UIC",
                method="N2X.Speaker.SetInput",
                pwron=False,
                args=[["strSource", value or "BT", "str"]],
                expected_response="",
                user_check=False,
                timeout_multiple=1,
            )
        else:
            raise HTTPException(status_code=400, detail="Unknown command")
        
        # Get the speaker instance and send the command
        speaker = discovered_speakers[speaker_ip]
        await speaker.client.request(api_call)
        
        return {"status": "command_sent", "command": command, "value": value}
    except Exception as e:
        detail_msg = f"Command failed: {str(e)}"
        logger.error(detail_msg)
        raise HTTPException(status_code=500, detail=detail_msg)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)
    try:
        # Send initial connection confirmation
        await manager.send_personal_message(json.dumps({"type": "connected", "message": "WebSocket connected"}), websocket)
        
        while True:
            # Just keep the connection alive - we'll broadcast updates from the app
            data = await websocket.receive_text()
            # Process any commands from frontend if needed
            try:
                # Try to parse the received data as JSON command
                command = json.loads(data)
                if command.get("type") == "ping":
                    # Respond to ping with current status
                    status = {
                        "type": "pong",
                        "speakers_count": len(discovered_speakers),
                        "connected_speakers": list(discovered_speakers.keys())
                    }
                    await manager.send_personal_message(json.dumps(status), websocket)
            except json.JSONDecodeError:
                # If not JSON, just echo it back
                await manager.send_personal_message(f"Server received: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)