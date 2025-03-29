import DataService from '../../services/data-service.js';
// Potential future import: import * as DateUtils from '../utils/date-utils.js'; // For complex date logic

/**
 * Calculates the value of a fee based on its definition and input parameters.
 * Handles various calculation methods including tiered structures and percentages.
 *
 * @param {object} feeDefinition - The fee definition object from closing_costs.json.
 * @param {MortgageInput} userInput - The user's input.
 * @param {object} loanDetails - Details about the calculated loan.
 * @returns {number} The calculated fee amount.
 * @throws {Error} If the calculation method is unknown or data is missing.
 */
function calculateFeeAmount(feeDefinition, userInput, loanDetails) {
    const { purchasePrice, loanAmount, points = 0, /* other inputs like sqFt, borrowerCount */ } = userInput;
    const method = feeDefinition.calculationMethod;

    switch (method) {
        case 'fixed':
            return feeDefinition.baseAmount ?? feeDefinition.typicalAmount ?? 0; // Use baseAmount if available from research
        case 'percentageLoanAmount':
            return loanAmount * (feeDefinition.percentage ?? 0);
        case 'percentagePurchasePrice':
            return purchasePrice * (feeDefinition.percentage ?? 0);
        case 'points':
            // Points value is directly from user input, but cost is calculated here if needed elsewhere
            // This calculation might be redundant if points cost is handled directly in cash-to-close
            return loanAmount * (feeDefinition.pointCostPercent ?? 0.01) * points;
        case 'tieredLoanAmount':
        case 'tieredPurchasePrice':
        case 'tieredPercentageLoanAmount': {
            const baseValue = method === 'tieredLoanAmount' ? loanAmount : purchasePrice;
            let calculatedAmount = feeDefinition.defaultAmount ?? 0; // Use default if no tiers match or defined
            if (feeDefinition.tiers) {
                for (const tier of feeDefinition.tiers.sort((a, b) => a.upTo - b.upTo)) {
                    if (baseValue <= tier.upTo) {
                        if (method === 'tieredPercentageLoanAmount') {
                            calculatedAmount = baseValue * (tier.percentage ?? 0);
                            // Apply min percentage if applicable
                            if (feeDefinition.minPercentage && calculatedAmount < baseValue * feeDefinition.minPercentage) {
                                calculatedAmount = baseValue * feeDefinition.minPercentage;
                            }
                            // Apply max percentage if applicable (though less common for origination)
                             if (feeDefinition.maxPercentage && calculatedAmount > baseValue * feeDefinition.maxPercentage) {
                                calculatedAmount = baseValue * feeDefinition.maxPercentage;
                            }
                        } else {
                            calculatedAmount = tier.amount;
                        }
                        break; // Found the correct tier
                    }
                }
            }
             // Handle amounts exceeding the last tier if defaultAmount wasn't suitable
             if (baseValue > (feeDefinition.tiers?.[feeDefinition.tiers.length - 1]?.upTo ?? 0) && feeDefinition.defaultAmount) {
                 calculatedAmount = feeDefinition.defaultAmount;
             } else if (baseValue > (feeDefinition.tiers?.[feeDefinition.tiers.length - 1]?.upTo ?? 0) && feeDefinition.perAdditional100k) {
                 // Handle perAdditional logic if present (e.g., Title Insurance)
                 const lastTier = feeDefinition.tiers[feeDefinition.tiers.length - 1];
                 const amountOverLastTier = baseValue - lastTier.upTo;
                 const additionalIncrements = Math.ceil(amountOverLastTier / 100000);
                 calculatedAmount = lastTier.amount + (additionalIncrements * feeDefinition.perAdditional100k);
             } else if (baseValue > (feeDefinition.tiers?.[feeDefinition.tiers.length - 1]?.upTo ?? 0) && feeDefinition.perAdditional250k) {
                 // Handle perAdditional logic if present (e.g., Attorney Fee)
                 const lastTier = feeDefinition.tiers[feeDefinition.tiers.length - 1];
                 const amountOverLastTier = baseValue - lastTier.upTo;
                 const additionalIncrements = Math.ceil(amountOverLastTier / 250000);
                 calculatedAmount = lastTier.amount + (additionalIncrements * feeDefinition.perAdditional250k);
             }

            // Apply max amount cap if defined
            if (feeDefinition.maxAmount && calculatedAmount > feeDefinition.maxAmount) {
                calculatedAmount = feeDefinition.maxAmount;
            }
             // Apply base adjustment from state variations if present
             if (feeDefinition.baseAdjustment) {
                 calculatedAmount += feeDefinition.baseAdjustment;
             }
             // Apply premium adjustment factor from state variations if present
             if (feeDefinition.premiumAdjustmentFactor) {
                 calculatedAmount *= feeDefinition.premiumAdjustmentFactor;
             }

            return calculatedAmount > 0 ? calculatedAmount : 0; // Ensure non-negative
        }
        case 'perBorrower': {
            const borrowerCount = 1; // Assuming 1 borrower for now, needs input enhancement
            return (feeDefinition.baseAmount ?? 0) + Math.max(0, borrowerCount - 1) * (feeDefinition.perCoBorrowerAmount ?? 0);
        }
         case 'perPage': {
            const estimatedPages = 20; // Placeholder - needs better estimation or input
            const baseAmount = feeDefinition.baseAmount ?? 0;
            const perPageAmount = feeDefinition.perPageAmount ?? 0;
            const includedPages = 5; // Example from research
            return baseAmount + Math.max(0, estimatedPages - includedPages) * perPageAmount;
         }
         case 'tieredSqFt': {
             const sqFt = userInput.sqFt ?? 2000; // Placeholder - needs input
             let amount = 0;
              if (feeDefinition.tiers) {
                for (const tier of feeDefinition.tiers.sort((a, b) => a.upTo - b.upTo)) {
                    if (sqFt <= tier.upTo) {
                        amount = tier.amount;
                        break;
                    }
                }
             }
             // Handle amounts exceeding the last tier
             if (sqFt > (feeDefinition.tiers?.[feeDefinition.tiers.length - 1]?.upTo ?? 0) && feeDefinition.perAdditional1000SqFt) {
                 const lastTier = feeDefinition.tiers[feeDefinition.tiers.length - 1];
                 const sqFtOverLastTier = sqFt - lastTier.upTo;
                 const additionalIncrements = Math.ceil(sqFtOverLastTier / 1000);
                 amount = lastTier.amount + (additionalIncrements * feeDefinition.perAdditional1000SqFt);
             } else if (!amount && feeDefinition.defaultAmount) {
                 amount = feeDefinition.defaultAmount; // Fallback if no tiers matched
             }

             // Apply age adjustment
             if (feeDefinition.ageAdjustment && (userInput.propertyAge ?? 0) > feeDefinition.ageAdjustment.overYears) {
                 amount += feeDefinition.ageAdjustment.amount;
             }
              // Apply base adjustment from state variations
             if (feeDefinition.baseAdjustment) {
                 amount += feeDefinition.baseAdjustment;
             }
             return amount > 0 ? amount : 0;
         }
         case 'fixedComplexity':
         case 'tieredComplexity': {
             // Placeholder: Assume 'baseAmount' for standard, 'complexAmount' if complexity flag is set (needs input)
             const isComplex = false; // Needs input flag
             let amount = isComplex ? (feeDefinition.complexAmount ?? feeDefinition.baseAmount ?? 0)
                                    : (feeDefinition.baseAmount ?? 0);
             // Apply base adjustment from state variations
             if (feeDefinition.baseAdjustment) {
                 amount += feeDefinition.baseAdjustment;
             }
             return amount > 0 ? amount : 0;
         }
        case 'stateRegulated':
            // Placeholder: Needs specific logic for state-regulated fees (e.g., TX title insurance)
            console.warn(`Calculation method 'stateRegulated' not fully implemented for fee: ${feeDefinition.notes}`);
            return 0; // Return 0 or a default estimate?

        default:
            console.warn(`Unknown calculation method: ${method}`);
            return feeDefinition.typicalAmount && typeof feeDefinition.typicalAmount === 'number'
                   ? feeDefinition.typicalAmount
                   : 0; // Fallback to numeric typicalAmount or 0
    }
}


/**
 * Calculates an individual closing cost fee, checking for overrides first.
 *
 * @param {string} feeName - The name of the fee (e.g., "Appraisal Fee").
 * @param {object} baseFeeData - The base fee definition from closing_costs.json.
 * @param {MortgageInput} userInput - The user's input, including overrides.
 * @param {object} loanDetails - Details about the calculated loan.
 * @param {object} stateVariations - State-specific overrides for fees.
 * @returns {ClosingCostDetails} An object containing the fee amount and override status.
 */
function calculateIndividualFee(feeName, baseFeeData, userInput, loanDetails, stateVariations) {
    const { overrides = {} } = userInput;

    // --- Check for User Override ---
    // Map common override keys to fee names (this might need expansion)
    const overrideKeyMap = {
        "Appraisal Fee": "AppraisalFee",
        "Lender's Title Insurance": "LenderTitleInsurance",
        "Owner's Title Insurance": "OwnerTitleInsurance",
        "Loan Origination Fee": "OriginationFeeAmount"
        // Add other mappings as needed
    };
    const overrideKey = overrideKeyMap[feeName] ?? feeName.replace(/\s+/g, ''); // Default to camelCase if no map
    const overrideValue = overrides[overrideKey];

    if (overrideValue !== undefined && overrideValue !== null && typeof overrideValue === 'number' && overrideValue >= 0) {
        return {
            amount: overrideValue,
            isOverridden: true,
            regZFinanceCharge: baseFeeData.regZFinanceCharge ?? false,
            calculationMethod: 'Override'
        };
    }

    // --- Apply State Variations ---
    let feeData = { ...baseFeeData }; // Start with base data
    const stateFeeOverride = stateVariations?.fees?.[feeName];
    if (stateFeeOverride) {
        // Deep merge state overrides onto base fee data
        // Simple merge for now, might need more sophisticated deep merge later
        feeData = { ...feeData, ...stateFeeOverride };
    }

    // --- Calculate Estimated Amount ---
    try {
        const calculatedAmount = calculateFeeAmount(feeData, userInput, loanDetails);
        return {
            amount: Math.round(calculatedAmount * 100) / 100, // Round to 2 decimal places
            isOverridden: false,
            regZFinanceCharge: feeData.regZFinanceCharge ?? false,
            calculationMethod: feeData.calculationMethod ?? 'Unknown'
        };
    } catch (error) {
        console.error(`Error calculating fee "${feeName}":`, error);
        return {
            amount: 0,
            isOverridden: false,
            regZFinanceCharge: feeData.regZFinanceCharge ?? false,
            calculationMethod: 'Error',
            error: error.message
        };
    }
}

// --- Placeholder Prepaid Calculation Functions ---

/**
 * Calculates prepaid interest.
 * Requires closingDate, loanAmount, interestRate. Needs date logic.
 */
function calculatePrepaidInterest(userInput, loanDetails) {
    const { closingDate } = userInput;
    const { loanAmount, interestRate } = loanDetails; // interestRate is annual

    if (!closingDate || !loanAmount || !interestRate) return 0;

    try {
        // Placeholder logic - needs robust date calculations
        const closeDt = new Date(closingDate + 'T00:00:00'); // Ensure parsing as local date
        const year = closeDt.getFullYear();
        const month = closeDt.getMonth();
        const dayOfMonth = closeDt.getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysRemaining = daysInMonth - dayOfMonth + 1; // Include closing day

        if (daysRemaining <= 0 || daysRemaining > 31) return 0; // Basic validation

        const dailyRate = (interestRate / 100) / 365; // Assuming interestRate is percentage
        const prepaidInterest = loanAmount * dailyRate * daysRemaining;

        return Math.round(prepaidInterest * 100) / 100;
    } catch (e) {
        console.error("Error calculating prepaid interest:", e);
        return 0;
    }
}

/**
 * Calculates prepaid Homeowners Insurance (HOI).
 * Checks for overrides. Needs purchasePrice/HOI rate, cushion months.
 */
function calculatePrepaidHOI(userInput, closingCostData) {
    const { purchasePrice, overrides = {} } = userInput;
    const hoiSettings = closingCostData?.prepaids?.homeownersInsurance;
    if (!hoiSettings) return 0;

    let annualPremium = 0;
    let isOverridden = false;

    // Check override first (FR-CC-06)
    if (overrides.AnnualHOI !== undefined && typeof overrides.AnnualHOI === 'number' && overrides.AnnualHOI >= 0) {
        annualPremium = overrides.AnnualHOI;
        isOverridden = true;
    } else if (purchasePrice && hoiSettings.typicalAnnualPremiumFormula) {
        // Estimate based on formula in data file
        const formula = hoiSettings.typicalAnnualPremiumFormula;
        annualPremium = (purchasePrice * formula.scalingFactor) || formula.basePremium; // Simplified linear scaling
        // Apply state premium adjustment factor if available (needs state context here)
    } else if (purchasePrice && hoiSettings.typicalAnnualRate) {
         // Fallback to simple rate if formula not present
         annualPremium = purchasePrice * hoiSettings.typicalAnnualRate;
    }


    const monthsPrepaid = hoiSettings.monthsPrepaid ?? 12;
    const cushionMonths = hoiSettings.escrowCushionMonths ?? 0;
    const totalMonthsToCollect = monthsPrepaid + cushionMonths;
    const prepaidAmount = (annualPremium / 12) * totalMonthsToCollect;

    return {
        amount: Math.round(prepaidAmount * 100) / 100,
        isOverridden: isOverridden,
        annualAmount: annualPremium // Store for monthly calculation later
    };
}

/**
 * Calculates prepaid Property Taxes.
 * Checks for overrides. Needs purchasePrice/tax rate, tax cycle, cushion months, closing date.
 * Implements RESPA-compliant logic for calculating escrow reserves.
 */
function calculatePrepaidTaxes(userInput, locationFactors, closingCostData) {
    const { purchasePrice, closingDate, overrides = {} } = userInput;
    const taxSettings = closingCostData?.prepaids?.propertyTaxes;

    // Validate essential inputs
    if (!taxSettings || !closingDate || !/^\d{4}-\d{2}-\d{2}$/.test(closingDate) || !locationFactors?.taxCycle?.dueDates || locationFactors.taxCycle.dueDates.length === 0) {
        console.warn("Missing data for prepaid tax calculation: closingDate, taxSettings, or locationFactors.taxCycle details.");
        // Determine annual amount even if reserves can't be calculated
        let annualTaxAmount = 0;
        let isOverridden = false;
        if (overrides.AnnualPropertyTaxAmount !== undefined && typeof overrides.AnnualPropertyTaxAmount === 'number' && overrides.AnnualPropertyTaxAmount >= 0) {
            annualTaxAmount = overrides.AnnualPropertyTaxAmount;
            isOverridden = true;
        } else if (purchasePrice && locationFactors?.rate) {
            annualTaxAmount = purchasePrice * locationFactors.rate;
        }
        return { amount: 0, isOverridden: isOverridden, annualAmount: annualTaxAmount };
    }

    let annualTaxAmount = 0;
    let isOverridden = false;

    // Determine Annual Tax Amount (Override or Estimate)
    if (overrides.AnnualPropertyTaxAmount !== undefined && typeof overrides.AnnualPropertyTaxAmount === 'number' && overrides.AnnualPropertyTaxAmount >= 0) {
        annualTaxAmount = overrides.AnnualPropertyTaxAmount;
        isOverridden = true;
    } else if (purchasePrice && locationFactors?.rate) {
        annualTaxAmount = purchasePrice * locationFactors.rate;
    }

    if (annualTaxAmount <= 0) {
        return { amount: 0, isOverridden: isOverridden, annualAmount: 0 };
    }

    // --- Accurate Reserve Calculation (RESPA Aggregate Adjustment Method) ---
    const cushionMonths = taxSettings.escrowCushionMonths ?? 0; // Typically 2 months
    const monthlyTax = annualTaxAmount / 12;
    const closeDt = new Date(closingDate + 'T00:00:00'); // Use local time
    const closeMonth = closeDt.getMonth(); // 0-11
    const closeYear = closeDt.getFullYear();

    // Parse and sort due dates (assuming MM-DD or YYYY-MM-DD format)
    const dueDates = locationFactors.taxCycle.dueDates
        .map(d => {
            const parts = d.split('-');
            if (parts.length === 3) return { month: parseInt(parts[1], 10) - 1, day: parseInt(parts[2], 10) };
            if (parts.length === 2) return { month: parseInt(parts[0], 10) - 1, day: parseInt(parts[1], 10) };
            return null;
        })
        .filter(d => d !== null)
        .sort((a, b) => a.month - b.month || a.day - b.day);

    // --- RESPA Aggregate Escrow Analysis ---
    // Project escrow balance over the next 12 months starting from the first payment date.
    // First payment date is typically the 1st of the month AFTER the month following closing.
    const firstPaymentMonth = (closeMonth + 2) % 12;
    const firstPaymentYear = closeMonth >= 10 ? closeYear + 1 : closeYear;

    let currentBalance = 0; // This is what we need to determine (the initial deposit)
    let minBalance = Infinity; // Track the lowest projected balance

    const paymentDatesAndAmounts = {}; // Store tax payment amounts by month index (0-11)

    // Determine tax payment amounts and months
    const paymentsPerYear = dueDates.length;
    const amountPerPayment = annualTaxAmount / paymentsPerYear;

    dueDates.forEach(dueDate => {
        paymentDatesAndAmounts[dueDate.month] = (paymentDatesAndAmounts[dueDate.month] || 0) + amountPerPayment;
    });

    // Simulate escrow balance for 14 months (to cover edge cases and cushion)
    for (let i = 0; i < 14; i++) {
        const currentMonthIndex = (firstPaymentMonth + i) % 12;
        const currentYear = firstPaymentYear + Math.floor((firstPaymentMonth + i) / 12);

        // 1. Add borrower's monthly payment
        currentBalance += monthlyTax;

        // 2. Subtract tax disbursement if due this month
        if (paymentDatesAndAmounts[currentMonthIndex]) {
             // Check if the due date's day has passed relative to the *start* of the month
             // Lenders typically pay before the actual due date. Assume payment happens at the start of the due month.
             currentBalance -= paymentDatesAndAmounts[currentMonthIndex];
        }

        // 3. Track minimum balance *after* potential disbursement
        minBalance = Math.min(minBalance, currentBalance);
    }

    // The required initial deposit is the amount needed to ensure the minimum balance
    // doesn't fall below the negative of the allowed cushion.
    // Required Initial Deposit = (Cushion Amount) - (Lowest Projected Balance)
    const cushionAmount = monthlyTax * cushionMonths;
    let initialDeposit = cushionAmount - minBalance;

    // Ensure deposit is not negative (can happen if cushion is large and taxes low/infrequent)
    initialDeposit = Math.max(0, initialDeposit);

    // Round the final amount
    const prepaidAmount = Math.round(initialDeposit * 100) / 100;

    // console.log(`Closing: ${closeDt.toDateString()}, First Pmt: ${firstPaymentYear}-${firstPaymentMonth + 1}-01, Monthly Tax: ${monthlyTax.toFixed(2)}, Cushion: ${cushionMonths}, Min Balance: ${minBalance.toFixed(2)}, Initial Deposit: ${initialDeposit.toFixed(2)}`);

    return {
        amount: prepaidAmount,
        isOverridden: isOverridden,
        annualAmount: annualTaxAmount // Store for monthly calculation later
    };
}


/**
 * Estimates all closing costs and prepaids for a given mortgage scenario.
 *
 * @param {MortgageInput} userInput - The user's input, including potential overrides.
 * @param {object} loanDetails - Details about the calculated loan (e.g., loanAmount, interestRate).
 * @param {object} locationFactors - Location-specific data (e.g., propertyTaxRate, taxCycle).
 * @returns {Promise<ClosingCostsBreakdown>} An object containing the breakdown of costs.
 */
export async function estimateAllCosts(userInput, loanDetails, locationFactors) {
    const { location } = userInput;
    let stateCode = 'default'; // Default to top-level if location is simple
    if (location && location.includes(',')) {
        stateCode = location.split(',')[0].trim().toUpperCase();
    } else if (location) {
        stateCode = location.trim().toUpperCase();
    }

    const closingCostData = await DataService.getClosingCostsData();
    const stateVariations = closingCostData.stateVariations?.[stateCode] ?? {};

    let totalEstimatedCosts = 0;
    let totalPrepaids = 0;
    const details = {};

    // Calculate individual fees
    for (const feeName in closingCostData.fees) {
        const baseFeeData = closingCostData.fees[feeName];
        const feeDetail = calculateIndividualFee(feeName, baseFeeData, userInput, loanDetails, stateVariations);
        details[feeName] = feeDetail;
        if (!feeDetail.error) {
            totalEstimatedCosts += feeDetail.amount;
        }
    }

    // Calculate Prepaids
    const prepaidInterest = calculatePrepaidInterest(userInput, loanDetails);
    const prepaidHOIResult = calculatePrepaidHOI(userInput, closingCostData);
    const prepaidTaxesResult = calculatePrepaidTaxes(userInput, locationFactors, closingCostData);

    details['Prepaid Interest'] = {
        amount: prepaidInterest,
        isOverridden: false, // Cannot be overridden directly
        regZFinanceCharge: closingCostData.prepaids.interest.regZFinanceCharge ?? true,
        calculationMethod: 'perDiem'
    };
    details['Prepaid Homeowners Insurance'] = {
        amount: prepaidHOIResult.amount,
        isOverridden: prepaidHOIResult.isOverridden,
        regZFinanceCharge: closingCostData.prepaids.homeownersInsurance.regZFinanceCharge ?? false,
        calculationMethod: 'escrow'
    };
    details['Prepaid Property Taxes'] = {
        amount: prepaidTaxesResult.amount,
        isOverridden: prepaidTaxesResult.isOverridden,
        regZFinanceCharge: closingCostData.prepaids.propertyTaxes.regZFinanceCharge ?? false,
        calculationMethod: 'escrow'
    };

    totalPrepaids = prepaidInterest + prepaidHOIResult.amount + prepaidTaxesResult.amount;

    // Add annual amounts to details for potential use elsewhere (e.g., monthly calculations)
    details['Annual Property Tax'] = { amount: prepaidTaxesResult.annualAmount, isOverridden: prepaidTaxesResult.isOverridden };
    details['Annual Homeowners Insurance'] = { amount: prepaidHOIResult.annualAmount, isOverridden: prepaidHOIResult.isOverridden };


    return {
        totalEstimated: Math.round(totalEstimatedCosts * 100) / 100,
        totalPrepaids: Math.round(totalPrepaids * 100) / 100,
        details: details,
        // Expose individual prepaids for clarity if needed by consumers of this function
        prepaidInterest: prepaidInterest,
        prepaidTaxes: prepaidTaxesResult.amount,
        prepaidHOI: prepaidHOIResult.amount
        // Include cushion months etc. if needed
    };
}
