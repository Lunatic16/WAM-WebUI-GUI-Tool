"""FastAPI web server for pywam GUI tool."""

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

from app import App

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variable to hold the app instance
web_app_instance: Optional[App] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler to initialize and cleanup resources."""
    global web_app_instance
    # Initialize the pywam app instance
    web_app_instance = App()
    # Load settings first
    web_app_instance.settings.load_settings()
    
    # Override the event and state receivers to broadcast to web clients
    original_event_receiver = web_app_instance.event_receiver
    original_state_receiver = web_app_instance.state_receiver
    
    def web_event_receiver(event: ApiResponse) -> None:
        """Receiver for all speaker events that broadcasts to web clients."""
        # Call the original receiver
        original_event_receiver(event)
        # Broadcast to all connected WebSocket clients
        try:
            event_dict = {
                "raw_response": event.raw_response,
                "api_type": event.api_type,
                "method": event.method,
                "user": event.user,
                "version": event.version,
                "speaker_ip": event.speaker_ip,
                "success": str(event.success),
                "data": str(event.data),
                "err_msg": event.err_msg,
                "err_repr": event.err_repr,
            }
            message = json.dumps({
                "type": "event",
                "event": event_dict
            })
            asyncio.create_task(manager.broadcast(message))
        except Exception as e:
            logger.error(f"Error broadcasting event: {e}")
    
    def web_state_receiver(state: dict) -> None:
        """Receiver for state changes that broadcasts to web clients."""
        # Call the original receiver
        original_state_receiver(state)
        # Broadcast to all connected WebSocket clients
        try:
            message = json.dumps({
                "type": "property_update",
                "properties": state
            })
            asyncio.create_task(manager.broadcast(message))
        except Exception as e:
            logger.error(f"Error broadcasting state: {e}")
    
    # Replace the receivers after settings are loaded
    web_app_instance.event_receiver = web_event_receiver
    web_app_instance.state_receiver = web_state_receiver
    
    yield
    # Cleanup if needed
    if web_app_instance and web_app_instance.speaker:
        try:
            await web_app_instance.async_disconnect()
        except:
            pass


# Create FastAPI app with lifespan
app = FastAPI(
    title="pywam Web API",
    description="Web interface for exploring Samsung Wireless Audio (WAM) speaker APIs",
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
app.mount("/static", StaticFiles(directory="web_ui/static"), name="static")

# Store connected websockets
active_connections: List[WebSocket] = []


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


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """Serve the main web UI page."""
    with open("web_ui/templates/index.html", "r") as f:
        return HTMLResponse(content=f.read())


@app.get("/api/settings")
async def get_settings():
    """Get application settings."""
    if not web_app_instance:
        raise HTTPException(status_code=500, detail="App not initialized")
    
    settings = web_app_instance.settings._settings
    return {"settings": settings}


@app.post("/api/connect")
async def connect_speaker(ip: str, port: int):
    """Connect to a speaker."""
    if not web_app_instance:
        raise HTTPException(status_code=500, detail="App not initialized")
    
    try:
        await web_app_instance.async_connect(ip, port)
        return {"status": "connected", "ip": ip, "port": port}
    except Exception as e:
        detail_msg = f"Connection failed: {str(e)}"
        logger.error(detail_msg)
        raise HTTPException(status_code=500, detail=detail_msg)


@app.post("/api/disconnect")
async def disconnect_speaker():
    """Disconnect from the current speaker."""
    if not web_app_instance:
        raise HTTPException(status_code=500, detail="App not initialized")
    
    if not hasattr(web_app_instance, 'speaker') or not web_app_instance.speaker:
        raise HTTPException(status_code=400, detail="Not connected to any speaker")
    
    try:
        await web_app_instance.async_disconnect()
        return {"status": "disconnected"}
    except Exception as e:
        detail_msg = f"Disconnection failed: {str(e)}"
        logger.error(detail_msg)
        raise HTTPException(status_code=500, detail=detail_msg)


@app.get("/api/properties")
async def get_properties():
    """Get current speaker properties."""
    if not web_app_instance:
        raise HTTPException(status_code=500, detail="App not initialized")
    
    if not hasattr(web_app_instance, 'speaker') or not web_app_instance.speaker:
        raise HTTPException(status_code=400, detail="Not connected to any speaker")
    
    # Get the current state
    try:
        # Get all attributes using WamAttributes
        from pywam.attributes import WamAttributes
        ws = WamAttributes()
        states = ws.get_state_copy()
        return {"properties": states}
    except Exception as e:
        detail_msg = f"Failed to get properties: {str(e)}"
        logger.error(detail_msg)
        raise HTTPException(status_code=500, detail=detail_msg)


@app.get("/api/events")
async def get_events(limit: Optional[int] = Query(100, ge=1, le=1000)):
    """Get recent events from the speaker."""
    if not web_app_instance:
        raise HTTPException(status_code=500, detail="App not initialized")
    
    events = []
    for i, event in enumerate(reversed(web_app_instance.events[-limit:])):
        event_dict = {
            "raw_response": event.raw_response,
            "api_type": event.api_type,
            "method": event.method,
            "user": event.user,
            "version": event.version,
            "speaker_ip": event.speaker_ip,
            "success": str(event.success),
            "data": str(event.data),
            "err_msg": event.err_msg,
            "err_repr": event.err_repr,
        }
        events.append(event_dict)
    
    return {"events": events}


@app.post("/api/send_api")
async def send_api_request(
    api_type: str,
    method: str,
    pwron: bool = False,
    args: Optional[str] = Query("[]"),  # JSON string of arguments
    expected_response: str = "",
    user_check: bool = False,
    timeout: int = 1
):
    """Send an API request to the speaker."""
    if not web_app_instance:
        raise HTTPException(status_code=500, detail="App not initialized")
    
    if not hasattr(web_app_instance, 'speaker') or not web_app_instance.speaker:
        raise HTTPException(status_code=400, detail="Not connected to any speaker")
    
    try:
        # Parse the args parameter
        parsed_args = json.loads(args) if args else []
        
        # Validate API call
        api_call = ApiCall(
            api_type=api_type,
            method=method,
            pwron=pwron,
            args=parsed_args,
            expected_response=expected_response,
            user_check=user_check,
            timeout_multiple=timeout,
        )
        
        web_app_instance.validate_api_call(api_call)
        
        # Send the API request
        await web_app_instance.async_send_api(api_call)
        
        return {"status": "sent", "method": method}
    except Exception as e:
        detail_msg = f"Failed to send API request: {str(e)}"
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
                        "connected": web_app_instance and hasattr(web_app_instance, 'speaker') and bool(web_app_instance.speaker)
                    }
                    await manager.send_personal_message(json.dumps(status), websocket)
            except json.JSONDecodeError:
                # If not JSON, just echo it back
                await manager.send_personal_message(f"Server received: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)