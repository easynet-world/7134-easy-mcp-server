#!/bin/bash

# ========================================
# easy-mcp-server Stop Script
# AI-Era Express Server Stop Script
# ========================================

echo "🛑 Stopping easy-mcp-server..."
echo "================================"

# Find and kill easy-mcp-server processes
PIDS=$(pgrep -f "easy-mcp-server" 2>/dev/null || true)

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
    REMAINING=$(pgrep -f "easy-mcp-server" 2>/dev/null || true)
    if [ ! -z "$REMAINING" ]; then
        echo "⚠️  Force killing remaining processes..."
        for PID in $REMAINING; do
            kill -KILL $PID 2>/dev/null || true
        done
    fi
    
    echo "✅ easy-mcp-server stopped"
fi

# Also kill any node processes that might be related
NODE_PIDS=$(pgrep -f "node.*easy-mcp-server" 2>/dev/null || true)
if [ ! -z "$NODE_PIDS" ]; then
    echo "🔍 Found related Node.js processes: $NODE_PIDS"
    for PID in $NODE_PIDS; do
        kill -TERM $PID 2>/dev/null || true
    done
fi

echo "✅ All easy-mcp-server processes stopped"
