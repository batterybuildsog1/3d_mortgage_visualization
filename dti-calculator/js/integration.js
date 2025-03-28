/**
 * Integration Script
 * Connects DTI Calculator with 3D Mortgage Visualization
 */

import DTICalculator from './dti-calculator.js';
import MortgageAIAssistant from './ai-assistant.js';

// --- Global AI Chat Initialization & Management ---

let globalAIAssistant = null;
let isChatInitialized = false;
// No longer need isChatExpanded for static layout

/**
 * Finds the static chat elements and initializes the AI Assistant.
 * @param {Object} initialData - Optional initial data for the AI assistant.
 */
export function initializeGlobalChat(initialData = {}) {
  console.log("[Chat Init] initializeGlobalChat called.");

  // Find the static container and its children from index.html
  const staticChatSection = document.getElementById('ai-chat-static-section');
  if (!staticChatSection) {
      console.error("[Chat Init] Static chat section #ai-chat-static-section not found in HTML. Cannot initialize chat.");
      return;
  }

  // Use BEM class names
  const body = staticChatSection.querySelector('.ai-chat__body');
  const inputArea = staticChatSection.querySelector('.ai-chat__input-area');

  if (!body) console.error("[Chat Init] Failed to find .ai-chat__body within static section.");
  if (!inputArea) console.error("[Chat Init] Failed to find .ai-chat__input-area within static section.");

  if (!body || !inputArea) {
      console.error("[Chat Init] Failed to find essential chat elements in static section. Aborting setup.");
      return; // Stop if elements are missing
  }

  // Remove placeholder text if JS is initializing
  const placeholder = body.querySelector('.ai-chat__placeholder'); // Use BEM class
  if (placeholder) placeholder.remove();

  // Initialize or update AI assistant directly into the static elements
  if (!globalAIAssistant) {
      // Only initialize once
      if (staticChatSection.dataset.chatInitialized === 'true') {
          console.log("[Chat Init] Static chat already marked as initialized. Updating data only.");
          if (initialData) globalAIAssistant?.updateData(initialData); // Use optional chaining
          return;
      }
      try {
          console.log("[Chat Init] Initializing MortgageAIAssistant into static elements...");
          // Pass the static body and inputArea elements to the constructor
          // **MODIFICATION**: Need to update MortgageAIAssistant constructor to accept inputArea too
          globalAIAssistant = new MortgageAIAssistant(body, inputArea, initialData);
          staticChatSection.dataset.chatInitialized = 'true'; // Mark as initialized
          isChatInitialized = true;
          console.log('[Chat Init] Global AI Assistant initialized successfully into static elements.');
      } catch (error) {
          console.error('[Chat Init] Error initializing Global AI assistant into static elements:', error);
          body.innerHTML = '<p style="color: red; padding: 10px;">Error loading AI Assistant.</p>';
      }
  } else { // AI Assistant already exists, just update data
      console.log("[Chat Init] Updating AI Assistant data.");
      globalAIAssistant.updateData(initialData);
  }

  // No toggle logic or dynamic container creation/append needed anymore
  console.log('[Chat Init] Static Global Chat UI Initialized/Updated.');
}


// --- DTI Calculator Specific Functions ---

export function initDTICalculator(containerIdOrElement) {
  // Allow passing either ID string or the element itself
  return new DTICalculator(containerIdOrElement);
}

/**
 * Open the DTI calculator in a popup or modal
 * @param {Object} currentMortgageData - Current mortgage data from the 3D visualization
 * @param {Function} onComplete - Callback function to run when calculator completes
 */
export function openDTICalculator(currentMortgageData = {}, onComplete) {
  // Create modal container if it doesn't exist
  let modalContainer = document.getElementById('dti-calculator-modal');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'dti-calculator-modal';
    modalContainer.className = 'dti-modal'; // Use BEM class for modal

    const modalContent = document.createElement('div');
    modalContent.className = 'dti-modal__content'; // Use BEM class

    // Add necessary modal styles if not in CSS
    modalContent.style.width = '90%';
    modalContent.style.maxWidth = '900px';
    modalContent.style.backgroundColor = '#ffffff'; // Use white background for modal content
    modalContent.style.padding = '0'; // Remove padding, header/body/footer will handle it
    modalContent.style.borderRadius = '8px';
    modalContent.style.position = 'relative';
    modalContent.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    modalContent.style.display = 'flex'; // Use flex for layout
    modalContent.style.flexDirection = 'column';
    modalContent.style.maxHeight = '90vh'; // Limit height

    const modalHeader = document.createElement('div');
    modalHeader.className = 'dti-modal__header'; // Use BEM class
    const modalTitle = document.createElement('h3');
    modalTitle.className = 'dti-modal__title'; // Use BEM class
    modalTitle.textContent = 'DTI Calculator';
    const closeButton = document.createElement('button');
    closeButton.className = 'dti-modal__close-button'; // Use BEM class
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
      modalContainer.style.display = 'none';
    };
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    const modalBody = document.createElement('div');
    modalBody.className = 'dti-modal__body'; // Use BEM class
    modalBody.style.overflowY = 'auto'; // Allow body scrolling
    modalBody.style.flexGrow = '1'; // Allow body to take space

    const calculatorContainer = document.createElement('div');
    // Use unique ID for modal instance if needed, or just pass element to constructor
    // calculatorContainer.id = 'dti-calculator-container-modal';

    modalBody.appendChild(calculatorContainer);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    // Footer can be added here if needed:
    // const modalFooter = document.createElement('div');
    // modalFooter.className = 'dti-modal__footer';
    // modalContent.appendChild(modalFooter);

    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);

     // Style the modal overlay if not done in CSS
     modalContainer.style.position = 'fixed';
     modalContainer.style.left = '0';
     modalContainer.style.top = '0';
     modalContainer.style.width = '100%';
     modalContainer.style.height = '100%';
     modalContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
     modalContainer.style.display = 'none'; // Start hidden
     modalContainer.style.zIndex = '1001';
     modalContainer.style.display = 'flex';
     modalContainer.style.alignItems = 'center';
     modalContainer.style.justifyContent = 'center';
  }

  // Show the modal
  modalContainer.style.display = 'flex';

  // Initialize DTI calculator inside the modal body's specific div
  const calculatorContainerInModal = modalContainer.querySelector('.dti-modal__body > div'); // Find the container div
  const calculator = initDTICalculator(calculatorContainerInModal); // Pass the element itself

  // Pre-fill the calculator with current mortgage data if available
  if (currentMortgageData) {
    if (currentMortgageData.monthlyIncome) {
      // Assuming DTI calculator state uses annual income
      calculator.state.income.primary = currentMortgageData.monthlyIncome * 12;
    }
     if (currentMortgageData.hoa) {
       calculator.state.housingExpenses.hoa = currentMortgageData.hoa;
     }
     if (currentMortgageData.loanAmount) {
         calculator.state.loanDetails.loanAmount = currentMortgageData.loanAmount;
     }
     if (currentMortgageData.interestRate) {
         calculator.state.loanDetails.interestRate = currentMortgageData.interestRate * 100; // Assuming rate is decimal
     }
     if (currentMortgageData.ltv) {
         calculator.state.loanDetails.ltv = currentMortgageData.ltv;
         calculator.state.loanDetails.downPayment = 100 - currentMortgageData.ltv;
     }
     if (currentMortgageData.ficoScore) {
         // Map score to range if necessary, or just use the score if state supports it
         // For now, assuming state uses ranges like the form
         const score = currentMortgageData.ficoScore;
         let scoreRange = 'below-580';
         if (score >= 760) scoreRange = '760+';
         else if (score >= 740) scoreRange = '740-759';
         else if (score >= 720) scoreRange = '720-739';
         else if (score >= 700) scoreRange = '700-719';
         else if (score >= 680) scoreRange = '680-699';
         else if (score >= 660) scoreRange = '660-679';
         else if (score >= 640) scoreRange = '640-659';
         else if (score >= 620) scoreRange = '620-639';
         else if (score >= 580) scoreRange = '580-619';
         calculator.state.creditInfo.score = scoreRange;
     }
    calculator.render(); // Re-render with updated data
    calculator.calculateDTIRatios(); // Recalculate DTI based on pre-filled data
    calculator.showResults(); // Show results immediately
  }

  // Ensure global chat is initialized/updated when modal opens
  // Pass calculator data from the modal's calculator instance
  const initialAIData = calculator ? {
      calculations: calculator.state.calculations,
      eligibility: calculator.state.eligibility
  } : {};
  initializeGlobalChat(initialAIData); // Call to potentially update data in the static chat

  // Add callback for when calculation is complete
  if (onComplete && typeof onComplete === 'function') {
    // Find the calculate button within the modal's calculator instance
    const calculateBtnInModal = calculator.container.querySelector('#calculate-dti-btn');
    if (calculateBtnInModal) {
        calculateBtnInModal.addEventListener('click', () => {
            // Calculation happens internally, then we call the callback
            onComplete(calculator.state);
            // Update AI chat data again after calculation
            initializeGlobalChat({
                calculations: calculator.state.calculations,
                eligibility: calculator.state.eligibility
            });
            // Optionally close modal after calculation?
            // modalContainer.style.display = 'none';
        });
    }
  }

  return calculator;
}

/**
 * Adds a DTI Calculator button to the 3D visualization panel header
 * @param {string} targetSelector - CSS selector for the panel header to add the button to
 * @param {Object} currentMortgageData - Current mortgage data
 * @param {Function} onDTICalculated - Callback function for when DTI is calculated
 */
export function addDTICalculatorButton(targetSelector, currentMortgageData = {}, onDTICalculated) {
  const targetContainer = document.querySelector(targetSelector);

  if (!targetContainer) {
    console.error(`DTI Button Target container not found: ${targetSelector}`);
    return;
  }

  // Create the button
  const button = document.createElement('button');
  button.innerText = 'DTI Calc'; // Shorter text?
  // Use BEM classes consistent with visualization controls
  button.className = 'neomort-viz-controls__button dti-calculator-button'; // Add specific class if needed
  button.title = 'Open DTI Calculator';

  // Add button click handler
  button.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent panel interactions if any
    // Get potentially updated mortgage data before opening
    const latestMortgageData = typeof window.visualizationAdapter?.getLastCalculation === 'function'
                               ? window.visualizationAdapter.getLastCalculation()
                               : currentMortgageData;
    openDTICalculator(latestMortgageData, onDTICalculated);
  });

  // Add the button to the target container
  targetContainer.appendChild(button);

  return button;
}
