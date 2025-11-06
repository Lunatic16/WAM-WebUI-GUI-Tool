#!/bin/bash

# Script to start the WAM Speaker Manager application

# Print welcome message
echo "Starting WAM Speaker Manager..."
echo "================================="

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

# Start the FastAPI application on port 8001
echo "Starting WAM Speaker Manager on http://0.0.0.0:8001"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn wam_manager.main:app --host 0.0.0.0 --port 8001 --reload

# Print closing message
echo ""
echo "WAM Speaker Manager stopped."