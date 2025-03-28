/**
 * Conventional Loan Calculator
 * 
 * Calculates details for conventional mortgage loans.
 */
import DataService from '../../services/data-service.js';
import { calculateLLPA } from '../adjustments/llpa.js';
import { calculateConventionalMI } from '../adjustments/mi.js';
import { 
  calculateMonthlyPI,
  calculateMaxPurchasePrice,
  calculateAmortization
} from '../utils/loan-utils.js';

/**
 * Conventional loan calculator
 */
class ConventionalLoan {
  /**
   * Calculate conventional loan details
   * @param {Object} inputData - Loan calculation parameters
   * @param {number} inputData.income - Annual income
   * @param {number} inputData.ltv - Loan-to-value ratio
   * @param {number} inputData.ficoScore - Credit score
   * @param {number} inputData.loanTerm - Loan term in years
   * @param {Object} inputData.locationFactors - Location-specific factors
   * @param {number} inputData.hoaFees - Monthly HOA fees
   * @returns {Promise<Object>} Loan calculation results
   */
  async calculateLoan(inputData) {
    const {
      income,
      ltv,
      ficoScore,
      loanTerm = 30,
      locationFactors,
      hoaFees = 0
    } = inputData;
    
    // Get base interest rate
    const baseRate = await this._getBaseRate(loanTerm);
    
    // Calculate LLPA adjustment
    const llpaAdjustment = await this._calculateLLPA({
      ficoScore,
      ltv,
      loanTerm
    });
    
    // Apply LLPA to rate
    const adjustedRate = baseRate + (llpaAdjustment / 100);
    
    // Calculate maximum DTI
    let maxDTI = 0.45; // Standard conventional DTI limit
    
    // Higher DTI for higher credit scores
    if (ficoScore >= 720) {
      maxDTI = 0.50;
    } else if (ficoScore >= 680) {
      maxDTI = 0.45;
    } else {
      maxDTI = 0.43;
    }
    
    // For the initial calculation, estimate mortgage insurance
    let initialMI = 0;
    if (ltv > 80) {
      // Rough estimate based on credit score and LTV
      if (ficoScore >= 760) {
        initialMI = ltv > 95 ? 0.58 : ltv > 90 ? 0.49 : ltv > 85 ? 0.25 : 0;
      } else if (ficoScore >= 740) {
        initialMI = ltv > 95 ? 0.62 : ltv > 90 ? 0.52 : ltv > 85 ? 0.28 : 0;
      } else if (ficoScore >= 720) {
        initialMI = ltv > 95 ? 0.72 : ltv > 90 ? 0.61 : ltv > 85 ? 0.33 : 0;
      } else if (ficoScore >= 700) {
        initialMI = ltv > 95 ? 0.85 : ltv > 90 ? 0.76 : ltv > 85 ? 0.38 : 0;
      } else if (ficoScore >= 680) {
        initialMI = ltv > 95 ? 0.97 : ltv > 90 ? 0.89 : ltv > 85 ? 0.45 : 0;
      } else if (ficoScore >= 660) {
        initialMI = ltv > 95 ? 1.21 : ltv > 90 ? 1.12 : ltv > 85 ? 0.56 : 0;
      } else if (ficoScore >= 640) {
        initialMI = ltv > 95 ? 1.35 : ltv > 90 ? 1.26 : ltv > 85 ? 0.72 : 0;
      } else {
        initialMI = ltv > 95 ? 1.65 : ltv > 90 ? 1.53 : ltv > 85 ? 0.88 : 0;
      }
      
      // Convert percentage to monthly amount (rough estimate on $300k loan)
      initialMI = 300000 * (initialMI / 100) / 12;
    }
    
    // Calculate maximum purchase price
    const maxPurchase = calculateMaxPurchasePrice({
      income,
      maxDTI,
      interestRate: adjustedRate,
      loanTerm,
      downPaymentPercent: 100 - ltv,
      propertyTaxRate: locationFactors.propertyTaxRate,
      insuranceRate: locationFactors.insuranceRate,
      hoaFees,
      monthlyMI: initialMI
    });
    
    // Recalculate mortgage insurance with the actual loan amount
    const mortgageInsurance = await calculateConventionalMI({
      loanAmount: maxPurchase.maxLoanAmount,
      propertyValue: maxPurchase.maxPurchasePrice,
      ltv,
      ficoScore,
      loanTerm
    });
    
    // Calculate principal and interest payment
    const principalAndInterest = calculateMonthlyPI(
      maxPurchase.maxLoanAmount,
      adjustedRate,
      loanTerm
    );
    
    // Calculate taxes and insurance
    const monthlyTaxes = maxPurchase.maxPurchasePrice * (locationFactors.propertyTaxRate / 12);
    const monthlyInsurance = maxPurchase.maxPurchasePrice * (locationFactors.insuranceRate / 12);
    
    // Calculate total monthly payment
    const monthlyPayment = principalAndInterest + 
                          monthlyTaxes + 
                          monthlyInsurance + 
                          mortgageInsurance.monthlyMI + 
                          hoaFees;
    
    // Generate amortization schedule
    const amortizationSchedule = calculateAmortization(
      maxPurchase.maxLoanAmount,
      adjustedRate,
      loanTerm
    );
    
    // Return comprehensive results
    return {
      loanAmount: maxPurchase.maxLoanAmount,
      purchasingPower: maxPurchase.maxPurchasePrice,
      downPayment: maxPurchase.maxPurchasePrice - maxPurchase.maxLoanAmount,
      interestRate: adjustedRate,
      baseRate,
      llpaAdjustment,
      principalAndInterest,
      monthlyPayment,
      monthlyTaxes,
      monthlyInsurance,
      mortgageInsurance: mortgageInsurance.monthlyMI,
      upfrontFee: 0, // Conventional loans don't have upfront fees
      pmiRemovalYear: mortgageInsurance.pmiRemovalYear,
      amortizationSchedule
    };
  }
  
  /**
   * Get base interest rate
   * @param {number} loanTerm - Loan term in years
   * @returns {Promise<number>} Base interest rate
   * @private
   */
  async _getBaseRate(loanTerm) {
    const baseRateData = await DataService.getBaseRates('Conventional');
    return baseRateData.rates[loanTerm] / 100; // Convert from percentage to decimal
  }
  
  /**
   * Calculate LLPA adjustment
   * @param {Object} loanData - Loan data
   * @returns {Promise<number>} LLPA adjustment in percentage points
   * @private
   */
  async _calculateLLPA(loanData) {
    return calculateLLPA({
      loanType: 'Conventional',
      ...loanData
    });
  }
}

export default ConventionalLoan;
