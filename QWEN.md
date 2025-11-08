# pywam GUI Tool - Project Overview

## Project Description

The pywam GUI Tool is a comprehensive application for exploring and managing Samsung Wireless Audio (WAM) speakers' APIs. It provides both a traditional tkinter-based desktop GUI and modern web interfaces for controlling and monitoring WAM speakers. The project utilizes the `pywam` library to communicate with Samsung WAM speakers via their network API.

## New Features (Latest Updates)

### Multiple Speaker Connections
- Connect to multiple WAM speakers simultaneously
- Individual control of each connected speaker
- Dedicated sections for discovered speakers, connected speakers, and speaker groups
- Ability to disconnect individual speakers or all speakers at once

### Group Control Functionality
- Control multiple speakers as a group
- Send commands to all speakers in a group simultaneously
- Group-specific equalizer and input controls
- Visual indication of grouped speakers

### Enhanced Equalizer Controls
- Preset equalizer settings (Normal, Flat, Jazz, Rock, Classical, Bass Boost, Treble Boost, Movie, Voice)
- Manual 7-band equalizer with real-time value display (-6 to +6 dB range)
- Toggle for manual equalizer controls
- Reset to flat EQ functionality

### Modern UI Redesign
- Clean, responsive design using Bootstrap 5
- Card-based layout with clear visual hierarchy  
- Better organization of controls in responsive grid layout
- Improved volume control with real-time percentage display
- Enhanced activity log with clear functionality

### Additional Features
- Disconnect all button for easy session management
- Real-time speaker status updates
- Visual indicators for grouped speakers
- Improved logging and status information

## Directory Structure

```
pywam_gui_tool/
├── __pycache__/              # Python bytecode cache
├── .ruff_cache/             # Ruff linter cache
├── venv/                    # Python virtual environment
├── wam_manager/             # WAM speaker management web interface
│   ├── static/              # CSS and JavaScript files
│   ├── templates/           # HTML templates
│   └── main.py              # FastAPI application
├── web_ui/                  # Web interface for API exploration
│   ├── static/              # CSS and JavaScript files
│   ├── templates/           # HTML templates
│   ├── discovery.py         # Network discovery utilities
│   └── main.py              # FastAPI application
├── .editorconfig            # Editor configuration
├── .flake8                  # Flake8 linter configuration
├── .gitignore               # Git ignore patterns
├── QWEN.md                 # Project documentation (this file)
├── LICENSE.txt             # MIT License
├── README.md               # Project README
├── app.py                  # Core application logic
├── gui.py                  # Desktop GUI implementation
├── manage_interfaces.sh    # Unified management script
├── requirements.txt        # Production dependencies
├── requirements_dev.txt    # Development dependencies
├── ruff.toml               # Ruff linter configuration
├── settings.json           # Configuration file (auto-generated)
├── settings.py             # Settings management
├── start_gui.sh            # Desktop GUI startup script
├── stop_gui.sh             # Desktop GUI stop script
└── stop_gui.sh             # Desktop GUI stop script
```

## Architecture and Components

### Core Components

1. **Main Application (`app.py`)**: The core application logic that handles connections to WAM speakers, manages API calls, and processes responses.

2. **Desktop GUI (`gui.py`)**: A tkinter-based interface that provides visual access to speaker properties, events, and API testing functionality.

3. **Web Interface (`web_ui/`)**: A modern FastAPI-based web application with real-time updates via WebSockets, featuring a responsive dark-themed UI.

4. **WAM Manager (`wam_manager/`)**: A specialized web interface for discovering and managing multiple WAM speakers on the network.

5. **Settings System (`settings.py`)**: Manages configuration for speaker connections, including IP addresses, ports, and logging levels.

6. **Discovery Service (`web_ui/discovery.py`)**: Implements SSDP/UPnP-based discovery of WAM speakers on the network.

### Key Features

- **WAM Speaker Connection**: Connect to Samsung WAM speakers via IP address and port 55001
- **Real-time Property Monitoring**: View and track all speaker attributes and state changes
- **Event Tracking**: Monitor all events received from connected speakers
- **API Testing**: Send custom API commands to test speaker functionality
- **Network Discovery**: Automatically discover WAM speakers on the local network using SSDP/UPnP
- **Multiple Interfaces**: Both desktop GUI and web-based interfaces available
- **WebSocket Support**: Real-time updates between application and web interfaces
- **Comprehensive Logging**: Detailed logging system for debugging and monitoring

## Building and Running

### Prerequisites

- Python 3.8 or higher
- Dependencies listed in `requirements.txt`
- Bash shell for startup scripts

### Setup Process

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Virtual Environment Setup** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

### Running the Application

The project provides multiple ways to run the application:

#### 1. Desktop GUI (Traditional)

```bash
# Using the provided script
./start_gui.sh

# Or directly
python app.py
```

#### 2. Web Interface Only

```bash
# Start the web UI server (runs on port 8000)
uvicorn web_ui.main:app --host 0.0.0.0 --port 8000

# Then access via browser: http://localhost:8000
```

#### 3. WAM Manager Only

```bash
# Start the WAM manager server (runs on port 8001)
uvicorn wam_manager.main:app --host 0.0.0.0 --port 8001

# Then access via browser: http://localhost:8001
```

#### 4. Unified Management (Recommended)

The project includes a comprehensive management script:

```bash
# Start both web UI and WAM Manager
./manage_interfaces.sh start all

# Start only the Web UI
./manage_interfaces.sh start webui

# Start only the WAM Manager
./manage_interfaces.sh start manager

# Check status of both interfaces
./manage_interfaces.sh status

# Stop both interfaces
./manage_interfaces.sh stop all

# Restart both interfaces
./manage_interfaces.sh restart all
```

## Configuration Details

### Settings File

The application uses `settings.json` file to store configuration:

```json
{
    "hosts": [
        {
            "name": "Speaker",
            "host": "192.168.1.100",
            "port": 55001
        }
    ],
    "loglevel": 1,
    "default_host": 0
}
```

- `hosts`: Array of known WAM speakers with name, IP, and port
- `loglevel`: Logging level (0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR, 4=CRITICAL)
- `default_host`: Index of the default speaker in the hosts array

### API Types Supported

- **UIC**: User Interface Control APIs
- **CPM**: Control and Playback Management APIs

### Argument Types

The API supports different argument types:
- `str`: String values
- `dec`: Decimal (integer) values
- `cdata`: Character data
- `dec_arr`: Array of decimal (integer) values

## Development Tools and Conventions

### Code Quality

The project uses modern Python development tools:

- **Ruff**: Fast Python linter configured in `ruff.toml`
- **Flake8**: Additional linter configured in `.flake8`
- **EditorConfig**: Consistent editor settings in `.editorconfig`

### Linting Configuration

The project follows strict code quality standards using Ruff with Python 3.11+ compatibility:

- Complexity checking (C rules)
- Documentation requirements (D rules)
- PEP 8 compliance (E rules)
- Import organization (I rules)
- Security checks (S rules)
- Type checking considerations (UP rules)

### Development Dependencies

- `ruff`: Code linter
- `httpx`: HTTP client for testing
- Production dependencies via `-r requirements.txt`

## Project Components Deep Dive

### Web Interface (web_ui/)

The web interface is built with FastAPI and includes:

- **Real-time Updates**: WebSocket connections for live updates
- **Network Discovery**: SSDP/UPnP-based discovery of WAM speakers
- **Responsive UI**: Mobile-friendly dark-themed interface
- **Property Monitoring**: Live updates of all speaker properties
- **Event Tracking**: Monitoring all events from connected speakers
- **API Testing**: Interface for sending custom API commands

### WAM Manager (wam_manager/)

The specialized WAM manager includes:

- **Network Discovery**: SSDP/UPnP-based discovery of WAM speakers
- **Remote Control**: Power, volume, playback, and input controls
- **Real-time Status**: Live updates of speaker status
- **Multi-speaker Support**: Management of multiple speakers simultaneously

### Discovery Service

The discovery service uses multiple approaches:

1. **SSDP/UPnP Discovery**: Standard network discovery protocol
2. **Port-based Scanning**: Checks common WAM ports on the local network
3. **Brand Identification**: Looks for Samsung/WAM-specific identifiers in responses

## Usage Instructions

### Desktop GUI Usage

1. Run `./start_gui.sh` or `python app.py`
2. Enter speaker IP and port (default port is 55001)
3. Click "Connect" to establish connection
4. Use the interface to:
   - View all speaker attributes and their last update time
   - Monitor all received events from the speaker
   - Access detailed event information via right-click context menus
   - Send custom API calls using the "Send API" button
   - Adjust logging level for debugging

### Web Interface Usage

1. Start the web server: `./manage_interfaces.sh start webui`
2. Open browser to `http://localhost:8000`
3. The interface provides:
   - Real-time property updates via WebSocket connections
   - Network discovery of WAM speakers
   - Complete property viewing and monitoring capabilities
   - Event tracking and logging system
   - API command testing interface

### WAM Manager Usage

1. Start the manager: `./manage_interfaces.sh start manager`
2. Access at `http://localhost:8001`
3. Features include:
   - Network discovery of WAM speakers using SSDP/UPnP
   - Remote control of discovered speakers
   - Power, volume, and playback controls
   - Input source selection
   - Real-time speaker status monitoring

## Important Notes

### License

The project is licensed under the MIT License - see `LICENSE.txt` for details.

### Safety Warning

The project allows sending commands to speakers that might not be tested. There's no guarantee that your speaker is compatible with all functions in this application. Use at your own risk.

### Troubleshooting

- Check that your WAM speaker is powered on and accessible on the network
- Verify the correct IP address and port (usually 55001)
- Use DEBUG logging level to see detailed communication information
- The discovery feature can help locate speakers on the network

## Project Development

### Adding New Features

The application is designed with extensibility in mind:

- New API commands can be tested through the Send API interface
- WebSocket functionality allows for real-time updates in web interfaces
- Modular design separates core functionality from presentation layers
- Network discovery can be enhanced with additional protocols

### API Support

The application supports all API types and methods available through the underlying pywam library, including validation for:

- API type (UIC or CPM)
- Method names
- Arguments with proper typing (str, dec, cdata, dec_arr)
- Power-on requirements
- User check requirements
- Timeout configurations

### Web Interface Structure

Both web interfaces follow FastAPI best practices:

- `main.py`: Main application with routes and WebSocket endpoints
- `templates/index.html`: Main HTML page
- `static/style.css`: Styling for the interface
- `static/app.js`: Client-side JavaScript for interactions
- CORS middleware for security
- Context manager for resource cleanup

## Implementation Details for Multiple Speaker & Group Controls

### Backend Implementation (`wam_manager/main.py`)

1. **Speaker Management**:
   - Added `speaker_connections` dictionary to track connection apps for each speaker
   - Implemented `speaker_groups` dictionary to track groups of speakers
   - Enhanced connection logic to support multiple simultaneous connections

2. **API Endpoints**:
   - `/api/speakers` - Get information about all connected speakers
   - `/api/groups` - Get information about speaker groups
   - `/api/speakers/disconnect_all` - Disconnect from all speakers
   - Enhanced `/api/speakers/{speaker_ip}/command` to support group commands with new `target` parameter

3. **Group Command Support**:
   - Implemented logic to find group members based on a reference speaker IP
   - Added functionality to send commands to all speakers in a group simultaneously
   - Returns detailed results showing success/failure for each speaker in the group

4. **WebSocket Updates**:
   - Added new message types (`speakers_list`, `groups_list`) for real-time updates
   - Enhanced ping responses to include group count information

### Frontend Implementation (`wam_manager/static/app.js`)

1. **State Management**:
   - Added `connectedSpeakers` and `speakerGroups` arrays to track state
   - Implemented `selectedSpeaker` and `selectedGroup` to track current selection

2. **UI Components**:
   - Implemented `updateConnectedSpeakersList()` to display connected speakers
   - Created `updateGroupsList()` function to show speaker groups
   - Added toggle functions for manual equalizer controls

3. **Group Controls**:
   - Created `loadGroupControls()` function to display group-specific controls
   - Implemented `sendGroupCommand()` to send commands to all speakers in a group
   - Added group-specific functions for equalizer, input source, and other controls

4. **WebSocket Integration**:
   - Enhanced WebSocket message handling to process `speakers_list` and `groups_list` messages
   - Added automatic refresh of speaker and group lists after connections

### Frontend UI Changes (`wam_manager/templates/index.html`)

1. **Layout Redesign**:
   - Created a two-column layout with discovery/connections on the left and controls on the right
   - Added separate sections for discovered speakers, connected speakers, and groups
   - Implemented responsive grid layout for better mobile experience

2. **New UI Elements**:
   - Added `connectedSpeakersList` div for showing connected speakers
   - Created `groupsList` div for displaying speaker groups
   - Added disconnect all button for easy session management

3. **Enhanced Controls**:
   - Implemented card-based design for better visual organization
   - Added icons throughout for better visual cues
   - Improved volume control layout with percentage display