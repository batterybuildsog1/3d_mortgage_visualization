import * as THREE from 'three';
import { formatCurrency } from './helpers.js';

// Loan type colors for tooltip
const LOAN_TYPE_COLORS = { 'Conventional': '#ec4899', 'FHA': '#06b6d4', 'VA': '#34d399', 'USDA': '#8b5cf6' };

/**
 * Manages UI elements related to the 3D visualization, including
 * tooltips, axis labels, view controls, and options panels.
 */
export class UIManager {
    visualization; // Reference to the main Visualization instance
    barManager;    // Reference to the BarManager instance (needed for config updates)
    scene;         // Reference to the THREE.Scene
    camera;        // Reference to the THREE.Camera
    controls;      // Reference to OrbitControls

    tooltipElement; // Re-added
    axesElements = []; // Store axis lines and labels (THREE objects)
    uiContainer;   // The main container for DOM UI elements

    // Callbacks for UI interactions
    onVizModeToggle;
    onLoanComparisonChange;
    onRecalculateRequest; // Generic callback to request recalculation

    constructor(visualization, barManager) {
        if (!visualization || !barManager) {
            throw new Error("UIManager requires Visualization and BarManager instances.");
        }
        this.visualization = visualization;
        this.barManager = barManager;
        this.scene = visualization.scene;
        this.camera = visualization.camera;
        this.controls = visualization.controls;
        this.uiContainer = visualization.targetContainer;

        this.#createTooltip(); // Re-added call
        this.createAxes();

        if (!visualization.isPopup) {
            this.#addViewControls();
            this.#setupVisualizationControls();
        }

        this.addTextLabel = this.addTextLabel.bind(this);
    }

    // --- Tooltip Management ---

    #createTooltip() {
        const existingTooltip = this.uiContainer.querySelector('.bar-tooltip');
        if (existingTooltip) {
            this.uiContainer.removeChild(existingTooltip);
        }

        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'bar-tooltip';
        this.tooltipElement.style.position = 'absolute';
        this.tooltipElement.style.display = 'none';
        this.tooltipElement.style.pointerEvents = 'none'; // Keep as none
        this.tooltipElement.style.zIndex = '1000';
        this.tooltipElement.style.backgroundColor = 'rgba(17, 24, 39, 0.95)';
        this.tooltipElement.style.color = '#ffffff';
        this.tooltipElement.style.padding = '15px';
        this.tooltipElement.style.borderRadius = '8px';
        this.tooltipElement.style.fontSize = '16px';
        this.tooltipElement.style.minWidth = '240px';
        this.tooltipElement.style.border = '2px solid var(--accent-cyan)';
        this.tooltipElement.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.5)';
        this.tooltipElement.style.fontFamily = 'Courier New, monospace';
        this.tooltipElement.style.backdropFilter = 'blur(4px)';
        this.tooltipElement.style.transition = 'opacity 0.15s ease-out';
        this.tooltipElement.style.opacity = '0';

        // Append to body instead of uiContainer to avoid stacking context issues
        document.body.appendChild(this.tooltipElement);
    }

    updateTooltipContent(data) {
        if (!data) return;

        const formattedLoanAmount = formatCurrency(data.loanAmount);
        const formattedPurchasePrice = formatCurrency(data.purchasingPower);
        const formattedDownPayment = formatCurrency(data.downPayment);

        let monthlyPayment = data.monthlyPayment;
        if (!monthlyPayment && data.loanAmount > 0) {
            const monthlyRate = (data.interestRate || 0.06) / 12;
            const termMonths = 30 * 12;
            if (monthlyRate > 0) {
                monthlyPayment = data.loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                                 (Math.pow(1 + monthlyRate, termMonths) - 1);
            }
        }
        const formattedMonthlyPayment = formatCurrency(monthlyPayment);
        const downPaymentPercent = data.ltv ? (100 - data.ltv) : 0;
        const ficoBand = this.#getFicoBand(data.ficoScore);
        const loanTypeColor = LOAN_TYPE_COLORS[data.loanType] || '#888888';
        const interestRateText = data.interestRate ? `${(data.interestRate * 100).toFixed(2)}%` : 'N/A';

        let primaryValueHTML = '', secondaryInfoHTML = '';
        const vizMode = this.visualization.currentVizMode;

        if (vizMode === 'purchasing') {
            primaryValueHTML = `
                <div style="font-size: 20px; font-weight: bold;">${formattedPurchasePrice}</div>
                <div style="margin-top: 2px; font-size: 14px; color: #aaaaaa;">Total Purchasing Power</div>
                <div style="margin-top: 5px; font-size: 14px; color: #dddddd;">(${formattedLoanAmount} Loan + ${formattedDownPayment} Down)</div>`;
            secondaryInfoHTML = `
                 <div><div style="color: #aaaaaa; font-size: 12px;">Loan Amount</div><div style="font-size: 16px;">${formattedLoanAmount}</div></div>
                 <div><div style="color: #aaaaaa; font-size: 12px;">Down Payment</div><div style="font-size: 16px;">${formattedDownPayment} (${downPaymentPercent.toFixed(1)}%)</div></div>`;
        } else {
            primaryValueHTML = `
                <div style="font-size: 20px; font-weight: bold;">${formattedLoanAmount}</div>
                <div style="margin-top: 2px; font-size: 14px; color: #aaaaaa;">Maximum Loan Amount</div>`;
            secondaryInfoHTML = `
                 <div><div style="color: #aaaaaa; font-size: 12px;">Est. Purchase Price</div><div style="font-size: 16px;">${formattedPurchasePrice}</div></div>
                 <div><div style="color: #aaaaaa; font-size: 12px;">Down Payment %</div><div style="font-size: 16px;">${downPaymentPercent.toFixed(1)}%</div></div>`;
        }

        this.tooltipElement.innerHTML = `
            <div style="margin-bottom: 12px; text-align: center;">${primaryValueHTML}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div><div style="color: #ff3366; font-weight: bold; margin-bottom: 2px;">FICO Band</div><div style="font-size: 14px;">${ficoBand} (${data.ficoScore || 'N/A'})</div></div>
                <div><div style="color: #3366ff; font-weight: bold; margin-bottom: 2px;">LTV</div><div style="font-size: 14px;">${data.ltv || 'N/A'}%</div></div>
            </div>
            <div style="padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                     <div><div style="color: #aaaaaa; font-size: 12px;">Est. P&I Payment</div><div style="font-size: 16px;">${formattedMonthlyPayment}</div></div>
                    ${secondaryInfoHTML}
                </div>
            </div>
            <div style="margin-top: 10px; text-align: center; padding: 5px; background-color: rgba(0,0,0,0.3); border-radius: 4px;">
                <div style="font-size: 14px; color: ${loanTypeColor}; font-weight: bold;">${data.loanType || 'N/A'} Loan (${interestRateText})</div>
            </div>`;
    }

    showTooltip(data) {
        // --- Debugging Tooltip ---
        console.log("[Tooltip Debug] showTooltip called with data:", data);
        // --- End Debugging ---
        this.updateTooltipContent(data);
        this.tooltipElement.style.display = 'block';
        requestAnimationFrame(() => {
             requestAnimationFrame(() => {
                 this.tooltipElement.style.opacity = '1';
             });
        });
    }

    hideTooltip() {
        this.tooltipElement.style.opacity = '0';
        setTimeout(() => {
            if (this.tooltipElement && this.tooltipElement.style.opacity === '0') {
                this.tooltipElement.style.display = 'none';
            }
        }, 150);
    }

    updateTooltipPosition(clientX, clientY) {
        if (!this.tooltipElement || this.tooltipElement.style.display === 'none') return;
        this.tooltipElement.style.left = `${clientX + 15}px`;
        this.tooltipElement.style.top = `${clientY + 15}px`;
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        if (clientX + 15 + tooltipRect.width > window.innerWidth) {
            this.tooltipElement.style.left = `${clientX - tooltipRect.width - 15}px`;
        }
        if (clientY + 15 + tooltipRect.height > window.innerHeight) {
            this.tooltipElement.style.top = `${clientY - tooltipRect.height - 15}px`;
        }
    }

    #getFicoBand(ficoScore) {
        if (!ficoScore) return "N/A";
        if (ficoScore >= 800) return "Exceptional";
        if (ficoScore >= 740) return "Excellent";
        if (ficoScore >= 670) return "Good";
        if (ficoScore >= 580) return "Fair";
        return "Poor";
    }

    // --- Axis Management ---

    createAxes() {
        this.#clearAxes();
        try {
            const axisConfigs = [
                { color: 0xff3366, points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)] },
                { color: 0x33ffaa, points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 10, 0)] },
                { color: 0x3366ff, points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 10)] }
            ];
            axisConfigs.forEach(config => {
                const material = new THREE.LineBasicMaterial({ color: config.color });
                const geometry = new THREE.BufferGeometry().setFromPoints(config.points);
                const line = new THREE.Line(geometry, material);
                this.scene.add(line);
                this.axesElements.push(line);
            });

            const yAxisLabelText = (this.visualization.currentVizMode === 'purchasing') ? 'Purchasing Power' : 'Borrowing Capacity';
            const labelConfigs = [
                { text: "FICO Score", position: new THREE.Vector3(12, 0, 0), color: "#ff3366" },
                { text: yAxisLabelText, position: new THREE.Vector3(0, 12, 0), color: "#33ffaa", id: "y-axis-label" },
                { text: "LTV %", position: new THREE.Vector3(0, 0, 12), color: "#3366ff" }
            ];
            labelConfigs.forEach(config => {
                const sprite = this.#createSpriteLabel(config.text, config.color);
                sprite.position.copy(config.position);
                sprite.scale.set(8, 2, 1);
                if (config.id) sprite.name = config.id;
                this.scene.add(sprite);
                this.axesElements.push(sprite);
            });
        } catch (error) {
            console.error('Error creating axes:', error);
        }
    }

    updateYAxisLabel() {
        const yAxisLabel = this.scene.getObjectByName("y-axis-label");
        if (yAxisLabel instanceof THREE.Sprite && yAxisLabel.material.map) {
            const newText = (this.visualization.currentVizMode === 'purchasing') ? 'Purchasing Power' : 'Borrowing Capacity';
            const canvas = yAxisLabel.material.map.image;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.font = "Bold 48px Courier New";
            context.fillStyle = "#33ffaa";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(newText, canvas.width / 2, canvas.height / 2);
            yAxisLabel.material.map.needsUpdate = true;
        }
    }

    #clearAxes() {
        this.axesElements.forEach(element => {
            this.scene.remove(element);
            if (element.geometry) element.geometry.dispose();
            if (element.material) {
                if (element.material.map) element.material.map.dispose();
                element.material.dispose();
            }
        });
        this.axesElements = [];
    }

    // --- Text Label Management ---

    addTextLabel(text, x, y, z, color, isCenterLabel = false) {
        try {
            const sprite = this.#createSpriteLabel(text, color);
            sprite.position.set(x, y, z);
            sprite.scale.set(sprite.material.map.image.width / 64, sprite.material.map.image.height / 64, 1);
            this.scene.add(sprite);
            if (!isCenterLabel && this.barManager) {
                this.barManager.bars.push(sprite);
            }
            return sprite;
        } catch (error) {
            console.error("Error adding text label:", error);
            return null;
        }
    }

    #createSpriteLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const font = "Bold 32px Courier New";
        context.font = font;
        const textWidth = context.measureText(text).width;
        canvas.width = THREE.MathUtils.ceilPowerOfTwo(textWidth + 20);
        canvas.height = 64;
        context.font = font;
        context.fillStyle = (typeof color === 'number') ? "#" + new THREE.Color(color).getHexString() : color;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        return new THREE.Sprite(spriteMaterial);
    }


    // --- DOM UI Controls ---

    #addViewControls() {
        const existingControls = this.uiContainer.querySelector('.view-controls');
        if (existingControls) this.uiContainer.removeChild(existingControls);
        const container = document.createElement('div');
        container.className = 'view-controls';
        container.style.position = 'absolute';
        container.style.bottom = '10px';
        container.style.left = '10px';
        container.style.display = 'flex';
        container.style.gap = '8px';
        container.style.zIndex = '100';

        const views = [
            { name: 'Top', position: [0, 15, 0] }, { name: 'Front', position: [0, 5, 15] },
            { name: 'Side', position: [15, 5, 0] }, { name: 'Isometric', position: [10, 10, 10] },
            { name: 'Reset', position: [15, 15, 15] }
        ];

        views.forEach(view => {
            const button = document.createElement('button');
            button.textContent = view.name;
            button.style.backgroundColor = 'rgba(17, 24, 39, 0.8)';
            button.style.color = view.name === 'Reset' ? '#ff3366' : '#06b6d4';
            button.style.border = `1px solid ${button.style.color}`;
            button.style.borderRadius = '4px';
            button.style.padding = '6px 10px';
            button.style.fontSize = '12px';
            button.style.fontFamily = 'Courier New, monospace';
            button.style.cursor = 'pointer';
            button.addEventListener('click', () => {
                if (!this.camera || !this.controls) return;
                this.camera.position.set(...view.position);
                this.camera.lookAt(0, 0, 0);
                this.controls.target.set(0, 0, 0);
                this.controls.update();
            });
            container.appendChild(button);
        });
        this.uiContainer.appendChild(container);
    }

    #setupVisualizationControls() {
        const loanComparisonDropdown = document.getElementById('loan-comparison');
        if (loanComparisonDropdown) {
            loanComparisonDropdown.addEventListener('change', (event) => {
                const selectedOption = event.target.value;
                console.log(`Loan comparison option selected: ${selectedOption}`);
                if (this.onLoanComparisonChange) this.onLoanComparisonChange(selectedOption);
                else console.warn("onLoanComparisonChange callback not set in UIManager.");
            });
        }

        const vizModeToggleBtn = document.getElementById('viz-mode-toggle');
        if (vizModeToggleBtn) {
            this.updateVizModeButton();
            vizModeToggleBtn.addEventListener('click', () => {
                const newMode = (this.visualization.currentVizMode === 'borrowing') ? 'purchasing' : 'borrowing';
                if (this.onVizModeToggle) this.onVizModeToggle(newMode);
                else {
                    console.warn("onVizModeToggle callback not set in UIManager.");
                    this.visualization.setVisualizationMode(newMode);
                    this.updateYAxisLabel();
                    this.updateVizModeButton();
                    if (this.visualization.currentData && this.onRecalculateRequest) {
                         this.onRecalculateRequest(this.visualization.currentData, true);
                    }
                }
            });
        }

        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                if (typeof window.toggleFullscreen === 'function') {
                    window.toggleFullscreen();
                } else {
                    console.error("toggleFullscreen function not found on window.");
                }
            });
        } else {
             console.warn("Fullscreen button #fullscreen-btn not found.");
        }

        const optionsBtn = document.querySelector('.options-btn');
        const optionsPanel = this.#createOptionsPanel();
        if (optionsBtn && optionsPanel) {
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                optionsPanel.style.display = optionsPanel.style.display === 'block' ? 'none' : 'block';
            });
            document.addEventListener('click', (e) => {
                 if (!optionsPanel.contains(e.target) && e.target !== optionsBtn) {
                     optionsPanel.style.display = 'none';
                 }
            });
        }
    }

    updateVizModeButton() {
        const vizModeToggleBtn = document.getElementById('viz-mode-toggle');
        if (vizModeToggleBtn) {
            const mode = this.visualization.currentVizMode;
            const span = vizModeToggleBtn.querySelector('span');
            if (span) span.textContent = (mode === 'borrowing') ? 'Show Purchasing Power' : 'Show Borrowing Capacity';
            vizModeToggleBtn.title = (mode === 'borrowing') ? 'Switch to Purchasing Power View' : 'Switch to Borrowing Capacity View';
            vizModeToggleBtn.dataset.mode = mode;
        }
    }

    #createOptionsPanel() {
        let optionsPanel = this.uiContainer.querySelector('.visualization-options-panel');
        if (!optionsPanel) {
            optionsPanel = document.createElement('div');
            optionsPanel.className = 'visualization-options-panel';
            optionsPanel.style.position = 'absolute';
            optionsPanel.style.top = '50px';
            optionsPanel.style.right = '10px';
            optionsPanel.style.backgroundColor = 'rgba(17, 24, 39, 0.95)';
            optionsPanel.style.border = '2px solid var(--accent-cyan)';
            optionsPanel.style.borderRadius = '8px';
            optionsPanel.style.padding = '15px';
            optionsPanel.style.width = '240px';
            optionsPanel.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.5)';
            optionsPanel.style.zIndex = '999';
            optionsPanel.style.display = 'none';
            this.uiContainer.appendChild(optionsPanel);
        }
        this.uiContainer.style.position = this.uiContainer.style.position || 'relative';

        optionsPanel.innerHTML = `
            <h4 style="color: var(--accent-cyan); margin-top: 0; margin-bottom: 10px; font-family: 'Courier New', monospace;">Viz Options</h4>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #fff; font-size: 14px;">Bar Spacing</label>
                <input type="range" id="bar-spacing-slider" min="1" max="4" step="0.1" value="${this.barManager.barSpacing}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #fff; font-size: 14px;">Bar Width</label>
                <input type="range" id="bar-width-slider" min="0.3" max="1.5" step="0.05" value="${this.barManager.barWidth}" style="width: 100%;">
            </div>
        `;

        const spacingSlider = optionsPanel.querySelector('#bar-spacing-slider');
        if (spacingSlider && !spacingSlider.dataset.listenerAttached) {
            spacingSlider.addEventListener('input', (e) => {
                const newSpacing = parseFloat(e.target.value);
                this.barManager.updateConfig({ barSpacing: newSpacing });
                if (this.visualization.currentData && this.onRecalculateRequest) {
                    this.onRecalculateRequest(this.visualization.currentData, true);
                }
            });
            spacingSlider.dataset.listenerAttached = 'true';
        }

        const widthSlider = optionsPanel.querySelector('#bar-width-slider');
        if (widthSlider && !widthSlider.dataset.listenerAttached) {
            widthSlider.addEventListener('input', (e) => {
                const newWidth = parseFloat(e.target.value);
                this.barManager.updateConfig({ barWidth: newWidth });
                 if (this.visualization.currentData && this.onRecalculateRequest) {
                    this.onRecalculateRequest(this.visualization.currentData, true);
                }
            });
            widthSlider.dataset.listenerAttached = 'true';
        }
        return optionsPanel;
    }

    destroy() {
        console.log("Destroying UIManager elements...");
        // Remove tooltip from body if it exists and is attached
        if (this.tooltipElement && this.tooltipElement.parentElement === document.body) {
             document.body.removeChild(this.tooltipElement);
        }
        this.tooltipElement = null;
        const viewControls = this.uiContainer.querySelector('.view-controls');
        if (viewControls?.parentElement) {
            viewControls.parentElement.removeChild(viewControls);
        }
        const optionsPanel = this.uiContainer.querySelector('.visualization-options-panel');
        if (optionsPanel?.parentElement) {
            optionsPanel.parentElement.removeChild(optionsPanel);
        }
        this.#clearAxes();
    }
}
