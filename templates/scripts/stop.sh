#!/bin/bash

# Easy MCP Server Stop Script
# This script stops the running server

echo "🛑 Stopping Easy MCP Server..."

# Find and kill the server process
PID=$(ps aux | grep 'easy-mcp-server' | grep -v grep | awk '{print $2}')

if [ -z "$PID" ]; then
  echo "⚠️  No running Easy MCP Server found"
  exit 1
fi

# Kill the process
kill $PID

if [ $? -eq 0 ]; then
  echo "✅ Server stopped successfully (PID: $PID)"
else
  echo "❌ Failed to stop server"
  exit 1
fi

