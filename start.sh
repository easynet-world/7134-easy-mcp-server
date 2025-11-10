#!/bin/bash

echo "🚀 Starting easy-mcp-server..."
echo "================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo "✅ Starting easy-mcp-server..."
echo ""

# Check for and kill existing processes first
echo "🔍 Checking for existing easy-mcp-server processes..."
PIDS=$(pgrep -f "easy-mcp-server|orchestrator.js" 2>/dev/null || true)

if [ ! -z "$PIDS" ]; then
    echo "🛑 Found existing easy-mcp-server processes: $PIDS"
    echo "   Stopping existing processes..."
    
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
        sleep 1
    fi
    
    echo "✅ Existing processes stopped"
else
    echo "ℹ️  No existing processes found"
fi

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📄 Loading configuration from .env file..."
    set -a
    source <(grep -v '^[[:space:]]*#' .env | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*#.*$//')
    set +a
else
    echo "⚠️  No .env file found, using default ports"
    export EASY_MCP_SERVER_PORT=${EASY_MCP_SERVER_PORT:-8887}
    export EASY_MCP_SERVER_MCP_PORT=${EASY_MCP_SERVER_MCP_PORT:-8888}
fi

echo "📡 Server will be available at:"
echo "   🌐 REST API: http://localhost:${EASY_MCP_SERVER_PORT:-8887}"
echo "   🤖 AI Server: http://localhost:${EASY_MCP_SERVER_MCP_PORT:-8888}"
echo "   📚 API Docs: http://localhost:${EASY_MCP_SERVER_PORT:-8887}/docs"
echo ""

# Check for processes using the configured ports and kill them
REST_PORT=${EASY_MCP_SERVER_PORT:-8887}
MCP_PORT=${EASY_MCP_SERVER_MCP_PORT:-8888}

PORT_PIDS=$(lsof -ti :$REST_PORT -ti :$MCP_PORT 2>/dev/null || true)
if [ ! -z "$PORT_PIDS" ]; then
    echo "🔍 Found processes using ports $REST_PORT/$MCP_PORT: $PORT_PIDS"
    echo "   Stopping processes using these ports..."
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
        sleep 1
    fi
    echo "✅ Port processes cleared"
    echo ""
fi

# Start the server in background with output redirected
echo "🚀 Starting with: npm start"
echo "🔄 Starting server in background..."

npm start > server.log 2>&1 &
SERVER_PID=$!

echo "✅ Server started with PID: $SERVER_PID"
echo "📡 Server is running in the background"
echo "📝 Server output is logged to: server.log"
echo ""

# Show progress while server starts up
echo "⏳ Waiting for server to start up..."
sleep 2

# Check if server is responding
REST_PORT=${EASY_MCP_SERVER_PORT:-8887}
echo "🔍 Checking server health at http://localhost:$REST_PORT/health..."

# Try to check server health with timeout
for i in {1..10}; do
    if curl -s http://localhost:$REST_PORT/health > /dev/null 2>&1; then
        echo "✅ Server is responding and ready!"
        break
    else
        echo "   Attempt $i/10: Server not ready yet..."
        sleep 1
    fi
done

echo ""
echo "💡 To stop the server, run: ./stop.sh"
echo "💡 To check server status: curl http://localhost:$REST_PORT/health"
echo "💡 To view server logs: tail -f server.log"
echo ""
echo "🎯 Server is ready! You can now use the terminal for other tasks."

