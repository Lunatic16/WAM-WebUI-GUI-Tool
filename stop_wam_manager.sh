#!/bin/bash

# Script to stop the WAM Speaker Manager application

echo "Stopping WAM Speaker Manager..."
echo "================================="

# Kill all uvicorn processes running wam_manager
pkill -TERM -f "uvicorn.*wam_manager" 2>/dev/null

# Kill any python processes running the wam_manager main.py with SIGTERM first
pkill -TERM -f "python.*wam_manager.main" 2>/dev/null

# Wait a moment for graceful shutdown
sleep 2

# Kill any remaining processes with SIGKILL if they're still running
pkill -KILL -f "uvicorn.*wam_manager" 2>/dev/null
pkill -KILL -f "python.*wam_manager.main" 2>/dev/null

# Alternative: Kill by port 8001 if lsof is available
if command -v lsof &> /dev/null; then
    PORT_PID=$(lsof -t -i:8001 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        kill -TERM $PORT_PID 2>/dev/null
        sleep 1
        # Kill with force if still running
        kill -KILL $PORT_PID 2>/dev/null
    fi
fi

# Check if the processes were stopped
UVICORN_PROCESSES=$(pgrep -f "uvicorn.*wam_manager" | wc -l 2>/dev/null)
PYTHON_PROCESSES=$(pgrep -f "python.*wam_manager.main" | wc -l 2>/dev/null)

if [ $UVICORN_PROCESSES -eq 0 ] && [ $PYTHON_PROCESSES -eq 0 ]; then
    echo "WAM Speaker Manager stopped successfully."
else
    echo "Some processes may still be running:"
    pgrep -f "uvicorn.*wam_manager" && echo " - uvicorn wam_manager processes"
    pgrep -f "python.*wam_manager.main" && echo " - python wam_manager.main processes"
fi

echo "Done."