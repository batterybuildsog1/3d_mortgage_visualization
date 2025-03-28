/**
 * AI Chat Handler
 * 
 * Manages the AI chat interface for the mortgage calculator
 */

import { initAIAssistant } from '/dti-calculator/js/integration.js';

export default class AIChatHandler {
  /**
   * Initialize the AI Chat handler
   * @param {Object} visualizationAdapter - The visualization adapter instance
   */
  constructor(visualizationAdapter) {
    this.visualizationAdapter = visualizationAdapter;
    this.aiAssistant = null;
    this.chatContainer = null;
    this.minimized = true;
    this.lastScrollPosition = 0;
    
    // Create and inject the chat container
    this.createChatContainer();
    
    // Initialize scroll detection
    this.initScrollDetection();
    
    console.log('AI Chat Handler initialized');
  }
  
  /**
   * Create and inject the chat container
   */
  createChatContainer() {
    // Create the main container
    this.chatContainer = document.createElement('div');
    this.chatContainer.id = 'ai-chat-container';
    this.chatContainer.className = 'ai-chat-container minimized';
    
    // Create the chat content
    this.chatContainer.innerHTML = `
      <div class="ai-chat-header">
        <div class="ai-chat-title">NEOMORT AI ASSISTANT</div>
        <div class="ai-chat-controls">
          <button class="ai-chat-toggle">
            <span class="expand-icon">+</span>
            <span class="collapse-icon">-</span>
          </button>
        </div>
      </div>
      <div class="ai-chat-body">
        <div id="ai-assistant-chat-container"></div>
      </div>
    `;
    
    // Add the container to the document
    document.body.appendChild(this.chatContainer);
    
    // Add event listener for toggle button
    const toggleButton = this.chatContainer.querySelector('.ai-chat-toggle');
    toggleButton.addEventListener('click', () => this.toggleChat());
    
    // Add event listener for header click
    const header = this.chatContainer.querySelector('.ai-chat-header');
    header.addEventListener('click', (e) => {
      if (e.target !== toggleButton && !toggleButton.contains(e.target)) {
        this.toggleChat();
      }
    });
    
    // Add chat styles
    this.addChatStyles();
  }
  
  /**
   * Toggle chat expanded/minimized state
   */
  toggleChat() {
    this.minimized = !this.minimized;
    
    if (this.minimized) {
      this.chatContainer.classList.add('minimized');
      this.chatContainer.classList.remove('expanded');
    } else {
      this.chatContainer.classList.remove('minimized');
      this.chatContainer.classList.add('expanded');
      
      // Initialize AI assistant if not already done
      if (!this.aiAssistant) {
        this.initializeAIAssistant();
      }
    }
  }
  
  /**
   * Initialize the AI assistant component
   */
  initializeAIAssistant() {
    // Get calculation data from the visualization adapter
    const calculationData = this.visualizationAdapter.getLastCalculation();
    
    // Initialize AI assistant
    this.aiAssistant = initAIAssistant('ai-assistant-chat-container', {
      calculations: {
        totalMonthlyIncome: calculationData ? calculationData.income / 12 : 0,
        totalHousingExpense: calculationData ? calculationData.monthlyPayment : 0
      }
    });
    
    console.log('AI Assistant initialized');
  }
  
  /**
   * Initialize scroll detection to show chat on scroll
   */
  initScrollDetection() {
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY || document.documentElement.scrollTop;
      
      // Show chat when scrolled down a bit
      if (currentScroll > 200 && this.chatContainer.style.display !== 'flex') {
        this.chatContainer.style.display = 'flex';
      }
      
      // Remember last scroll position
      this.lastScrollPosition = currentScroll;
    });
  }
  
  /**
   * Add CSS styles for the chat interface
   */
  addChatStyles() {
    const styles = `
      .ai-chat-container {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #111827;
        display: none;
        flex-direction: column;
        border-top: 2px solid var(--accent-cyan);
        box-shadow: 0 -5px 15px rgba(0, 0, 0, 0.5);
        z-index: 100;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      
      .ai-chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        background: linear-gradient(90deg, #111827, #1f2937);
        cursor: pointer;
      }
      
      .ai-chat-title {
        color: var(--accent-cyan);
        font-weight: bold;
        font-family: 'Courier New', monospace;
        letter-spacing: 1px;
      }
      
      .ai-chat-controls button {
        background: none;
        border: 1px solid var(--accent-cyan);
        color: var(--accent-cyan);
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .ai-chat-controls button:hover {
        background: rgba(6, 182, 212, 0.2);
      }
      
      .ai-chat-body {
        padding: 15px;
        max-height: 400px;
        overflow-y: auto;
      }
      
      /* State styles */
      .ai-chat-container.minimized {
        max-height: 44px;
      }
      
      .ai-chat-container.minimized .ai-chat-body {
        display: none;
      }
      
      .ai-chat-container.expanded {
        max-height: 500px;
      }
      
      .ai-chat-container.minimized .expand-icon,
      .ai-chat-container.expanded .collapse-icon {
        display: inline;
      }
      
      .ai-chat-container.minimized .collapse-icon,
      .ai-chat-container.expanded .expand-icon {
        display: none;
      }
      
      /* Responsive styles */
      @media (max-width: 768px) {
        .ai-chat-container.expanded {
          max-height: 300px;
        }
        
        .ai-chat-body {
          max-height: 250px;
        }
      }
    `;
    
    // Add styles to document head
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
  }
  
  /**
   * Update the AI assistant with new data
   * @param {Object} data - Calculation data
   */
  updateData(data) {
    if (this.aiAssistant && data) {
      // Format data for the AI assistant
      const aiData = {
        calculations: {
          totalMonthlyIncome: data.income / 12,
          totalHousingExpense: data.monthlyPayment
        },
        loanDetails: {
          loanType: data.loanType,
          interestRate: data.interestRate,
          loanAmount: data.loanAmount,
          purchasingPower: data.purchasingPower
        }
      };
      
      // Update AI assistant (if it has an updateData method)
      if (this.aiAssistant.updateData) {
        this.aiAssistant.updateData(aiData);
      }
    }
  }
}
