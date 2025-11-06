#!/bin/bash

# Script to stop the pywam Web UI application

echo "Stopping pywam Web UI Application..."
echo "====================================="

# Kill all uvicorn processes with SIGTERM first
pkill -TERM -f "uvicorn" 2>/dev/null

# Kill any python processes running the web_ui main.py with SIGTERM first
pkill -TERM -f "python.*web_ui.main" 2>/dev/null

# Wait a moment for graceful shutdown
sleep 2

# Kill any remaining processes with SIGKILL if they're still running
pkill -KILL -f "uvicorn" 2>/dev/null
pkill -KILL -f "python.*web_ui.main" 2>/dev/null

# Alternative: Kill by port if lsof is available
if command -v lsof &> /dev/null; then
    PORT_PID=$(lsof -t -i:8000 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        kill -TERM $PORT_PID 2>/dev/null
        sleep 1
        # Kill with force if still running
        kill -KILL $PORT_PID 2>/dev/null
    fi
fi

# Check if the processes were stopped
UVICORN_PROCESSES=$(pgrep -f "uvicorn" | wc -l 2>/dev/null)
PYTHON_PROCESSES=$(pgrep -f "python.*web_ui.main" | wc -l 2>/dev/null)

if [ $UVICORN_PROCESSES -eq 0 ] && [ $PYTHON_PROCESSES -eq 0 ]; then
    echo "pywam Web UI Application stopped successfully."
else
    echo "Some processes may still be running:"
    pgrep -f "uvicorn" && echo " - uvicorn processes"
    pgrep -f "python.*web_ui.main" && echo " - python web_ui processes"
fi

echo "Done."