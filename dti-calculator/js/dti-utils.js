/**
 * DTI Calculator Utilities
 * Provides functions for calculating DTI ratios and determining loan eligibility
 */

import DTI_GUIDELINES from './loan-guidelines.js';

/**
 * Calculate front-end and back-end DTI ratios
 * @param {Object} income - User's income information
 * @param {Object} housingExpenses - Housing expense information
 * @param {Object} otherDebts - Other debt obligations
 * @returns {Object} Calculated DTI ratios and values
 */
export function calculateDTI(income, housingExpenses, otherDebts) {
  // Calculate total monthly income
  const totalMonthlyIncome = parseFloat(income.grossMonthly) || 0;
  
  // Calculate total housing expenses
  const totalHousingExpense = 
    (parseFloat(housingExpenses.principalInterest) || 0) +
    (parseFloat(housingExpenses.propertyTaxes) || 0) +
    (parseFloat(housingExpenses.homeInsurance) || 0) +
    (parseFloat(housingExpenses.mortgageInsurance) || 0) +
    (parseFloat(housingExpenses.hoaDues) || 0);
  
  // Calculate total other debts
  const totalOtherDebts = Object.values(otherDebts).reduce(
    (sum, value) => sum + (parseFloat(value) || 0), 
    0
  );
  
  // Calculate total monthly debt payments
  const totalMonthlyDebt = totalHousingExpense + totalOtherDebts;
  
  // Calculate DTI ratios
  const frontEndDTI = totalMonthlyIncome > 0 
    ? ((totalHousingExpense / totalMonthlyIncome) * 100).toFixed(2) 
    : "0.00";
    
  const backEndDTI = totalMonthlyIncome > 0 
    ? ((totalMonthlyDebt / totalMonthlyIncome) * 100).toFixed(2) 
    : "0.00";
  
  return {
    frontEndDTI,
    backEndDTI,
    totalMonthlyIncome,
    totalHousingExpense,
    totalOtherDebts,
    totalMonthlyDebt,
    totalMonthlyDTIPayment: totalMonthlyDebt
  };
}

/**
 * Determine loan eligibility based on DTI and other factors
 * @param {Object} dtiValues - Calculated DTI values
 * @param {Object} creditInfo - Credit score and other credit information
 * @param {Object} compensatingFactors - Potential compensating factors
 * @returns {Object} Eligibility assessment for different loan types
 */
export function determineLoanEligibility(dtiValues, creditInfo = {}, compensatingFactors = {}) {
  const { frontEndDTI, backEndDTI } = dtiValues;
  const frontEndDTIValue = parseFloat(frontEndDTI);
  const backEndDTIValue = parseFloat(backEndDTI);
  
  // Check eligibility for each loan type
  const eligibility = {
    fha: checkFHAEligibility(frontEndDTIValue, backEndDTIValue, creditInfo, compensatingFactors),
    va: checkVAEligibility(frontEndDTIValue, backEndDTIValue, creditInfo, compensatingFactors),
    conventional: checkConventionalEligibility(frontEndDTIValue, backEndDTIValue, creditInfo, compensatingFactors),
    freddieMac: checkFreddieMacEligibility(frontEndDTIValue, backEndDTIValue, creditInfo, compensatingFactors),
    usda: checkUSDAEligibility(frontEndDTIValue, backEndDTIValue, creditInfo, compensatingFactors)
  };
  
  return eligibility;
}

/**
 * Check FHA loan eligibility
 */
function checkFHAEligibility(frontEndDTI, backEndDTI, creditInfo, compensatingFactors) {
  const { standardLimits, expandedLimits } = DTI_GUIDELINES.fha;
  
  // Basic eligibility check
  const meetsFrontEndDTI = frontEndDTI <= standardLimits.frontEndDTI;
  const meetsBackEndDTI = backEndDTI <= standardLimits.backEndDTI;
  const meetsStandardGuidelines = meetsFrontEndDTI && meetsBackEndDTI;
  
  // Check if expanded limits might apply based on credit score
  const hasStrongCredit = creditInfo.score >= 680;
  const hasExpandedEligibility = hasStrongCredit && backEndDTI <= expandedLimits.backEndDTI;
  
  // Overall eligibility
  const eligible = meetsStandardGuidelines || hasExpandedEligibility;
  
  let status = eligible ? "Eligible" : "May Not Be Eligible";
  let notes = "";
  
  if (meetsStandardGuidelines) {
    notes = "Your DTI is within standard FHA guidelines.";
  } else if (hasExpandedEligibility) {
    notes = "Your DTI exceeds standard guidelines but may be acceptable with your strong credit score.";
  } else if (backEndDTI <= expandedLimits.backEndDTI) {
    notes = "Your DTI exceeds standard guidelines. Strong compensating factors may help.";
    status = "Possibly Eligible";
  } else {
    notes = "Your DTI significantly exceeds FHA guidelines. Consider debt reduction strategies.";
  }
  
  return {
    eligible,
    status,
    notes,
    standardLimits,
    expandedLimits,
    meetsFrontEndDTI,
    meetsBackEndDTI,
    meetsStandardGuidelines,
    hasExpandedEligibility
  };
}

/**
 * Check VA loan eligibility
 */
function checkVAEligibility(frontEndDTI, backEndDTI, creditInfo, compensatingFactors) {
  const { standardLimits } = DTI_GUIDELINES.va;
  
  // VA focuses more on residual income than strict DTI limits
  const meetsBackEndDTI = backEndDTI <= standardLimits.backEndDTI;
  
  // Consider compensating factors for VA
  const hasStrongResidualIncome = compensatingFactors.hasHighResidualIncome;
  const hasTaxFreeIncome = compensatingFactors.hasTaxFreeIncome;
  
  let status = "Possibly Eligible";
  let notes = "";
  
  if (meetsBackEndDTI) {
    status = "Likely Eligible";
    notes = "Your DTI is within standard VA guidelines.";
  } else if (hasStrongResidualIncome || hasTaxFreeIncome) {
    status = "Likely Eligible";
    notes = "Your DTI exceeds standard guidelines but may be offset by your strong residual income or tax-free income.";
  } else if (backEndDTI <= 50) {
    notes = "Your DTI exceeds VA guidelines. Residual income will be a key factor in approval.";
  } else {
    status = "May Not Be Eligible";
    notes = "Your DTI significantly exceeds VA guidelines. Consider debt reduction strategies.";
  }
  
  return {
    eligible: status !== "May Not Be Eligible",
    status,
    notes,
    standardLimits,
    meetsBackEndDTI
  };
}

/**
 * Check Conventional loan eligibility (Fannie Mae)
 */
function checkConventionalEligibility(frontEndDTI, backEndDTI, creditInfo, compensatingFactors) {
  const { manualUnderwriting, desktopUnderwriter } = DTI_GUIDELINES.conventional;
  
  // Check for manual underwriting limits
  const meetsFrontEndDTI = frontEndDTI <= manualUnderwriting.standardLimits.frontEndDTI;
  const meetsBackEndDTI = backEndDTI <= manualUnderwriting.standardLimits.backEndDTI;
  const meetsManualStandard = meetsFrontEndDTI && meetsBackEndDTI;
  
  // Check for expanded manual limits
  const meetsManualExpanded = backEndDTI <= manualUnderwriting.expandedLimits.backEndDTI;
  
  // Check for Desktop Underwriter limits
  const meetsDULimits = backEndDTI <= desktopUnderwriter.standardLimits.backEndDTI;
  
  // Consider credit score for DU
  const hasStrongCredit = creditInfo.score >= 740;
  const hasSignificantReserves = compensatingFactors.hasSignificantReserves;
  
  let status = "May Not Be Eligible";
  let notes = "";
  
  if (meetsManualStandard) {
    status = "Eligible";
    notes = "Your DTI is within standard conventional guidelines.";
  } else if (meetsManualExpanded) {
    status = "Likely Eligible";
    notes = "Your DTI exceeds standard guidelines but is within expanded manual underwriting limits.";
  } else if (meetsDULimits && (hasStrongCredit || hasSignificantReserves)) {
    status = "Likely Eligible";
    notes = "Your DTI may be acceptable through Desktop Underwriter with your strong compensating factors.";
  } else if (meetsDULimits) {
    status = "Possibly Eligible";
    notes = "Your DTI is within Desktop Underwriter limits but may require strong compensating factors.";
  } else {
    notes = "Your DTI exceeds conventional loan guidelines. Consider debt reduction strategies.";
  }
  
  return {
    eligible: status !== "May Not Be Eligible",
    status,
    notes,
    manualUnderwriting,
    desktopUnderwriter,
    meetsFrontEndDTI,
    meetsBackEndDTI,
    meetsManualStandard,
    meetsManualExpanded,
    meetsDULimits
  };
}

/**
 * Check Freddie Mac loan eligibility
 */
function checkFreddieMacEligibility(frontEndDTI, backEndDTI, creditInfo, compensatingFactors) {
  const { standardLimits, expandedLimits } = DTI_GUIDELINES.freddieMac;
  
  // Basic eligibility check
  const meetsStandardDTI = backEndDTI <= standardLimits.backEndDTI;
  const meetsExpandedDTI = backEndDTI <= expandedLimits.backEndDTI;
  
  // Consider credit score
  const hasStrongCredit = creditInfo.score >= 740;
  
  let status = "May Not Be Eligible";
  let notes = "";
  
  if (meetsStandardDTI) {
    status = "Eligible";
    notes = "Your DTI is within standard Freddie Mac guidelines.";
  } else if (meetsExpandedDTI && hasStrongCredit) {
    status = "Likely Eligible";
    notes = "Your DTI exceeds standard guidelines but may be acceptable with your strong credit profile.";
  } else if (meetsExpandedDTI) {
    status = "Possibly Eligible";
    notes = "Your DTI exceeds standard guidelines but is within expanded limits with qualifying factors.";
  } else {
    notes = "Your DTI exceeds Freddie Mac guidelines. Consider debt reduction strategies.";
  }
  
  return {
    eligible: status !== "May Not Be Eligible",
    status,
    notes,
    standardLimits,
    expandedLimits,
    meetsStandardDTI,
    meetsExpandedDTI
  };
}

/**
 * Check USDA loan eligibility
 */
function checkUSDAEligibility(frontEndDTI, backEndDTI, creditInfo, compensatingFactors) {
  const { standardLimits, expandedLimits } = DTI_GUIDELINES.usda;
  
  // Basic eligibility check
  const meetsFrontEndDTI = frontEndDTI <= standardLimits.frontEndDTI;
  const meetsBackEndDTI = backEndDTI <= standardLimits.backEndDTI;
  const meetsStandardGuidelines = meetsFrontEndDTI && meetsBackEndDTI;
  
  // Check expanded eligibility
  const meetsExpandedDTI = backEndDTI <= expandedLimits.backEndDTI;
  const hasStrongCredit = creditInfo.score >= 680;
  
  let status = "May Not Be Eligible";
  let notes = "";
  
  if (meetsStandardGuidelines) {
    status = "Eligible";
    notes = "Your DTI is within standard USDA guidelines.";
  } else if (meetsExpandedDTI && hasStrongCredit) {
    status = "Possibly Eligible";
    notes = "Your DTI exceeds standard guidelines but may be acceptable with manual underwriting.";
  } else if (meetsExpandedDTI) {
    status = "Possibly Eligible";
    notes = "Your DTI exceeds standard guidelines. Manual underwriting with strong compensating factors may be required.";
  } else {
    notes = "Your DTI exceeds USDA guidelines. Consider debt reduction strategies.";
  }
  
  return {
    eligible: status !== "May Not Be Eligible",
    status,
    notes,
    standardLimits,
    expandedLimits,
    meetsFrontEndDTI,
    meetsBackEndDTI,
    meetsStandardGuidelines,
    meetsExpandedDTI
  };
}

/**
 * Evaluate compensating factors based on user inputs
 * @param {Object} userInputs - User financial information
 * @returns {Object} Evaluated compensating factors
 */
export function evaluateCompensatingFactors(userInputs) {
  const {
    creditScore,
    cashReserves,
    employmentHistory,
    downPaymentPercent,
    residualIncome,
    hasTaxFreeIncome,
    additionalIncome,
    currentHousingPayment,
    hasMinimalDebt
  } = userInputs;
  
  // Convert credit score to number if it's a string
  const creditScoreNum = typeof creditScore === 'string' 
    ? parseInt(creditScore.split('-')[0]) 
    : creditScore;
  
  // Evaluate factors
  const factors = {
    hasHighCreditScore: creditScoreNum >= 720,
    hasGoodCreditScore: creditScoreNum >= 680 && creditScoreNum < 720,
    hasSignificantReserves: cashReserves >= (userInputs.totalHousingPayment * 3),
    hasStableEmployment: employmentHistory >= 2,
    hasLargeDownPayment: downPaymentPercent >= 20,
    hasHighResidualIncome: residualIncome >= (userInputs.totalHousingPayment * 0.2),
    hasTaxFreeIncome: hasTaxFreeIncome,
    hasAdditionalIncome: additionalIncome > 0,
    hasMinimalPaymentShock: currentHousingPayment > 0 && 
      userInputs.totalHousingPayment <= (currentHousingPayment * 1.2),
    hasMinimalDebt: hasMinimalDebt
  };
  
  return factors;
}

/**
 * Get suggested improvement strategies based on DTI analysis
 * @param {Object} dtiValues - Calculated DTI values
 * @param {Object} eligibility - Loan eligibility assessment
 * @returns {Array} List of suggested improvement strategies
 */
export function getSuggestions(dtiValues, eligibility) {
  const { frontEndDTI, backEndDTI } = dtiValues;
  const frontEndDTIValue = parseFloat(frontEndDTI);
  const backEndDTIValue = parseFloat(backEndDTI);
  
  const suggestions = [];
  
  // High front-end DTI suggestions
  if (frontEndDTIValue > 31) {
    suggestions.push({
      priority: "high",
      category: "housing",
      title: "Consider a lower-priced home",
      description: "Your housing expenses are high relative to your income. A more affordable home could improve your approval chances."
    });
    
    suggestions.push({
      priority: "medium",
      category: "income",
      title: "Increase your income",
      description: "Consider ways to increase your income through a side job, overtime, or asking for a raise."
    });
  }
  
  // High back-end DTI suggestions
  if (backEndDTIValue > 43) {
    suggestions.push({
      priority: "high",
      category: "debt",
      title: "Pay down high-interest debt",
      description: "Focus on paying off credit cards and other high-interest debts to reduce your DTI ratio."
    });
    
    suggestions.push({
      priority: "medium",
      category: "debt",
      title: "Consolidate or refinance existing debt",
      description: "Consider debt consolidation to potentially lower your monthly payments."
    });
  }
  
  // Down payment suggestions
  suggestions.push({
    priority: "medium",
    category: "down payment",
    title: "Increase your down payment",
    description: "A larger down payment reduces your loan amount and monthly payment, improving your DTI."
  });
  
  // Credit score suggestions
  suggestions.push({
    priority: "medium",
    category: "credit",
    title: "Improve your credit score",
    description: "A higher credit score can help qualify with a higher DTI, especially with automated underwriting."
  });
  
  return suggestions;
}

/**
 * Format currency values for display
 * @param {Number} value - Value to format as currency
 * @returns {String} Formatted currency string
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format percentage values for display
 * @param {Number} value - Value to format as percentage
 * @returns {String} Formatted percentage string
 */
export function formatPercentage(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
}