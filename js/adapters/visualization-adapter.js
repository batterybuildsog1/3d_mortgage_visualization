/**
 * Visualization Adapter
 * 
 * Connects the mortgage calculation engine to the 3D visualization.
 */
import MortgageCalculator from '../engine/calculator.js'; // Corrected path
import { initializeVisualization } from '../visualization/index.js'; // Import the initializer

/**
 * Adapter for connecting mortgage calculations to the 3D visualization
 */
class VisualizationAdapter {
  /**
   * Create a new visualization adapter
   */
  constructor() {
    this.calculator = MortgageCalculator;
    this.lastCalculation = null;
    this.lastMatrix = null;
    this.vizController = null; // Will be injected
  }

  /**
   * Sets the visualization controller instance.
   * @param {object} controller - The visualization controller instance.
   */
  setVisualizationController(controller) {
    console.log("Visualization controller injected into adapter.");
    this.vizController = controller;
  }
  
  /**
   * Update the visualization with calculation results
   * @param {Object} userData - User input data
   * @returns {Promise<Object>} Visualization data
   */
  async updateVisualization(userData) {
    try {
      // Make this instance available globally
      window.visualizationAdapter = this;
      
      // Show loading indicator
      this._showLoading();
      
      // Create a standardized input object for the calculator
      const calculatorInput = {
        income: userData.income || 75000,
        location: userData.location || '',
        ltv: userData.ltv || 95,
        ficoScore: userData.ficoScore || 680,
        loanType: userData.loanType || 'FHA',
        hoaFees: userData.hoaFees || 0,
        loanTerm: userData.loanTerm || 30
      };
      
      console.log('Calculating with input:', calculatorInput);
      
      // Calculate primary scenario
      const result = await this.calculator.calculate(calculatorInput);
      
      // Calculate complete matrix for visualization
      const powerMatrix = await this.calculator.calculatePowerMatrix(calculatorInput);
      
      console.log('Calculation complete, preparing visualization data');
      
      // Format the data for the visualization
      const visualizationData = {
        // Core data for the user's specific scenario
        loanAmount: result.loanAmount || 0,
        totalBorrowingPower: result.loanAmount || 0,
        purchasingPower: result.purchasingPower || 0,
        downPayment: result.downPayment || 0,
        monthlyPayment: result.monthlyPayment || 0,
        interestRate: result.interestRate || 0,
        
        // User parameters
        ficoScore: calculatorInput.ficoScore,
        ltv: calculatorInput.ltv,
        loanType: calculatorInput.loanType,
        
        // Full matrix data for 3D visualization
        powerMatrix: powerMatrix
      };
      
      // Store calculations for later reference
      this.lastCalculation = result;
      this.lastMatrix = powerMatrix;
      
      // Update DOM elements with calculation results
      this._updateResultsDisplay(visualizationData);
      
      // Update the 3D visualization
      this._updateVisualization(visualizationData);
      
      // Update the AI Chat Handler if available
      if (window.aiChatHandler) {
        window.aiChatHandler.updateData(visualizationData);
      }
      
      // Hide loading indicator
      this._hideLoading();
      
      return visualizationData;
    } catch (error) {
      console.error('Error updating visualization:', error);
      
      // Hide loading indicator
      this._hideLoading();
      
      // Show error message
      this._showError(error.message);
      
      throw error;
    }
  }
  
  /**
   * Get the last calculation result
   * @returns {Object|null} Last calculation result
   */
  getLastCalculation() {
    return this.lastCalculation;
  }
  
  /**
   * Get the last power matrix
   * @returns {Array|null} Last power matrix
   */
  getLastMatrix() {
    return this.lastMatrix;
  }
  
  /**
   * Update DOM elements with calculation results
   * @param {Object} data - Visualization data
   * @private
   */
  _updateResultsDisplay(data) {
    // Format currency values
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    });
    
    // Get DOM elements
    const loanAmountEl = document.getElementById('loan-amount');
    const borrowingPowerEl = document.getElementById('borrowing-power');
    const downPaymentEl = document.getElementById('down-payment');
    const monthlyPaymentEl = document.getElementById('monthly-payment');
    const interestRateEl = document.getElementById('interest-rate');
    
    // Update values with animation if elements exist
    if (loanAmountEl) {
      this._animateValue(loanAmountEl, data.loanAmount, formatter);
    }
    
    if (borrowingPowerEl) {
      this._animateValue(borrowingPowerEl, data.totalBorrowingPower, formatter);
    }
    
    if (downPaymentEl) {
      this._animateValue(downPaymentEl, data.downPayment, formatter);
    }
    
    if (monthlyPaymentEl) {
      this._animateValue(monthlyPaymentEl, data.monthlyPayment, formatter);
    }
    
    // Update interest rate (no animation)
    if (interestRateEl) {
      interestRateEl.textContent = `${(data.interestRate * 100).toFixed(2)}%`;
    }
  }
  
  /**
   * Update the 3D visualization
   * @param {Object} data - Visualization data
   * @private
   */
  _updateVisualization(data) {
    // Use the injected controller
    if (this.vizController && typeof this.vizController.update === 'function') {
      this.vizController.update(data);
    } else {
      console.error('Visualization controller has not been set on the adapter or lacks an update method.');
    }
  }
  
  /**
   * Animate a value change
   * @param {HTMLElement} element - DOM element to update
   * @param {number} endValue - Target value
   * @param {Intl.NumberFormat} formatter - Number formatter
   * @private
   */
  _animateValue(element, endValue, formatter) {
    const startValue = 0;
    const duration = 500;
    let startTimestamp = null;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentValue = Math.floor(progress * (endValue - startValue) + startValue);
      
      element.textContent = formatter.format(currentValue);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }
  
  /**
   * Show loading indicator
   * @private
   */
  _showLoading() {
    document.querySelectorAll('.result-value').forEach(el => {
      if (el.id !== 'selected-loan-type') {
        el.classList.add('loading');
      }
    });
  }
  
  /**
   * Hide loading indicator
   * @private
   */
  _hideLoading() {
    document.querySelectorAll('.result-value').forEach(el => {
      el.classList.remove('loading');
    });
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   * @private
   */
  _showError(message) {
    console.error('Calculation Error:', message);
    
    // In a more complete implementation, we could show a toast or modal
    // For now, just log to console
  }
}

// Create and export singleton instance
export default new VisualizationAdapter();
