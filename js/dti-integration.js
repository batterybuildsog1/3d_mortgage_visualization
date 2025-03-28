/**
 * DTI Calculator Integration Module
 * 
 * Integrates the DTI calculator with the main mortgage visualization app.
 */

// Import necessary functions from dti-calculator/js/integration.js
import { addDTICalculatorButton, openDTICalculator } from '../dti-calculator/js/integration.js';

/**
 * Initialize the DTI calculator integration
 * @param {Object} visualizationAdapter - The visualization adapter instance
 */
export function initDTICalculatorIntegration(visualizationAdapter) {
  console.log('Initializing DTI Calculator integration');
  
  // Add DTI calculator button to the form container, styled to match
  const targetSelector = '.neomort-form'; // Updated BEM class
  
  // Create button with cyberpunk styling that matches the main UI
  const button = document.createElement('button');
  button.innerText = 'CALCULATE DTI RATIO';
  button.id = 'dti-calculator-button';
  button.className = 'calculate-btn dti-btn';
  button.style.marginTop = '15px';
  button.style.backgroundColor = 'var(--accent-pink)';
  
  // Add button to container
  const container = document.querySelector(targetSelector);
  if (container) {
    container.appendChild(button);
    
    // Add click handler
    button.addEventListener('click', () => {
      // Get current mortgage data from visualization adapter
      const lastCalculation = visualizationAdapter.getLastCalculation();
      
      if (!lastCalculation) {
        console.warn('No calculation data available for DTI calculator');
        openDTICalculator();
        return;
      }
      
      // Prepare mortgage data for DTI calculator
      const mortgageData = {
        monthlyIncome: lastCalculation.monthlyIncome || lastCalculation.income / 12,
        monthlyPayment: lastCalculation.monthlyPayment,
        propertyTaxes: lastCalculation.propertyTaxes,
        homeInsurance: lastCalculation.homeInsurance,
        hoa: lastCalculation.hoaDues
      };
      
      // Define callback for when DTI is calculated
      const onDTICalculated = (dtiState) => {
        console.log('DTI calculation complete:', dtiState);
        
        // Here you could update the main UI with the DTI calculation results
        // For example, updating the DTI display in the results panel
        const dtiElement = document.querySelector('.result-mini-card:nth-child(3) .result-value');
        if (dtiElement && dtiState.calculations && dtiState.calculations.backEndDTI) {
          dtiElement.textContent = `${dtiState.calculations.backEndDTI}%`;
        }
      };
      
      // Open DTI calculator with current mortgage data
      openDTICalculator(mortgageData, onDTICalculated);
    });
    
    // Add modal styles to the document
    addDTIModalStyles();
    
    console.log('DTI Calculator button added to interface');
  } else {
    console.error(`Target container not found: ${targetSelector}`);
  }
}

/**
 * Add CSS styles for the DTI calculator modal
 */
function addDTIModalStyles() {
  // Add some basic styles for the modal
  const styles = `
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      z-index: 1000;
      overflow: auto;
      backdrop-filter: blur(5px);
      align-items: center;
      justify-content: center;
    }
    
    .modal-content {
      position: relative;
      background-color: #1a1a1a;
      margin: 50px auto;
      padding: 25px;
      border: 2px solid var(--accent-cyan);
      border-radius: 10px;
      box-shadow: 0 0 20px var(--accent-cyan);
      max-width: 900px;
      width: 90%;
      color: #fff;
      font-family: 'Courier New', monospace;
    }
    
    .close-button {
      color: var(--accent-pink);
      font-size: 28px;
      font-weight: bold;
      position: absolute;
      right: 20px;
      top: 10px;
      transition: all 0.2s ease;
      background: none;
      border: none;
      cursor: pointer;
    }
    
    .close-button:hover {
      color: white;
      text-shadow: 0 0 10px var(--accent-pink);
    }
    
    .dti-btn {
      background-color: var(--accent-pink);
      border: none;
      transition: all 0.3s ease;
    }
    
    .dti-btn:hover {
      background-color: #f472b6;
      box-shadow: 0 0 15px rgba(236, 72, 153, 0.5);
    }
  `;
  
  // Add styles to document head
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
