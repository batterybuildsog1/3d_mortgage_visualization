# Code Cleanup and Refactoring Plan

**Guiding Principles:**

1.  **Safety First:** Proceed incrementally, with verification steps after each major change. Use Git extensively.
2.  **Standardization:** Fully embrace ES6 modules as the standard across the JavaScript codebase.
3.  **Eliminate Redundancy:** Remove duplicate files and logic.
4.  **Clarity:** Make the structure and data flow easier to understand.
5.  **Minimal Disruption:** Avoid unnecessary structural or styling changes unless required for correctness.

**Crucial Prerequisites - Do This Before Starting:**

1.  **Version Control (Git):**
    *   Ensure your entire codebase is committed to a Git repository. (Done)
    *   Create a new branch for this refactoring work (e.g., `git checkout -b refactor-cleanup`). Do *not* work directly on your main branch.
    *   Commit frequently after each successful step.
2.  **Backup:** Create a full backup copy of your project directory just in case. (User responsibility)
3.  **Verification Plan:**
    *   Identify the key functionalities you need to test after each step. This includes:
        *   DTI Calculator UI rendering and input handling.
        *   DTI calculation accuracy.
        *   Loan eligibility display.
        *   DTI suggestions display.
        *   Integration with the main visualization (button clicks, opening modals/UI).
        *   AI Chat functionality (sending/receiving messages - *requires the backend Python server to be running*).
        *   3D Visualization rendering and interaction (if applicable and tied to this codebase).
    *   Perform these manual tests in your browser after relevant steps. Check the browser's Developer Console (F12) for errors at every stage.
4.  **Development Environment:** Ensure you have Node.js installed if you plan to add build tools or automated tests later. Have your local AI chat backend server ready if you need to test that part. (User responsibility)

---

**Refactoring Steps:**

**Step 1: Confirm Intended Code Versions (`*-fixed` vs. non-fixed)**

*   **Problem:** You have pairs like `ai-assistant.js` / `ai-assistant-fixed.js`, `dti-utils.js` / `dti-utils-fixed.js`, etc., and `index.html` / `index-fixed.html`. Also `visualization-new.js` vs `visualization-fixed.js`.
*   **Assumption (Please Confirm):** My assumption is that the files *without* `fixed` (like `ai-assistant.js`, `dti-utils.js`, `loan-guidelines.js`, `visualization-new.js`, and `index.html`) which seem to use ES6 modules (`import`/`export`) are the **intended, current, and working versions** you want to keep. The `-fixed` versions are likely older attempts, debugging versions, or non-module versions that should be removed.
*   **QUESTION:** **Is the above assumption correct?** Are the non-fixed (`.js`) and `visualization-new.js` files the ones that represent the current, desired functionality using ES6 modules?
*   **Action:** Proceed *only* after confirming the above. If the assumption is wrong, the steps below need significant adjustment.

**Step 2: Remove Redundant `-fixed` Files (Assuming Step 1 Confirmed)**

*   **Goal:** Eliminate the older/duplicate non-module or debug versions.
*   **Action:**
    1.  Delete the following files:
        *   `dti-calculator/js/ai-assistant-fixed.js`
        *   `dti-calculator/js/dti-utils-fixed.js`
        *   `dti-calculator/js/loan-guidelines-fixed.js`
        *   `js/visualization-fixed.js`
        *   `dti-calculator/index-fixed.html`
    2.  If `visualization-fixed.js` was somehow still being referenced anywhere, ensure those references now point to `visualization-new.js` (or its modules, if refactored later).
*   **Verification:**
    1.  Open `dti-calculator/index.html` in your browser.
    2.  Test all DTI Calculator functionality (inputs, calculation, results, eligibility, suggestions).
    3.  Test the AI Chat panel within this page (sending/receiving messages). Requires the backend server.
    4.  Check the browser console for any errors (especially 404 errors for the deleted files or reference errors).
*   **Commit:** `git add . && git commit -m "Cleanup: Remove redundant -fixed files"`

**Step 3: Standardize Fully on ES6 Modules**

*   **Goal:** Ensure the entire JS codebase consistently uses `import`/`export` and eliminate reliance on global variables for module access.
*   **Action:**
    1.  **Check Entry Point:** Verify `dti-calculator/index.html` uses `<script type="module" src="...">` to load its main JavaScript file (the current snippet uses an inline module, which is fine, but ensure the *imports* within it work).
    2.  **Review `dti-utils.js`:** Ensure it uses `export function calculateDTI(...)` etc., and *does not* assign to `window.DTIUtils`. (The provided snippet looks correct). Consumers should `import { calculateDTI, ... } from './dti-utils.js';`.
    3.  **Review `loan-guidelines.js`:** Ensure it uses `export default DTI_GUIDELINES;`. (The provided snippet looks correct). Consumers should `import DTI_GUIDELINES from './loan-guidelines.js';`.
    4.  **Trace Imports:** Starting from your main script (`script-new.js` or the inline module in `index.html`), trace all `import` statements. Ensure every JS file that provides functionality to others uses `export` and every file that uses functionality from others uses `import`.
    5.  **Global Scope:** Search the codebase for assignments to `window.*` (like `window.visualizationAdapter`, `window.DTIUtils`). Plan to remove these in Step 6. For now, just identify them.
*   **Verification:**
    1.  Reload `dti-calculator/index.html` and re-test all functionality mentioned in Step 2.
    2.  Pay close attention to the browser console for errors like `ReferenceError: DTI_GUIDELINES is not defined` or `TypeError: Cannot read properties of undefined (reading 'calculateDTI')`, which indicate module import/export issues.
*   **Commit:** `git add . && git commit -m "Refactor: Standardize ES6 module usage"`

**Step 4: Clarify and Unify AI Chat Implementation**

*   **Problem:** Multiple files related to AI chat (`ai-chat-handler.js`, `ai-assistant.js`, `ai-chat.css`).
*   **Analysis:**
    *   `dti-calculator/index.html` includes `css/ai-chat.css` and initializes the AI assistant via `integration.js` -> `ai-assistant.js`. This seems to target the static panel structure shown in `ai-chat.css` and the HTML within `index.html` where the `ai-chat-body` and `chat-input-area` reside (though these are commented out in your `index.html` snippet - they should be present in your actual file, likely within `<div id="ai-chat-static-section">`).
    *   `js/ai-chat-handler.js` seems to dynamically create a *different*, floating/docked chat UI.
*   **QUESTION:** What is the **intended** user interface for the AI Chat?
    *   **Option A:** The static panel integrated directly into the main page layout (as styled by `ai-chat.css` and targeted by `ai-assistant.js`).
    *   **Option B:** The floating/docked panel created by `ai-chat-handler.js`.
    *   **Option C:** Both are intended for different purposes?
*   **Action (Assuming Option A is intended for the main app):**
    1.  Confirm that your main application structure uses the static panel (`<div id="ai-chat-static-section">...</div>`) and that `initializeGlobalChat` correctly targets elements within it. Ensure the HTML elements (`ai-chat-body`, `chat-input-area`) are present and not commented out in your working `index.html` or main application page.
    2.  Carefully review `js/ai-chat-handler.js`. Is it used *anywhere* else in the project, or was it an earlier version/alternative approach?
    3.  **If `ai-chat-handler.js` is NOT used:** Delete `js/ai-chat-handler.js`. You might also be able to remove some styles from `ai-chat.css` that were specific to the floating version (like `.ai-chat-container`, `.ai-chat-icon`, `.minimized`/`.expanded` state styles related to the floating container, if they are truly unused by the static panel). Be cautious when removing CSS.
    4.  **If `ai-chat-handler.js` IS used:** Keep it, but ensure its functionality and UI don't conflict with the static panel. Clarify its purpose.
*   **Verification:**
    1.  Test the AI Chat functionality thoroughly in its intended location(s).
    2.  Ensure there are no console errors related to chat initialization or UI creation.
    3.  Verify the chat styling looks correct.
*   **Commit:** `git add . && git commit -m "Refactor: Clarify and unify AI chat implementation (focused on static panel)"` (Adjust message if `ai-chat-handler.js` was kept).

**Step 5: Refactor Fragile Integration Points (e.g., `window.visualizationAdapter`)**

*   **Problem:** Using global `window` properties creates tight coupling and makes testing harder. `dti-calculator/js/integration.js` mentions `window.visualizationAdapter`.
*   **Solution:** Pass dependencies explicitly.
*   **Action:**
    1.  **Identify Consumers:** Find where `window.visualizationAdapter` (or similar globals) are accessed. `dti-calculator/js/integration.js` (in `addDTICalculatorButton`) is one place. Are there others?
    2.  **Identify Provider:** Find where `window.visualizationAdapter` is *created* and assigned. This is likely in `script-new.js` or wherever `VisualizationAdapter` is instantiated.
    3.  **Modify Functions:** Update functions that *consume* the adapter (like `addDTICalculatorButton`, `openDTICalculator`, potentially `initializeGlobalChat`) to accept the adapter instance as a parameter.
        *   Example in `dti-calculator/js/integration.js`:
            ```javascript
            // Change this:
            // export function addDTICalculatorButton(targetSelector, currentMortgageData = {}, onDTICalculated) { ...
            //   const latestMortgageData = typeof window.visualizationAdapter?.getLastCalculation === 'function' ? ...
            // }
            // To this:
            export function addDTICalculatorButton(targetSelector, visualizationAdapter, currentMortgageData = {}, onDTICalculated) { // Added adapter param
              // ...
              button.addEventListener('click', (e) => {
                // ...
                const latestMortgageData = typeof visualizationAdapter?.getLastCalculation === 'function' // Use passed adapter
                                           ? visualizationAdapter.getLastCalculation()
                                           : currentMortgageData;
                openDTICalculator(visualizationAdapter, latestMortgageData, onDTICalculated); // Pass adapter along
              });
              // ...
            }

            // Also update openDTICalculator if it needs the adapter for callbacks or data fetching
            export function openDTICalculator(visualizationAdapter, currentMortgageData = {}, onComplete) {
                 // ... use visualizationAdapter if needed ...
            }

            // Similarly update initializeGlobalChat if it needs the adapter
            export function initializeGlobalChat(visualizationAdapter, initialData = {}) {
                // ... use visualizationAdapter if needed ...
            }
            ```
    4.  **Update Callers:** Modify the code that *calls* these functions (likely in `script-new.js` or your main app setup) to pass the actual `VisualizationAdapter` instance.
        *   Example in `script-new.js` (conceptual):
            ```javascript
            import VisualizationAdapter from './adapters/visualization-adapter.js'; // Assuming this path
            import { initDTICalculatorIntegration } from './dti-integration.js';
            import { initializeGlobalChat } from '../dti-calculator/js/integration.js';

            document.addEventListener('DOMContentLoaded', function() {
                // ... existing setup ...

                // Instantiate the adapter (assuming it's done here)
                const vizAdapter = VisualizationAdapter; // Or new VisualizationAdapter() if it's a class

                // Initialize DTI Integration, passing the adapter
                initDTICalculatorIntegration(vizAdapter);

                // Initialize Global Chat, passing the adapter
                const initialAIData = vizAdapter.getLastCalculation ? vizAdapter.getLastCalculation() : {};
                initializeGlobalChat(vizAdapter, initialAIData);

                // ... rest of setup ...
            });
            ```
    5.  **Remove Globals:** Once all consumers use the passed parameter, remove the `window.visualizationAdapter = ...` assignment.
*   **Verification:**
    1.  Test all interactions that rely on the adapter: clicking the DTI button, ensuring it gets the latest data, opening the DTI calculator, potentially updating the AI chat or visualization after DTI calculation.
    2.  Check the console for errors related to the adapter being undefined.
*   **Commit:** `git add . && git commit -m "Refactor: Remove global visualizationAdapter, use dependency injection"`

**Step 6: Clean Up Unused Test/Reference Files**

*   **Goal:** Remove files that are not part of the main application or documentation.
*   **Action:**
    1.  Review the following files in the `dti-calculator/` directory:
        *   `minimal.html`
        *   `test-js.html`
        *   `test-modules.html`
        *   `test.html`
    2.  **If these were temporary test files and are no longer needed:** Delete them.
    3.  **If they serve some ongoing purpose (e.g., simple demos):** Keep them, but be aware they might fall out of sync with the main codebase. Consider moving them to a separate `examples/` or `tests/manual/` directory.
    4.  Review `references/three_js_examples.md`. This seems like useful documentation/reference material. Consider moving it to a `docs/` folder at the project root for better organization. Keep `dti-calculator/README.md` as it documents that specific module.
*   **Verification:** Ensure the main application (`index.html` or equivalent) still works correctly.
*   **Commit:** `git add . && git commit -m "Cleanup: Remove unused test HTML files"` (Adjust message based on actions taken).

**Step 7: Review and Final Testing**

*   **Goal:** Ensure the codebase is stable, clean, and functional after the refactoring.
*   **Action:**
    1.  **Code Review:** Look through the changed files. Check for consistency, clarity, and any remaining commented-out code that should be removed.
    2.  **Manual Testing:** Perform a thorough test of *all* application features identified in the initial verification plan. Test different inputs, loan types, and interactions.
    3.  **Console Check:** Keep the browser console open during testing and watch for any errors or warnings.
    4.  **Merge:** If everything looks good, merge your `refactor-cleanup` branch back into your main development branch.

---

**Future Considerations (Lower Priority - Post Cleanup):**

1.  **Refactor Large Files:** Break down `visualization-new.js` (and potentially other large files like `dti-calculator.js`) into smaller, more focused modules as discussed in the evaluation.
2.  **CSS Scoping:** If components are intended for reuse, consider CSS Modules, Scoped CSS (if using a framework like Vue/Svelte), or BEM naming conventions more strictly to prevent style conflicts.
3.  **Build Process:** Introduce a build tool (like Vite, Webpack) for optimizations, bundling, and easier dependency management, especially if the project grows.
