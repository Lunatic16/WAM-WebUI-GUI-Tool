#!/bin/bash

# Unified script to manage pywam Web UI and WAM Manager applications

SCRIPT_NAME=$(basename "$0")

# Print usage information
usage() {
    echo "Usage: $SCRIPT_NAME [COMMAND] [INTERFACE]"
    echo ""
    echo "Commands:"
    echo "  start     Start the specified interface(s)"
    echo "  stop      Stop the specified interface(s)"
    echo "  restart   Restart the specified interface(s)"
    echo "  status    Check status of the interfaces"
    echo ""
    echo "Interfaces:"
    echo "  webui     Web UI (runs on port 8000) - default if no interface specified"
    echo "  manager   WAM Manager (runs on port 8001)"
    echo "  all       Both interfaces (default if no interface specified in start/restart)"
    echo ""
    echo "Examples:"
    echo "  $SCRIPT_NAME start webui      # Start only Web UI"
    echo "  $SCRIPT_NAME start manager    # Start only WAM Manager"  
    echo "  $SCRIPT_NAME start            # Start both interfaces"
    echo "  $SCRIPT_NAME stop all         # Stop both interfaces"
    echo "  $SCRIPT_NAME restart webui    # Restart only Web UI"
    echo "  $SCRIPT_NAME status           # Check status of both interfaces"
    exit 1
}

# Function to get process IDs for an interface
get_pid() {
    local interface=$1
    local port=$2
    
    if command -v lsof >/dev/null 2>&1; then
        lsof -t -i:$port 2>/dev/null
    else
        # Fallback: search for python processes running the specific interface
        if [ "$interface" = "webui" ]; then
            pgrep -f "uvicorn.*web_ui.main" 2>/dev/null
        elif [ "$interface" = "manager" ]; then
            pgrep -f "uvicorn.*wam_manager.main" 2>/dev/null
        fi
    fi
}

# Function to check if an interface is running
is_running() {
    local interface=$1
    local port=$2
    local pid=$(get_pid $interface $port)
    
    if [ -n "$pid" ]; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

# Function to start an interface
start_interface() {
    local interface=$1
    local port=$2
    local name=$3
    
    echo "Starting $name..."
    
    # Check if already running
    if is_running $interface $port; then
        local pid=$(get_pid $interface $port)
        echo "$name is already running (PID: $pid)"
        return 0
    fi
    
    # Get the directory where this script is located
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$SCRIPT_DIR"
    
    # Check if virtual environment exists, if not create it
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies if needed
    pip install -r requirements.txt >/dev/null 2>&1
    
    # Start the appropriate interface
    if [ "$interface" = "webui" ]; then
        echo "Starting Web UI on port $port..."
        nohup uvicorn web_ui.main:app --host 0.0.0.0 --port $port --log-level warning > webui.log 2>&1 &
    elif [ "$interface" = "manager" ]; then
        echo "Starting WAM Manager on port $port..."
        nohup uvicorn wam_manager.main:app --host 0.0.0.0 --port $port --log-level warning > manager.log 2>&1 &
    fi
    
    # Wait a moment and check if it started successfully
    sleep 3
    if is_running $interface $port; then
        local pid=$(get_pid $interface $port)
        echo "$name started successfully (PID: $pid)"
    else
        echo "Failed to start $name"
        return 1
    fi
}

# Function to stop an interface
stop_interface() {
    local interface=$1
    local port=$2
    local name=$3
    
    echo "Stopping $name..."
    
    # Check if running
    if ! is_running $interface $port; then
        echo "$name is not running"
        return 0
    fi
    
    # Try graceful shutdown first
    local pid=$(get_pid $interface $port)
    if [ -n "$pid" ]; then
        echo "Sending SIGTERM to $name (PID: $pid)..."
        kill -TERM $pid 2>/dev/null
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Check if process is still running
        if is_running $interface $port; then
            # Force kill if still running
            local pid=$(get_pid $interface $port)
            if [ -n "$pid" ]; then
                echo "Process still running, sending SIGKILL to $name (PID: $pid)..."
                kill -KILL $pid 2>/dev/null
            fi
        fi
    fi
    
    # Verify it stopped
    if ! is_running $interface $port; then
        echo "$name stopped successfully"
    else
        echo "Failed to stop $name"
        return 1
    fi
}

# Function to show status of an interface
show_status() {
    local interface=$1
    local port=$2
    local name=$3
    
    if is_running $interface $port; then
        local pid=$(get_pid $interface $port)
        echo "$name: RUNNING (PID: $pid, Port: $port)"
    else
        echo "$name: STOPPED (Port: $port)"
    fi
}

# Parse command line arguments
COMMAND=""
INTERFACE=""

if [ $# -eq 0 ]; then
    usage
elif [ $# -eq 1 ]; then
    COMMAND="$1"
    if [ "$COMMAND" = "status" ]; then
        INTERFACE="all"  # For status, show all
    else
        INTERFACE="all"  # Default to 'all' for start/restart/stop
    fi
elif [ $# -eq 2 ]; then
    COMMAND="$1"
    INTERFACE="$2"
else
    usage
fi

# Validate command
case "$COMMAND" in
    start|stop|restart|status)
        ;;
    *)
        echo "Error: Invalid command '$COMMAND'"
        echo ""
        usage
        ;;
esac

# Validate interface (not needed for status command)
if [ "$COMMAND" != "status" ]; then
    case "$INTERFACE" in
        webui|manager|all)
            ;;
        *)
            echo "Error: Invalid interface '$INTERFACE'"
            echo ""
            usage
            ;;
    esac
fi

# Execute command based on interface
case "$COMMAND" in
    start)
        case "$INTERFACE" in
            webui)
                start_interface "webui" "8000" "Web UI"
                ;;
            manager)
                start_interface "manager" "8001" "WAM Manager"
                ;;
            all)
                start_interface "webui" "8000" "Web UI"
                sleep 1  # Small delay to avoid port conflicts
                start_interface "manager" "8001" "WAM Manager"
                ;;
        esac
        ;;
        
    stop)
        case "$INTERFACE" in
            webui)
                stop_interface "webui" "8000" "Web UI"
                ;;
            manager)
                stop_interface "manager" "8001" "WAM Manager"
                ;;
            all)
                stop_interface "webui" "8000" "Web UI"
                stop_interface "manager" "8001" "WAM Manager"
                ;;
        esac
        ;;
        
    restart)
        case "$INTERFACE" in
            webui)
                stop_interface "webui" "8000" "Web UI"
                sleep 2
                start_interface "webui" "8000" "Web UI"
                ;;
            manager)
                stop_interface "manager" "8001" "WAM Manager"
                sleep 2
                start_interface "manager" "8001" "WAM Manager"
                ;;
            all)
                stop_interface "webui" "8000" "Web UI"
                stop_interface "manager" "8001" "WAM Manager"
                sleep 2
                start_interface "webui" "8000" "Web UI"
                sleep 1  # Small delay to avoid port conflicts
                start_interface "manager" "8001" "WAM Manager"
                ;;
        esac
        ;;
        
    status)
        echo "Service Status:"
        show_status "webui" "8000" "Web UI"
        show_status "manager" "8001" "WAM Manager"
        ;;
esac

echo "Done."