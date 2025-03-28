/**
 * Loan Utilities
 * 
 * Common utilities for loan calculations.
 */

/**
 * Calculate monthly principal and interest payment
 * @param {number} loanAmount - Loan amount
 * @param {number} interestRate - Annual interest rate (decimal)
 * @param {number} loanTerm - Loan term in years
 * @returns {number} Monthly payment
 */
export function calculateMonthlyPI(loanAmount, interestRate, loanTerm) {
  const monthlyRate = interestRate / 12;
  const termMonths = loanTerm * 12;
  
  // Handle edge case to avoid division by zero
  if (monthlyRate === 0) {
    return loanAmount / termMonths;
  }
  
  return loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}

/**
 * Calculate maximum loan amount based on monthly payment
 * @param {number} monthlyPayment - Target monthly payment
 * @param {number} interestRate - Annual interest rate (decimal)
 * @param {number} loanTerm - Loan term in years
 * @returns {number} Maximum loan amount
 */
export function calculateMaxLoanAmount(monthlyPayment, interestRate, loanTerm) {
  const monthlyRate = interestRate / 12;
  const termMonths = loanTerm * 12;
  
  // Handle edge case to avoid division by zero
  if (monthlyRate === 0) {
    return monthlyPayment * termMonths;
  }
  
  return monthlyPayment * 
    (1 - Math.pow(1 + monthlyRate, -termMonths)) / 
    monthlyRate;
}

/**
 * Calculate maximum affordable payment based on income and DTI
 * @param {number} monthlyIncome - Monthly income
 * @param {number} dti - Maximum debt-to-income ratio (decimal)
 * @param {number} existingDebt - Existing monthly debt payments
 * @returns {number} Maximum affordable monthly payment
 */
export function calculateMaxPayment(monthlyIncome, dti, existingDebt = 0) {
  return (monthlyIncome * dti) - existingDebt;
}

/**
 * Calculate debt-to-income ratio
 * @param {number} monthlyDebt - Total monthly debt payments
 * @param {number} monthlyIncome - Monthly income
 * @returns {number} DTI ratio (decimal)
 */
export function calculateDTI(monthlyDebt, monthlyIncome) {
  return monthlyDebt / monthlyIncome;
}

/**
 * Calculate loan-to-value ratio
 * @param {number} loanAmount - Loan amount
 * @param {number} propertyValue - Property value
 * @returns {number} LTV ratio (percentage)
 */
export function calculateLTV(loanAmount, propertyValue) {
  return (loanAmount / propertyValue) * 100;
}

/**
 * Calculate amortization schedule
 * @param {number} loanAmount - Loan amount
 * @param {number} interestRate - Annual interest rate (decimal)
 * @param {number} loanTerm - Loan term in years
 * @returns {Array<Object>} Amortization schedule
 */
export function calculateAmortization(loanAmount, interestRate, loanTerm) {
  const monthlyRate = interestRate / 12;
  const termMonths = loanTerm * 12;
  const monthlyPayment = calculateMonthlyPI(loanAmount, interestRate, loanTerm);
  
  const schedule = [];
  let remainingBalance = loanAmount;
  
  for (let month = 1; month <= termMonths; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;
    
    // Add data points at year intervals (or can be modified for monthly)
    if (month % 12 === 0 || month === 1 || month === termMonths) {
      schedule.push({
        month,
        year: Math.ceil(month / 12),
        payment: monthlyPayment,
        principal: principalPayment,
        interest: interestPayment,
        totalInterest: loanAmount - remainingBalance - (monthlyPayment * (month - 1)) + interestPayment,
        balance: remainingBalance,
        equity: loanAmount - remainingBalance
      });
    }
  }
  
  return schedule;
}

/**
 * Calculate the maximum purchase price based on income, DTI, interest rate, etc.
 * @param {Object} params - Calculation parameters
 * @param {number} params.income - Annual income
 * @param {number} params.maxDTI - Maximum debt-to-income ratio (decimal)
 * @param {number} params.interestRate - Annual interest rate (decimal)
 * @param {number} params.loanTerm - Loan term in years
 * @param {number} params.downPaymentPercent - Down payment percentage
 * @param {number} params.monthlyDebts - Existing monthly debts
 * @param {number} params.propertyTaxRate - Annual property tax rate (decimal)
 * @param {number} params.insuranceRate - Annual insurance rate (decimal)
 * @param {number} params.hoaFees - Monthly HOA fees
 * @param {number} params.monthlyMI - Monthly mortgage insurance
 * @returns {Object} Maximum purchase price and loan amount
 */
export function calculateMaxPurchasePrice(params) {
  const {
    income,
    maxDTI,
    interestRate,
    loanTerm,
    downPaymentPercent,
    monthlyDebts = 0,
    propertyTaxRate = 0.01,
    insuranceRate = 0.0035,
    hoaFees = 0,
    monthlyMI = 0
  } = params;
  
  const monthlyIncome = income / 12;
  const maxMonthlyPayment = calculateMaxPayment(monthlyIncome, maxDTI, monthlyDebts);
  
  // We need to solve for the loan amount iteratively because
  // tax and insurance depend on the property value, which we don't know yet
  let maxLoanAmount = 0;
  let maxPurchasePrice = 0;
  let iteration = 0;
  const maxIterations = 10;
  let converged = false;
  
  // First approximation - assume all payment goes to P&I
  let currentLoanAmount = calculateMaxLoanAmount(maxMonthlyPayment, interestRate, loanTerm);
  let currentPropertyValue = currentLoanAmount / (1 - (downPaymentPercent / 100));
  
  while (!converged && iteration < maxIterations) {
    // Calculate tax and insurance based on current property value
    const monthlyTax = (currentPropertyValue * propertyTaxRate) / 12;
    const monthlyInsurance = (currentPropertyValue * insuranceRate) / 12;
    
    // Calculate available payment for P&I
    const availableForPI = maxMonthlyPayment - monthlyTax - monthlyInsurance - hoaFees - monthlyMI;
    
    // Recalculate loan amount
    const newLoanAmount = calculateMaxLoanAmount(availableForPI, interestRate, loanTerm);
    const newPropertyValue = newLoanAmount / (1 - (downPaymentPercent / 100));
    
    // Check for convergence
    if (Math.abs(newLoanAmount - currentLoanAmount) < 1000) {
      converged = true;
      maxLoanAmount = newLoanAmount;
      maxPurchasePrice = newPropertyValue;
    }
    
    currentLoanAmount = newLoanAmount;
    currentPropertyValue = newPropertyValue;
    iteration++;
  }
  
  return {
    maxPurchasePrice,
    maxLoanAmount,
    downPayment: maxPurchasePrice - maxLoanAmount,
    monthlyPI: calculateMonthlyPI(maxLoanAmount, interestRate, loanTerm),
    monthlyTax: (maxPurchasePrice * propertyTaxRate) / 12,
    monthlyInsurance: (maxPurchasePrice * insuranceRate) / 12,
    monthlyMI,
    totalMonthlyPayment: calculateMonthlyPI(maxLoanAmount, interestRate, loanTerm) + 
                         (maxPurchasePrice * propertyTaxRate) / 12 +
                         (maxPurchasePrice * insuranceRate) / 12 + 
                         hoaFees + 
                         monthlyMI
  };
}
