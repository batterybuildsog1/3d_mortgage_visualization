/**
 * AI Mortgage Assistant
 * Connected to Gemini API for intelligent mortgage advice
 */

class MortgageAIAssistant {
  // Constructor now accepts body and inputArea elements, plus initialData
  constructor(bodyContainerElement, inputAreaContainerElement, initialData) {
    this.bodyContainer = bodyContainerElement;
    this.inputAreaContainer = inputAreaContainerElement; // Store the input area container

    if (!this.bodyContainer) {
      console.error(`AI Assistant body container element not provided.`);
      return;
    }
     if (!this.inputAreaContainer) {
      console.error(`AI Assistant input area container element not provided.`);
      return;
    }

    this.dtiData = initialData;
    this.sessionId = this.generateSessionId();
    // Use the absolute URL for the API server running on port 5013
    this.apiEndpoint = 'http://localhost:5013/api/chat';

    // Initialize chat state
    this.state = {
      messages: [
        {
          role: 'assistant',
          content: "Hi there! I'm your mortgage advisor powered by AI. I can help you understand your DTI situation and suggest ways to improve your mortgage eligibility. How can I help you today?"
        }
      ],
      isTyping: false // Used for the "Thinking..." indicator state
    };

    // Render initial UI
    this.render();

    // Initialize event listeners
    this.initEventListeners();

    // Offer initial analysis if we have DTI data
    if (this.dtiData && this.dtiData.calculations) {
      // this.offerInitialAnalysis(); // Let user initiate
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Initialize event listeners (scoped within the rendered content)
   */
  initEventListeners() {
    // Form submission
    const form = this.inputAreaContainer.querySelector('.chat-input-form');
    if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleUserMessage();
        });
    } else {
        console.error("Chat input form not found for event listener.");
    }

    // Quick question buttons
    const quickQuestionsContainer = this.inputAreaContainer.querySelector('.questions-container');
     if (quickQuestionsContainer) {
        quickQuestionsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-question')) {
                this.handleQuickQuestion(e.target.dataset.question);
            }
        });
    } else {
         console.error("Quick questions container not found for event listener.");
    }
  }

  /**
   * Handle sending a user message
   */
  handleUserMessage() {
    const inputEl = this.inputAreaContainer.querySelector('.chat-input-form input[type="text"]');
    if (!inputEl) return;
    const message = inputEl.value.trim();
    if (!message) return;

    this.state.messages.push({ role: 'user', content: message });
    this.renderMessages(); // Render user message
    inputEl.value = '';
    this.processUserMessage(message); // Process after adding user message
  }

  /**
   * Handle quick question button click
   */
  handleQuickQuestion(question) {
    this.state.messages.push({ role: 'user', content: question });
    this.renderMessages(); // Render user message
    this.processUserMessage(question); // Process after adding user message
  }

  /**
   * Add a complete message to the chat state and re-render.
   */
  addMessage(role, content) {
    // Ensure thinking indicator is off before adding final message
    this.showThinkingIndicator(false);
    this.state.messages.push({ role, content });
    this.renderMessages();
  }

  /**
   * Process a user message, initiating a stream and handling incoming chunks.
   */
  async processUserMessage(message) {
    this.showThinkingIndicator(true); // Show "Thinking..."

    try {
      const systemPrompt = this.generateSystemPrompt();
      const payload = {
        sessionId: this.sessionId, message, systemPrompt,
        dtiData: this.dtiData, reset: false
      };

      const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify(payload)
      });

      await this.processFetchStream(response); // Await the stream processing

    } catch (error) {
        console.error('Error initiating chat stream request:', error);
        this.showThinkingIndicator(false);
        this.addMessage('assistant', "Sorry, I couldn't connect to the AI service.");
    }
  }

  /**
   * Helper function to process the streaming response from fetch.
   * @param {Response} response - The fetch Response object.
   */
  async processFetchStream(response) {
    let reader;
    let accumulatedResponse = ''; // Accumulate the full response text
    let currentAssistantMessageElement = null; // Reference to the temporary DOM element

    try {
        if (!response.ok) {
            let errorBody = await response.text();
            try { errorBody = JSON.parse(errorBody); } catch(e) {}
            console.error('API Stream Error Response:', errorBody);
            this.addMessage('assistant', `Sorry, there was an error (${response.status}).`);
            // Thinking indicator hidden in finally block
            return;
        }

        reader = response.body?.getReader();
        if (!reader) {
            this.addMessage('assistant', "Sorry, couldn't read the stream response.");
             // Thinking indicator hidden in finally block
            return;
        }

        // Create the temporary assistant message element in the DOM
        currentAssistantMessageElement = this.createAssistantMessageElement(''); // Start empty
        this.bodyContainer.appendChild(currentAssistantMessageElement);
        this.bodyContainer.scrollTop = this.bodyContainer.scrollHeight;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (value) {
                 buffer += decoder.decode(value, { stream: !done });
                 let lines = buffer.split('\n');
                 buffer = lines.pop() || '';

                 for (const line of lines) {
                     if (line.startsWith('event: end')) {
                         console.log("[Stream] Received end event.");
                         break;
                     } else if (line.startsWith('event: error')) {
                         console.warn("[Stream] Received error event line.");
                         continue;
                     } else if (line.startsWith('data:')) {
                         const dataJson = line.substring(5).trim();
                         if (dataJson) {
                             try {
                                 const data = JSON.parse(dataJson);
                                 if (data.chunk) {
                                     // Append chunk to accumulated text AND update the temporary DOM element
                                     accumulatedResponse += data.chunk;
                                     this.updateAssistantMessageElement(currentAssistantMessageElement, accumulatedResponse);
                                     this.bodyContainer.scrollTop = this.bodyContainer.scrollHeight; // Keep scrolled down
                                 } else if (data.error) {
                                     console.error("[Stream] Received error in data:", data.error);
                                     accumulatedResponse += `\n\n[Error: ${data.error}]`;
                                     this.updateAssistantMessageElement(currentAssistantMessageElement, accumulatedResponse);
                                     break;
                                 }
                             } catch (e) {
                                 console.error("[Stream] Error parsing data JSON:", e, "Data:", dataJson);
                                 accumulatedResponse += "\n\n[Error processing response]";
                                 this.updateAssistantMessageElement(currentAssistantMessageElement, accumulatedResponse);
                                 break;
                             }
                         }
                     }
                 } // End for loop processing lines
                 // REMOVED incorrect break condition: if (line.startsWith('event: end') || line.includes('[Error')) break;
            }

            if (done) {
                console.log("[Stream] Reader finished.");
                break; // Exit outer while loop
            }
        } // End while loop reading stream

        // Add the final accumulated message to the state AFTER the stream is done
        this.state.messages.push({ role: 'assistant', content: accumulatedResponse || "Sorry, I didn't receive a valid response." });
        // Remove the temporary element now that the state has the final message
        if (currentAssistantMessageElement) currentAssistantMessageElement.remove();
        // Re-render everything from state
        this.renderMessages();

    } catch (error) {
        console.error("[Stream] Error reading stream:", error);
        this.addMessage('assistant', "Sorry, a stream reading error occurred.");
        if (currentAssistantMessageElement) currentAssistantMessageElement.remove(); // Clean up temp element on error
    } finally {
        this.showThinkingIndicator(false); // Hide thinking indicator
        console.log("[Stream] Cleaning up reader.");
        if (reader) {
            try { await reader.cancel(); } catch (cancelError) { console.error("[Stream] Error cancelling reader:", cancelError); }
        }
    }
  }

  /**
   * Creates a new assistant message element (without adding to state yet).
   * @param {string} initialContent - The initial content (usually empty).
   * @returns {HTMLElement} The created message element.
   */
  createAssistantMessageElement(initialContent) {
      const messageEl = document.createElement('div');
      messageEl.className = 'message assistant streaming'; // Add 'streaming' class?
      messageEl.innerHTML = `<div class="message-content">${this.formatMessageContent(initialContent)}</div>`;
      return messageEl;
  }

  /**
   * Updates the content of an existing assistant message element.
   * @param {HTMLElement} element - The message element to update.
   * @param {string} newContent - The new full content.
   */
  updateAssistantMessageElement(element, newContent) {
      if (element) {
          const contentEl = element.querySelector('.message-content');
          if (contentEl) {
              contentEl.innerHTML = this.formatMessageContent(newContent);
          }
      }
  }


  /**
   * Shows or hides a dedicated "Thinking..." indicator.
   * @param {boolean} show - Whether to show or hide the indicator.
   */
  showThinkingIndicator(show) {
      this.state.isTyping = show; // Use state flag to control thinking indicator
      this.renderMessages(); // Re-render to show/hide based on state
  }

  /**
   * Update the DTI data used by the assistant.
   * @param {Object} newData - The new DTI data object.
   */
  updateData(newData) {
    if (newData) {
      this.dtiData = { ...(this.dtiData || {}), ...newData };
      console.log('AI Assistant data updated:', this.dtiData);
    }
  }

  /**
   * Generate a system prompt for the AI based on the user's financial data
   */
  generateSystemPrompt() {
    const { calculations, eligibility } = this.dtiData || {};
    let systemPrompt = `
You are the 'Home Finance Assistant', a helpful and knowledgeable chatbot focused on coaching users about mortgages and personal finance to help them achieve homeownership.
Your goal is to:
1. Understand the user's financial situation (based on what they tell you and the provided data).
2. Explain mortgage concepts clearly (e.g., DTI, down payments, closing costs, loan types).
3. Provide actionable advice on improving mortgage qualification factors.
4. Answer user questions related to the mortgage process.
5. Be encouraging and supportive throughout the user's journey.
Do NOT give specific investment or legal advice. Frame your responses as educational coaching and general guidance.
`;
    if (calculations) {
      systemPrompt += `\nThe user's current financial information (use this as context):
- Front-end DTI: ${calculations.frontEndDTI || 'N/A'}% (housing expenses / income)
- Back-end DTI: ${calculations.backEndDTI || 'N/A'}% (all debts / income)
- Monthly Income: $${calculations.totalMonthlyIncome || 'Unknown'}
- Monthly Housing Expenses: $${calculations.totalHousingExpense || 'Unknown'}
- Other Monthly Debts: $${calculations.totalOtherDebts || 'Unknown'}`;
    } else { systemPrompt += "\nNo specific financial calculation data provided yet." }
    if (eligibility) {
      systemPrompt += `\n\nLoan eligibility assessment (use this as context):`;
      Object.entries(eligibility).forEach(([type, data]) => {
        const formattedType = this.formatLoanType(type);
        systemPrompt += `\n- ${formattedType}: ${data.status || 'Unknown'}`;
        if (data.notes) { systemPrompt += ` - ${data.notes}`; }
      });
    } else { systemPrompt += "\nNo specific loan eligibility data provided yet." }
    return systemPrompt;
  }

  /**
   * Format loan type names
   */
  formatLoanType(type) {
    switch(type) {
      case 'fha': return 'FHA Loan';
      case 'va': return 'VA Loan';
      case 'conventional': return 'Conventional Loan';
      case 'freddieMac': return 'Freddie Mac Loan';
      case 'usda': return 'USDA Loan';
      default: return type.toUpperCase();
    }
  }

  /**
   * Generate a fallback response if API call fails
   */
  generateFallbackResponse(message) {
    console.warn("Generating fallback response.");
    const { calculations } = this.dtiData || {};
    if (!calculations) {
      return "I'm having trouble connecting to my knowledge base right now. Please ensure the backend server is running and check the browser console for errors.";
    }
    return `I apologize, but I'm having trouble connecting to my advanced AI capabilities right now. Please check the server logs and browser console for errors.
Based on your DTI ratios (front-end: ${calculations.frontEndDTI || 'N/A'}%, back-end: ${calculations.backEndDTI || 'N/A'}%), I can tell you that ${parseFloat(calculations.backEndDTI) <= 43 ? "you seem to be within standard qualification guidelines for most loan types" : "you may need to work on lowering your DTI to qualify for standard loan programs"}.`;
  }

  /**
   * Set the typing indicator state (dots - currently unused but kept)
   */
  setTyping(isTyping) {
    // This function is not directly used for the main "Thinking..." indicator now
    // It might be repurposed if a dot indicator is added during streaming
    // this.state.isTyping = isTyping;
    // this.renderTypingIndicator();
  }

  /**
   * Offer initial analysis based on DTI data
   */
  offerInitialAnalysis() {
    if (!this.dtiData || !this.dtiData.calculations) return;
    this.processUserMessage("Can you analyze my DTI and tell me about my mortgage options?");
  }

  /**
   * Reset the conversation
   */
  resetConversation() {
    this.sessionId = this.generateSessionId();
    this.state.messages = [
      { role: 'assistant', content: "I've reset our conversation. How can I help you with your mortgage questions today?" }
    ];
    this.renderMessages();
    console.log("Chat conversation reset.");
  }

  /**
   * Render the chat messages from state
   */
  renderMessages() {
    if (!this.bodyContainer) return;

    const messagesHTML = this.state.messages.map(message => `
      <div class="message ${message.role}">
        <div class="message-content">${this.formatMessageContent(message.content)}</div>
      </div>
    `).join('');

    this.bodyContainer.innerHTML = messagesHTML; // Replace content

    // Add thinking indicator if state requires it
    if (this.state.isTyping) { // Check the state flag
        let indicator = this.bodyContainer.querySelector('.thinking-indicator-message');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'message assistant thinking-indicator-message';
            indicator.innerHTML = `<div class="message-content"><i>Assistant is thinking...</i></div>`;
            this.bodyContainer.appendChild(indicator);
        }
        indicator.style.display = 'flex';
    }

    // Scroll to bottom
    this.bodyContainer.scrollTop = this.bodyContainer.scrollHeight;
  }

  /**
   * Render the typing indicator (dots - currently unused)
   */
  renderTypingIndicator() {
     // This function is currently not used for the main "Thinking..." indicator
  }

  /**
   * Format message content with basic markdown-like formatting
   */
  formatMessageContent(content) {
    if (typeof content !== 'string') return '';
    let formatted = content.replace(/\n/g, '<br>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^(\*|\-|\•) (.+)/gm, '<li>$2</li>');
    formatted = formatted.replace(/(?:<br>)?(<li>.*?<\/li>)(?=(?:<br>)?<li>|$)/gs, '$1');
    formatted = formatted.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
    formatted = formatted.replace(/^(\d+)\. (.+)/gm, '<li>$2</li>');
    formatted = formatted.replace(/(?:<br>)?(<li>.*?<\/li>)(?=(?:<br>)?<li>|$)/gs, '$1');
    formatted = formatted.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ol>${match}</ol>`);
    return formatted;
  }

  /**
   * Render the internal components (input form, suggestions) into the inputAreaContainer.
   */
  render() {
    if (!this.bodyContainer || !this.inputAreaContainer) return;

    // Render messages into bodyContainer
    this.renderMessages();

    // Render Input Form and Suggestions into inputAreaContainer
    this.inputAreaContainer.innerHTML = `
      <form class="chat-input-form">
        <input
          type="text"
          placeholder="Ask NEOMORT AI..."
          autocomplete="off"
        >
        <button type="submit" title="Send">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
      <div class="quick-questions">
        <h4>Suggested Questions</h4>
        <div class="questions-container">
          <button class="quick-question" data-question="How can I lower my DTI?">
            How can I lower my DTI?
          </button>
          <button class="quick-question" data-question="Which loan type is best for me?">
            Which loan type is best for me?
          </button>
          <button class="quick-question" data-question="What are compensating factors?">
            What are compensating factors?
          </button>
          <button class="quick-question" data-question="How can I improve my credit score?">
            How can I improve my credit score?
          </button>
        </div>
      </div>
    `;

    // Make input area visible
    this.inputAreaContainer.style.display = 'block';

    // Re-initialize event listeners for the newly rendered elements
    this.initEventListeners();
  }
}

export default MortgageAIAssistant;
