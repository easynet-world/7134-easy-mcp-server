#!/bin/bash

echo "🛑 Stopping easy-mcp-server..."
echo "================================"

# Kill easy-mcp-server processes
PIDS=$(pgrep -f "easy-mcp-server|orchestrator.js" 2>/dev/null || true)

if [ -z "$PIDS" ]; then
    echo "ℹ️  No easy-mcp-server processes found"
else
    echo "🔍 Found easy-mcp-server processes: $PIDS"
    echo "🛑 Terminating processes..."
    
    for PID in $PIDS; do
        echo "   Killing process $PID"
        kill -TERM $PID 2>/dev/null || true
    done
    
    # Wait a moment for graceful shutdown
    sleep 2
    
    # Force kill if still running
    REMAINING=$(pgrep -f "easy-mcp-server|orchestrator.js" 2>/dev/null || true)
    if [ ! -z "$REMAINING" ]; then
        echo "⚠️  Force killing remaining processes..."
        for PID in $REMAINING; do
            kill -KILL $PID 2>/dev/null || true
        done
    fi
    
    echo "✅ easy-mcp-server stopped"
fi

# Load environment variables to get port numbers
if [ -f .env ]; then
    set -a
    source <(grep -v '^[[:space:]]*#' .env | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*#.*$//')
    set +a
fi

# Kill processes using the default ports
REST_PORT=${EASY_MCP_SERVER_PORT:-8887}
MCP_PORT=${EASY_MCP_SERVER_MCP_PORT:-8888}

PORT_PIDS=$(lsof -ti :$REST_PORT -ti :$MCP_PORT 2>/dev/null || true)
if [ ! -z "$PORT_PIDS" ]; then
    echo "🔍 Found processes using ports $REST_PORT/$MCP_PORT: $PORT_PIDS"
    for PID in $PORT_PIDS; do
        echo "   Killing process $PID using port"
        kill -TERM $PID 2>/dev/null || true
    done
    sleep 1
    
    # Force kill if still running
    REMAINING_PORTS=$(lsof -ti :$REST_PORT -ti :$MCP_PORT 2>/dev/null || true)
    if [ ! -z "$REMAINING_PORTS" ]; then
        echo "⚠️  Force killing remaining processes on ports..."
        for PID in $REMAINING_PORTS; do
            kill -KILL $PID 2>/dev/null || true
        done
    fi
    echo "✅ Port processes cleared"
fi

echo "✅ All easy-mcp-server processes stopped"

# Clean up log file if it exists
if [ -f "server.log" ]; then
    echo "🧹 Cleaning up server log file..."
    rm -f server.log
fi

echo "✅ Cleanup completed"

