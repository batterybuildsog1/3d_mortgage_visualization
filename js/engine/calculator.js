/**
 * Mortgage Calculator
 * 
 * Main calculator engine for mortgage calculations.
 */
import DataService from '../services/data-service.js';
import LoanFactory from './loan-types/loan-factory.js';
import { calculateEligibility } from './utils/eligibility.js';

/**
 * Main mortgage calculator class
 */
class MortgageCalculator {
  /**
   * Create a new mortgage calculator
   */
  constructor() {
    this.dataService = DataService;
    this.loanFactory = new LoanFactory();
    this.calculationCache = new Map();
  }
  
  /**
   * Calculate mortgage details for the given input parameters
   * @param {Object} userInput - User input parameters
   * @param {number} userInput.income - Annual income
   * @param {string} userInput.location - Property location
   * @param {number} userInput.ltv - Loan-to-value ratio (percentage)
   * @param {number} userInput.ficoScore - Credit score
   * @param {string} userInput.loanType - Loan type (Conventional, FHA, VA, USDA)
   * @param {number} [userInput.hoaFees=0] - Monthly HOA fees
   * @param {number} [userInput.loanTerm=30] - Loan term in years
   * @returns {Promise<Object>} Calculation results
   */
  async calculate(userInput) {
    try {
      // Validate input parameters
      this._validateInput(userInput);
      
      // Extract input params
      const { 
        income, 
        location, 
        ltv, 
        ficoScore, 
        loanType, 
        hoaFees = 0,
        loanTerm = 30
      } = userInput;
      
      // Check if we have cached results for this input
      const cacheKey = this._getCacheKey(userInput);
      if (this.calculationCache.has(cacheKey)) {
        return this.calculationCache.get(cacheKey);
      }
      
      // Check eligibility for selected loan type
      const eligibility = calculateEligibility(loanType, userInput);
      
      if (!eligibility.eligible) {
        return {
          eligible: false,
          reason: eligibility.reason,
          alternativeLoanTypes: eligibility.alternatives,
          ficoScore,
          ltv,
          loanType
        };
      }
      
      // Get location factors (property tax, insurance)
      const locationFactors = await this.dataService.estimateLocationFactors(location);
      
      // Create loan calculator instance for the specific loan type
      const loanCalculator = this.loanFactory.createLoanCalculator(loanType);
      
      // Calculate loan details
      const loanDetails = await loanCalculator.calculateLoan({
        income,
        ltv,
        ficoScore,
        loanTerm,
        locationFactors,
        hoaFees
      });
      
      // Add the input parameters to the results
      const results = {
        eligible: true,
        ficoScore,
        ltv,
        loanType,
        ...loanDetails
      };
      
      // Cache the results
      this.calculationCache.set(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Error in mortgage calculation:', error);
      throw new CalculationError('Failed to calculate mortgage details', { cause: error });
    }
  }
  
  /**
   * Calculate multiple scenarios for the 3D visualization
   * @param {Object} baseInput - Base input parameters
   * @returns {Promise<Array>} Array of calculation results for different scenarios
   */
  async calculatePowerMatrix(baseInput) {
    // Define the FICO and LTV ranges for the grid
    const ficoScores = [580, 620, 660, 700, 740, 780, 820];
    
    // Use loan-type specific LTV ranges
    let ltvValues;
    if (baseInput.loanType === 'VA' || baseInput.loanType === 'USDA') {
      // VA and USDA can go up to 100% LTV
      ltvValues = [70, 75, 80, 85, 90, 95, 100];
    } else if (baseInput.loanType === 'FHA') {
      // FHA typically goes up to 96.5%
      ltvValues = [70, 75, 80, 85, 90, 95, 96.5];
    } else {
      // Conventional
      ltvValues = [70, 75, 80, 85, 90, 95, 97];
    }
    
    const results = [];
    
    // Calculate for each combination
    for (const ficoScore of ficoScores) {
      for (const ltv of ltvValues) {
        const input = {
          ...baseInput,
          ficoScore,
          ltv
        };
        
        try {
          const result = await this.calculate(input);
          
          results.push({
            ficoScore,
            ltv,
            loanType: baseInput.loanType,
            purchasingPower: result.eligible ? result.purchasingPower : 0,
            monthlyPayment: result.eligible ? result.monthlyPayment : 0,
            interestRate: result.eligible ? result.interestRate : 0,
            downPayment: result.eligible ? result.downPayment : 0,
            eligible: result.eligible,
            reason: result.eligible ? null : result.reason
          });
        } catch (error) {
          console.error(`Error calculating for FICO ${ficoScore}, LTV ${ltv}:`, error);
          
          results.push({
            ficoScore,
            ltv,
            loanType: baseInput.loanType,
            purchasingPower: 0,
            eligible: false,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Validate user input
   * @param {Object} input - User input
   * @private
   */
  _validateInput(input) {
    const { income, ltv, ficoScore, loanType } = input;
    
    // Validate income
    if (typeof income !== 'number' || income <= 0) {
      throw new Error('Income must be a positive number');
    }
    
    // Validate LTV
    if (typeof ltv !== 'number' || ltv < 50 || ltv > 100) {
      throw new Error('LTV must be a number between 50 and 100');
    }
    
    // Validate FICO score
    if (typeof ficoScore !== 'number' || ficoScore < 500 || ficoScore > 850) {
      throw new Error('FICO score must be a number between 500 and 850');
    }
    
    // Validate loan type
    const validLoanTypes = ['Conventional', 'FHA', 'VA', 'USDA'];
    if (!validLoanTypes.includes(loanType)) {
      throw new Error(`Invalid loan type: ${loanType}. Must be one of: ${validLoanTypes.join(', ')}`);
    }
  }
  
  /**
   * Generate cache key for input parameters
   * @param {Object} input - Input parameters
   * @returns {string} Cache key
   * @private
   */
  _getCacheKey(input) {
    const { income, ltv, ficoScore, loanType, loanTerm = 30, hoaFees = 0 } = input;
    return `${loanType}_${income}_${ltv}_${ficoScore}_${loanTerm}_${hoaFees}`;
  }
  
  /**
   * Clear the calculation cache
   */
  clearCache() {
    this.calculationCache.clear();
  }
}

/**
 * Custom error class for calculation errors
 */
class CalculationError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'CalculationError';
  }
}

// Create and export singleton instance
export default new MortgageCalculator();
