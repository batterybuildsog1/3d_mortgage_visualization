import * as THREE from 'three';
import { formatCurrency, createIncrementTexture } from './helpers.js';

// Define the grid dimensions - should match the calculator
const FICO_SCORES = [580, 660, 740, 820];
const LTV_VALUES = [70, 80, 90, 97];

// Loan type colors for multi-loan comparison
const LOAN_TYPE_COLORS = {
    'Conventional': 0xff1493, // Pink
    'FHA': 0x00e5ff,          // Cyan
    'VA': 0x39ff14,           // Green
    'USDA': 0xb026ff          // Purple
};

/**
 * Manages the creation, update, and removal of 3D bars in the visualization.
 */
export class BarManager {
    scene; // Reference to the main THREE.Scene
    bars = []; // Holds the THREE.Group objects representing bars
    centerBarLabel = null; // Reference to the label on the center bar

    // Configuration
    barSpacing = 3.0;
    barWidth = 0.8;
    // No longer need to store THREE instance

    constructor(scene) { // Removed THREE_Instance param
        if (!scene) {
            throw new Error("BarManager requires a THREE.Scene instance.");
        }
        // No need to check global THREE here
        this.scene = scene;
    }

    updateConfig(config) {
        if (config.barSpacing !== undefined) this.barSpacing = config.barSpacing;
        if (config.barWidth !== undefined) this.barWidth = config.barWidth;
    }

    clearBars() {
        try {
            this.bars.forEach(barGroup => {
                if (barGroup instanceof THREE.Group) { // Use imported THREE
                    barGroup.traverse(object => {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => {
                                    if (material.map) material.map.dispose();
                                    material.dispose();
                                });
                            } else {
                                if (object.material.map) object.material.map.dispose();
                                object.material.dispose();
                            }
                        }
                    });
                } else if (barGroup instanceof THREE.Sprite && barGroup.material) { // Use imported THREE
                    if (barGroup.material.map) barGroup.material.map.dispose();
                    barGroup.material.dispose();
                }
                this.scene.remove(barGroup);
            });
            this.bars = [];
            this.centerBarLabel = null;
        } catch (error) {
            console.error('Error clearing bars:', error);
        }
    }

    createBarsFromMatrix(data, vizMode, addTextLabelFunc, isMultiLoanComparison = false) {
        this.clearBars();
        const { ficoScore: currentFico, ltv: currentLtv, loanType: currentLoanType, powerMatrix } = data;
        if (!powerMatrix || !Array.isArray(powerMatrix)) {
            console.warn("Power matrix data is missing or invalid.");
            return;
        }

        try {
            const ficoIndex = FICO_SCORES.findIndex(val => currentFico <= val) ?? 0;
            const ltvIndex = LTV_VALUES.findIndex(val => currentLtv <= val) ?? 0;
            let minValue = Infinity, maxValue = -Infinity;
            const valueKey = (vizMode === 'purchasing') ? 'purchasingPower' : 'loanAmount';

            powerMatrix.forEach(entry => {
                entry.loanAmount = entry.loanAmount || (entry.purchasingPower * (entry.ltv / 100));
                entry.purchasingPower = entry.purchasingPower || (entry.loanAmount / (entry.ltv / 100));
                const value = entry[valueKey];
                if (entry.eligible && value > 0) {
                    minValue = Math.min(minValue, value);
                    maxValue = Math.max(maxValue, value);
                }
            });

            if (minValue === Infinity) minValue = 150000;
            if (maxValue === -Infinity || minValue >= maxValue) maxValue = minValue + 350000;

            const matrixMap = new Map();
            powerMatrix.forEach(entry => matrixMap.set(`${entry.ficoScore}_${entry.ltv}`, entry));

            const minHeight = 0.5, maxHeight = 10;

            for (let i = 0; i < FICO_SCORES.length; i++) {
                for (let j = 0; j < LTV_VALUES.length; j++) {
                    const key = `${FICO_SCORES[i]}_${LTV_VALUES[j]}`;
                    const entry = matrixMap.get(key);
                    if (!entry || !entry.eligible) continue;

                    const displayValue = entry[valueKey];
                    const loanAmount = entry.loanAmount;
                    const downPayment = Math.max(0, entry.purchasingPower - entry.loanAmount);
                    let totalHeight = minHeight;
                    if (displayValue > 0 && maxValue > minValue) {
                        totalHeight = ((displayValue - minValue) / (maxValue - minValue)) * (maxHeight - minHeight) + minHeight;
                        totalHeight = Math.max(minHeight, Math.min(maxHeight, totalHeight));
                    }

                    let loanAmountHeight = totalHeight, downPaymentHeight = 0;
                    if (vizMode === 'purchasing' && entry.purchasingPower > 0 && displayValue > 0) {
                        const loanProportion = loanAmount / entry.purchasingPower;
                        loanAmountHeight = Math.max(0.01, totalHeight * loanProportion);
                        downPaymentHeight = Math.max(0.01, totalHeight * (1 - loanProportion));
                    } else {
                        loanAmountHeight = totalHeight;
                    }

                    let barColor = this.#getBarColor(entry, currentLoanType, i, isMultiLoanComparison);
                    const loanAmountMaterial = this.#createBarMaterial(barColor, totalHeight, maxHeight, 0, loanAmountHeight / totalHeight, maxValue);
                    const loanAmountGeometry = new THREE.BoxGeometry(this.barWidth, loanAmountHeight, this.barWidth); // Use imported THREE
                    const loanAmountBar = new THREE.Mesh(loanAmountGeometry, loanAmountMaterial); // Use imported THREE
                    loanAmountBar.position.y = loanAmountHeight / 2;

                    const barGroup = new THREE.Group(); // Use imported THREE
                    barGroup.add(loanAmountBar);

                    if (vizMode === 'purchasing' && downPaymentHeight > 0.01) {
                        const dpMaterial = this.#createBarMaterial(0xffffff, totalHeight, maxHeight, loanAmountHeight / totalHeight, 1.0, maxValue, true);
                        const dpGeometry = new THREE.BoxGeometry(this.barWidth, downPaymentHeight, this.barWidth); // Use imported THREE
                        const dpBar = new THREE.Mesh(dpGeometry, dpMaterial); // Use imported THREE
                        dpBar.position.y = loanAmountHeight + downPaymentHeight / 2;
                        barGroup.add(dpBar);
                    }

                    const xOffset = -(FICO_SCORES.length - 1) * this.barSpacing / 2;
                    const zOffset = -(LTV_VALUES.length - 1) * this.barSpacing / 2;
                    barGroup.position.set(i * this.barSpacing + xOffset, 0, j * this.barSpacing + zOffset);

                    const isCurrentScenario = (i === ficoIndex && j === ltvIndex);
                    if (isCurrentScenario) {
                        this.#addHighlightOutline(barGroup, totalHeight);
                        if (addTextLabelFunc) {
                            this.centerBarLabel = addTextLabelFunc(formatCurrency(displayValue), barGroup.position.x, totalHeight + 1, barGroup.position.z, 0xffffff, true);
                        }
                    }

                    barGroup.userData = {
                        ficoScore: FICO_SCORES[i], ltv: LTV_VALUES[j], loanType: entry.loanType || currentLoanType,
                        purchasingPower: entry.purchasingPower, loanAmount: loanAmount, monthlyPayment: entry.monthlyPayment,
                        interestRate: entry.interestRate, downPayment: downPayment, displayValue: displayValue,
                        baseColor: barColor, isCurrentScenario: isCurrentScenario
                    };
                    this.scene.add(barGroup);
                    this.bars.push(barGroup);
                }
            }
            console.log(`Created ${this.bars.length} bars for ${currentLoanType} loan type in ${vizMode} mode`);
        } catch (error) {
            console.error('Error creating visualization from matrix:', error);
        }
    }

    createMultiLoanComparisonBars(results, baseCalculation, vizMode, addTextLabelFunc) {
        this.clearBars();
        const validResults = results.filter(r => r.result && r.result.eligible);
        if (validResults.length === 0) {
            console.warn("No eligible loans found for comparison.");
            if (addTextLabelFunc) addTextLabelFunc("No eligible loans found", 0, 5, 0, 0xffffff);
            return;
        }

        try {
            let minValue = Infinity, maxValue = -Infinity;
            const valueKey = (vizMode === 'purchasing') ? 'purchasingPower' : 'loanAmount';

            validResults.forEach(r => {
                r.result.loanAmount = r.result.loanAmount || (r.result.purchasingPower * (r.result.ltv / 100));
                r.result.purchasingPower = r.result.purchasingPower || (r.result.loanAmount / (r.result.ltv / 100));
                const value = r.result[valueKey];
                if (value > 0) {
                    minValue = Math.min(minValue, value);
                    maxValue = Math.max(maxValue, value);
                }
            });

            if (minValue === Infinity) minValue = 150000;
            if (maxValue === -Infinity || minValue >= maxValue) maxValue = minValue + 350000;

            const minHeight = 0.5, maxHeight = 10;

            validResults.forEach((r, index) => {
                const { loanType, result } = r;
                const displayValue = result[valueKey];
                const loanAmount = result.loanAmount;
                const downPayment = Math.max(0, result.purchasingPower - result.loanAmount);

                let totalHeight = minHeight;
                if (displayValue > 0 && maxValue > minValue) {
                    totalHeight = ((displayValue - minValue) / (maxValue - minValue)) * (maxHeight - minHeight) + minHeight;
                    totalHeight = Math.max(minHeight, Math.min(maxHeight, totalHeight));
                }

                let loanAmountHeight = totalHeight, downPaymentHeight = 0;
                if (vizMode === 'purchasing' && result.purchasingPower > 0 && displayValue > 0) {
                    const loanProportion = loanAmount / result.purchasingPower;
                    loanAmountHeight = Math.max(0.01, totalHeight * loanProportion);
                    downPaymentHeight = Math.max(0.01, totalHeight * (1 - loanProportion));
                } else {
                    loanAmountHeight = totalHeight;
                }

                const barColor = LOAN_TYPE_COLORS[loanType] || 0x888888;
                const loanAmountMaterial = this.#createBarMaterial(barColor, totalHeight, maxHeight, 0, loanAmountHeight / totalHeight, maxValue);
                const loanAmountGeometry = new THREE.BoxGeometry(this.barWidth, loanAmountHeight, this.barWidth); // Use imported THREE
                const loanAmountBar = new THREE.Mesh(loanAmountGeometry, loanAmountMaterial); // Use imported THREE
                loanAmountBar.position.y = loanAmountHeight / 2;

                const barGroup = new THREE.Group(); // Use imported THREE
                barGroup.add(loanAmountBar);

                if (vizMode === 'purchasing' && downPaymentHeight > 0.01) {
                    const dpMaterial = this.#createBarMaterial(0xffffff, totalHeight, maxHeight, loanAmountHeight / totalHeight, 1.0, maxValue, true);
                    const dpGeometry = new THREE.BoxGeometry(this.barWidth, downPaymentHeight, this.barWidth); // Use imported THREE
                    const dpBar = new THREE.Mesh(dpGeometry, dpMaterial); // Use imported THREE
                    dpBar.position.y = loanAmountHeight + downPaymentHeight / 2;
                    barGroup.add(dpBar);
                }

                const offset = this.barSpacing * 0.8;
                barGroup.position.set(index * offset - (validResults.length - 1) * offset / 2, 0, 0);

                barGroup.userData = {
                    ficoScore: baseCalculation.ficoScore, ltv: baseCalculation.ltv, loanType: loanType,
                    purchasingPower: result.purchasingPower, loanAmount: result.loanAmount, monthlyPayment: result.monthlyPayment,
                    interestRate: result.interestRate, downPayment: downPayment, displayValue: displayValue,
                    baseColor: barColor, isCurrentScenario: loanType === baseCalculation.loanType
                };
                this.scene.add(barGroup);
                this.bars.push(barGroup);

                if (addTextLabelFunc) {
                    addTextLabelFunc(loanType, barGroup.position.x, -1, barGroup.position.z, barColor);
                }
            });

            if (addTextLabelFunc) {
                const modeText = (vizMode === 'purchasing') ? 'Purchasing Power' : 'Borrowing Capacity';
                addTextLabelFunc(`Comparing ${modeText} @ FICO ${baseCalculation.ficoScore}, LTV ${baseCalculation.ltv}%`, 0, maxHeight + 2, 0, 0xffffff);
            }
            console.log(`Created ${this.bars.length} bars for loan type comparison`);
        } catch (error) {
            console.error('Error creating multi-loan visualization:', error);
        }
    }

    #getBarColor(entry, currentLoanType, ficoIndex, isMultiLoanComparison) {
        if (isMultiLoanComparison) {
            return LOAN_TYPE_COLORS[entry.loanType || currentLoanType] || 0x888888;
        } else {
            const minFICO = Math.min(...FICO_SCORES);
            const maxFICO = Math.max(...FICO_SCORES);
            const normalizedFICO = Math.max(0, Math.min(1, (FICO_SCORES[ficoIndex] - minFICO) / (maxFICO - minFICO)));
            const red = Math.round(255 * (1 - normalizedFICO));
            const blue = Math.round(255 * normalizedFICO);
            const green = Math.round(100 * Math.sin(normalizedFICO * Math.PI));
            return (red << 16) | (green << 8) | blue;
        }
    }

    #createBarMaterial(color, totalHeight, maxHeight, uvOffsetY, uvScaleYFactor, textureMaxValue, isDownPayment = false) {
        const incrementTexture = createIncrementTexture(textureMaxValue);
        const material = new THREE.MeshStandardMaterial({ // Use imported THREE
            color: color,
            metalness: isDownPayment ? 0.1 : 0.3,
            roughness: isDownPayment ? 0.5 : 0.2,
            emissive: new THREE.Color(color).multiplyScalar(isDownPayment ? 0.3 : 0.5), // Use imported THREE
            map: incrementTexture ? incrementTexture.clone() : null,
        });

        if (material.map) {
            const textureScaleY = totalHeight / maxHeight;
            material.map.repeat.set(1, textureScaleY);
            material.map.offset.set(0, uvOffsetY);
            material.map.needsUpdate = true;
        }
        return material;
    }

    #addHighlightOutline(barGroup, totalHeight) {
        const outlineWidth = this.barWidth + 0.2;
        const outlineGeometry = new THREE.BoxGeometry(outlineWidth, totalHeight + 0.2, outlineWidth); // Use imported THREE
        const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4 }); // Use imported THREE
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial); // Use imported THREE
        outline.position.y = totalHeight / 2;
        outline.name = "highlightOutline";
        barGroup.add(outline);
    }

    applyHoverEffect(barGroup, isHovered) {
        if (!barGroup || !barGroup.userData) return;
        const baseIntensity = barGroup.userData.isCurrentScenario ? 0.6 : 0.5;
        const hoverIntensityFactor = 1.6;

        barGroup.children.forEach(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                let targetIntensity = baseIntensity;
                if (child.material.color.getHex() === 0xffffff) {
                    targetIntensity = 0.3;
                }
                if (isHovered) {
                    targetIntensity *= hoverIntensityFactor;
                }
                child.material.emissiveIntensity = targetIntensity;
                child.material.needsUpdate = true;
            }
        });
    }
}
