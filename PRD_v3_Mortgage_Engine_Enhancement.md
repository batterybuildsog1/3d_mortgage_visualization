# Product Requirements Document: Mortgage Calculation Engine Enhancement & Closing Cost Integration

**Version:** 3.0
**Date:** [Current Date]
**Author:** [AI Financial Calculation Expert]
**Status:** Final Draft (Incorporating Overrides & True APR Roadmap)

## Table of Contents

1.  Executive Summary
    *   1.1. Project Goal (Revised)
    *   1.2. Key Features (Revised)
    *   1.3. Target Audience
    *   1.4. High-Level Architecture (Revised)
2.  Goals & Objectives
    *   2.1. Business Goals
    *   2.2. User Goals (Revised)
    *   2.3. Technical Goals (Revised)
    *   2.4. Non-Goals
3.  Functional Requirements
    *   3.1. Core Calculation Engine
    *   3.2. Loan Type Specific Logic
    *   3.3. Adjustments (LLPA, MI)
    *   3.4. Closing Cost Estimation Engine (Revised for Overrides)
    *   3.5. Representative APR (RepAPR) Calculation
    *   3.6. Cash-to-Close Calculation (Revised for Overrides)
    *   3.7. Data Management & Sourcing
    *   3.8. Eligibility Checks Integration
    *   3.9. **User Input Overrides (NEW)**
    *   3.10. **True APR Calculation (Post-Launch Scope Definition) (NEW)**
    *   3.11. Error Handling & User Feedback
4.  Architecture & Technical Design
    *   4.1. Overview Diagram (Revised)
    *   4.2. Component Responsibilities (Revised)
        *   4.2.1. UI Layer
        *   4.2.2. Engine Orchestrator (calculator.js)
        *   4.2.3. Loan Strategy (loan-types/)
        *   4.2.4. Adjustment Modules (adjustments/)
        *   4.2.5. Utility Modules (utils/)
        *   4.2.6. Data Service (services/data-service.js)
        *   4.2.7. Data Layer (data/)
    *   4.3. Data Structures (Revised)
        *   4.3.1. MortgageInput Interface (Revised for Overrides)
        *   4.3.2. CalculationResult Interface (Revised for Overrides & True APR placeholder)
        *   4.3.3. ClosingCostData Schema (data/closing_costs.json) (Revised for Finance Charge Classification)
        *   4.3.4. Internal Data Transfer Objects (DTOs)
    *   4.4. Calculation Precision & Rounding Strategy
    *   4.5. Asynchronous Operations Handling
    *   4.6. **Architecture for True APR Calculation (NEW)**
5.  Detailed Implementation Plan (Phased)
    *   5.1. Phase 1: Data Structure & Service Layer Enhancement
    *   5.2. Phase 2: Closing Cost Engine & Override Logic
    *   5.3. Phase 3: Core Engine Integration & Refinement
    *   5.4. Phase 4: RepAPR Calculation Implementation
    *   5.5. Phase 5: Eligibility Module Refactoring/Integration
    *   5.6. Phase 6: UI Implementation (Overrides & Display)
    *   5.7. Phase 7 (Post-Launch): True APR Implementation
6.  Testing Strategy
    *   6.1. Unit Testing (Revised)
    *   6.2. Integration Testing (Revised)
    *   6.3. End-to-End (E2E) Testing (Revised)
    *   6.4. **APR Validation Strategy (NEW)**
    *   6.5. Test Data Management
7.  Deployment & Maintenance
    *   7.1. Data Update Process
    *   7.2. Code Deployment
    *   7.3. Monitoring & Logging
8.  Future Considerations & Roadmap (Revised Priority)
9.  Appendices
    *   9.1. Glossary of Terms
    *   9.2. Full Closing Cost Parameter Schema (data/closing_costs.json) - Reference
    *   9.3. RepAPR Calculation Details & Disclaimer Text
    *   9.4. **Regulation Z Finance Charge Classification Guidance (NEW)**

---

## 1. Executive Summary

### 1.1. Project Goal (Revised)
To evolve the mortgage calculation tool into a premier educational and financial planning resource. This involves integrating highly accurate closing cost estimations, offering user customization through overrides for known costs, and calculating both an illustrative Representative APR (RepAPR) and laying the groundwork for a future, compliant True APR calculation.

### 1.2. Key Features (Revised)

*   Accurate PITI + HOA calculation.
*   Detailed, location-aware closing cost and prepaid estimation.
*   User overrides for key estimated costs (HOI, Taxes, selected closing fees).
*   Estimated Cash-to-Close calculation incorporating overrides.
*   Illustrative RepAPR calculation for loan comparison.
*   Defined scope and technical path for future implementation of a Regulation Z compliant True APR.
*   Support for Conventional, FHA, VA, USDA loans.
*   Enhanced modular, data-driven architecture.

### 1.3. Target Audience
(No change) Prospective homebuyers, internal development team, product managers, QA testers.

### 1.4. High-Level Architecture (Revised)
Maintains the modular frontend structure. Incorporates user overrides into the input flow and calculation logic within calculator.js and closing-costs.js. Defines the architecture and prerequisites for the future True APR module, including a numerical solver utility and refined finance charge data.

---

## 2. Goals & Objectives

### 2.1. Business Goals
(No change)

### 2.2. User Goals (Revised)

*   Understand estimated total monthly housing payment (PITI+HOA).
*   Get a realistic estimate of upfront costs, with the ability to refine it using their own known figures for key items (HOI, Taxes).
*   Compare loan scenarios effectively using Note Rate and illustrative RepAPR.
*   Gain insight into how specific finance charges impact the potential True APR (once implemented).
*   Feel more confident and informed.

### 2.3. Technical Goals (Revised)

*   Implement accurate calculation logic, prioritizing user overrides where provided.
*   Enhance modularity, testability, maintainability.
*   Implement the RepAPR estimation accurately based on defined scope.
*   Design and document the robust architecture required for future True APR implementation.
*   Ensure efficient data loading and access.
*   Implement robust error handling and clear user feedback mechanisms.
*   Use consistent coding standards, JSDoc, and precise numerical handling.

### 2.4. Non-Goals
(No change, emphasizes RepAPR is not True APR for this release)

---

## 3. Functional Requirements

*(Sections 3.1 - 3.3 remain largely the same, focusing on core P&I, Loan Logic, LLPA, MI)*

### 3.4. Closing Cost Estimation Engine (closing-costs.js, data/closing_costs.json) (Revised for Overrides)

*   **FR-CC-01:** (No change) Define schema for `data/closing_costs.json`.
*   **FR-CC-02:** (No change) Implement `closing-costs.js` with `estimateAllCosts`.
*   **FR-CC-03:** (No change) Fetch data via `data-service.js`.
*   **FR-CC-04:** (No change) Apply state variations.
*   **FR-CC-05:** (No change) Implement `calculateIndividualFee` helper.
*   **FR-CC-05b (NEW):** `calculateIndividualFee` shall check the `MortgageInput.overrides` object first. If a valid override exists for the current `feeName`, return the override value instead of calculating the estimate.
*   **FR-CC-06:** (Revised) Implement specific calculation logic for prepaids:
    *   **Prepaid Interest:** (No change in calculation method).
    *   **Prepaid HOI:** Use `MortgageInput.overrides.AnnualHOI` if provided and valid, otherwise use `MortgageInput.AnnualHOI`. Calculate prepaid amount based on 12 months + cushion months.
    *   **Prepaid Taxes:** Use `MortgageInput.overrides.AnnualPropertyTaxAmount` if provided and valid. If not, calculate based on PV and estimated `AnnualTaxRate`. Calculate reserves based on closing date, tax cycle, and cushion months.
*   **FR-CC-07:** (No change) Return detailed results object.
*   **FR-CC-08 (NEW):** The `details` map in the returned result should indicate if a value was overridden by the user (e.g., by adding a flag like `isOverridden: true` to the specific fee detail).

### 3.5. Representative APR (RepAPR) Calculation (calculator.js)
*(No significant changes to the RepAPR calculation itself, but inputs might now reflect overrides)*

*   **FR-APR-01 to FR-APR-07:** (Remain the same - calculation based on Note Rate + amortized estimated finance charges over `REP_APR_PERIOD_MONTHS`). Ensure finance charges used (Points, Origination, Underwriting, Doc Prep) are sourced from the final values (estimated or overridden) generated by `closing-costs.js`.

### 3.6. Cash-to-Close Calculation (calculator.js) (Revised for Overrides)

*   **FR-CTC-01:** (Revised) Calculate `CashToClose` using the final values from the closing cost estimation, which will incorporate any user overrides for DP, `closingCosts.totalEstimated`, `closingCosts.totalPrepaids`, `SellerCredits`, and `LenderCredits`. `CashToClose = FinalDP + FinalTotalEstimatedCosts + FinalTotalPrepaids - FinalSellerCredits - FinalLenderCredits`.

### 3.7. Data Management & Sourcing (data-service.js, data/)

*   **FR-DATA-01 to FR-DATA-06:** (No change, except ensure `closing_costs.json` includes robust `isFinanceChargeAPR` boolean flags for True APR planning).

### 3.8. Eligibility Checks Integration (eligibility.js)

*   **FR-ELIG-01, FR-ELIG-02:** (As defined previously) Refactor/implement to provide clear flags like `vaFundingFeeWaived`.
*   **FR-ELIG-03:** (Confirm role) Ensure it primarily provides flags/constraints, not complex calculations impacting core formulas.

### 3.9. User Input Overrides (NEW)

*   **FR-OVR-01:** The system shall accept optional user-provided values for:
    *   `AnnualHOI`
    *   `AnnualPropertyTaxAmount` (Overrides calculation based on rate/PV)
    *   Selected closing cost items (TBD, recommended starting with Appraisal Fee, Title Insurance Fees, potentially Origination Fee if user has a quote). Define the specific overridable keys in `MortgageInput.overrides`.
*   **FR-OVR-02:** If a valid (numeric, non-negative) override value is provided for a specific cost item, the calculation engine must use this value instead of its own estimate for that item in all subsequent calculations (Total Costs, Cash-to-Close, potentially RepAPR if the overridden fee is a finance charge).
*   **FR-OVR-03:** The UI shall provide clear input fields for these overrides, possibly marked as "Optional: Enter known cost".
*   **FR-OVR-04:** The final results display should visually indicate which cost components used an override value.

### 3.10. True APR Calculation (Post-Launch Scope Definition) (NEW)

*   **FR-TAPR-01:** Implement a function `calculateTrueAPR` that computes the Annual Percentage Rate according to Regulation Z (TILA) standards.
*   **FR-TAPR-02:** This function shall utilize a numerical root-finding algorithm (e.g., Newton-Raphson) housed in `loanUtils.solveForRate` to solve for the periodic rate.
*   **FR-TAPR-03:** Identify all applicable Finance Charges based on Regulation Z definitions. This requires:
    *   Clear classification within `data/closing_costs.json` (e.g., a `regZFinanceCharge: true/false` flag). See Appendix 9.4.
    *   Inclusion of: Total interest paid over the loan term (implicit in the rate), Points (Discount & Origination), MI premiums (Upfront Financed and all scheduled periodic payments), specified Lender Fees (e.g., Origination, Underwriting, Doc Prep, Application Fee if charged to all).
    *   Exclusion of: Appraisal Fees (if bona fide and reasonable), Title Insurance, Notary Fees, Recording Fees, Credit Report Fees (if bona fide and reasonable), Property Taxes, HOI premiums. Consult Reg Z §1026.4 for definitive classification.
*   **FR-TAPR-04:** Calculate the Amount Financed (TotalLoanAmount (P) minus finance charges paid separately by the borrower at or before closing).
*   **FR-TAPR-05:** Construct the Payment Stream for the APR solver. This stream must accurately reflect:
    *   The P&I payment (M).
    *   All periodic finance charges, specifically recurring MI payments (I_MI).
    *   Crucially: Changes in the payment stream over time, particularly the cancellation of PMI or the fixed duration of FHA MIP for lower LTV loans. This requires generating or simulating the relevant portion of the amortization schedule to determine when I_MI drops to zero.
*   **FR-TAPR-06:** The `solveForRate` function will use the Amount Financed and the complex Payment Stream function to find the periodic rate, which is then annualized (`periodicRate * 12`) to get the True APR.
*   **FR-TAPR-07:** The calculated True APR shall be displayed with high precision (e.g., 3 decimal places) and clearly labeled as the official APR estimate.

### 3.11. Error Handling & User Feedback (Revised)

*   **FR-ERR-01 to FR-ERR-04:** (No change) Implement robust error handling and logging.
*   **FR-ERR-05:** (Revised) UI layer must provide clear feedback:
    *   Input validation errors should highlight fields.
    *   Calculation errors should display a generic but helpful message ("Unable to calculate. Please check inputs or contact support if the issue persists.").
    *   Success messages implicitly confirmed by updated results.
    *   Loading indicators during calculation.

---

## 4. Architecture & Technical Design

### 4.1. Overview Diagram (Revised)
*(The previous diagram remains largely valid. Add notation indicating MortgageInput now includes overrides, and calculator.js incorporates override logic.)*

### 4.2. Component Responsibilities (Revised)

*   **4.2.1. UI Layer:** Now responsible for rendering override input fields and indicating which final values were based on overrides.
*   **4.2.2. Engine Orchestrator (calculator.js):** Now responsible for checking `inputs.overrides` before calling estimation functions for HOI, Taxes, and relevant closing costs. Passes final (potentially overridden) costs to RepAPR and Cash-to-Close calculations. Will be the primary caller for the future `calculateTrueAPR` function.
*   **4.2.3. Loan Strategy (loan-types/):** (No major change implied by overrides/APR)
*   **4.2.4. Adjustment Modules (adjustments/closing-costs.js):** Must check for and prioritize input overrides for individual fee calculations before proceeding with estimations.
*   **4.2.5. Utility Modules (utils/loan-utils.js):** CRITICAL: Needs the implementation of `solveForRate` (numerical solver) for the future True APR calculation. Needs robust date/calendar logic for tax/insurance prepaids.
*   **4.2.6. Data Service (services/data-service.js):** (No major change implied by overrides/APR)
*   **4.2.7. Data Layer (data/):** `closing_costs.json` needs the `regZFinanceCharge` flag for each fee. `property_tax.json` needs tax cycle information (e.g., `dueDates: ["YYYY-MM-DD", ...]`, `frequency: "SemiAnnually"`).

### 4.3. Data Structures (Revised)

#### 4.3.1. MortgageInput Interface (Revised for Overrides):

```javascript
/**
 * @typedef {object} MortgageInput
 * // ... all previous properties ...
 * @property {object} [overrides] - Optional user-provided known values.
 * @property {number} [overrides.AnnualHOI] - User's known annual HOI premium.
 * @property {number} [overrides.AnnualPropertyTaxAmount] - User's known annual property tax amount.
 * @property {number} [overrides.AppraisalFee] - User's known appraisal fee.
 * @property {number} [overrides.LenderTitleInsurance] - User's known lender's title premium.
 * @property {number} [overrides.OwnerTitleInsurance] - User's known owner's title premium.
 * @property {number} [overrides.OriginationFeeAmount] - User's known origination fee amount (overrides % calc).
 * // Add other specific closing cost keys here as overrides are enabled
 */
```

#### 4.3.2. CalculationResult Interface (Revised for Overrides & True APR placeholder):

```javascript
/**
 * @typedef {object} CalculationResult
 * // ... all previous properties ...
 * @property {object} closingCosts - Breakdown of estimated costs
 * // ... sub-properties ...
 * @property {object} closingCosts.details - Dictionary { FeeName: { amount: number, isOverridden: boolean } }
 * @property {number|null} trueAPR - Placeholder for future True APR calculation (null initially)
 * @property {string} [trueAPRDisclaimer] - Disclaimer for True APR (once implemented)
 */
```

#### 4.3.3. ClosingCostData Schema (data/closing_costs.json) (Revised):

*   Add `regZFinanceCharge: boolean` to each fee definition in the `fees` object. Consult Appendix 9.4 and Reg Z for accurate classification.

#### 4.3.4. Internal Data Transfer Objects (DTOs):
More relevant for True APR's payment stream function, potentially passing `{ period: number, pAndI: number, miPayment: number, otherPeriodicFinanceCharge: number }`.

### 4.4. Calculation Precision & Rounding Strategy:

*   (Revised) Intermediate rates (monthlyRate, NoteRate, RepAPR, True APR) to 6 decimal places. Currency rounded to 2 decimal places at the final output stage for each value.

### 4.5. Asynchronous Operations Handling:
(No change)

### 4.6. Architecture for True APR Calculation (NEW)

*   **Core Solver:** `loanUtils.solveForRate` implements Newton-Raphson or similar. Requires a callback function representing the Present Value calculation.
*   **Payment Stream Generation:** A new utility function, potentially `generateAprPaymentStream(inputs, context, miDetails)`, is needed. This function must:
    *   Access the full loan term (n).
    *   Know the P&I payment (M).
    *   Know the schedule of periodic finance charges (primarily I_MI). This requires simulating MI duration/cancellation. For PMI, track the principal balance (requiring basic amortization logic within this specific utility) to determine when LTV hits the cancellation threshold (e.g., 78% of original value). For FHA, use the duration rules (11 years or lifetime).
    *   Return an array or function allowing the solver to get the total payment (P&I + Periodic Finance Charges) for any given period k.
*   **Finance Charge Identification:** `calculator.js` or a dedicated APR helper module reads `data/closing_costs.json` metadata and `regZFinanceCharge` flags to sum upfront finance charges and identify periodic ones.
*   **Amount Financed Calculation:** `APRHelper.calculateAmountFinanced(totalLoanAmount, upfrontFinanceChargesPaidAtClosing)`.
*   **Integration:** `calculator.js` orchestrates: calculating Amount Financed, generating the payment stream details, calling `loanUtils.solveForRate` with the correct PV function (using the payment stream and amount financed), and annualizing the result.

---

## 5. Detailed Implementation Plan (Phased)

*   **Phase 1: Data Structure & Service Layer Enhancement:** (Revised) Include `regZFinanceCharge` in schema, tax cycle data, override fields in `MortgageInput`, `isOverridden` flag in `CalculationResult.closingCosts.details`.
*   **Phase 2: Closing Cost Engine & Override Logic:** (Revised) Implement override checks within `calculateIndividualFee` and for HOI/Taxes within `estimateAllCosts`. Update unit tests.
*   **Phase 3: Core Engine Integration & Refinement:** (Revised) Ensure `calculator.js` uses final (potentially overridden) values for Cash-to-Close. Update integration tests for override scenarios.
*   **Phase 4: RepAPR Calculation Implementation:** (No change to scope, but uses final costs).
*   **Phase 5: Eligibility Module Refactoring/Integration:** (No change).
*   **Phase 6: UI Implementation (Overrides & Display):** (Revised) Add override input fields. Add visual indicators for overridden values in results.
*   **Phase 7 (Post-Launch): True APR Implementation:**
    *   Implement `loanUtils.solveForRate`.
    *   Implement `generateAprPaymentStream` utility, including basic amortization logic needed only for MI cancellation simulation within this utility.
    *   Implement `APRHelper.calculateAmountFinanced`.
    *   Implement `calculateTrueAPR` function in `calculator.js` or `APRHelper`, orchestrating the above.
    *   Thoroughly validate `regZFinanceCharge` flags in `closing_costs.json`.
    *   Add `trueAPR` field to `CalculationResult`.
    *   Update UI adapter and display components for True APR.
    *   Implement rigorous APR validation testing (Phase 6.4).

---

## 6. Testing Strategy

*   **6.1. Unit Testing:** (Revised) Add tests for override logic in `closing-costs.js`. Add tests for `solveForRate` and payment stream generation utilities (when implemented in Phase 7).
*   **6.2. Integration Testing:** (Revised) Add scenarios testing various combinations of overrides. Add scenarios specifically for True APR validation (Phase 7).
*   **6.3. End-to-End (E2E) Testing:** (Revised) Add test cases for entering overrides in the UI and verifying their impact on results. Add cases for validating the displayed True APR (Phase 7).
*   **6.4. APR Validation Strategy (NEW - for Phase 7):**
    *   Create test cases based on official Regulation Z examples and appendices if possible.
    *   Compare results against known-good, certified third-party APR calculation tools using identical inputs and fee classifications. Document any discrepancies and their reasons (e.g., rounding differences, minor fee interpretation).
    *   Test scenarios with different MI types and cancellation points extensively.
*   **6.5. Test Data Management:** (No change)

---

## 7. Deployment & Maintenance

*   **7.1. Data Update Process:** (Revised) Include review of `regZFinanceCharge` flags during periodic updates of `closing_costs.json`.
*   **7.2. Code Deployment:** (No change)
*   **7.3. Monitoring & Logging:** (No change)

---

## 8. Future Considerations & Roadmap (Revised Priority)

1.  **True APR Calculation (Phase 7):** Highest Priority Post-Launch.
2.  ARM Loan Support.
3.  Refinance Scenarios.
4.  Detailed Amortization Schedule Generation & Display.
5.  Enhanced MI/Fee Logic (more precise cancellation/duration).
6.  Granular Location Data (County-level taxes/fees).
7.  User Customization Expansion (More overridable fees).
8.  API Integration / Performance Optimization.

---

## 9. Appendices

### 9.1. Glossary of Terms
(Add RepAPR, True APR, Finance Charge, Amount Financed)

### 9.2. Full Closing Cost Parameter Schema
(Updated with `regZFinanceCharge`)

### 9.3. RepAPR Calculation Details & Disclaimer Text
(Final text)

### 9.4. Regulation Z Finance Charge Classification Guidance (NEW)
A reference table mapping fee names from `closing_costs.json` to their typical Reg Z finance charge status (Yes/No/Conditional) with brief justifications or references to §1026.4. This aids the True APR implementation. Example:

| Fee Name                 | Included in True APR Finance Charge? | Reg Z Ref / Notes                                     |
| :----------------------- | :----------------------------------: | :---------------------------------------------------- |
| Loan Origination Fee     | Yes                                  | §1026.4(a)(1) - Charged directly/indirectly by creditor |
| Discount Points          | Yes                                  | §1026.4(a)(2) - Prepaid interest                      |
| Underwriting Fee         | Yes                                  | §1026.4(a)(1) - Lender fee                            |
| Document Preparation Fee | Yes                                  | §1026.4(a)(1) - Lender fee                            |
| Appraisal Fee            | No                                   | §1026.4(c)(7)(iii) - If bona fide and reasonable      |
| Credit Report Fee        | No                                   | §1026.4(c)(7)(ii) - If bona fide and reasonable       |
| Title Insurance (Lender) | No                                   | §1026.4(c)(7)(i)                                      |
| Title Insurance (Owner)  | No                                   | §1026.4(c)(7)(i)                                      |
| Recording Fees           | No                                   | §1026.4(e)(1)                                         |
| Property Taxes           | No                                   | §1026.4(e) - Escrows                                  |
| Homeowners Insurance     | No                                   | §1026.4(d)(2) - If borrower can choose provider       |
| MI Premiums (All Types)  | Yes                                  | §1026.4(a)(5) & (b)(5) - Includes upfront & periodic  |
| ... etc. ...             |                                      |                                                       |

---

This Version 3.0 PRD provides a significantly more detailed and technically robust plan, incorporating user overrides and clearly defining the scope and implementation path for both the immediate RepAPR estimate and the future True APR calculation, aligning with the goal of creating a sophisticated and user-centric financial education tool.
