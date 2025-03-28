/**
 * Loan Factory
 * 
 * Factory class for creating loan calculator instances based on loan type.
 */
import ConventionalLoan from './conventional-loan.js';
import FHALoan from './fha-loan.js';
import VALoan from './va-loan.js';
import USDALoan from './usda-loan.js';

/**
 * Factory for creating loan calculator instances
 */
class LoanFactory {
  /**
   * Create a loan calculator for the specified loan type
   * @param {string} loanType - Loan type (Conventional, FHA, VA, USDA)
   * @returns {Object} Loan calculator instance
   */
  createLoanCalculator(loanType) {
    switch(loanType) {
      case 'Conventional':
        return new ConventionalLoan();
      case 'FHA':
        return new FHALoan();
      case 'VA':
        return new VALoan();
      case 'USDA':
        return new USDALoan();
      default:
        throw new Error(`Unknown loan type: ${loanType}`);
    }
  }
}

export default LoanFactory;
