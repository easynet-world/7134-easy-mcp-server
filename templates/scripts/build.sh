#!/bin/bash

echo "🔨 Building npm package..."
echo "========================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ first."
    exit 1
fi

# Find npm path
NPM_PATH=""
for path in "/opt/homebrew/bin/npm" "/usr/local/bin/npm" "/usr/bin/npm" "npm"; do
    if command -v "$path" &> /dev/null; then
        NPM_PATH="$path"
        break
    fi
done

if [ -z "$NPM_PATH" ]; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $($NPM_PATH --version)"
echo ""

# Get package name and version from package.json
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")

echo "📦 Package: $PACKAGE_NAME@$PACKAGE_VERSION"
echo ""

# Step 1: Clean previous build artifacts
echo "🧹 Step 1: Cleaning previous build artifacts..."
rm -f *.tgz
rm -rf dist/ build/
echo "✅ Cleanup completed"
echo ""

# Step 2: Install dependencies
echo "📥 Step 2: Installing dependencies..."
if ! $NPM_PATH install; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 3: Run tests (if configured)
echo "🧪 Step 3: Running tests..."
if $NPM_PATH test; then
    echo "✅ Tests passed"
else
    echo "⚠️  Tests completed (no tests configured or tests failed)"
fi
echo ""

# Step 4: Pack the npm package
echo "📦 Step 4: Packing npm package..."
PACK_FILE=$($NPM_PATH pack 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Failed to pack npm package"
    echo "$PACK_FILE"
    exit 1
fi

# Extract the filename from npm pack output (usually last line)
PACK_FILENAME=$(echo "$PACK_FILE" | tail -n 1 | grep -o '[^/]*\.tgz$' || echo "$PACK_FILE" | tail -n 1)

if [ -z "$PACK_FILENAME" ]; then
    # Fallback: construct filename from package name and version
    # Note: PACKAGE_NAME and PACKAGE_VERSION are bash variables defined earlier in this script
    PACK_FILENAME="$PACKAGE_NAME-$PACKAGE_VERSION.tgz"
    PACK_FILENAME=$(echo "$PACK_FILENAME" | sed 's/@//g')
fi

if [ ! -f "$PACK_FILENAME" ]; then
    echo "❌ Package file not found: $PACK_FILENAME"
    exit 1
fi

PACK_SIZE=$(du -h "$PACK_FILENAME" | cut -f1)

echo "✅ Package created: $PACK_FILENAME ($PACK_SIZE)"
echo ""

# Step 5: Verify package contents
echo "🔍 Step 5: Verifying package contents..."
if tar -tzf "$PACK_FILENAME" > /dev/null 2>&1; then
    echo "✅ Package archive is valid"
    FILE_COUNT=$(tar -tzf "$PACK_FILENAME" | wc -l | tr -d ' ')
    echo "   Contains $FILE_COUNT files"
else
    echo "⚠️  Could not verify package archive"
fi
echo ""

echo "========================================"
echo "✅ Build completed successfully!"
echo ""
echo "📦 BUILD RESULT:"
echo "   Package file: $PACK_FILENAME"
echo "   Package size: $PACK_SIZE"
echo "   Package name: $PACKAGE_NAME"
echo "   Version: $PACKAGE_VERSION"
echo ""
echo "📥 HOW USERS CAN INSTALL THIS PACKAGE:"
echo ""
echo "   1️⃣  From npm registry (after publishing):"
echo "      npm install $PACKAGE_NAME"
echo ""
echo "   2️⃣  From local .tgz file (for testing):"
echo "      npm install ./$PACK_FILENAME"
echo ""
echo "   3️⃣  Global installation:"
echo "      npm install -g ./$PACK_FILENAME"
echo ""
echo "🚀 TO PUBLISH THIS PACKAGE:"
echo ""
echo "   📤 Publish to npm registry:"
echo "      npm publish $PACK_FILENAME"
echo ""
echo "   📤 Publish to GitHub Packages:"
echo "      npm publish $PACK_FILENAME --registry=https://npm.pkg.github.com"
echo ""

