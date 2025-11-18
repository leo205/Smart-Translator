#!/bin/bash
# Script to start the frontend server

cd "$(dirname "$0")"
echo "Starting frontend server"
echo "Frontend available at: http://localhost:5500"
echo "Press Ctrl+C to stop"
echo ""
python3 -m http.server 5500

