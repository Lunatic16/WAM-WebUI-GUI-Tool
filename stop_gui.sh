#!/bin/bash

# Script to stop the pywam GUI application (app.py)

echo "Stopping pywam GUI Application (app.py)..."
echo "=========================================="

# Kill any python processes running app.py with SIGTERM first
pkill -TERM -f "python.*app.py" 2>/dev/null
pkill -TERM -f "app.py" 2>/dev/null

# Wait a moment for graceful shutdown
sleep 1

# Kill any remaining processes with SIGKILL if they're still running
pkill -KILL -f "python.*app.py" 2>/dev/null
pkill -KILL -f "app.py" 2>/dev/null

# Alternative: Kill by checking for tkinter python processes if lsof is available
if command -v lsof &> /dev/null; then
    # Look for processes that might be the GUI app (common tkinter process patterns)
    for pid in $(pgrep -f "python.*app.py" 2>/dev/null); do
        kill -TERM $pid 2>/dev/null
        sleep 0.5
        # Force kill if still running
        kill -KILL $pid 2>/dev/null
    done
fi

# Check if the processes were stopped
PYTHON_PROCESSES=$(pgrep -f "app.py" | wc -l 2>/dev/null)

if [ $PYTHON_PROCESSES -eq 0 ]; then
    echo "pywam GUI Application (app.py) stopped successfully."
else
    echo "Some app.py processes may still be running:"
    pgrep -f "app.py" 2>/dev/null
fi

echo "Done."