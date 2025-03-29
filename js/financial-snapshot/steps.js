// js/financial-snapshot/steps.js
// Defines the content, structure, and logic for each step in the Financial Snapshot workflow

console.log("Financial Snapshot steps definitions loaded.");

// Placeholder for step definitions
// - Array or object containing configuration for each step
//   - Headline
//   - Instructions/Tooltips
//   - Input types (confirmation, text, radio, number)
//   - Options (for radio/select)
//   - Validation rules (if any)
//   - Conditional logic (e.g., for VA step)

export const snapshotSteps = [
    {
        id: 'confirmData',
        headline: 'Verify Your Information',
        fields: [
            { id: 'income', label: 'Gross Monthly Income', type: 'display', format: 'currency' },
            { id: 'fico', label: 'Credit Score Range', type: 'display' },
            { id: 'ltv', label: 'LTV', type: 'display', format: 'percentage' },
            { id: 'loanType', label: 'Loan Type', type: 'display' }
        ],
        buttons: [
            { id: 'continue', text: 'Continue', type: 'primary' }
        ]
    },
    {
        id: 'estimateDebts',
        headline: 'Total Monthly Non-Housing Debts',
        tooltip: 'Include: Car loans, student loans, minimum credit card payments, other installment loans, alimony/child support. Exclude: Rent, utilities.',
        fields: [
            { id: 'estimatedTotalDebts', label: 'Estimated Total Monthly Debts:', type: 'displayWithButtons', format: 'currency', valueSource: 'autofill' } // Value will be autofilled
        ],
        buttons: [
            { id: 'confirmEstimate', text: 'Confirm Estimate', type: 'primary' },
            { id: 'adjustEstimate', text: 'Adjust Estimate', type: 'secondary' }
        ],
        adjustSection: { // Nested section for adjustments
            headline: 'Adjust Monthly Debts',
            fields: [
                { id: 'carPayments', label: 'Car Payments', type: 'numberInput', defaultValue: 0 },
                { id: 'studentLoans', label: 'Student Loans', type: 'numberInput', defaultValue: 0 },
                { id: 'creditCardMinimums', label: 'Credit Card Minimums', type: 'numberInput', defaultValue: 0 },
                { id: 'otherRecurringDebts', label: 'Other Recurring Debts', type: 'numberInput', defaultValue: 0 }
            ],
            totalDisplay: { id: 'adjustedTotalDebts', label: 'Updated Total:' },
            buttons: [
                 { id: 'confirmDebts', text: 'Confirm Debts', type: 'primary' }
            ]
        }
    },
    {
        id: 'liquidAssets',
        headline: 'Liquid Assets After Closing',
        // Removed subtext, will be handled dynamically in UI
        instruction: 'Lenders look at funds remaining *after* your down payment and estimated closing costs. Having extra liquid assets (like cash, stocks, non-retirement funds) can help you qualify for more.',
        closingCostsSection: { // New section definition
            headline: "Estimated Closing Costs Breakdown:",
            items: [ // Placeholder items, calculation done in UI
                { label: "Down Payment", valueKey: "dpAmount" },
                { label: "Est. Loan Costs (Origination, Appraisal, etc.)", percentageKey: "purchasePriceGoal", factor: 0.015 }, // Example 1.5%
                { label: "Est. Taxes & Gov Fees", percentageKey: "purchasePriceGoal", factor: 0.01 }, // Example 1%
                { label: "Est. Prepaid Items (Insurance, Taxes)", percentageKey: "purchasePriceGoal", factor: 0.015 } // Example 1.5%
            ],
            totalLabel: "Total Estimated Funds Needed at Closing:"
        },
        fields: [
             {
                id: 'reservesInstruction', // Added an ID for the instruction related to options
                type: 'instruction', // New type for just displaying text
                text: 'Approximately how much extra liquid assets will you have remaining?'
             },
            {
                id: 'reserves', // Matches key used in calculation logic
                type: 'radioOptions',
                options: [
                    // Values can be simple keys, labels are user-facing
                    { value: 'less_than_2_percent', label: 'Less than 2% of Purchase Price' },
                    { value: '2_to_5_percent', label: '2% - 5% of Purchase Price' },
                    { value: '6_to_10_percent', label: '6% - 10% of Purchase Price' },
                    { value: 'more_than_10_percent', label: 'More than 10% of Purchase Price' },
                    { value: 'prefer_not_to_say', label: 'Prefer Not To Say' }
                ]
            }
        ],
        // No explicit button needed, selection triggers next step (will handle in snapshot.js)
    },
    {
        id: 'employmentDuration',
        headline: 'Employment Duration',
        instruction: 'Select time in current job or field:',
        fields: [
            {
                id: 'employment', // Matches key used in calculation logic
                type: 'radioOptions',
                options: [
                    { value: 'less_than_1_year', label: 'Less than 1 Year' },
                    { value: '1_to_2_years', label: '1 Year to < 2 Years' },
                    { value: '2_to_5_years', label: '2 Years to < 5 Years' },
                    { value: '5_years_plus', label: '5 Years or More' }
                ]
            }
        ],
         // No explicit button needed, selection triggers next step
    },
    {
        id: 'vaDetails',
        headline: 'VA Loan Details',
        condition: (state) => state.initialData.loanType?.toUpperCase() === 'VA', // Condition for showing this step
        fields: [
            { id: 'taxFreeIncome', label: 'Monthly Tax-Free Income (e.g., VA disability)', type: 'numberInput', defaultValue: 0 },
            { id: 'householdSize', label: 'Household Size (including borrower)', type: 'numberInput', defaultValue: 1, min: 1 } // Min value 1
        ],
        buttons: [
            { id: 'finishSnapshot', text: 'Finish & Estimate DTI', type: 'primary' }
        ]
    },
    {
        id: 'summary',
        headline: 'Financial Snapshot Summary',
        summaryType: 'multiDti', // Indicate special rendering needed for multiple DTIs
        // Removed the old 'fields' array which expected a single DTI
        instruction: 'Estimated maximum DTI based on your inputs. This helps guide your borrowing power calculation across different loan types.', // Slightly updated instruction
        buttons: [
            { id: 'proceedToCalculator', text: 'View Full Calculation', type: 'primary' }
        ]
    }
];
