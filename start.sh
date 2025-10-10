#!/bin/bash

# ========================================
# easy-mcp-server Start Script
# AI-Era Express Server Start Script
# ========================================

echo "🚀 Starting easy-mcp-server..."
echo "================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Check if easy-mcp-server is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ Starting AI-era Express Server..."
echo ""
echo "📡 Server will be available at:"
echo "   🌐 REST API: http://localhost:8887"
echo "   🤖 AI Server: http://localhost:8888"
echo "   📚 API Docs: http://localhost:8887/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
echo "🚀 Starting with: npx easy-mcp-server"
npx easy-mcp-server
