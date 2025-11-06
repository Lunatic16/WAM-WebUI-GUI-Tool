#!/bin/bash

# Script to start the original pywam GUI application

# Print welcome message
echo "Starting pywam GUI Application..."
echo "=================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set the working directory to the script location
cd "$SCRIPT_DIR"

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Install dependencies
echo "Installing/updating dependencies..."
pip install -r requirements.txt

# Start the tkinter GUI application
echo "Starting pywam GUI application..."
echo "Note: The GUI will open in a separate window."
echo "Close the GUI window to stop the application."
echo ""

python app.py

# Print closing message
echo ""
echo "pywam GUI Application stopped."