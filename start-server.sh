#!/bin/bash

# Dynamic server startup script for synthetic-data-generator
# This script automatically finds and starts the server from the correct directory

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're in the correct project structure
if [ -d "$SCRIPT_DIR/synthetic-data-generator" ]; then
    echo "Starting server from: $SCRIPT_DIR/synthetic-data-generator"
    cd "$SCRIPT_DIR/synthetic-data-generator"
    
    # Check if server.js exists
    if [ -f "server.js" ]; then
        echo "Found server.js, starting Node.js server..."
        node server.js
    else
        echo "Error: server.js not found in synthetic-data-generator directory"
        exit 1
    fi
else
    echo "Error: synthetic-data-generator directory not found"
    echo "Make sure you're running this script from the project root directory"
    exit 1
fi
