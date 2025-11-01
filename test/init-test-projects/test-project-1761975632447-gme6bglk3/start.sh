#!/bin/bash

# Easy MCP Server Start Script
# This script loads environment variables and starts the server

# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "📄 Loaded environment variables from .env"
fi

# Start the server
echo "🚀 Starting Easy MCP Server..."
npx easy-mcp-server

# Keep the script running if server exits
exit $?
