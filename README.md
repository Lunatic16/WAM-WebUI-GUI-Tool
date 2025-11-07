# pywam GUI Tool - Project Overview

## Project Description

The pywam GUI Tool is a comprehensive application for exploring and managing Samsung Wireless Audio (WAM) speakers' APIs. It provides both a traditional tkinter-based desktop GUI and modern web interfaces for controlling and monitoring WAM speakers. The project utilizes the `pywam` library to communicate with Samsung WAM speakers via their network API.

## Key Features

- **WAM Speaker Connection**: Connect to Samsung WAM speakers via IP address and port 55001
- **Real-time Property Monitoring**: View and track all speaker attributes and state changes
- **Event Tracking**: Monitor all events received from connected speakers
- **API Testing**: Send custom API commands to test speaker functionality
- **Network Discovery**: Automatically discover WAM speakers on the network using SSDP/UPnP
- **Multiple Interfaces**: Both desktop GUI and web-based interfaces available
- **WebSocket Support**: Real-time updates between application and web interfaces
- **Comprehensive Logging**: Detailed logging system for debugging and monitoring

## Installation

### Prerequisites

- Python 3.8 or higher
- Dependencies listed in `requirements.txt`
- Bash shell for startup scripts

### Setup Process

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Lunatic16/WAM-WebUI-GUI-Tool.git
   cd pywam_gui_tool
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Virtual Environment Setup** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Running the Application

The project provides multiple ways to run the application:

### 1. Desktop GUI (Traditional)

```bash
# Using the provided script
./start_gui.sh

# Or directly
python app.py
```

### 2. Web Interface Only

```bash
# Start the web UI server (runs on port 8000)
uvicorn web_ui.main:app --host 0.0.0.0 --port 8000

# Then access via browser: http://localhost:8000
```

### 3. WAM Manager Only

```bash
# Start the WAM manager server (runs on port 8001)
uvicorn wam_manager.main:app --host 0.0.0.0 --port 8001

# Then access via browser: http://localhost:8001
```

### 4. Unified Management (Recommended)

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

## Desktop GUI Usage

1. Run `./start_gui.sh` or `python app.py`
2. Enter speaker IP and port (default port is 55001)
3. Click "Connect" to establish connection
4. Use the interface to:
   - View all speaker attributes and their last update time
   - Monitor all received events from the speaker
   - Access detailed event information via right-click context menus
   - Send custom API calls using the "Send API" button
   - Adjust logging level for debugging

## Web Interface Usage

1. Start the web server: `./manage_interfaces.sh start webui`
2. Open browser to `http://localhost:8000`
3. The interface provides:
   - Real-time property updates via WebSocket connections
   - Network discovery of WAM speakers
   - Complete property viewing and monitoring capabilities
   - Event tracking and logging system
   - API command testing interface

## WAM Manager Usage

1. Start the manager: `./manage_interfaces.sh start manager`
2. Access at `http://localhost:8001`
3. Features include:
   - Network discovery of WAM speakers using SSDP/UPnP
   - Remote control of discovered speakers
   - Power, volume, and playback controls
   - Input source selection
   - Real-time speaker status monitoring

## Project Architecture

### Core Components

1. **Main Application (`app.py`)**: The core application logic that handles connections to WAM speakers, manages API calls, and processes responses.

2. **Desktop GUI (`gui.py`)**: A tkinter-based interface that provides visual access to speaker properties, events, and API testing functionality.

3. **Web Interface (`web_ui/`)**: A modern FastAPI-based web application with real-time updates via WebSockets, featuring a responsive dark-themed UI.

4. **WAM Manager (`wam_manager/`)**: A specialized web interface for discovering and managing multiple WAM speakers on the network.

5. **Settings System (`settings.py`)**: Manages configuration for speaker connections, including IP addresses, ports, and logging levels.

6. **Discovery Service (`web_ui/discovery.py`)**: Implements SSDP/UPnP-based discovery of WAM speakers on the network.

### Web Interface Structure

Both web interfaces follow FastAPI best practices:

- `main.py`: Main application with routes and WebSocket endpoints
- `templates/index.html`: Main HTML page
- `static/style.css`: Styling for the interface
- `static/app.js`: Client-side JavaScript for interactions
- CORS middleware for security
- Context manager for resource cleanup

## Troubleshooting

- Check that your WAM speaker is powered on and accessible on the network
- Verify the correct IP address and port (usually 55001)
- Use DEBUG logging level to see detailed communication information
- The discovery feature can help locate speakers on the network

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

## Development

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

## Contribute

- Issue Tracker: https://github.com/Lunatic16/WAM-WebUI-GUI-Tool/issues
- Source Code: https://github.com/Lunatic16/WAM-WebUI-GUI-Tool

## License

The project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

## Disclaimer Notice

With this tool you will be able to send commands to the speaker that I have never tested. I can NOT guarantee that your speaker is compatible with this app, and you can't hold me responsible if you brick your speaker when using this app.

## Support the work

[![BuyMeCoffee][coffeebadge]][coffeelink]

[coffeelink]: https://www.buymeacoffee.com/76strixx
[coffeebadge]: https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png
