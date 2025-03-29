/**
 * @typedef {object} MortgageInput
 * @property {number} income - Annual income.
 * @property {string} location - Property location (e.g., "State" or "State, County").
 * @property {number} purchasePrice - Purchase price of the property. // Assuming this exists or is needed
 * @property {number} downPayment - Down payment amount. // Assuming this exists or is needed
 * @property {number} ltv - Loan-to-value ratio (percentage). Calculated if purchasePrice and downPayment provided.
 * @property {number} loanAmount - Loan amount. Calculated if purchasePrice and downPayment provided. // Assuming this exists or is needed
 * @property {number} ficoScore - Credit score (e.g., 740).
 * @property {string} loanType - Loan type ('Conventional', 'FHA', 'VA', 'USDA').
 * @property {number} [loanTerm=30] - Loan term in years (e.g., 30).
 * @property {number} [hoaFees=0] - Monthly HOA fees.
 * @property {number} [points=0] - Discount points paid. // Assuming this exists or is needed
 * @property {string} [closingDate] - Estimated closing date (YYYY-MM-DD). // Needed for prepaids
 * @property {number} [sellerCredits=0] - Seller credits towards closing costs. // Assuming this exists or is needed
 * @property {number} [lenderCredits=0] - Lender credits towards closing costs (often from rate). // Assuming this exists or is needed
 * @property {number} [annualPropertyTaxRate] - Estimated annual property tax rate (percentage). // Used if override not provided
 * @property {number} [annualHOIRate] - Estimated annual homeowners insurance rate (percentage of property value). // Used if override not provided
 * @property {object} [overrides] - Optional user-provided known values.
 * @property {number} [overrides.AnnualHOI] - User's known annual HOI premium.
 * @property {number} [overrides.AnnualPropertyTaxAmount] - User's known annual property tax amount.
 * @property {number} [overrides.AppraisalFee] - User's known appraisal fee.
 * @property {number} [overrides.LenderTitleInsurance] - User's known lender's title premium.
 * @property {number} [overrides.OwnerTitleInsurance] - User's known owner's title premium.
 * @property {number} [overrides.OriginationFeeAmount] - User's known origination fee amount (overrides % calc).
 * // Add other specific closing cost keys here as overrides are enabled
 */

/**
 * @typedef {object} ClosingCostDetails
 * @property {number} amount - The calculated or overridden cost amount.
 * @property {boolean} isOverridden - Flag indicating if the amount came from user override.
 * @property {boolean} [regZFinanceCharge] - Flag indicating if this fee counts towards True APR finance charges. // Corrected name based on usage
 * @property {string} [calculationMethod] - How the fee was calculated (e.g., 'Estimate', 'Override', 'Percentage'). // Optional detail
 */

/**
 * @typedef {object} ClosingCostsBreakdown
 * @property {number} totalEstimated - Total estimated closing costs (excluding prepaids).
 * @property {number} totalPrepaids - Total estimated prepaid items (interest, taxes, insurance).
 * @property {object.<string, ClosingCostDetails>} details - Dictionary mapping fee names to their details.
 * @property {number} prepaidInterest - Calculated prepaid interest.
 * @property {number} prepaidTaxes - Calculated prepaid property taxes.
 * @property {number} prepaidHOI - Calculated prepaid homeowners insurance.
 * @property {number} taxEscrowCushionMonths - Number of cushion months for tax escrow. // Example detail
 * @property {number} hoiEscrowCushionMonths - Number of cushion months for HOI escrow. // Example detail
 */

/**
 * @typedef {object} CalculationResult
 * @property {boolean} eligible - Whether the user is eligible for this loan scenario.
 * @property {string} [reason] - Reason for ineligibility, if applicable.
 * @property {string[]} [alternativeLoanTypes] - Suggested alternative loan types, if applicable.
 * @property {number} ficoScore - FICO score used in calculation.
 * @property {number} ltv - LTV used in calculation.
 * @property {string} loanType - Loan type used.
 * @property {number} loanAmount - The calculated loan amount.
 * @property {number} purchasingPower - Estimated maximum purchasing power (if applicable, might be deprecated for direct calculation).
 * @property {number} monthlyPI - Monthly Principal & Interest payment.
 * @property {number} monthlyTaxes - Estimated monthly property taxes.
 * @property {number} monthlyHOI - Estimated monthly homeowners insurance.
 * @property {number} monthlyMI - Estimated monthly mortgage insurance (if applicable).
 * @property {number} monthlyHOA - Monthly HOA fees (from input).
 * @property {number} monthlyPayment - Total estimated monthly payment (PITI + MI + HOA).
 * @property {number} interestRate - The calculated note interest rate (%).
 * @property {number} downPayment - Down payment amount used.
 * @property {ClosingCostsBreakdown} closingCosts - Detailed breakdown of estimated closing costs and prepaids.
 * @property {number} cashToClose - Estimated total cash needed at closing.
 * @property {number} repAPR - Representative APR (calculated based on estimated finance charges).
 * @property {number|null} trueAPR - Placeholder for future True APR calculation (null initially).
 * @property {string} [trueAPRDisclaimer] - Disclaimer for True APR (once implemented).
 * @property {object} [miDetails] - Details about mortgage insurance calculation. // Example detail
 * @property {object} [llpaDetails] - Details about LLPA calculation. // Example detail
 */

/**
 * Mortgage Calculator
 *
 * Main calculator engine for mortgage calculations.
 */
import DataService from '../services/data-service.js';
import LoanFactory from './loan-types/loan-factory.js';
import { calculateEligibility } from './utils/eligibility.js';
import { estimateAllCosts } from './adjustments/closing-costs.js'; // Import the new module

/**
 * Main mortgage calculator class
 */
class MortgageCalculator {
  /**
   * Create a new mortgage calculator
   */
  constructor() {
    this.dataService = DataService;
    this.loanFactory = new LoanFactory();
    this.calculationCache = new Map();
  }

  /**
   * Calculate mortgage details for the given input parameters.
   * Assumes input includes necessary fields like purchasePrice, downPayment, etc.
   * @param {MortgageInput} userInput - User input parameters conforming to the MortgageInput type.
   * @returns {Promise<CalculationResult>} Calculation results conforming to the CalculationResult type.
   */
  async calculate(userInput) {
    try {
      // Validate input parameters
      this._validateInput(userInput);

      // Extract input params
      const {
        income,
        location,
        ltv,
        ficoScore,
        loanType,
        hoaFees = 0,
        loanTerm = 30,
        downPayment = 0, // Assume DP is provided or calculated earlier
        sellerCredits = 0,
        lenderCredits = 0
      } = userInput;

      // Check if we have cached results for this input
      const cacheKey = this._getCacheKey(userInput);
      if (this.calculationCache.has(cacheKey)) {
        return this.calculationCache.get(cacheKey);
      }

      // Check eligibility for selected loan type
      const eligibility = calculateEligibility(loanType, userInput);

      if (!eligibility.eligible) {
        return {
          eligible: false,
          reason: eligibility.reason,
          alternativeLoanTypes: eligibility.alternatives,
          ficoScore,
          ltv,
          loanType
        };
      }

      // Get location factors (property tax, insurance)
      const locationFactors = await this.dataService.estimateLocationFactors(location);

      // Create loan calculator instance for the specific loan type
      const loanCalculator = this.loanFactory.createLoanCalculator(loanType);

      // Prepare input for loan calculator, including eligibility results if needed
      const loanCalcInput = {
        income,
        ltv,
        ficoScore,
        loanTerm,
        locationFactors,
        hoaFees,
        purchasePrice: userInput.purchasePrice,
        downPayment: userInput.downPayment,
        // Pass eligibility results specifically needed by loan types (e.g., VA exemption)
        ...(loanType === 'VA' && { isExempt: eligibility.vaFundingFeeWaived ?? false }),
        // Add other eligibility flags if needed by other loan types
      };

      // Calculate loan details
      const loanDetails = await loanCalculator.calculateLoan(loanCalcInput);

      // --- Estimate Closing Costs ---
      const closingCostsBreakdown = await estimateAllCosts(userInput, loanDetails, locationFactors);

      // --- Calculate Monthly Payments ---
      const monthlyPI = loanDetails.monthlyPI ?? 0; // Principal & Interest from loan calc
      const monthlyMI = loanDetails.monthlyMI ?? 0; // Mortgage Insurance from loan calc
      // Get Taxes & Insurance from closing cost details (annual / 12)
      const annualTaxes = closingCostsBreakdown.details['Annual Property Tax']?.amount ?? 0;
      const annualHOI = closingCostsBreakdown.details['Annual Homeowners Insurance']?.amount ?? 0;
      const monthlyTaxes = annualTaxes / 12;
      const monthlyHOI = annualHOI / 12;
      // Total Monthly Payment
      const totalMonthlyPayment = monthlyPI + monthlyTaxes + monthlyHOI + monthlyMI + hoaFees;

      // --- Calculate Cash To Close (FR-CTC-01) ---
      // Assumes downPayment is correctly passed in userInput
      const finalDP = userInput.downPayment ?? 0; // Or calculate if needed: purchasePrice - loanAmount
      const finalTotalEstimatedCosts = closingCostsBreakdown.totalEstimated ?? 0;
      const finalTotalPrepaids = closingCostsBreakdown.totalPrepaids ?? 0;
      const finalSellerCredits = userInput.sellerCredits ?? 0;
      const finalLenderCredits = userInput.lenderCredits ?? 0;
      const cashToClose = finalDP + finalTotalEstimatedCosts + finalTotalPrepaids - finalSellerCredits - finalLenderCredits;

      // --- Calculate Representative APR (RepAPR) --- Phase 4
      let totalFinanceCharges = 0;

      // Sum finance charges from closing costs based on the regZFinanceCharge flag
      for (const feeName in closingCostsBreakdown.details) {
          const detail = closingCostsBreakdown.details[feeName];
          // Check if the detail exists, has the flag set to true, and no error occurred
          if (detail && detail.regZFinanceCharge === true && !detail.error) {
              totalFinanceCharges += detail.amount;
          }
      }

      // Add Points cost (Points are always a finance charge)
      const pointsCost = (userInput.points ?? 0) * 0.01 * loanDetails.loanAmount;
      totalFinanceCharges += pointsCost;

      // Add financed upfront MI/Funding fees (if applicable, these are finance charges)
      totalFinanceCharges += loanDetails.upfrontFee ?? 0;

      // Simple APR Approximation: Spread finance charges over term
      // TODO: Replace this simple approximation with a more accurate APR calculation method
      //       (e.g., using a rate solver like Newton-Raphson or a financial library function)
      //       that properly accounts for the time value of money according to Reg Z principles,
      //       even for the illustrative RepAPR.
      let repAPR = loanDetails.interestRate; // Start with the note rate
      if (loanDetails.loanAmount > 0 && loanTerm > 0) {
          // This approximation is very basic and doesn't reflect true APR calculation methods.
          const approxRateIncrease = (totalFinanceCharges / loanTerm / loanDetails.loanAmount) * 100;
          repAPR += approxRateIncrease;
      }


      // --- Assemble Final Results ---
      const results = {
        eligible: true,
        ficoScore,
        ltv: loanDetails.ltv ?? ltv, // Use LTV possibly adjusted by loan calc (e.g., FHA MIP financing)
        loanType,
        loanAmount: loanDetails.loanAmount,
        purchasingPower: loanDetails.purchasingPower, // Keep if still relevant, might need recalculation
        monthlyPI: monthlyPI,
        monthlyTaxes: Math.round(monthlyTaxes * 100) / 100,
        monthlyHOI: Math.round(monthlyHOI * 100) / 100,
        monthlyMI: monthlyMI,
        monthlyHOA: hoaFees,
        monthlyPayment: Math.round(totalMonthlyPayment * 100) / 100,
        interestRate: loanDetails.interestRate,
        downPayment: finalDP, // Use the final DP value
        closingCosts: closingCostsBreakdown, // Add the detailed breakdown
        cashToClose: Math.round(cashToClose * 100) / 100,
        repAPR: Math.round(repAPR * 1000) / 1000, // Calculate RepAPR, round to 3 decimals
        trueAPR: null, // Placeholder for future True APR
        trueAPRDisclaimer: null, // Placeholder
        miDetails: loanDetails.miDetails, // Pass through details if provided
        llpaDetails: loanDetails.llpaDetails // Pass through details if provided
      };

      // Cache the results
      this.calculationCache.set(cacheKey, results);

      return results;
    } catch (error) {
      console.error('Error in mortgage calculation:', error);
      throw new CalculationError('Failed to calculate mortgage details', { cause: error });
    }
  }

  /**
   * Calculate multiple scenarios for the 3D visualization
   * @param {Object} baseInput - Base input parameters
   * @returns {Promise<Array>} Array of calculation results for different scenarios
   */
  async calculatePowerMatrix(baseInput) {
    // Define the FICO and LTV ranges for the grid
    const ficoScores = [580, 620, 660, 700, 740, 780, 820];

    // Use loan-type specific LTV ranges
    let ltvValues;
    if (baseInput.loanType === 'VA' || baseInput.loanType === 'USDA') {
      // VA and USDA can go up to 100% LTV
      ltvValues = [70, 75, 80, 85, 90, 95, 100];
    } else if (baseInput.loanType === 'FHA') {
      // FHA typically goes up to 96.5%
      ltvValues = [70, 75, 80, 85, 90, 95, 96.5];
    } else {
      // Conventional
      ltvValues = [70, 75, 80, 85, 90, 95, 97];
    }

    const results = [];

    // Calculate for each combination
    for (const ficoScore of ficoScores) {
      for (const ltv of ltvValues) {
        const input = {
          ...baseInput,
          ficoScore,
          ltv
        };

        try {
          const result = await this.calculate(input);

          results.push({
            ficoScore,
            ltv,
            loanType: baseInput.loanType,
            purchasingPower: result.eligible ? result.purchasingPower : 0,
            monthlyPayment: result.eligible ? result.monthlyPayment : 0,
            interestRate: result.eligible ? result.interestRate : 0,
            downPayment: result.eligible ? result.downPayment : 0,
            eligible: result.eligible,
            reason: result.eligible ? null : result.reason
          });
        } catch (error) {
          console.error(`Error calculating for FICO ${ficoScore}, LTV ${ltv}:`, error);

          results.push({
            ficoScore,
            ltv,
            loanType: baseInput.loanType,
            purchasingPower: 0,
            eligible: false,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Validate user input
   * @param {Object} input - User input
   * @private
   */
  _validateInput(input) {
    const { income, ltv, ficoScore, loanType } = input;

    // Validate income
    if (typeof income !== 'number' || income <= 0) {
      throw new Error('Income must be a positive number');
    }

    // Validate Purchase Price & Down Payment (Crucial for new calcs)
     if (typeof input.purchasePrice !== 'number' || input.purchasePrice <= 0) {
       throw new Error('Purchase Price must be a positive number');
     }
     if (typeof input.downPayment !== 'number' || input.downPayment < 0) {
       throw new Error('Down Payment must be a non-negative number');
     }
     // Potentially recalculate LTV here if needed based on PP/DP
     // const calculatedLTV = ((input.purchasePrice - input.downPayment) / input.purchasePrice) * 100;
     // if (Math.abs(calculatedLTV - ltv) > 0.1) { /* Handle discrepancy or trust input LTV */ }


    // Validate LTV
    if (typeof ltv !== 'number' || ltv < 50 || ltv > 100) {
      throw new Error('LTV must be a number between 50 and 100');
    }

    // Validate FICO score
    if (typeof ficoScore !== 'number' || ficoScore < 500 || ficoScore > 850) {
      throw new Error('FICO score must be a number between 500 and 850');
    }

    // Validate Closing Date if provided (basic format check)
    if (input.closingDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.closingDate)) {
        throw new Error('Closing Date must be in YYYY-MM-DD format');
    }

    // Validate loan type
    const validLoanTypes = ['Conventional', 'FHA', 'VA', 'USDA'];
    if (!validLoanTypes.includes(loanType)) {
      throw new Error(`Invalid loan type: ${loanType}. Must be one of: ${validLoanTypes.join(', ')}`);
    }
  }

  /**
   * Generate cache key for input parameters
   * @param {Object} input - Input parameters
   * @returns {string} Cache key
   * @private
   */
  _getCacheKey(input) {
    const { income, ltv, ficoScore, loanType, loanTerm = 30, hoaFees = 0 } = input;
    return `${loanType}_${income}_${ltv}_${ficoScore}_${loanTerm}_${hoaFees}`;
  }

  /**
   * Clear the calculation cache
   */
  clearCache() {
    this.calculationCache.clear();
  }
}

/**
 * Custom error class for calculation errors
 */
class CalculationError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'CalculationError';
  }
}

// Create and export singleton instance
export default new MortgageCalculator();
