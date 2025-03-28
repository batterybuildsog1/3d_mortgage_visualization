"""
Mortgage AI Assistant Server
Connects to Gemini API for intelligent mortgage advice.
"""

import google.generativeai as genai
import os
import json
import time # For potential delays in streaming
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
import traceback # Import the traceback module

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

# Configure Gemini
genai.configure(api_key=api_key)

# Model configuration
MODEL_NAME = "gemini-1.5-flash" # Using a potentially faster model for streaming
generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
}

# Safety settings
safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]

# Initialize Flask
app = Flask(__name__) # Removed static_folder configuration
CORS(app)  # Enable CORS for all routes

# Chat sessions storage (in-memory for now)
chat_sessions = {}

# --- Removed Static File Serving Routes ---
# The simple python http.server will handle serving frontend files.
# Flask will only handle API routes.

@app.route('/api/chat', methods=['POST'])
def chat_stream():
    """Handle streaming chat API requests"""
    data = request.json
    session_id = data.get('sessionId', 'default')
    user_message = data.get('message', '')
    system_prompt = data.get('systemPrompt', '')
    dti_data = data.get('dtiData', {})
    reset = data.get('reset', False)

    # Define the generator function for streaming
    def generate_stream():
        try:
            # --- Start of indented block ---
            # Initialize or retrieve chat session
            if reset or session_id not in chat_sessions:
                print(f"[Session {session_id}] Initializing new chat session.")
                model = genai.GenerativeModel(
                    model_name=MODEL_NAME,
                    generation_config=generation_config,
                    safety_settings=safety_settings
                )
                chat_session = model.start_chat(history=[])
                chat_sessions[session_id] = {
                    'chat': chat_session,
                    'initialized_with_prompt': False
                }

            session_data = chat_sessions[session_id]
            chat = session_data['chat']

            message_to_send = user_message
            if not session_data['initialized_with_prompt']:
                print(f"[Session {session_id}] Prepending system prompt.")
                message_to_send = f"{system_prompt}\n\nUSER: {user_message}\nASSISTANT:"
                session_data['initialized_with_prompt'] = True

            print(f"[Session {session_id}] Sending message (streaming): {message_to_send[:100]}...")
            response_stream = chat.send_message(message_to_send, stream=True)

            # Yield chunks in Server-Sent Event format
            for chunk in response_stream:
                if chunk.text:
                    sse_data = json.dumps({"chunk": chunk.text})
                    yield f"data: {sse_data}\n\n"
                    # time.sleep(0.01) # Optional small delay

            print(f"[Session {session_id}] Stream finished.")
            # Yield a special event to signal the end
            yield "event: end\ndata: {}\n\n"
            # --- End of indented block ---

        except Exception as e:
            print("--- ERROR IN /api/chat STREAM ---")
            traceback.print_exc()
            print("---------------------------------")
            # Yield an error event
            error_data = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {error_data}\n\n"

    # Return a streaming response using the generator
    return Response(stream_with_context(generate_stream()), mimetype='text/event-stream')


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    # Use the PORT environment variable set by start_dti_server.sh
    port = int(os.environ.get('PORT', 5013)) # Default to 5013 if not set
    print(f"Starting AI API server on http://localhost:{port}")
    print(f"API endpoints: /api/chat (POST) and /api/health (GET)")
    # Make sure debug=True is appropriate for your environment
    app.run(host='0.0.0.0', port=port, debug=True)
