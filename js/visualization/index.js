// Import THREE and modules that use it
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Visualization } from './Visualization.js';
import { BarManager } from './BarManager.js';
import { UIManager } from './UIManager.js';
import { InteractionManager } from './InteractionManager.js';

// Store visualization instances mapped by their container element
const visualizationInstances = new Map();

/**
 * Initializes or retrieves a visualization instance for a given container.
 * @param {HTMLElement} targetContainer - The DOM element for the visualization.
 * @param {boolean} [isPopup=false] - Is this running in the popup window?
 * @returns {object | null} The visualization controller object or null on error.
 */
function initializeVisualization(targetContainer, isPopup = false) {
    if (!targetContainer) {
        console.error('Target container not provided for initialization.');
        return null;
    }

    // Check if an instance already exists for this container
    if (visualizationInstances.has(targetContainer)) {
        return visualizationInstances.get(targetContainer);
    }

    // --- Instantiate Immediately using imported THREE ---
    try {
        // No need to check for global THREE, imports handle it.

        // 1. Create the core Visualization instance
        const viz = new Visualization(targetContainer, isPopup); // Pass only necessary params

        // 2. Create Managers
        const barManager = new BarManager(viz.scene); // Pass only necessary params
        const uiManager = new UIManager(viz, barManager); // Pass only necessary params
        const interactionManager = new InteractionManager(viz, barManager, uiManager); // Pass only necessary params

        // 3. Create the main controller object
        const controller = {
            viz,
            barManager,
            uiManager,
            interactionManager,
            isPopup,
            targetContainer,
            currentData: null,
            isInitialized: true,

            /** Main update function */
            update(data) {
                if (!data) return;
                this.currentData = data;
                this.viz.updateData(data);
                this.uiManager.updateYAxisLabel();

                const loanComparisonDropdown = document.getElementById('loan-comparison');
                const isMultiLoan = !this.isPopup && loanComparisonDropdown && loanComparisonDropdown.value === 'Compare All Loans';

                if (isMultiLoan) {
                    console.warn("Update called during multi-loan comparison mode. Recalculate via dropdown.");
                    this.compareAllLoanTypes(this.currentData);
                } else {
                    this.barManager.createBarsFromMatrix(data, this.viz.currentVizMode, this.uiManager.addTextLabel, false);
                }
            },

            /** Handles visualization mode toggle */
            handleVizModeToggle(newMode) {
                this.viz.setVisualizationMode(newMode);
                this.uiManager.updateYAxisLabel();
                this.uiManager.updateVizModeButton();
                if (this.currentData) {
                    const loanComparisonDropdown = document.getElementById('loan-comparison');
                    const isMultiLoan = !this.isPopup && loanComparisonDropdown && loanComparisonDropdown.value === 'Compare All Loans';
                    if (isMultiLoan) {
                        this.compareAllLoanTypes(this.currentData);
                    } else {
                        this.update(this.currentData);
                    }
                }
            },

            /** Handles loan comparison dropdown change */
            async handleLoanComparisonChange(selectedOption) {
                if (selectedOption === 'Compare All Loans') {
                    const baseData = this.currentData;
                    if (!baseData) {
                        console.warn('No base calculation data available for comparison.');
                        this.uiManager.addTextLabel("No base data for comparison", 0, 5, 0, 0xffffff);
                        return;
                    }
                    await this.compareAllLoanTypes(baseData);
                } else {
                    const loanType = selectedOption.replace(' Only', '');
                    if (this.uiManager.onRecalculateRequest) {
                         const inputData = { ...this.currentData, loanType: loanType };
                         this.uiManager.onRecalculateRequest(inputData, false);
                    } else {
                         console.warn("onRecalculateRequest callback not set.");
                    }
                }
            },

            /** Fetches data for all loan types and triggers multi-bar rendering */
            async compareAllLoanTypes(baseCalculation) {
                console.log('Comparing all loan types via controller...');
                if (!window.visualizationAdapter || !window.visualizationAdapter.calculator) {
                    console.error('Visualization adapter or calculator not found for comparison.');
                    this.uiManager.addTextLabel("Error: Calculator not found", 0, 5, 0, 0xff0000);
                    return;
                }

                let currentIncome = baseCalculation.income;
                if (!currentIncome || currentIncome <= 0) {
                    const incomeInput = document.getElementById('income');
                    currentIncome = parseFloat(incomeInput?.value) || 0;
                    if (currentIncome <= 0) {
                         console.error('Cannot compare loans: Invalid or missing income.');
                         this.uiManager.addTextLabel("Error: Invalid income for comparison", 0, 5, 0, 0xff0000);
                         return;
                    }
                    console.log("Using income from DOM for comparison:", currentIncome);
                }
                const currentLocation = baseCalculation.location || '';

                const loanTypes = ['Conventional', 'FHA', 'VA', 'USDA'];
                this.barManager.clearBars();
                const loadingLabel = this.uiManager.addTextLabel("Calculating comparison...", 0, 5, 0, 0xffffff);

                try {
                    const results = await Promise.all(loanTypes.map(async (loanType) => {
                        const input = { ...baseCalculation, income: currentIncome, location: currentLocation, loanType: loanType };
                        try {
                            const result = await window.visualizationAdapter.calculator.calculate(input);
                            return { loanType, result };
                        } catch (error) {
                            console.error(`Error calculating for ${loanType}:`, error);
                            return { loanType, result: null };
                        }
                    }));

                    if (loadingLabel && this.viz.scene) this.viz.scene.remove(loadingLabel);
                    this.barManager.createMultiLoanComparisonBars(results, { ...baseCalculation, income: currentIncome, location: currentLocation }, this.viz.currentVizMode, this.uiManager.addTextLabel);

                } catch (error) {
                    console.error('Error comparing loan types:', error);
                    if (loadingLabel && this.viz.scene) this.viz.scene.remove(loadingLabel);
                    this.uiManager.addTextLabel("Error comparing loans", 0, 5, 0, 0xff0000);
                }
            },

            /** Animation loop integration */
            runAnimationFrame() {
                if (this.interactionManager) {
                    this.interactionManager.checkIntersections();
                }
            },

            /** Cleanup */
            destroy() {
                console.log(`Destroying visualization instance for container: ${this.targetContainer.id || 'Unnamed'}`);
                if (this.interactionManager) this.interactionManager.destroy();
                if (this.uiManager) this.uiManager.destroy();
                if (this.viz) this.viz.destroy();
                visualizationInstances.delete(this.targetContainer);
            }
        };

        // --- Connect Callbacks ---
        uiManager.onVizModeToggle = controller.handleVizModeToggle.bind(controller);
        uiManager.onLoanComparisonChange = controller.handleLoanComparisonChange.bind(controller);
        uiManager.onRecalculateRequest = (data, renderOnly) => {
             console.log("Recalculate request received by UIManager:", data, "Render only:", renderOnly);
             if (renderOnly) {
                 controller.update(data);
             } else {
                 if (window.visualizationAdapter?.updateVisualization) {
                     window.visualizationAdapter.updateVisualization(data)
                         .catch(err => console.error("Error triggering recalculation from UI:", err));
                 } else {
                     console.warn("Cannot trigger full recalculation: visualizationAdapter not found or missing updateVisualization method.");
                 }
             }
        };

        // --- Integrate Interaction Check into Animation Loop ---
        const originalAnimate = viz.animate.bind(viz);
        viz.animate = () => {
            originalAnimate();
            controller.runAnimationFrame();
        };

        // Store the fully initialized instance
        visualizationInstances.set(targetContainer, controller);
        console.log('Visualization controller created and initialized.');
        return controller;

    } catch (error) {
        console.error('Failed to initialize visualization:', error);
        // Attempt cleanup if partial initialization occurred
        if (visualizationInstances.has(targetContainer)) {
            visualizationInstances.get(targetContainer).destroy();
        } else if (targetContainer.dataset.visualizationInitialized === 'true') {
             try {
                 // If only Visualization core was created before error
                 const tempViz = new Visualization(targetContainer, isPopup); // No THREE needed here
                 tempViz.destroy();
             } catch (cleanupError) {
                 console.error("Error during cleanup:", cleanupError);
             }
        }
        return null;
    }
} // End of initializeVisualization function

// --- Global Functions Exposed --- // REMOVED window.updateVisualization

// Removed getLatestVisualizationData as popup will use localStorage

window.toggleFullscreen = function() { // Keep toggleFullscreen global for now, though ideally it should also be managed
    if (typeof window.opener !== 'undefined' && window.opener !== null) {
        console.warn("Already in popup, cannot open another.");
        return;
    }

    const mainContainer = document.getElementById('visualization');
    let controller = null;
    if (mainContainer) {
        controller = visualizationInstances.get(mainContainer);
    }

    if (!controller && mainContainer) {
         console.log("Fullscreen toggle: Initializing main controller first.");
         controller = initializeVisualization(mainContainer, false);
    }

    if (!controller || !controller.isInitialized || !controller.currentData) {
         console.warn("No data in main visualization or controller not ready to show in popup.");
         alert("Please perform a calculation first or wait for visualization to load before opening the fullscreen view.");
         return;
    }

    // Save data to localStorage before opening popup
    try {
        localStorage.setItem('visualizationDataForPopup', JSON.stringify(controller.currentData));
        console.log("[Fullscreen] Saved data to localStorage for popup.");
    } catch (e) {
        console.error("[Fullscreen] Error saving data to localStorage:", e);
        alert("Could not prepare data for fullscreen view. Please try again.");
        return;
    }


    const width = Math.min(1200, window.screen.availWidth * 0.8);
    const height = Math.min(800, window.screen.availHeight * 0.8);
    const left = (window.screen.availWidth - width) / 2;
    const top = (window.screen.availHeight - height) / 2;

    window.open(
        'visualization-popup.html',
        'MortgageVisualizationPopup',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,location=no`
    );
};

// Optional: Export initializeVisualization if needed directly by other modules
// export { initializeVisualization };
