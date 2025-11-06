#!/bin/bash

# Script to start the pywam Web UI application

# Print welcome message
echo "Starting pywam Web UI Application..."
echo "====================================="

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

# Start the FastAPI application
echo "Starting FastAPI server on http://0.0.0.0:8000"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn web_ui.main:app --host 0.0.0.0 --port 8000 --reload

# Print closing message
echo ""
echo "pywam Web UI Application stopped."