#!/bin/bash

echo "🚀 Starting easy-mcp-server..."
echo "================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Find npx path
NPX_PATH=""
for path in "/opt/homebrew/bin/npx" "/usr/local/bin/npx" "/usr/bin/npx" "npx"; do
    if command -v "$path" &> /dev/null; then
        NPX_PATH="$path"
        break
    fi
done

if [ -z "$NPX_PATH" ]; then
    echo "❌ npx not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ Starting AI-era Express Server..."
echo ""

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📄 Loading configuration from .env file..."
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
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

# Start the server in background with output redirected
echo "🚀 Starting with: $NPX_PATH easy-mcp-server"
echo "🔄 Starting server in background..."

$NPX_PATH easy-mcp-server > server.log 2>&1 &
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