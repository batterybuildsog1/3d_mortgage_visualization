/**
 * FHA Loan Calculator
 * 
 * Calculates details for FHA mortgage loans.
 */
import DataService from '../../services/data-service.js';
import { calculateFHAMI } from '../adjustments/mi.js';
import { 
  calculateMonthlyPI,
  calculateMaxPurchasePrice,
  calculateAmortization
} from '../utils/loan-utils.js';

/**
 * FHA loan calculator
 */
class FHALoan {
  /**
   * Calculate FHA loan details
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
    
    // Apply credit score adjustment to rate
    const adjustedRate = this._adjustRateForCreditScore(baseRate, ficoScore);
    
    // Calculate maximum DTI
    // FHA allows up to 43% DTI standard, up to 50% with compensating factors
    let maxDTI = 0.43;
    
    // Higher DTI for compensating factors
    if (ficoScore >= 680 && ltv <= 90) {
      maxDTI = 0.50; // With strong compensating factors
    } else if (ficoScore >= 640) {
      maxDTI = 0.45; // With moderate compensating factors
    } else if (ficoScore >= 580) {
      maxDTI = 0.43; // Standard FHA limit
    } else {
      maxDTI = 0.41; // Conservative for lower credit scores
    }
    
    // For the initial calculation, use a rough estimate of MIP
    // This will be refined later
    const initialMonthlyMIP = 0.55 / 100 / 12 * 300000; // 0.55% annual MIP on $300k loan
    
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
      monthlyMI: initialMonthlyMIP
    });
    
    // Recalculate MIP with the actual loan amount
    const mip = await calculateFHAMI({
      loanAmount: maxPurchase.maxLoanAmount,
      ltv,
      loanTerm
    });
    
    // Calculate upfront MIP amount
    const upfrontMIP = mip.upfrontMI;
    
    // Calculate loan amount with upfront MIP (if financed)
    const loanAmountWithMIP = maxPurchase.maxLoanAmount + upfrontMIP;
    
    // Recalculate principal and interest payment with financed MIP
    const principalAndInterest = calculateMonthlyPI(
      loanAmountWithMIP,
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
                          mip.monthlyMI + 
                          hoaFees;
    
    // Generate amortization schedule
    const amortizationSchedule = calculateAmortization(
      loanAmountWithMIP,
      adjustedRate,
      loanTerm
    );
    
    // Return comprehensive results
    return {
      loanAmount: maxPurchase.maxLoanAmount,
      loanAmountWithMIP,
      purchasingPower: maxPurchase.maxPurchasePrice,
      downPayment: maxPurchase.maxPurchasePrice - maxPurchase.maxLoanAmount,
      interestRate: adjustedRate,
      baseRate,
      principalAndInterest,
      monthlyPayment,
      monthlyTaxes,
      monthlyInsurance,
      mortgageInsurance: mip.monthlyMI,
      upfrontFee: upfrontMIP,
      mipDuration: mip.mipDuration,
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
    const baseRateData = await DataService.getBaseRates('FHA');
    return baseRateData.rates[loanTerm] / 100; // Convert from percentage to decimal
  }
  
  /**
   * Adjust interest rate based on credit score
   * @param {number} baseRate - Base interest rate
   * @param {number} ficoScore - Credit score
   * @returns {number} Adjusted interest rate
   * @private
   */
  _adjustRateForCreditScore(baseRate, ficoScore) {
    // FHA loans typically have less rate variation by credit score
    // than conventional loans, but there is still some adjustment
    
    let adjustment = 0;
    
    if (ficoScore >= 740) {
      adjustment = -0.0025; // -0.25%
    } else if (ficoScore >= 720) {
      adjustment = -0.00125; // -0.125%
    } else if (ficoScore >= 680) {
      adjustment = 0; // No adjustment
    } else if (ficoScore >= 660) {
      adjustment = 0.00125; // +0.125%
    } else if (ficoScore >= 640) {
      adjustment = 0.0025; // +0.25%
    } else if (ficoScore >= 620) {
      adjustment = 0.00375; // +0.375%
    } else if (ficoScore >= 600) {
      adjustment = 0.005; // +0.5%
    } else {
      adjustment = 0.0075; // +0.75%
    }
    
    return baseRate + adjustment;
  }
}

export default FHALoan;
