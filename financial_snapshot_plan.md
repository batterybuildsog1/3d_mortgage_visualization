# Financial Snapshot Feature Implementation Plan

This plan outlines the steps to implement the "Financial Snapshot" workflow, designed to estimate a user's maximum allowable DTI before they interact with the main mortgage calculator.

**Core Goal:** Create a simple, direct, multi-step UI flow (modal/overlay) that gathers key financial data points (debts, assets, employment) after initial loan parameters are entered, calculates an estimated max DTI based on compensating factors, and displays this estimate in the main calculator UI.

**Technology:** Vanilla JavaScript, HTML, CSS. Styling will aim for a clean, modern look inspired by Shadcn UI principles but implemented with plain CSS.

**Implementation Steps:**

1.  [X] **Create Plan Markdown File:** Document the implementation steps (This file).
2.  [X] **Set up Directory Structure & Initial Files:**
    *   Create `js/financial-snapshot/` directory.
    *   Create `js/financial-snapshot/snapshot.js` (main controller).
    *   Create `js/financial-snapshot/ui.js` (UI generation/manipulation).
    *   Create `js/financial-snapshot/steps.js` (logic/content for each step).
    *   Create `css/financial-snapshot.css` for styling.
    *   Add basic HTML structure for the modal container in `index.html` (initially hidden).
3.  [X] **Implement Step 1 UI & Logic (Confirm Initial Data):**
    *   Define data structure for step 1 in `steps.js`.
    *   Create function in `ui.js` to render step 1 HTML.
    *   Add event listener for the 'Continue' button in `snapshot.js`.
4.  [X] **Implement Step 2 UI & Logic (Estimate Monthly Debts):**
    *   Define data structure for step 2 in `steps.js`.
    *   Create function in `ui.js` to render step 2 HTML, including the conditional 'Adjust Estimate' section.
    *   Implement basic autofill logic placeholder.
    *   Add event listeners for 'Confirm Estimate' and 'Adjust Estimate' buttons in `snapshot.js`. Handle dynamic updates for the adjusted total.
5.  [X] **Implement Step 3 UI & Logic (Liquid Assets):**
    *   Define data structure for step 3 in `steps.js`.
    *   Create function in `ui.js` to render step 3 HTML.
    *   Implement calculation for `FundsNeededEstimate` and display it.
    *   Implement logic to display purchase price percentage brackets.
    *   Add event listeners for selection in `snapshot.js`.
6.  [X] **Implement Step 4 UI & Logic (Employment Duration):**
    *   Define data structure for step 4 in `steps.js`.
    *   Create function in `ui.js` to render step 4 HTML.
    *   Add event listeners for selection in `snapshot.js`.
7.  [X] **Implement Step 5 UI & Logic (VA Loan Details):**
    *   Define data structure for step 5 in `steps.js`.
    *   Create function in `ui.js` to render step 5 HTML.
    *   Implement conditional rendering logic in `snapshot.js` based on `LoanType`.
    *   Add event listeners for inputs in `snapshot.js`.
8.  [X] **Implement Core Snapshot Controller Logic (`snapshot.js`):**
    *   Manage state (current step, collected data).
    *   Handle transitions between steps.
    *   Implement the final `calculateEstimatedMaxDTI` function (NOT using placeholders for complex rule logic initially) make the logical connections we need for this to work right
    *   Add functions to show/hide the snapshot modal.
9.  [X] **Integrate with Main Application (`js/script-new.js` or similar):**
    *   Identify where initial data is submitted.
    *   Instead of immediately showing the calculator, call the function to show the snapshot modal.
    *   Pass necessary initial data (Purchase Price Goal, DP, FICO, Income, LoanType, State, LTV) to the snapshot module.
    *   Implement a callback or promise to receive the `estimatedMaxDTI` back from the snapshot module upon completion.
    *   Store the `estimatedMaxDTI`.
    *   Proceed to show the main calculator visualization.
10. [X] **Update Calculator UI (`js/adapters/visualization-adapter.js`):**
    *   Read the stored `estimatedMaxDTI`.
    *   Add a UI element (e.g., text label with tooltip) near the actual calculated DTI display to show the estimate.
11. [X] **Refine CSS Styling (`css/financial-snapshot.css`):**
    *   Apply styles for the modal container, cards, steps, inputs, buttons, segmented controls, tooltips to achieve the desired clean, simple, direct look. Ensure responsiveness.
12. [ ] **Testing and Refinement:** Test the entire flow with different loan types and inputs. Refine logic and UI based on testing.
