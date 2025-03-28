/**
 * USDA Loan Calculator
 * 
 * Calculates details for USDA mortgage loans.
 */
import DataService from '../../services/data-service.js';
import { calculateUSDAGuaranteeFee } from '../adjustments/mi.js';
import { 
  calculateMonthlyPI,
  calculateMaxPurchasePrice,
  calculateAmortization
} from '../utils/loan-utils.js';

/**
 * USDA loan calculator
 */
class USDALoan {
  /**
   * Calculate USDA loan details
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
    // USDA typically caps at 41%
    let maxDTI = 0.41; // Standard benchmark
    
    // Higher DTI possible with strong compensating factors
    if (ficoScore >= 680) {
      maxDTI = 0.44; // With strong compensating factors
    } else {
      maxDTI = 0.41; // Standard USDA benchmark
    }
    
    // For the initial calculation, use a rough estimate of guarantee fee
    // This will be refined later
    const initialMonthlyFee = 0.35 / 100 / 12 * 300000; // 0.35% annual fee on $300k loan
    
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
      monthlyMI: initialMonthlyFee
    });
    
    // Recalculate guarantee fee with the actual loan amount
    const guaranteeFee = await calculateUSDAGuaranteeFee({
      loanAmount: maxPurchase.maxLoanAmount
    });
    
    // Calculate upfront guarantee fee amount
    const upfrontFee = guaranteeFee.upfrontFee;
    
    // Calculate loan amount with upfront fee (if financed)
    const loanAmountWithFee = maxPurchase.maxLoanAmount + upfrontFee;
    
    // Recalculate principal and interest payment with financed fee
    const principalAndInterest = calculateMonthlyPI(
      loanAmountWithFee,
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
                          guaranteeFee.monthlyFee + 
                          hoaFees;
    
    // Generate amortization schedule
    const amortizationSchedule = calculateAmortization(
      loanAmountWithFee,
      adjustedRate,
      loanTerm
    );
    
    // Return comprehensive results
    return {
      loanAmount: maxPurchase.maxLoanAmount,
      loanAmountWithFee,
      purchasingPower: maxPurchase.maxPurchasePrice,
      downPayment: maxPurchase.maxPurchasePrice - maxPurchase.maxLoanAmount,
      interestRate: adjustedRate,
      baseRate,
      principalAndInterest,
      monthlyPayment,
      monthlyTaxes,
      monthlyInsurance,
      mortgageInsurance: guaranteeFee.monthlyFee,
      upfrontFee,
      guaranteeFeeRate: guaranteeFee.upfrontFeeRate,
      annualFeeRate: guaranteeFee.annualFeeRate,
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
    const baseRateData = await DataService.getBaseRates('USDA');
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
    // USDA loans have stringent credit requirements (typically 640+)
    // so rate adjustments are minimal
    
    let adjustment = 0;
    
    if (ficoScore >= 740) {
      adjustment = -0.00125; // -0.125%
    } else if (ficoScore >= 700) {
      adjustment = 0; // No adjustment
    } else if (ficoScore >= 680) {
      adjustment = 0.00125; // +0.125%
    } else if (ficoScore >= 660) {
      adjustment = 0.0025; // +0.25%
    } else {
      adjustment = 0.00375; // +0.375%
    }
    
    return baseRate + adjustment;
  }
}

export default USDALoan;
