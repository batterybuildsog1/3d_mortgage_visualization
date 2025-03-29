# Plan: Enhance Financial Snapshot Summary with Multi-Loan DTI Estimates

**Goal:** Modify the Financial Snapshot summary step to calculate and display the estimated maximum DTI for *all* relevant loan types (Conventional, FHA, VA, USDA) based on the single set of financial data collected from the user during the snapshot workflow.

**Rationale:** Provides the user with a more comprehensive upfront understanding of their potential eligibility across different loan programs, aligning better with the goal of empowering users early in the process.

**Current State:** The snapshot currently calculates and displays only one estimated max DTI based on the loan type selected *before* the snapshot began.

**Proposed Enhancement:**

1.  **Calculation Logic:** Modify the `calculateEstimatedMaxDTI` function to accept the target `loanType` as a parameter. The `finishSnapshot` function will then iterate through a predefined list of relevant loan types (e.g., ['Conventional', 'FHA', 'VA', 'USDA']), calling the parameterized calculation function for each.
2.  **State Management:** Store the results as an object in the `currentState`, mapping each loan type to its estimated DTI (e.g., `estimatedMaxDTIs: { Conventional: 0.50, FHA: 0.48, VA: 0.45, USDA: 0.44 }`).
3.  **UI Display:** Update the 'summary' step UI to display these multiple results clearly, likely in a list or small grid format.

---

## Detailed Implementation Plan

**Phase 1: Refactor Calculation Logic (`js/financial-snapshot/snapshot.js`)**

*   **Task 1.1:** Modify `calculateEstimatedMaxDTI` function signature.
    *   **Current:** `calculateEstimatedMaxDTI()`
    *   **New:** `calculateEstimatedMaxDTI(targetLoanType)`
    *   **Details:** The function currently reads the loan type from `currentState.initialData.loanType`. Change this to use the `targetLoanType` parameter passed into the function. All other logic accessing `currentState.initialData` (FICO, LTV) and `currentState.collectedData` (debts, reserves, employment, VA specifics) remains the same.

*   **Task 1.2:** Modify `finishSnapshot` function.
    *   **Details:**
        *   Define an array of loan types to calculate: `const loanTypesToEstimate = ['Conventional', 'FHA', 'VA', 'USDA'];`
        *   Initialize an empty object: `const allEstimatedDTIs = {};`
        *   Iterate through `loanTypesToEstimate`:
            *   For each `type`, call `const estimatedDTI = calculateEstimatedMaxDTI(type);`
            *   Store the result: `allEstimatedDTIs[type] = estimatedDTI;`
        *   Store the results object in the main state: `currentState.allEstimatedDTIs = allEstimatedDTIs;`
        *   Remove the old single value storage: `delete currentState.estimatedMaxDTI;` and `delete currentState.collectedData.estimatedMaxDTI;`
        *   Call `renderStep('summary', { ...currentState });` (The state now includes `allEstimatedDTIs`).

**Phase 2: Update Summary Step Definition (`js/financial-snapshot/steps.js`)**

*   **Task 2.1:** Modify the 'summary' step configuration.
    *   **Details:**
        *   Remove the existing `fields` array which expects a single `estimatedMaxDTI`.
        *   Add a new property, perhaps `summaryType: 'multiDti'`, to indicate how the UI should render this step's data.
        *   The `headline` and `instruction` can remain. The `buttons` array also remains the same.
        *   Example:
            ```javascript
            {
                id: 'summary',
                headline: 'Financial Snapshot Summary',
                summaryType: 'multiDti', // Indicate special rendering needed
                instruction: 'Estimated maximum DTI based on your inputs. This helps guide your borrowing power calculation.',
                buttons: [
                    { id: 'proceedToCalculator', text: 'View Full Calculation', type: 'primary' }
                ]
            }
            ```

**Phase 3: Update UI Rendering (`js/financial-snapshot/ui.js`)**

*   **Task 3.1:** Modify `renderStep` function.
    *   **Details:** Add a check for `stepConfig.summaryType === 'multiDti'`. If true, instead of iterating through `stepConfig.fields`, call a new dedicated rendering function, e.g., `renderMultiDtiSummary(currentSnapshotState.allEstimatedDTIs)`.

*   **Task 3.2:** Create `renderMultiDtiSummary` function.
    *   **Input:** `allEstimatedDTIs` object (e.g., `{ Conventional: 0.50, FHA: 0.48, ... }`).
    *   **Output:** HTML string to display the results.
    *   **Logic:**
        *   Start with a container div: `<div class="snapshot-dti-summary">`
        *   Iterate through the `allEstimatedDTIs` object (using `Object.entries` or similar).
        *   For each `[loanType, dtiValue]`:
            *   Create a display element (e.g., a `div` or `p` tag).
            *   Format the `dtiValue` using `formatValue(dtiValue, 'percentage')`.
            *   Display the loan type and its corresponding formatted DTI estimate (e.g., `<p><strong>${loanType}:</strong> ${formattedDti}</p>`).
        *   Append each element's HTML to the main summary HTML string.
        *   Close the container div.
        *   Return the complete HTML string.

*   **Task 3.3:** Add CSS for the summary display (`css/financial-snapshot.css`).
    *   **Details:** Add styles for `.snapshot-dti-summary` and its child elements to ensure clear and readable presentation (e.g., using a grid, list, or flexbox layout, appropriate spacing, font weights).

**Phase 4: Update Main Application Logic (`js/script-new.js` and `js/adapters/visualization-adapter.js`)**

*   **Task 4.1:** Modify `runInitialSnapshot` callback in `js/script-new.js`.
    *   **Details:** The callback now receives the *object* `allEstimatedDTIs` instead of a single value. Store this object: `lastEstimatedDTIs = allEstimatedDTIs;` (rename the state variable). Update the `estimatedMaxDTI` property passed to `engineUserData` in `runCalculation` to use the DTI corresponding to the *currently selected* loan type from the stored `lastEstimatedDTIs` object.

*   **Task 4.2:** Modify `getCurrentUserData` in `js/script-new.js`.
    *   **Details:** Ensure it includes the `lastEstimatedDTIs` object (or the relevant value for the selected loan type) when returning the user data object.

*   **Task 4.3:** Modify `_updateResultsDisplay` in `js/adapters/visualization-adapter.js`.
    *   **Details:** Update the logic that sets the text content for `#dti-value`. It should now display the `actualDTI` (from `this.lastCalculation.dtiRatios.backend`) and the specific estimated max DTI for the *currently calculated* loan type (available in the `data` object passed to the function, which originates from `engineUserData`).

**Phase 5: Testing**

*   **Task 5.1:** Test the snapshot flow with different initial loan type selections. Verify the summary step displays estimates for all four types.
*   **Task 5.2:** Verify that after proceeding, the main results panel correctly displays the actual DTI and the estimated DTI *for the loan type being calculated*.
*   **Task 5.3:** Test edge cases (e.g., missing input data).

---
This plan outlines the necessary code modifications to achieve the multi-loan DTI estimation display within the snapshot summary.
