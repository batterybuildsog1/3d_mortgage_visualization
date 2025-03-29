// js/financial-snapshot/snapshot.js
// Main controller for the Financial Snapshot workflow
import { renderStep, showAdjustSection, updateAdjustedTotal } from './ui.js'; // Added imports
import { snapshotSteps } from './steps.js'; // Import steps to know the sequence

console.log("Financial Snapshot controller loaded.");

const modalElement = document.getElementById('financial-snapshot-modal');
const modalContentElement = modalElement?.querySelector('.snapshot-content');

let currentState = {
    currentStepIndex: 0,
    initialData: {}, // Data passed in (income, fico, ltv, loanType etc.)
    collectedData: {}, // Data collected during the snapshot steps
    estimatedMaxDTI: null,
    onCompleteCallback: null, // Callback function when snapshot is finished
};

// --- Modal Control ---

function showModal() {
    if (modalElement) {
        modalElement.classList.add('active');
        console.log("Snapshot modal shown.");
    } else {
        console.error("Modal element not found for showing.");
    }
}

function hideModal() {
    if (modalElement) {
        modalElement.classList.remove('active');
        console.log("Snapshot modal hidden.");
    } else {
        console.error("Modal element not found for hiding.");
    }
}

// --- Step Navigation & Logic ---

function proceedToNextStep() {
    currentState.currentStepIndex++;

    // Skip steps whose condition function evaluates to false
    while (
        currentState.currentStepIndex < snapshotSteps.length &&
        snapshotSteps[currentState.currentStepIndex].condition &&
        !snapshotSteps[currentState.currentStepIndex].condition(currentState)
    ) {
        console.log(`Skipping step: ${snapshotSteps[currentState.currentStepIndex].id}`);
        currentState.currentStepIndex++;
    }

    if (currentState.currentStepIndex < snapshotSteps.length) {
        const nextStepId = snapshotSteps[currentState.currentStepIndex].id;
        // Check if the next step is the summary step
        if (nextStepId === 'summary') {
            // If it's the summary, calculate DTI first, then render summary
            finishSnapshot(); // finishSnapshot will now render the summary step
        } else {
            // Otherwise, render the next regular step
            renderStep(nextStepId, { ...currentState });
        }
    } else {
        // This path might not be reached if summary is always last, but good practice
        console.log("Reached end of defined steps (excluding summary).");
        finishSnapshot(); // Calculate and render summary if somehow missed
    }
}

// --- Event Handlers ---

function handleInteraction(event) {
    const target = event.target;
    const stepElement = target.closest('.snapshot-step');
    if (!stepElement) return;
    const stepId = stepElement.dataset.stepId;
    const currentStepConfig = snapshotSteps.find(s => s.id === stepId);
    if (!currentStepConfig) return;

    if (target.tagName === 'BUTTON' && target.closest('.snapshot-content')) {
        handleButtonClick(target, currentStepConfig.id);
    } else if (target.tagName === 'INPUT' && target.type === 'radio' && target.closest('.snapshot-content')) {
        handleRadioChange(target, currentStepConfig.id);
    } else if (target.tagName === 'INPUT' && target.type === 'number' && target.closest('.snapshot-content')) {
        if (target.closest('.snapshot-adjust-section')) {
            handleAdjustmentInputChange(target);
        } else if (currentStepConfig.id === 'vaDetails') {
            handleVaDetailsInputChange(target);
        }
    }
}


function handleButtonClick(buttonElement, stepId) {
    const action = buttonElement.dataset.action;
    console.log(`Snapshot button clicked: ${action} on step ${stepId}`);

    switch (action) {
        case 'continue': // Step 1
            proceedToNextStep();
            break;
        case 'confirmEstimate': // Step 2
             if (currentState.collectedData.totalMonthlyDebts === undefined) {
                 currentState.collectedData.totalMonthlyDebts = currentState.collectedData.estimatedTotalDebts !== undefined
                    ? currentState.collectedData.estimatedTotalDebts
                    : getAutofilledValue('estimatedTotalDebts', currentState.initialData);
             }
             delete currentState.collectedData.estimatedTotalDebts;
            proceedToNextStep();
            break;
        case 'adjustEstimate': // Step 2
            showAdjustSection();
            break;
        case 'confirmDebts': // Step 2 (Adjust section)
            const finalTotal = updateAdjustedTotal();
            currentState.collectedData.totalMonthlyDebts = finalTotal;
            delete currentState.collectedData.carPayments;
            delete currentState.collectedData.studentLoans;
            delete currentState.collectedData.creditCardMinimums;
            delete currentState.collectedData.otherRecurringDebts;
            proceedToNextStep();
            break;
        case 'finishSnapshot': // Step 5 (VA Details)
             if (stepId === 'vaDetails') {
                captureVaDetailsInputs();
             }
            finishSnapshot(); // Calculate and render summary
            break;
        case 'proceedToCalculator': // From Summary Step
            console.log("Proceeding to main calculator display.");
            hideModal(); // Hide the modal
            // Call the original completion callback to trigger main calculation display
            if (typeof currentState.onCompleteCallback === 'function') {
                currentState.onCompleteCallback(currentState.estimatedMaxDTI);
            } else {
                console.warn("Snapshot completed, but no onComplete callback was provided.");
            }
            break;
        default:
            console.warn(`Unhandled button action: ${action}`);
    }
}

function handleRadioChange(radioElement, stepId) {
     if (!radioElement.checked) return;
     const fieldId = radioElement.dataset.fieldId;
     const value = radioElement.value;
     console.log(`Snapshot radio changed: Field ${fieldId}, Value ${value} on step ${stepId}`);
     currentState.collectedData[fieldId] = value;

     // Proceed immediately for these steps
     if (stepId === 'liquidAssets' || stepId === 'employmentDuration') {
         proceedToNextStep();
     }
}

function handleAdjustmentInputChange(inputElement) {
    const fieldId = inputElement.dataset.fieldId;
    const value = Number(inputElement.value) || 0;
    currentState.collectedData[fieldId] = value;
    updateAdjustedTotal();
}

function handleVaDetailsInputChange(inputElement) {
    const fieldId = inputElement.dataset.fieldId;
    let value = Number(inputElement.value) || 0;
    if (fieldId === 'householdSize') {
        value = Math.max(1, value);
        inputElement.value = value;
    }
     currentState.collectedData[fieldId] = value;
     console.log(`VA Detail Input: ${fieldId} = ${value}`);
}

function captureVaDetailsInputs() {
    const stepElement = modalContentElement?.querySelector('.snapshot-step[data-step-id="vaDetails"]');
    if (!stepElement) return;
    const inputs = stepElement.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        handleVaDetailsInputChange(input);
    });
}

// --- Completion / Summary ---

// Renamed: Now calculates DTI for multiple loan types and renders the summary step
function finishSnapshot() {
    console.log("Calculating snapshot summary for multiple loan types...");
    console.log("Initial Data:", currentState.initialData);
    console.log("Collected Data:", currentState.collectedData);

    const loanTypesToEstimate = ['Conventional', 'FHA', 'VA', 'USDA'];
    const allEstimatedDTIs = {};

    loanTypesToEstimate.forEach(type => {
        const estimatedDTI = calculateEstimatedMaxDTI(type); // Pass the type
        allEstimatedDTIs[type] = estimatedDTI;
    });

    // Store the results object in the main state
    currentState.allEstimatedDTIs = allEstimatedDTIs;

    // Remove the old single value storage
    delete currentState.estimatedMaxDTI;
    delete currentState.collectedData.estimatedMaxDTI; // Remove temporary render value

    console.log("All Estimated DTIs:", currentState.allEstimatedDTIs);

    // Render the summary step, the state now includes allEstimatedDTIs
    renderStep('summary', { ...currentState });

    // Do NOT hide modal or call callback here anymore.
    // That happens when the 'proceedToCalculator' button is clicked.
}

// --- DTI Calculation (Refined based on Deep Dive) ---

// Modified to accept targetLoanType
function calculateEstimatedMaxDTI(targetLoanType) {
    console.log(`Calculating Estimated Max DTI for: ${targetLoanType}`);

    // Use initialData for FICO/LTV, but targetLoanType for the calculation rules
    const { fico, ltv = 1.0 } = currentState.initialData;
    const {
        totalMonthlyDebts = 0,
        reserves = 'prefer_not_to_say',
        employment = '',
        taxFreeIncome = 0,
        householdSize = 1
    } = currentState.collectedData;

    let baseDTI = 0.43;
    let maxDTI = 0.50;
    let adjustment = 0;

    // Use the passed targetLoanType for rules
    const upperLoanType = targetLoanType.toUpperCase();
    switch (upperLoanType) {
        case 'FHA':
            baseDTI = 0.43; maxDTI = 0.57; break; // FHA allows higher DTI with compensating factors
        case 'VA':
            // VA often relies more on residual income, but 41% is a common guideline starting point. Max can be higher but less defined by DTI alone. Let's keep a reasonable cap for estimation.
            baseDTI = 0.41; maxDTI = 0.50; break;
        case 'USDA':
            baseDTI = 0.41; maxDTI = 0.46; break; // USDA can sometimes go slightly higher
        case 'CONVENTIONAL':
            baseDTI = 0.45; maxDTI = 0.50; break; // 50% is common max for Fannie/Freddie
        default: console.warn(`Unknown loan type: ${targetLoanType}. Using default DTI limits.`);
             baseDTI = 0.43; maxDTI = 0.50; // Default fallback
    }

    const ficoScore = parseInt(fico?.split('-')[0] || fico || 0);
    if (ficoScore >= 740) adjustment += (upperLoanType === 'CONVENTIONAL' || upperLoanType === 'FHA') ? 0.04 : 0.03;
    else if (ficoScore >= 700) adjustment += 0.02;
    else if (ficoScore >= 660) adjustment += 0.01;
    // Adjustments based on compensating factors
    else if (ficoScore < 620) adjustment -= 0.05; // More significant penalty for very low scores
    else if (ficoScore < 640) adjustment -= 0.03;

    switch (reserves) {
        case 'more_than_10_percent': adjustment += (upperLoanType === 'CONVENTIONAL' || upperLoanType === 'FHA') ? 0.05 : 0.04; break; // Slightly higher impact for Conv/FHA
        case '6_to_10_percent': adjustment += 0.03; break;
        case '2_to_5_percent': adjustment += 0.01; break;
        // No adjustment for <2% or prefer not to say
    }

    switch (employment) {
        case '5_years_plus': adjustment += 0.03; break; // Slightly more weight for long tenure
        case '2_to_5_years': adjustment += 0.01; break;
        case 'less_than_1_year': adjustment -= 0.02; break; // Slightly higher penalty for short tenure
        // No adjustment for 1-2 years
    }

    // LTV adjustments (less impact than FICO/Reserves)
    if (ltv < 0.80) adjustment += 0.01;
    // High LTV penalty only for Conventional, as FHA/VA/USDA are designed for high LTV
    else if (ltv > 0.95 && upperLoanType === 'CONVENTIONAL') adjustment -= 0.01;

    // VA specific adjustments (Residual Income proxies)
    if (upperLoanType === 'VA') {
        // Tax-free income boost
        if (taxFreeIncome > 1000) adjustment += 0.03;
        else if (taxFreeIncome > 500) adjustment += 0.02;

        // Household size / debt load consideration (simplified residual income check)
        // Only apply if debts are provided (not zero)
        if (totalMonthlyDebts > 0 && householdSize > 0) {
             const debtPerPerson = totalMonthlyDebts / householdSize;
             if (debtPerPerson < 200 && householdSize >= 4) adjustment += 0.02; // Lower debt per person for larger families
             else if (debtPerPerson < 150 && householdSize >= 2) adjustment += 0.01;
        }
    }

    let estimatedDTI = baseDTI + adjustment;

    // Apply caps and floors
    estimatedDTI = Math.min(estimatedDTI, maxDTI); // Ensure it doesn't exceed the max for the loan type
    estimatedDTI = Math.max(0.30, estimatedDTI); // Ensure a reasonable minimum floor (e.g., 30%)

    console.log(` -> ${targetLoanType}: Base DTI: ${baseDTI.toFixed(3)}, Adjustment: ${adjustment.toFixed(3)}, Capped Max: ${maxDTI.toFixed(3)}, Final Estimated DTI: ${estimatedDTI.toFixed(3)}`);
    return estimatedDTI; // Return as decimal
}


// --- Initialization ---

export function initSnapshot(initialParams, onComplete) {
    console.log("Initializing Financial Snapshot with params:", initialParams);
    if (!modalElement || !modalContentElement) {
        console.error("Cannot initialize snapshot: Modal elements not found.");
        return;
    }

    currentState = {
        currentStepIndex: 0,
        initialData: { ...initialParams },
        collectedData: {},
        estimatedMaxDTI: null,
        onCompleteCallback: onComplete,
    };

    let firstStepIndex = 0;
     while (
        firstStepIndex < snapshotSteps.length &&
        snapshotSteps[firstStepIndex].condition &&
        !snapshotSteps[firstStepIndex].condition(currentState)
    ) {
        console.log(`Skipping initial step: ${snapshotSteps[firstStepIndex].id}`);
        firstStepIndex++;
    }

    // Ensure we don't try to render the summary step initially
    if (firstStepIndex < snapshotSteps.length && snapshotSteps[firstStepIndex].id === 'summary') {
         console.error("Snapshot attempted to start on summary step.");
         // Handle this error case - maybe show first step instead?
         firstStepIndex = 0; // Default to first step if summary is somehow first
    }


    if (firstStepIndex < snapshotSteps.length) {
         currentState.currentStepIndex = firstStepIndex;
         const firstStepId = snapshotSteps[firstStepIndex].id;
         renderStep(firstStepId, { ...currentState });
    } else {
         console.error("No initial step could be rendered based on conditions.");
         // Don't call finishSnapshot here, let the flow handle it or show error
         return;
    }

    // Add event listeners
    modalContentElement.removeEventListener('click', handleInteraction);
    modalContentElement.addEventListener('click', handleInteraction);
    modalContentElement.removeEventListener('change', handleInteraction);
    modalContentElement.addEventListener('change', handleInteraction);
    modalContentElement.removeEventListener('input', handleInteraction);
    modalContentElement.addEventListener('input', handleInteraction);

    showModal();
}

// Example Usage (commented out):
/* ... */
