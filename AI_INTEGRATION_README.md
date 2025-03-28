# DTI Calculator with Gemini Pro 2.5 AI Integration

This implementation connects the DTI Calculator to Google's Gemini Pro 2.5 Experimental model for intelligent mortgage advice and guidance.

## Setup Instructions

### 1. Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher (for serving static files)
- A Gemini API key

### 2. API Key Setup

1. Edit the `.env` file in the project root directory:
   ```
   GEMINI_API_KEY=your_test_api_key_here
   ```
   Replace `your_test_api_key_here` with your actual Gemini API key.

### 3. Install Dependencies

Run the following command to install the required Python packages:

```bash
pip install -r requirements.txt
```

The requirements include:
- Flask (for the API server)
- Flask-CORS (for cross-origin requests)
- google-generativeai (for Gemini API)
- python-dotenv (for loading environment variables)

### 4. Start the Server

You can start the server using the provided shell script:

```bash
chmod +x start_dti_server.sh
./start_dti_server.sh
```

Alternatively, you can start it manually:

```bash
python ai_server.py
```

The server will run on port 5000 by default.

### 5. Access the DTI Calculator

Open your browser and navigate to:
- Standalone calculator: `http://localhost:5000/dti-calculator/index.html`
- Integration example: `http://localhost:5000/dti-integration-example.html`

## Integration Details

### Architecture

1. **Frontend**: JavaScript-based DTI calculator with an AI assistant UI
2. **Backend**: Python Flask server that communicates with the Gemini API
3. **API**: RESTful endpoints for chat functionality

### API Endpoints

- `POST /api/chat`: Send messages to the AI assistant
  - Request payload:
    ```json
    {
      "sessionId": "unique_session_id",
      "message": "User message",
      "systemPrompt": "Context for the AI",
      "dtiData": {
        "calculations": {},
        "eligibility": {}
      },
      "reset": false
    }
    ```
  - Response:
    ```json
    {
      "sessionId": "unique_session_id",
      "response": "AI response text"
    }
    ```

- `GET /api/health`: Health check endpoint

### Files Overview

- `ai_server.py`: Python server that handles API requests to Gemini
- `dti-calculator/js/ai-assistant.js`: JavaScript component for the chat interface
- `.env`: Environment file for storing the API key

## Customization

### System Prompt

The AI assistant generates a system prompt based on the user's DTI data. You can modify the prompt generation in the `generateSystemPrompt()` method in `ai-assistant.js`.

### UI Customization

Adjust the styling in `dti-calculator/css/dti-calculator.css` to match your design needs.

## Troubleshooting

1. **API Connection Issues**:
   - Ensure the API key is correctly set in the `.env` file
   - Check if the server is running on port 5000
   - Look for error messages in the browser console

2. **AI Response Problems**:
   - The assistant will fall back to basic responses if the API call fails
   - Check the server logs for detailed error messages

3. **CORS Errors**:
   - The server includes CORS headers, but you may need to adjust them for your specific setup

## Next Steps

1. **Persistent Chat History**: Currently, chat history is stored in memory. For production, implement database storage for persistent conversations.

2. **Enhanced Error Handling**: Add more robust error handling and retry logic for API calls.

3. **User Authentication**: Add user authentication to secure the API and associate conversations with specific users.

4. **Advanced Conversation Management**: Implement more sophisticated conversation management, such as branching dialogues based on user inputs.

5. **Integration with 3D Visualization**: Further integrate the AI assistant with your 3D mortgage visualization to provide contextual advice based on the visualization state.