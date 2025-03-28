/**
 * LLPA Calculator
 * 
 * Calculates Loan-Level Price Adjustments for conventional mortgages based on
 * factors like credit score, LTV, loan term, etc.
 */
import DataService from '../../services/data-service.js';

/**
 * Calculate Loan-Level Price Adjustment
 * @param {Object} loanData - Loan data for LLPA calculation
 * @param {string} loanData.loanType - Loan type (Conventional)
 * @param {number} loanData.ficoScore - Credit score
 * @param {number} loanData.ltv - Loan-to-value ratio
 * @param {number} loanData.loanTerm - Loan term in years
 * @param {string} [loanData.loanPurpose='Purchase'] - Loan purpose
 * @param {string} [loanData.propertyType='SingleFamily'] - Property type
 * @param {boolean} [loanData.isSecondHome=false] - Is second home
 * @returns {Promise<number>} LLPA adjustment in percentage points
 */
export async function calculateLLPA(loanData) {
  const {
    loanType,
    ficoScore,
    ltv,
    loanTerm,
    loanPurpose = 'Purchase',
    propertyType = 'SingleFamily',
    isSecondHome = false
  } = loanData;
  
  // Only conventional loans have LLPAs
  if (loanType !== 'Conventional') {
    return 0;
  }
  
  // Get LLPA data
  const llpaData = await DataService.getLLPA('Fannie Mae');
  
  // Find the appropriate FICO score band
  const ficoBands = Object.keys(llpaData.fico)
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
  
  // Find the appropriate LTV band
  const ltvBands = Object.keys(llpaData.fico[ficoBand])
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
  
  // Get the base LLPA adjustment
  let llpaAdjustment = llpaData.fico[ficoBand][ltvBand];
  
  // Apply term adjustment if applicable
  if (loanTerm <= 15 && llpaData.termAdjustments) {
    llpaAdjustment += llpaData.termAdjustments['15year'] || 0;
  }
  
  // Apply property type adjustment if applicable
  if (propertyType !== 'SingleFamily' && llpaData.propertyTypeAdjustments) {
    const propertyTypeMapping = {
      '2units': '2units',
      '3units': '3to4units',
      '4units': '3to4units',
      'Condo': 'condo',
      'Townhouse': 'townhouse',
      'ManufacturedHome': 'manufacturedHome'
    };
    
    const adjustmentKey = propertyTypeMapping[propertyType];
    if (adjustmentKey && llpaData.propertyTypeAdjustments[adjustmentKey]) {
      llpaAdjustment += llpaData.propertyTypeAdjustments[adjustmentKey];
    }
  }
  
  // Apply second home adjustment if applicable
  if (isSecondHome && llpaData.secondHomeAdjustment) {
    llpaAdjustment += llpaData.secondHomeAdjustment;
  }
  
  return llpaAdjustment;
}
