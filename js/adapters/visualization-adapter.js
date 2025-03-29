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
   * @param {Object} userData - User input data, potentially including estimatedMaxDTI
   * @returns {Promise<Object>} Visualization data
   */
  async updateVisualization(userData) {
    try {
      // Make this instance available globally
      window.visualizationAdapter = this;

      // Show loading indicator
      this._showLoading();

      // Create a standardized input object for the calculator
      // Exclude estimatedMaxDTI from engine input if it exists
      const { estimatedMaxDTI, ...engineInputData } = userData;
      const calculatorInput = {
        income: engineInputData.income || 75000,
        location: engineInputData.location || '',
        ltv: engineInputData.ltv || 95,
        ficoScore: engineInputData.ficoScore || 680,
        loanType: engineInputData.loanType || 'FHA',
        hoaFees: engineInputData.hoaFees || 0,
        loanTerm: engineInputData.loanTerm || 30,
        purchasePrice: engineInputData.purchasePrice, // Pass purchase price
        overrides: engineInputData.overrides
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
        totalBorrowingPower: result.loanAmount || 0, // Assuming this is correct mapping
        purchasingPower: result.purchasingPower || 0,
        downPayment: result.downPayment || 0,
        monthlyPayment: result.monthlyPayment || 0,
        interestRate: result.interestRate || 0,
        actualDTI: result.dtiRatios?.backend || 0, // Get actual DTI from result

        // User parameters
        ficoScore: calculatorInput.ficoScore,
        ltv: calculatorInput.ltv,
        loanType: calculatorInput.loanType,

        // Estimated DTI from snapshot
        estimatedMaxDTI: estimatedMaxDTI, // Include the estimated DTI

        // Full matrix data for 3D visualization
        powerMatrix: powerMatrix
      };

      // Store calculations for later reference
      this.lastCalculation = result; // Store the full engine result
      this.lastMatrix = powerMatrix;

      // Update DOM elements with calculation results (including estimated DTI)
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
   * @param {Object} data - Visualization data, including estimatedMaxDTI
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
    const dtiValueEl = document.getElementById('dti-value'); // Get the new DTI element

    // Check for overrides affecting monthly payment
    let monthlyPaymentOverridden = false;
    if (this.lastCalculation?.closingCosts?.details) {
        const taxDetails = this.lastCalculation.closingCosts.details['Annual Property Tax'];
        const hoiDetails = this.lastCalculation.closingCosts.details['Annual Homeowners Insurance'];
        if (taxDetails?.isOverridden || hoiDetails?.isOverridden) {
            monthlyPaymentOverridden = true;
        }
    }

    // Update values with animation if elements exist
    if (loanAmountEl) {
      this._animateValue(loanAmountEl, data.loanAmount, formatter);
    }

    if (borrowingPowerEl) {
      // Assuming borrowing power is same as loan amount for now
      this._animateValue(borrowingPowerEl, data.loanAmount, formatter);
    }

    if (downPaymentEl) {
      this._animateValue(downPaymentEl, data.downPayment, formatter);
    }
    if (monthlyPaymentEl) {
      this._animateValue(monthlyPaymentEl, data.monthlyPayment, formatter);
      // Add/remove override indicator class
      if (monthlyPaymentOverridden) {
          monthlyPaymentEl.classList.add('neomort-card__value--overridden');
          monthlyPaymentEl.title = 'Monthly payment calculated using user-provided tax/insurance values.'; // Add tooltip
      } else {
          monthlyPaymentEl.classList.remove('neomort-card__value--overridden');
           monthlyPaymentEl.title = ''; // Remove tooltip
      }
    }

    // Update interest rate (no animation)
    if (interestRateEl) {
      interestRateEl.textContent = `${(data.interestRate * 100).toFixed(2)}%`;
    }

    // Update DTI display (no animation)
    if (dtiValueEl) {
        const actualDtiText = data.actualDTI ? `${(data.actualDTI * 100).toFixed(1)}%` : '--%';
        const estimatedDtiText = data.estimatedMaxDTI ? `${(data.estimatedMaxDTI * 100).toFixed(1)}%` : '--%';
        dtiValueEl.textContent = `${actualDtiText} / ${estimatedDtiText}`;
        // Add tooltip explaining the values
        dtiValueEl.title = `Actual Calculated DTI / Estimated Max DTI based on snapshot`;
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
    const startValue = parseFloat(element.textContent.replace(/[^0-9.-]+/g,"")) || 0; // Start from current displayed value
    const duration = 500; // ms
    let startTimestamp = null;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Linear interpolation
      const currentValue = Math.floor(progress * (endValue - startValue) + startValue);

      element.textContent = formatter.format(currentValue);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
         element.textContent = formatter.format(endValue); // Ensure final value is exact
      }
    };

    window.requestAnimationFrame(step);
  }


  /**
   * Show loading indicator
   * @private
   */
  _showLoading() {
    // Target specific value elements, excluding the DTI one for now as it updates differently
    document.querySelectorAll('#loan-amount, #borrowing-power, #down-payment, #monthly-payment, #interest-rate').forEach(el => {
        el?.classList.add('loading');
    });
     // Clear DTI display during loading
     const dtiValueEl = document.getElementById('dti-value');
     if (dtiValueEl) dtiValueEl.textContent = '--% / --%';
  }

  /**
   * Hide loading indicator
   * @private
   */
  _hideLoading() {
     document.querySelectorAll('.neomort-card__value').forEach(el => {
        el?.classList.remove('loading');
    });
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @private
   */
  _showError(message) {
    console.error('Calculation Error:', message);
    // Update result displays to show 'Error'
     document.querySelectorAll('#loan-amount, #borrowing-power, #down-payment, #monthly-payment, #interest-rate, #dti-value').forEach(el => {
        if(el) el.textContent = 'Error';
    });
  }
}

// Create and export singleton instance
export default new VisualizationAdapter();
