/**
 * VA Loan Calculator
 * 
 * Calculates details for VA mortgage loans.
 */
import DataService from '../../services/data-service.js';
import { calculateVAFundingFee } from '../adjustments/mi.js';
import { 
  calculateMonthlyPI,
  calculateMaxPurchasePrice,
  calculateAmortization
} from '../utils/loan-utils.js';

/**
 * VA loan calculator
 */
class VALoan {
  /**
   * Calculate VA loan details
   * @param {Object} inputData - Loan calculation parameters
   * @param {number} inputData.income - Annual income
   * @param {number} inputData.ltv - Loan-to-value ratio
   * @param {number} inputData.ficoScore - Credit score
   * @param {number} inputData.loanTerm - Loan term in years
   * @param {Object} inputData.locationFactors - Location-specific factors
   * @param {number} inputData.hoaFees - Monthly HOA fees
   * @param {boolean} inputData.isFirstTimeUse - Is first-time use of VA benefit
   * @param {boolean} inputData.isReservist - Is reservist or National Guard
   * @param {boolean} inputData.isExempt - Is exempt from funding fee
   * @returns {Promise<Object>} Loan calculation results
   */
  async calculateLoan(inputData) {
    const {
      income,
      ltv,
      ficoScore,
      loanTerm = 30,
      locationFactors,
      hoaFees = 0,
      isFirstTimeUse = true,
      isReservist = false,
      isExempt = false
    } = inputData;
    
    // Get base interest rate
    const baseRate = await this._getBaseRate(loanTerm);
    
    // Apply credit score adjustment to rate
    const adjustedRate = this._adjustRateForCreditScore(baseRate, ficoScore);
    
    // Calculate maximum DTI
    // VA allows higher DTI with residual income analysis
    let maxDTI = 0.41; // Standard benchmark
    
    // Higher DTI possible with strong residual income
    if (ficoScore >= 680) {
      maxDTI = 0.50; // With strong compensating factors
    } else if (ficoScore >= 640) {
      maxDTI = 0.45; // With moderate compensating factors
    } else if (ficoScore >= 620) {
      maxDTI = 0.43; // With minimal compensating factors
    } else {
      maxDTI = 0.41; // Standard VA benchmark
    }
    
    // VA loans don't have monthly mortgage insurance
    const monthlyMI = 0;
    
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
      monthlyMI
    });
    
    // Calculate VA funding fee
    const downPaymentPercent = 100 - ltv;
    
    const fundingFee = await calculateVAFundingFee({
      loanAmount: maxPurchase.maxLoanAmount,
      downPaymentPercent,
      isFirstTimeUse,
      isReservist,
      isExempt
    });
    
    // Calculate loan amount with funding fee (if financed)
    const loanAmountWithFundingFee = maxPurchase.maxLoanAmount + fundingFee.fundingFee;
    
    // Recalculate principal and interest payment with financed funding fee
    const principalAndInterest = calculateMonthlyPI(
      loanAmountWithFundingFee,
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
                          hoaFees;
    
    // Generate amortization schedule
    const amortizationSchedule = calculateAmortization(
      loanAmountWithFundingFee,
      adjustedRate,
      loanTerm
    );
    
    // Return comprehensive results
    return {
      loanAmount: maxPurchase.maxLoanAmount,
      loanAmountWithFundingFee,
      purchasingPower: maxPurchase.maxPurchasePrice,
      downPayment: maxPurchase.maxPurchasePrice - maxPurchase.maxLoanAmount,
      interestRate: adjustedRate,
      baseRate,
      principalAndInterest,
      monthlyPayment,
      monthlyTaxes,
      monthlyInsurance,
      mortgageInsurance: 0, // VA loans don't have monthly MI
      upfrontFee: fundingFee.fundingFee,
      fundingFeeRate: fundingFee.fundingFeeRate,
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
    const baseRateData = await DataService.getBaseRates('VA');
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
    // VA loans typically have less rate variation by credit score
    // than conventional loans, but there is still some adjustment
    
    let adjustment = 0;
    
    if (ficoScore >= 760) {
      adjustment = -0.0025; // -0.25%
    } else if (ficoScore >= 740) {
      adjustment = -0.00125; // -0.125%
    } else if (ficoScore >= 720) {
      adjustment = 0; // No adjustment
    } else if (ficoScore >= 680) {
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

export default VALoan;
