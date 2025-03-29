/**
 * NEOMORT Calculator main script
 *
 * Handles UI interactions and connects to the calculation engine.
 */
import { initializeGlobalChat } from '../dti-calculator/js/integration.js';
import VisualizationAdapter from './adapters/visualization-adapter.js';
import { initDTICalculatorIntegration } from './dti-integration.js';
import { initializeVisualization } from './visualization/index.js';
import { initSnapshot } from './financial-snapshot/snapshot.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('NEOMORT Calculator initialized');

    const incomeInput = document.getElementById('income');
    if (!incomeInput) {
        console.log('Main page elements not found, skipping main setup (likely in popup).');
        return;
    }

    // Get UI elements
    const purchasePriceInput = document.getElementById('purchase-price');
    const downPaymentAmountInput = document.getElementById('down-payment-amount');
    const locationInput = document.getElementById('location');
    const ltvSlider = document.getElementById('ltv');
    const ltvValue = document.getElementById('ltv-value');
    const ficoSlider = document.getElementById('fico');
    const ficoValue = document.getElementById('fico-value');
    const loanTypeButtons = document.querySelectorAll('.neomort-loan-types__button');
    const calculateBtn = document.querySelector('.neomort-calculate-button'); // Keep reference to potentially hide/disable later
    const overrideAnnualTaxInput = document.getElementById('override-annual-tax');
    const overrideAnnualHoiInput = document.getElementById('override-annual-hoi');
    const selectedLoanTypeEl = document.getElementById('selected-loan-type');

    // State variables
    let snapshotCompleted = false; // Flag to track if snapshot ran
    let lastEstimatedDTIs = null; // Store the object of results from snapshot { Conventional: 0.5, FHA: 0.48, ... }

    // --- Helper to gather current user data ---
    function getCurrentUserData() {
        const income = parseFloat(incomeInput?.value) || 0;
        const purchasePriceGoal = parseFloat(purchasePriceInput?.value) || 0;
        const dpAmount = parseFloat(downPaymentAmountInput?.value) || 0;
        const location = locationInput?.value || '';
        const ltv = parseInt(ltvSlider?.value) || 0;
        const ficoScore = parseInt(ficoSlider?.value) || 0;
        const loanType = document.querySelector('.neomort-loan-types__button.neomort-loan-types__button--active')?.dataset.loanType || 'FHA';

        const annualTaxOverride = overrideAnnualTaxInput?.value ? parseFloat(overrideAnnualTaxInput.value) : undefined;
        const annualHoiOverride = overrideAnnualHoiInput?.value ? parseFloat(overrideAnnualHoiInput.value) : undefined;

        const overrides = {};
        if (annualTaxOverride !== undefined && !isNaN(annualTaxOverride) && annualTaxOverride >= 0) {
            overrides.AnnualPropertyTaxAmount = annualTaxOverride;
        }
        if (annualHoiOverride !== undefined && !isNaN(annualHoiOverride) && annualHoiOverride >= 0) {
            overrides.AnnualHOI = annualHoiOverride;
        }

        // Get the specific estimated DTI for the currently selected loan type
        const currentEstimatedMaxDTI = lastEstimatedDTIs ? (lastEstimatedDTIs[loanType] ?? null) : null;
        console.log(`Getting user data: Selected Loan Type: ${loanType}, Specific Estimated Max DTI: ${currentEstimatedMaxDTI}`);


        return {
            income, // Annual
            purchasePriceGoal, // Use consistent naming
            dpAmount,
            location,
            ltv, // Integer 0-100
            ficoScore,
            loanType,
            overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
            estimatedMaxDTI: currentEstimatedMaxDTI // Include the specific stored estimate for the selected loan type
        };
    }

    // --- Function to trigger calculation AFTER snapshot ---
    async function runCalculation() {
        if (!snapshotCompleted) {
            console.log("Snapshot not completed yet, calculation deferred.");
            // Optionally show a message to the user?
            return;
        }
        console.log("Running main calculation...");
        const userData = getCurrentUserData();

        // Prepare data for the engine (similar to before, but use gathered data)
        const engineUserData = {
            income: userData.income,
            location: userData.location,
            ltv: userData.ltv,
            ficoScore: userData.ficoScore,
            loanType: userData.loanType,
            purchasePrice: userData.purchasePriceGoal,
            overrides: userData.overrides,
            estimatedMaxDTI: userData.estimatedMaxDTI // Pass estimate along
        };

        try {
            await VisualizationAdapter.updateVisualization(engineUserData);
        } catch (error) {
            console.error('Error running main calculation:', error);
        }
    }


    // --- Function to run snapshot ONCE on load ---
    function runInitialSnapshot() {
        console.log('Running initial Financial Snapshot on page load.');
        const initialData = getCurrentUserData(); // Get initial values from form

        const snapshotParams = {
            income: initialData.income / 12,
            fico: initialData.ficoScore.toString(),
            ltv: initialData.ltv / 100,
            loanType: initialData.loanType,
            purchasePriceGoal: initialData.purchasePriceGoal,
            dpAmount: initialData.dpAmount,
        };

        console.log('Starting Financial Snapshot with initial params:', snapshotParams);

        // Update the callback to receive the object
        initSnapshot(snapshotParams, (allEstimatedDTIs) => {
            // --- Snapshot Callback ---
            console.log("Initial Snapshot complete! All Estimated Max DTIs:", allEstimatedDTIs);
            snapshotCompleted = true;
            lastEstimatedDTIs = allEstimatedDTIs; // Store the entire object

            // Now run the first calculation automatically
            runCalculation();

            // Potentially hide or disable the original "Calculate" button now
            if (calculateBtn) {
                 // calculateBtn.style.display = 'none'; // Option 1: Hide
                 calculateBtn.textContent = 'Recalculate'; // Option 2: Change text
                 calculateBtn.removeEventListener('click', runInitialSnapshot); // Remove old listener if any
                 calculateBtn.addEventListener('click', runCalculation); // Make button trigger recalculation
                 console.log("Calculate button repurposed for recalculation.");
            }
        });
    }

    // --- Event Listeners Setup ---

    // Sliders trigger recalculation directly (after snapshot)
    ltvSlider.addEventListener('input', function() {
        const ltv = parseInt(this.value);
        ltvValue.textContent = `${ltv}%`;
        const percentage = (ltv - 70) / (100 - 70) * 100;
        this.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, #374151 ${percentage}%, #374151 100%)`;
        runCalculation(); // Recalculate on change
    });

    ficoSlider.addEventListener('input', function() {
        const ficoScore = parseInt(this.value);
        ficoValue.textContent = ficoScore;
        const percentage = (ficoScore - 580) / (850 - 580) * 100;
        this.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, #374151 ${percentage}%, #374151 100%)`;
        runCalculation(); // Recalculate on change
    });

    // Loan type selection triggers recalculation directly (after snapshot)
    loanTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            loanTypeButtons.forEach(btn => btn.classList.remove('neomort-loan-types__button--active'));
            this.classList.add('neomort-loan-types__button--active');
            if(selectedLoanTypeEl) selectedLoanTypeEl.textContent = this.dataset.loanType;
            runCalculation(); // Recalculate on change
        });
    });

    // Text inputs trigger recalculation on blur (after snapshot)
    [incomeInput, purchasePriceInput, downPaymentAmountInput, locationInput, overrideAnnualTaxInput, overrideAnnualHoiInput].forEach(input => {
        input?.addEventListener('focus', function() {
            this.style.borderColor = 'var(--accent-pink)';
            this.style.boxShadow = '0 0 10px rgba(236, 72, 153, 0.3)';
        });
        input?.addEventListener('blur', function() {
            this.style.borderColor = 'rgba(139, 92, 246, 0.5)';
            this.style.boxShadow = 'none';
            runCalculation(); // Recalculate on blur
        });
    });

    // Remove the original button listener that called handleCalculateClick (which is removed)
    // The new listener is added inside runInitialSnapshot callback

    // --- Initialization ---

    // Set initial slider backgrounds
    ltvSlider.dispatchEvent(new Event('input'));
    ficoSlider.dispatchEvent(new Event('input'));

    // Initialize Visualization and Inject into Adapter
    const vizContainer = document.getElementById('visualization');
    if (vizContainer) {
        const vizController = initializeVisualization(vizContainer, false);
        if (vizController) {
            VisualizationAdapter.setVisualizationController(vizController);
        } else {
            console.error("Failed to initialize visualization controller in script-new.js");
        }
    } else {
        console.error("Main visualization container '#visualization' not found in script-new.js");
    }

    // Run the initial snapshot process
    runInitialSnapshot(); // <<<< CALL SNAPSHOT ON LOAD >>>>

    // Initialize DTI Calculator Integration (separate feature)
    initDTICalculatorIntegration(VisualizationAdapter);

    // Initialize the global AI Chat
    const initialAIData = VisualizationAdapter.getLastCalculation ? VisualizationAdapter.getLastCalculation() : {};
    initializeGlobalChat(initialAIData);

});

// Add loading animation style to head
document.head.insertAdjacentHTML('beforeend', `
<style>
    @keyframes loading {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }
    .neomort-card__value.loading {
        animation: loading 1s infinite;
    }
    /* Style for overridden values */
    .neomort-card__value--overridden {
        /* Add a subtle indicator, e.g., a small asterisk or different color/style */
        /* Example: */
        /* color: var(--accent-pink); */
        /* font-style: italic; */
    }

</style>
`);
