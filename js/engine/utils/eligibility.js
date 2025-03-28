/**
 * Loan Eligibility Calculator
 * 
 * Determines eligibility for different loan types based on
 * borrower characteristics and loan parameters.
 */

/**
 * Calculate loan eligibility
 * @param {string} loanType - Loan type
 * @param {Object} borrowerData - Borrower data
 * @param {number} borrowerData.ficoScore - Credit score
 * @param {number} borrowerData.ltv - Loan-to-value ratio
 * @param {number} borrowerData.income - Annual income
 * @param {string} borrowerData.location - Property location
 * @param {number} borrowerData.dti - Debt-to-income ratio
 * @param {boolean} borrowerData.isVeteran - Veteran status
 * @returns {Object} Eligibility result with reason and alternatives
 */
export function calculateEligibility(loanType, borrowerData) {
  const {
    ficoScore,
    ltv,
    income,
    location = '',
    dti = 0.43,
    isVeteran = false
  } = borrowerData;
  
  // Check basic eligibility based on loan type
  switch(loanType) {
    case 'Conventional':
      return checkConventionalEligibility(ficoScore, ltv, dti);
      
    case 'FHA':
      return checkFHAEligibility(ficoScore, ltv, dti);
      
    case 'VA':
      return checkVAEligibility(ficoScore, ltv, dti, isVeteran);
      
    case 'USDA':
      return checkUSDAEligibility(ficoScore, ltv, dti, income, location);
      
    default:
      return {
        eligible: false,
        reason: `Unknown loan type: ${loanType}`,
        alternatives: ['Conventional', 'FHA', 'VA', 'USDA']
      };
  }
}

/**
 * Check conventional loan eligibility
 * @param {number} ficoScore - Credit score
 * @param {number} ltv - Loan-to-value ratio
 * @param {number} dti - Debt-to-income ratio
 * @returns {Object} Eligibility result
 */
function checkConventionalEligibility(ficoScore, ltv, dti) {
  const result = {
    eligible: true,
    reason: '',
    alternatives: []
  };
  
  // Check credit score
  if (ficoScore < 620) {
    result.eligible = false;
    result.reason = 'Credit score below minimum 620 requirement for conventional loans';
    result.alternatives.push('FHA');
  }
  
  // Check LTV
  if (ltv > 97) {
    result.eligible = false;
    result.reason = 'LTV exceeds maximum 97% for conventional loans';
    result.alternatives.push('FHA', 'VA', 'USDA');
  }
  
  // Check DTI
  if (dti > 0.45) {
    result.eligible = false;
    result.reason = 'DTI exceeds maximum 45% for conventional loans';
    result.alternatives.push('FHA', 'VA');
  }
  
  return result;
}

/**
 * Check FHA loan eligibility
 * @param {number} ficoScore - Credit score
 * @param {number} ltv - Loan-to-value ratio
 * @param {number} dti - Debt-to-income ratio
 * @returns {Object} Eligibility result
 */
function checkFHAEligibility(ficoScore, ltv, dti) {
  const result = {
    eligible: true,
    reason: '',
    alternatives: []
  };
  
  // Check credit score
  if (ficoScore < 500) {
    result.eligible = false;
    result.reason = 'Credit score below minimum 500 requirement for FHA loans';
    // No alternatives for very low credit scores
  } else if (ficoScore < 580 && ltv > 90) {
    result.eligible = false;
    result.reason = 'For credit scores between 500-579, maximum LTV is 90% for FHA loans';
    // Suggest increasing down payment
    result.alternatives.push('FHA with 10%+ down payment');
  }
  
  // Check LTV
  if (ltv > 96.5 && ficoScore >= 580) {
    result.eligible = false;
    result.reason = 'LTV exceeds maximum 96.5% for FHA loans';
    result.alternatives.push('VA', 'USDA');
  }
  
  // Check DTI
  if (dti > 0.50) {
    result.eligible = false;
    result.reason = 'DTI exceeds maximum 50% for FHA loans (with compensating factors)';
    result.alternatives.push('VA');
  } else if (dti > 0.43 && ficoScore < 620) {
    result.eligible = false;
    result.reason = 'For credit scores below 620, maximum DTI is 43% for FHA loans';
    // Suggest reducing debt or increasing income
  }
  
  return result;
}

/**
 * Check VA loan eligibility
 * @param {number} ficoScore - Credit score
 * @param {number} ltv - Loan-to-value ratio
 * @param {number} dti - Debt-to-income ratio
 * @param {boolean} isVeteran - Veteran status
 * @returns {Object} Eligibility result
 */
function checkVAEligibility(ficoScore, ltv, dti, isVeteran) {
  const result = {
    eligible: true,
    reason: '',
    alternatives: []
  };
  
  // For the 3D visualization demo purposes, we're assuming the user is eligible for VA loans
  // In a real application, you would check veteran status
  /* 
  if (!isVeteran) {
    result.eligible = false;
    result.reason = 'Must be a qualifying veteran, service member, or surviving spouse for VA loans';
    result.alternatives.push('Conventional', 'FHA', 'USDA');
    return result;
  }
  */
  
  // Check credit score
  if (ficoScore < 580) {
    result.eligible = false;
    result.reason = 'Credit score too low for most VA lenders (typically 580-620 minimum)';
    result.alternatives.push('FHA');
  }
  
  // Check LTV
  if (ltv > 100) {
    result.eligible = false;
    result.reason = 'LTV exceeds maximum 100% for VA loans';
    // No alternative for > 100% LTV
  }
  
  // Check DTI
  if (dti > 0.60) {
    result.eligible = false;
    result.reason = 'DTI exceeds maximum 60% for VA loans (with compensating factors)';
    // Suggest reducing debt or increasing income
  }
  
  return result;
}

/**
 * Check USDA loan eligibility
 * @param {number} ficoScore - Credit score
 * @param {number} ltv - Loan-to-value ratio
 * @param {number} dti - Debt-to-income ratio
 * @param {number} income - Annual income
 * @param {string} location - Property location
 * @returns {Object} Eligibility result
 */
function checkUSDAEligibility(ficoScore, ltv, dti, income, location) {
  const result = {
    eligible: true,
    reason: '',
    alternatives: []
  };
  
  // Check credit score
  if (ficoScore < 640) {
    result.eligible = false;
    result.reason = 'Credit score below minimum 640 requirement for USDA loans';
    result.alternatives.push('FHA', 'VA');
  }
  
  // Check LTV
  if (ltv > 100) {
    result.eligible = false;
    result.reason = 'LTV exceeds maximum 100% for USDA loans';
    // No alternative for > 100% LTV
  }
  
  // Check DTI
  if (dti > 0.41) {
    result.eligible = false;
    result.reason = 'DTI exceeds maximum 41% for USDA loans';
    result.alternatives.push('FHA', 'VA', 'Conventional');
  }
  
  // For the 3D visualization demo purposes, temporarily disable income and location checks
  // In a real application, you would perform these checks properly
  
  /* 
  // Check income limits (simplified check)
  // In a real app, we would check against actual USDA income limits for the area
  if (income > 115000) {
    result.eligible = false;
    result.reason = 'Income exceeds USDA limits (typically 115% of area median income)';
    result.alternatives.push('Conventional', 'FHA', 'VA');
  }
  
  // Check rural area (simplified check)
  // In a real app, we would use USDA eligibility lookup service
  if (location.includes('New York City') || location.includes('Los Angeles') || 
      location.includes('Chicago') || location.includes('Houston') ||
      location.includes('Phoenix') || location.includes('Philadelphia') ||
      location.includes('San Antonio') || location.includes('San Diego') ||
      location.includes('Dallas') || location.includes('San Jose')) {
    result.eligible = false;
    result.reason = 'Property does not appear to be in a USDA-eligible rural area';
    result.alternatives.push('Conventional', 'FHA', 'VA');
  }
  */
  
  return result;
}
