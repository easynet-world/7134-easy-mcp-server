#!/bin/bash

# Easy MCP Server Start Script
# This script stops existing processes, loads environment variables, and starts the server

# Stop existing easy-mcp-server processes
echo "🔍 Checking for existing easy-mcp-server processes..."
PIDS=$(pgrep -f "easy-mcp-server" 2>/dev/null || true)

if [ ! -z "$PIDS" ]; then
  echo "🛑 Found existing easy-mcp-server processes: $PIDS"
  echo "   Stopping existing processes..."
  for PID in $PIDS; do
    kill -TERM $PID 2>/dev/null || true
  done
  sleep 2
  # Force kill if still running
  REMAINING=$(pgrep -f "easy-mcp-server" 2>/dev/null || true)
  if [ ! -z "$REMAINING" ]; then
    echo "⚠️  Force killing remaining processes..."
    for PID in $REMAINING; do
      kill -KILL $PID 2>/dev/null || true
    done
    sleep 1
  fi
  echo "✅ Existing processes stopped"
fi

# Load environment variables from .env file
if [ -f .env ]; then
  # Strip inline comments and empty lines, then export variables
  # This handles both full-line comments (already skipped) and inline comments
  # Using process substitution to source the cleaned .env file
  set -a
  source <(grep -v '^[[:space:]]*#' .env | grep -v '^[[:space:]]*$' | sed 's/[[:space:]]*#.*$//')
  set +a
  echo "📄 Loaded environment variables from .env"
else
  echo "⚠️  No .env file found, using default ports"
  export EASY_MCP_SERVER_PORT=${EASY_MCP_SERVER_PORT:-8887}
  export EASY_MCP_SERVER_MCP_PORT=${EASY_MCP_SERVER_MCP_PORT:-8888}
fi

# Stop processes using the configured ports
REST_PORT=${EASY_MCP_SERVER_PORT:-8887}
MCP_PORT=${EASY_MCP_SERVER_MCP_PORT:-8888}

PORT_PIDS=$(lsof -ti :$REST_PORT -ti :$MCP_PORT 2>/dev/null || true)
if [ ! -z "$PORT_PIDS" ]; then
  echo "🔍 Found processes using ports $REST_PORT/$MCP_PORT: $PORT_PIDS"
  echo "   Stopping processes using these ports..."
  for PID in $PORT_PIDS; do
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
fi

# Start the server
echo "🚀 Starting Easy MCP Server..."
echo "📡 Server will be available at:"
echo "   🌐 REST API: http://localhost:$REST_PORT"
echo "   🤖 AI Server: http://localhost:$MCP_PORT"
echo "   📚 API Docs: http://localhost:$REST_PORT/docs"
echo ""
npx easy-mcp-server

# Keep the script running if server exits
exit $?

