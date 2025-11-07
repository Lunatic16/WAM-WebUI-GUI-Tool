# pywam GUI Tool - Setup Guide

This document provides a comprehensive guide to setting up and running the pywam GUI Tool project.

## Overview

The pywam GUI Tool is a comprehensive application for exploring and managing Samsung Wireless Audio (WAM) speakers' APIs. It provides both a traditional tkinter-based desktop GUI and modern web interfaces for controlling and monitoring WAM speakers.

## Prerequisites

- Python 3.8 or higher
- Git (for cloning the repository)
- Bash shell for startup scripts

## Setup Process

### 1. Clone the Repository (if not already done)

```bash
git clone https://github.com/your-username/pywam_gui_tool.git
cd pywam_gui_tool
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
```

### 3. Activate Virtual Environment

```bash
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

## Running the Application

The project provides multiple ways to run the application:

### 1. Traditional GUI (Desktop)

```bash
# Using the provided script
./start_gui.sh

# Or directly
python app.py
```

### 2. Web UI (Modern Interface)

```bash
# Start the web UI server (runs on port 8000)
uvicorn web_ui.main:app --host 0.0.0.0 --port 8000

# Then access via browser: http://localhost:8000
```

### 3. WAM Manager (Specialized Manager)

```bash
# Start the WAM manager server (runs on port 8001)
uvicorn wam_manager.main:app --host 0.0.0.0 --port 8001

# Then access via browser: http://localhost:8001
```

### 4. Unified Management (Recommended)

Use the comprehensive management script:

```bash
# Make sure the script is executable
chmod +x manage_interfaces.sh

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

## Configuration

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

## Features

### Core Features:
- WAM Speaker Connection: Connect to Samsung WAM speakers via IP address and port 55001
- Real-time Property Monitoring: View and track all speaker attributes and state changes
- Event Tracking: Monitor all events received from connected speakers
- API Testing: Send custom API commands to test speaker functionality
- Network Discovery: Automatically discover WAM speakers on the local network using SSDP/UPnP
- Multiple Interfaces: Both desktop GUI and web-based interfaces available
- WebSocket Support: Real-time updates between application and web interfaces
- Comprehensive Logging: Detailed logging system for debugging and monitoring

### Web Interface (web_ui/):
- Real-time Updates: WebSocket connections for live updates
- Network Discovery: SSDP/UPnP-based discovery of WAM speakers
- Responsive UI: Mobile-friendly dark-themed interface
- Property Monitoring: Live updates of all speaker properties
- Event Tracking: Monitoring all events from connected speakers
- API Testing: Interface for sending custom API commands

### WAM Manager (wam_manager/):
- Network Discovery: SSDP/UPnP-based discovery of WAM speakers
- Remote Control: Power, volume, playback, and input controls
- Real-time Status: Live updates of speaker status
- Multi-speaker Support: Management of multiple speakers simultaneously

## Development Tools

The project uses modern Python development tools:
- Ruff: Fast Python linter configured in ruff.toml
- Flake8: Additional linter configured in .flake8

## Troubleshooting

### Common Issues:

1. **Dependency Issues**: Make sure you've activated the virtual environment before running the application.
2. **Port Conflicts**: If you get port binding errors, make sure ports 8000 and 8001 are free.
3. **Network Discovery**: For network discovery to work, make sure your WAM speaker is powered on and accessible on the same network.

### Checking Process Status:

You can check if the services are running using:
```bash
# Using the management script
./manage_interfaces.sh status

# Or using lsof (if available)
lsof -i:8000  # For Web UI
lsof -i:8001  # For WAM Manager
```

## Stopping the Application

### For GUI:
Simply close the GUI window.

### For Web Applications:
```bash
# Using the management script
./manage_interfaces.sh stop all

# Or manually kill the processes
kill -9 $(lsof -t -i:8000)  # For Web UI
kill -9 $(lsof -t -i:8001)  # For WAM Manager
```

## Safety Warning

The project allows sending commands to speakers that might not be tested. There's no guarantee that your speaker is compatible with all functions in this application. Use at your own risk.

## Support

For additional help, check the original README.md file in the repository for more detailed information about specific features and usage instructions.