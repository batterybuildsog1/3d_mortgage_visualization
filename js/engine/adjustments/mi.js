/**
 * Mortgage Insurance Calculator
 * 
 * Calculates mortgage insurance premiums for different loan types.
 */
import DataService from '../../services/data-service.js';

/**
 * Calculate conventional PMI (Private Mortgage Insurance)
 * @param {Object} loanData - Loan data
 * @param {number} loanData.loanAmount - Loan amount
 * @param {number} loanData.propertyValue - Property value
 * @param {number} loanData.ltv - Loan-to-value ratio
 * @param {number} loanData.ficoScore - Credit score
 * @param {number} loanData.loanTerm - Loan term in years
 * @returns {Promise<Object>} PMI calculation results
 */
export async function calculateConventionalMI(loanData) {
  const { loanAmount, propertyValue, ltv, ficoScore, loanTerm } = loanData;
  
  // No MI needed if LTV <= 80%
  if (ltv <= 80) {
    return { 
      monthlyMI: 0, 
      upfrontMI: 0,
      annualPremium: 0,
      pmiRemovalYear: 0
    };
  }
  
  // Get PMI rate data
  const pmiData = await DataService.getMortgageInsurance('Conventional');
  
  // Find FICO score band
  const ficoBands = Object.keys(pmiData.rates)
    .map(Number)
    .sort((a, b) => a - b);
  
  // Find the closest FICO band that's less than or equal to the borrower's score
  let ficoBand = ficoBands[0]; // Default to lowest band
  for (const band of ficoBands) {
    if (ficoScore >= band) {
      ficoBand = band;
    } else {
      break;
    }
  }
  
  // Find LTV band
  const ltvBands = Object.keys(pmiData.rates[ficoBand])
    .map(Number)
    .sort((a, b) => a - b);
  
  // Find the closest LTV band that's less than or equal to the loan's LTV
  let ltvBand = ltvBands[0]; // Default to lowest band
  for (const band of ltvBands) {
    if (ltv >= band) {
      ltvBand = band;
    } else {
      break;
    }
  }
  
  // Get annual premium rate
  const annualPremiumRate = pmiData.rates[ficoBand][ltvBand] / 100;
  
  // Calculate annual premium amount
  const annualPremium = loanAmount * annualPremiumRate;
  
  // Monthly MI payment
  const monthlyMI = annualPremium / 12;
  
  // Estimate PMI removal (approximate)
  const annualPrincipalPaydown = 0.02; // Assume ~2% principal reduction per year
  const yearsToReach80LTV = Math.ceil((ltv - 80) / (annualPrincipalPaydown * 100));
  const pmiRemovalYear = Math.max(2, yearsToReach80LTV); // Minimum 2 years
  
  return {
    monthlyMI,
    upfrontMI: 0, // Conventional loans don't have upfront MI
    annualPremium,
    pmiRemovalYear
  };
}

/**
 * Calculate FHA MIP (Mortgage Insurance Premium)
 * @param {Object} loanData - Loan data
 * @param {number} loanData.loanAmount - Loan amount
 * @param {number} loanData.ltv - Loan-to-value ratio
 * @param {number} loanData.loanTerm - Loan term in years
 * @returns {Promise<Object>} MIP calculation results
 */
export async function calculateFHAMI(loanData) {
  const { loanAmount, ltv, loanTerm } = loanData;
  
  // Get FHA MIP data
  const mipData = await DataService.getMortgageInsurance('FHA');
  
  // Upfront MIP (currently 1.75% for all FHA loans)
  const upfrontMIPRate = mipData.upfront / 100;
  const upfrontMI = loanAmount * upfrontMIPRate;
  
  // Annual MIP rate depends on loan amount, LTV, and term
  let annualMIPRate;
  
  if (loanTerm > 15) {
    // 30-year term rates
    if (loanAmount <= 726200) {
      if (ltv <= 90) {
        annualMIPRate = mipData.annual.term30.loanLessThan726200.ltvLessThan90 / 100;
      } else if (ltv <= 95) {
        annualMIPRate = mipData.annual.term30.loanLessThan726200.ltvLessThan95 / 100;
      } else {
        annualMIPRate = mipData.annual.term30.loanLessThan726200.ltvGreaterThan95 / 100;
      }
    } else {
      if (ltv <= 90) {
        annualMIPRate = mipData.annual.term30.loanGreaterThan726200.ltvLessThan90 / 100;
      } else if (ltv <= 95) {
        annualMIPRate = mipData.annual.term30.loanGreaterThan726200.ltvLessThan95 / 100;
      } else {
        annualMIPRate = mipData.annual.term30.loanGreaterThan726200.ltvGreaterThan95 / 100;
      }
    }
  } else {
    // 15-year term rates
    if (loanAmount <= 726200) {
      if (ltv <= 90) {
        annualMIPRate = mipData.annual.term15.loanLessThan726200.ltvLessThan90 / 100;
      } else {
        annualMIPRate = mipData.annual.term15.loanLessThan726200.ltvGreaterThan90 / 100;
      }
    } else {
      if (ltv <= 78) {
        annualMIPRate = mipData.annual.term15.loanGreaterThan726200.ltvLessThan78 / 100;
      } else if (ltv <= 90) {
        annualMIPRate = mipData.annual.term15.loanGreaterThan726200.ltvLessThan90 / 100;
      } else {
        annualMIPRate = mipData.annual.term15.loanGreaterThan726200.ltvGreaterThan90 / 100;
      }
    }
  }
  
  // Calculate annual premium
  const annualPremium = loanAmount * annualMIPRate;
  
  // Monthly MI payment
  const monthlyMI = annualPremium / 12;
  
  // MIP duration
  const mipDuration = (ltv > 90) ? loanTerm : 11; // Life of loan if LTV > 90%, else 11 years
  
  return {
    monthlyMI,
    upfrontMI,
    annualPremium,
    annualMIPRate,
    mipDuration
  };
}

/**
 * Calculate VA Funding Fee
 * @param {Object} loanData - Loan data
 * @param {number} loanData.loanAmount - Loan amount
 * @param {number} loanData.downPaymentPercent - Down payment percentage
 * @param {boolean} loanData.isFirstTimeUse - Is first-time use of VA benefit
 * @param {boolean} loanData.isReservist - Is reservist or National Guard
 * @param {boolean} loanData.isExempt - Is exempt from funding fee
 * @returns {Promise<Object>} VA funding fee calculation results
 */
export async function calculateVAFundingFee(loanData) {
  const {
    loanAmount,
    downPaymentPercent,
    isFirstTimeUse = true,
    isReservist = false,
    isExempt = false
  } = loanData;
  
  // No funding fee for exempt veterans
  if (isExempt) {
    return {
      fundingFee: 0,
      fundingFeeRate: 0,
      monthlyMI: 0
    };
  }
  
  // Get VA funding fee data
  const vaData = await DataService.getMortgageInsurance('VA');
  
  // Determine the appropriate funding fee rate
  let fundingFeeRate;
  
  if (isReservist) {
    // Reservist/Guard rates
    if (isFirstTimeUse) {
      if (downPaymentPercent < 5) {
        fundingFeeRate = vaData.fundingFee.reservistOrGuard.firstTimeUse.downPaymentLessThan5 / 100;
      } else if (downPaymentPercent < 10) {
        fundingFeeRate = vaData.fundingFee.reservistOrGuard.firstTimeUse.downPaymentBetween5And10 / 100;
      } else {
        fundingFeeRate = vaData.fundingFee.reservistOrGuard.firstTimeUse.downPaymentGreaterThan10 / 100;
      }
    } else {
      if (downPaymentPercent < 5) {
        fundingFeeRate = vaData.fundingFee.reservistOrGuard.subsequentUse.downPaymentLessThan5 / 100;
      } else if (downPaymentPercent < 10) {
        fundingFeeRate = vaData.fundingFee.reservistOrGuard.subsequentUse.downPaymentBetween5And10 / 100;
      } else {
        fundingFeeRate = vaData.fundingFee.reservistOrGuard.subsequentUse.downPaymentGreaterThan10 / 100;
      }
    }
  } else {
    // Regular military rates
    if (isFirstTimeUse) {
      if (downPaymentPercent < 5) {
        fundingFeeRate = vaData.fundingFee.firstTimeUse.downPaymentLessThan5 / 100;
      } else if (downPaymentPercent < 10) {
        fundingFeeRate = vaData.fundingFee.firstTimeUse.downPaymentBetween5And10 / 100;
      } else {
        fundingFeeRate = vaData.fundingFee.firstTimeUse.downPaymentGreaterThan10 / 100;
      }
    } else {
      if (downPaymentPercent < 5) {
        fundingFeeRate = vaData.fundingFee.subsequentUse.downPaymentLessThan5 / 100;
      } else if (downPaymentPercent < 10) {
        fundingFeeRate = vaData.fundingFee.subsequentUse.downPaymentBetween5And10 / 100;
      } else {
        fundingFeeRate = vaData.fundingFee.subsequentUse.downPaymentGreaterThan10 / 100;
      }
    }
  }
  
  // Calculate funding fee
  const fundingFee = loanAmount * fundingFeeRate;
  
  return {
    fundingFee,
    fundingFeeRate,
    monthlyMI: 0 // VA loans don't have monthly MI
  };
}

/**
 * Calculate USDA Guarantee Fee
 * @param {Object} loanData - Loan data
 * @param {number} loanData.loanAmount - Loan amount
 * @returns {Promise<Object>} USDA guarantee fee calculation results
 */
export async function calculateUSDAGuaranteeFee(loanData) {
  const { loanAmount } = loanData;
  
  // Get USDA fee data
  const usdaData = await DataService.getMortgageInsurance('USDA');
  
  // Upfront guarantee fee
  const upfrontFeeRate = usdaData.upfront / 100;
  const upfrontFee = loanAmount * upfrontFeeRate;
  
  // Annual fee
  const annualFeeRate = usdaData.annual / 100;
  const annualFee = loanAmount * annualFeeRate;
  
  // Monthly fee
  const monthlyFee = annualFee / 12;
  
  return {
    upfrontFee,
    annualFee,
    monthlyFee,
    upfrontFeeRate,
    annualFeeRate
  };
}
