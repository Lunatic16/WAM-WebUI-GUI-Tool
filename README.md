# pywam API explorer GUI tool

This is a simple GUI tool that uses the pywam library to explore API calls and answers from Samsung Wireless Audio (R) speakers (WAM).

## Installation

Clone the GitHub repository, and install the requirements.

## Usage

- Run `app.py`
- Enter speaker ip and port and click "Connect".
- In the top list you can see all attributes of the speaker that the pywam library supports and when it was last updated.
- In the middle list you can see all received events from the speaker.
  - To copy a full API response right click in the event list and choose copy
  - To view or copy a specific attribute to the API right click on that attribute and choose view or copy.
- In the bottom list you see the log. To debug the pywam library select DEBUG log level.
- You can add more speakers to the list if you edit `settings.json` which is created the first time you run the app.
- Click "Send API" to test new API calls. Then simply enter all the values and click "Send". If you have log level set to DEBUG you can see if the pywam.client is receiving any data from the speaker.

## Contribute

- Issue Tracker: https://github.com/Strixx76/pywam_gui_tool/issues
- Source Code: https://github.com/Strixx76/pywam_gui_tool

## License

The project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

## Disclaimer Notice

With this tool you will be able to send commands to the speaker that I have never tested. I can NOT guarantee that your speaker is compatible with this app, and you can’t hold me responsible if you brick your speaker when using this app.

## Usage

The pywam GUI tool now provides two interfaces for managing WAM speakers:

### Web UI (Recommended)
A modern web interface has been added for easier access to the pywam functionality. To start/stop the web UI:

1. Make sure you have installed the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the web server:
   ```bash
   ./start_web_ui.sh
   ```

3. To stop the web server when needed:
   ```bash
   ./stop_web_ui.sh
   ```

4. Open your browser and navigate to `http://localhost:8000`

The web UI provides:
- Modern, responsive interface with a dark theme
- Real-time updates via WebSocket connections
- Connection management for WAM speakers
- Property viewing and monitoring
- Event tracking and logging
- API command testing interface
- Comprehensive logging system

### Traditional GUI
The original tkinter-based GUI is still available:

1. To start the GUI application:
   ```bash
   ./start_gui.sh
   ```

2. To stop the GUI application (if needed):
   ```bash
   ./stop_gui.sh
   ```

The traditional GUI provides the same core functionality as before with a desktop interface.

### Scripts Overview

The following scripts are available for managing the application:

- `manage_interfaces.sh` - Unified script to manage both Web UI and WAM Manager interfaces
- `start_gui.sh` - Starts the traditional tkinter GUI
- `stop_gui.sh` - Stops the traditional tkinter GUI

### Using the Unified Management Script

The unified script provides easy management of both web interfaces:

```bash
# Start Web UI only
./manage_interfaces.sh start webui

# Start WAM Manager only
./manage_interfaces.sh start manager

# Start both interfaces
./manage_interfaces.sh start all
# or simply:
./manage_interfaces.sh start

# Stop both interfaces
./manage_interfaces.sh stop all
# or simply:
./manage_interfaces.sh stop

# Restart Web UI only
./manage_interfaces.sh restart webui

# Check status of both interfaces
./manage_interfaces.sh status

# Get help
./manage_interfaces.sh
```

The Web UI runs on port 8000 and the WAM Manager runs on port 8001.

### WAM Speaker Manager

The project now includes a specialized web UI for managing Samsung WAM speakers:

1. To start the WAM Speaker Manager:
   ```bash
   ./start_wam_manager.sh
   ```

2. Access the interface at `http://localhost:8001`

The WAM Speaker Manager provides:
- Network discovery of WAM speakers using SSDP/UPnP
- Remote control of discovered speakers through API port 55001
- Power, volume, and playback controls
- Input source selection
- Real-time speaker status monitoring

## Support the work

[![BuyMeCoffee][coffeebadge]][coffeelink]

[coffeelink]: https://www.buymeacoffee.com/76strixx
[coffeebadge]: https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png
