/**
 * NEOMORT Calculator main script
 * 
 * Handles UI interactions and connects to the calculation engine.
 */
// Import the centralized chat initializer
import { initializeGlobalChat } from '../dti-calculator/js/integration.js';
import VisualizationAdapter from './adapters/visualization-adapter.js';
import { initDTICalculatorIntegration } from './dti-integration.js';
import { initializeVisualization } from './visualization/index.js'; // Import the visualization initializer
// Removed AIChatHandler import

document.addEventListener('DOMContentLoaded', function() {
    console.log('NEOMORT Calculator initialized');
    
    // --- Check if we are in the main page context ---
    // If a key element like the income input doesn't exist, assume we are in the popup
    // and skip the main page setup.
    const incomeInput = document.getElementById('income');
    if (!incomeInput) {
        console.log('Main page elements not found, skipping main setup (likely in popup).');
        return; // Exit if not on the main page
    }
    // --- End Check ---


    // Get UI elements (only run if incomeInput exists)
    const locationInput = document.getElementById('location');
    const ltvSlider = document.getElementById('ltv');
    const ltvValue = document.getElementById('ltv-value');
    const ficoSlider = document.getElementById('fico');
    const ficoValue = document.getElementById('fico-value');
    const loanTypeButtons = document.querySelectorAll('.neomort-loan-types__button'); // Updated BEM class
    const calculateBtn = document.querySelector('.neomort-calculate-button'); // Corrected BEM class
    
    // Results elements
    const loanAmountEl = document.getElementById('loan-amount');
    const purchasingPowerEl = document.getElementById('purchasing-power'); // Assuming this ID exists
    const downPaymentEl = document.getElementById('down-payment');
    const monthlyPaymentEl = document.getElementById('monthly-payment');
    const interestRateEl = document.getElementById('interest-rate');
    const selectedLoanTypeEl = document.getElementById('selected-loan-type');
    
    // Initialize values
    let income = 75000;
    let location = '';
    let ltv = 95;
    let ficoScore = 680;
    let loanType = 'FHA';
    
    // Update slider displays
    ltvSlider.addEventListener('input', function() {
        ltv = this.value;
        ltvValue.textContent = `${ltv}%`;
        const percentage = (ltv - 70) / (100 - 70) * 100;
        this.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, #374151 ${percentage}%, #374151 100%)`;
    });
    
    ficoSlider.addEventListener('input', function() {
        ficoScore = this.value;
        ficoValue.textContent = ficoScore;
        const percentage = (ficoScore - 580) / (850 - 580) * 100;
        this.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, #374151 ${percentage}%, #374151 100%)`;
    });
    
    // Set initial slider backgrounds
    ltvSlider.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${(ltv-70)/(100-70)*100}%, #374151 ${(ltv-70)/(100-70)*100}%, #374151 100%)`;
    ficoSlider.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${(ficoScore-580)/(850-580)*100}%, #374151 ${(ficoScore-580)/(850-580)*100}%, #374151 100%)`;
    
    // Loan type selection
    loanTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            loanTypeButtons.forEach(btn => btn.classList.remove('neomort-loan-types__button--active'));
            this.classList.add('neomort-loan-types__button--active');
            loanType = this.dataset.loanType;
            if(selectedLoanTypeEl) selectedLoanTypeEl.textContent = loanType; // Check if element exists
            calculateMortgage();
        });
    });
    
    // Form input styling & blur calculation trigger
    incomeInput.addEventListener('focus', function() {
        this.style.borderColor = 'var(--accent-pink)';
        this.style.boxShadow = '0 0 10px rgba(236, 72, 153, 0.3)';
    });
    incomeInput.addEventListener('blur', function() {
        this.style.borderColor = 'rgba(139, 92, 246, 0.5)';
        this.style.boxShadow = 'none';
        calculateMortgage();
    });
    locationInput.addEventListener('focus', function() {
        this.style.borderColor = 'var(--accent-pink)';
        this.style.boxShadow = '0 0 10px rgba(236, 72, 153, 0.3)';
    });
    locationInput.addEventListener('blur', function() {
        this.style.borderColor = 'rgba(139, 92, 246, 0.5)';
        this.style.boxShadow = 'none';
        // Optionally trigger calculation on location blur too, if desired
        // calculateMortgage(); 
    });
    
    /**
     * Calculate mortgage details using the calculation engine
     */
    async function calculateMortgage() {
        try {
            // Get current values only if elements exist
            income = parseFloat(incomeInput?.value) || 75000; // Use optional chaining
            location = locationInput?.value || '';
            ltv = ltvSlider?.value || 95;
            ficoScore = ficoSlider?.value || 680;
            // loanType is updated via button click listener

            const userData = { income, location, ltv: parseInt(ltv), ficoScore: parseInt(ficoScore), loanType };
            console.log('Calculating mortgage with:', userData);
            
            // Use visualization adapter
            await VisualizationAdapter.updateVisualization(userData);
            
        } catch (error) {
            console.error('Error calculating mortgage:', error);
            // Update error display only if elements exist
            document.querySelectorAll('.neomort-card__value').forEach(el => {
                el.classList.remove('loading');
                if (el.id !== 'selected-loan-type') {
                    el.textContent = 'Error';
                }
            });
        }
    }
    
    // Add cyberpunk button effect only if button exists
    if (calculateBtn) {
        calculateBtn.addEventListener('mousedown', function() { this.style.transform = 'scale(0.98)'; });
        calculateBtn.addEventListener('mouseup', function() { this.style.transform = 'scale(1)'; });
        calculateBtn.addEventListener('mouseleave', function() { this.style.transform = 'scale(1)'; });
        calculateBtn.addEventListener('click', calculateMortgage);
    }
    
    // Call calculate initially
    // --- Initialize Visualization and Inject into Adapter ---
    const vizContainer = document.getElementById('visualization');
    if (vizContainer) {
        const vizController = initializeVisualization(vizContainer, false); // Initialize for main page
        if (vizController) {
            VisualizationAdapter.setVisualizationController(vizController); // Inject controller into adapter
        } else {
            console.error("Failed to initialize visualization controller in script-new.js");
        }
    } else {
        console.error("Main visualization container '#visualization' not found in script-new.js");
    }
    // --- End Initialization ---

    // Call calculate initially (now that adapter has the controller)
    calculateMortgage();
    
    // Add loading class animation style
    document.querySelectorAll('.neomort-card__value').forEach(el => {
        el.style.transition = 'all 0.3s ease';
    });
    
    // Initialize DTI Calculator Integration (might need adjustment if button is inside modal now)
    initDTICalculatorIntegration(VisualizationAdapter);

    // Initialize the global AI Chat (this should be safe even in popup)
    const initialAIData = VisualizationAdapter.getLastCalculation ? VisualizationAdapter.getLastCalculation() : {};
    initializeGlobalChat(initialAIData);

});

// Add loading animation style to head (safe to run always)
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
</style>
`);
