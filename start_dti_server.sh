#!/bin/bash

# Start the AI API server and a simple HTTP server for frontend files

# --- Configuration ---
API_PORT=5013
HTTP_PORT=8000
PROJECT_ROOT=$(pwd) # Get current directory

# --- Helper Functions ---
cleanup() {
    echo "Stopping servers..."
    # Kill processes using the specified ports, if they exist
    API_PID=$(lsof -ti:${API_PORT})
    HTTP_PID=$(lsof -ti:${HTTP_PORT})

    if [ -n "$API_PID" ]; then
        echo "Killing API server (PID: $API_PID)..."
        kill $API_PID
    fi
     if [ -n "$HTTP_PID" ]; then
        echo "Killing HTTP server (PID: $HTTP_PID)..."
        kill $HTTP_PID
    fi
    # Deactivate virtual environment if active
    if type deactivate &> /dev/null; then
        deactivate
    fi
    echo "Cleanup complete."
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# --- Prerequisites Check ---
# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not found. Please install Python 3."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "pip3 is required but not found. Please install pip3."
    exit 1
fi

# --- Virtual Environment and Dependencies ---
# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then echo "Failed to create virtual environment."; exit 1; fi
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "Installing dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then echo "Failed to install dependencies."; exit 1; fi

# --- Environment Variables ---
# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "ERROR: .env file not found. Please create a .env file with your GEMINI_API_KEY."
    echo "Example: GEMINI_API_KEY=your_api_key_here"
    exit 1
fi

# --- Start Servers ---
# Start the Flask API server (ai_server.py) in the background
echo "Starting AI API server on port ${API_PORT}..."
PORT=${API_PORT} python ai_server.py &
API_SERVER_PID=$!
sleep 2 # Give it a moment to start

# Start the simple HTTP server for frontend files in the background
echo "Starting HTTP server for frontend files on port ${HTTP_PORT}..."
python3 -m http.server ${HTTP_PORT} &
HTTP_SERVER_PID=$!
sleep 1 # Give it a moment

# --- Open Browser ---
FRONTEND_URL="http://localhost:${HTTP_PORT}/index.html"
echo "Opening frontend in browser: ${FRONTEND_URL}"

# Open the browser based on the operating system
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "${FRONTEND_URL}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "${FRONTEND_URL}"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    start "" "${FRONTEND_URL}" # Use start command correctly on Windows
else
    echo "Please open ${FRONTEND_URL} in your browser"
fi

# --- Keep Script Running ---
echo ""
echo "AI API Server running on http://localhost:${API_PORT}"
echo "Frontend available at http://localhost:${HTTP_PORT}"
echo "Press Ctrl+C to stop both servers."

# Wait indefinitely until Ctrl+C is pressed
wait $API_SERVER_PID $HTTP_SERVER_PID
