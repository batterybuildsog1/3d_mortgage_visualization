// js/financial-snapshot/ui.js
// Handles generation and manipulation of the Financial Snapshot UI elements
import { snapshotSteps } from './steps.js';

console.log("Financial Snapshot UI handler loaded.");

const modalContentElement = document.querySelector('#financial-snapshot-modal .snapshot-content');

// --- Helper Functions ---

function formatValue(value, format) {
    if (value === null || value === undefined) return 'N/A';
    try {
        switch (format) {
            case 'currency':
                const numValue = Number(value);
                return isNaN(numValue) ? 'N/A' : `$${numValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
            case 'percentage':
                const percValue = Number(value);
                // Handle potential floating point inaccuracies for display
                const displayPerc = (percValue * 100).toFixed(1);
                return isNaN(percValue) ? 'N/A' : `${displayPerc}%`;
            default:
                return value.toString();
        }
    } catch (error) {
        console.error("Error formatting value:", value, format, error);
        return 'Error';
    }
}

function createTooltip(text) {
    if (!text) return '';
    return `
        <span class="snapshot-tooltip">
            &#9432; <!-- Info icon -->
            <span class="tooltip-text">${text}</span>
        </span>`;
}

// --- Autofill Placeholder ---
function getAutofilledValue(fieldId, initialData) {
    if (fieldId === 'estimatedTotalDebts') {
        const monthlyIncome = initialData.income || 0;
        return Math.max(300, Math.round(monthlyIncome * 0.08));
    }
    return 0;
}


// --- Step Rendering ---

export function renderStep(stepId, currentSnapshotState) {
    if (!modalContentElement) {
        console.error("Modal content element not found!");
        return;
    }

    const stepConfig = snapshotSteps.find(step => step.id === stepId);
    if (!stepConfig) {
        console.error(`Step configuration for ID "${stepId}" not found.`);
        modalContentElement.innerHTML = `<p class="error">Error: Step configuration not found.</p>`;
        return;
    }

    // --- Check for Multi-DTI Summary Step ---
    if (stepConfig.summaryType === 'multiDti') {
        console.log("Rendering Multi-DTI Summary step.");
        modalContentElement.innerHTML = renderMultiDtiSummary(stepConfig, currentSnapshotState);
        return; // Stop further rendering for this special step type
    }
    // --- End Multi-DTI Check ---


    let html = `<div class="snapshot-step" data-step-id="${stepConfig.id}">`;
    html += `<h2>${stepConfig.headline}${createTooltip(stepConfig.tooltip)}</h2>`;

    if (stepConfig.instruction && typeof stepConfig.instruction === 'string') {
        html += `<p class="snapshot-instruction">${stepConfig.instruction}</p>`;
    }

    if (stepConfig.closingCostsSection) {
        html += renderClosingCostsSection(stepConfig.closingCostsSection, currentSnapshotState.initialData);
    }

    if (stepConfig.fields && stepConfig.fields.length > 0) {
        html += '<div class="snapshot-fields">';
        stepConfig.fields.forEach(field => {
            // Pass the full state, including collectedData for summary step
            html += renderField(field, currentSnapshotState);
        });
        html += '</div>';
    }

    if (stepConfig.buttons && stepConfig.buttons.length > 0) {
        html += '<div class="snapshot-buttons initial-buttons">'; // Renamed class, maybe just 'snapshot-buttons'?
        stepConfig.buttons.forEach(button => {
            const buttonClass = button.type === 'secondary' ? 'snapshot-button secondary' : 'snapshot-button';
            html += `<button id="snapshot-btn-${button.id}" class="${buttonClass}" data-action="${button.id}">${button.text}</button>`;
        });
        html += '</div>';
    }

    if (stepConfig.adjustSection) {
        html += renderAdjustSection(stepConfig.adjustSection, currentSnapshotState);
    }

    html += `</div>`; // Close snapshot-step

    modalContentElement.innerHTML = html;
    console.log(`Rendered step: ${stepId}`);
}

function renderField(field, state) {
    let fieldHtml = '';
    const labelHtml = `<label for="snapshot-input-${field.id}">${field.label}</label>`;
    let value;

    switch (field.type) {
        case 'display':
             fieldHtml = `<div class="snapshot-form-group field-${field.type}">`;
            // For summary step, value might be in collectedData
            value = state.collectedData[field.id] !== undefined ? state.collectedData[field.id] : state.initialData[field.id];
            fieldHtml += `<p><strong>${field.label}:</strong> ${formatValue(value, field.format)}</p>`;
            fieldHtml += `</div>`;
            break;
        case 'displayWithButtons':
             fieldHtml = `<div class="snapshot-form-group field-${field.type}">`;
             value = state.collectedData[field.id] !== undefined ? state.collectedData[field.id] : getAutofilledValue(field.id, state.initialData);
             if (state.collectedData[field.id] === undefined) {
                 state.collectedData[field.id] = value;
             }
            fieldHtml += `<p><strong>${field.label}</strong> <span id="display-${field.id}">${formatValue(value, field.format)}</span></p>`;
            fieldHtml += `</div>`;
            break;
        case 'numberInput':
             fieldHtml = `<div class="snapshot-form-group field-${field.type}">`;
            value = state.collectedData[field.id] !== undefined ? state.collectedData[field.id] : (field.defaultValue !== undefined ? field.defaultValue : '');
             const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
             fieldHtml += `${labelHtml}
                         <input type="number" id="snapshot-input-${field.id}" class="snapshot-input" data-field-id="${field.id}" value="${value}" placeholder="0" ${minAttr}>`;
            fieldHtml += `</div>`;
            break;
        case 'radioOptions':
             fieldHtml = `<div class="snapshot-form-group field-${field.type}">`;
            fieldHtml += `<div class="snapshot-options" data-field-id="${field.id}">`;
            const purchasePrice = state.initialData.purchasePriceGoal || 0;
            field.options.forEach(option => {
                const optionId = `snapshot-option-${field.id}-${option.value}`;
                const isChecked = state.collectedData[field.id] === option.value;
                let labelText = option.label;
                if (purchasePrice > 0) {
                    labelText = labelText.replace(/(\d+(\.\d+)?)% of Purchase Price/g, (match, p1) => {
                        const percentage = parseFloat(p1) / 100;
                        return `${formatValue(purchasePrice * percentage, 'currency')}`;
                    });
                     labelText = labelText.replace(/Less than (\d+(\.\d+)?)% of Purchase Price/g, (match, p1) => {
                        const percentage = parseFloat(p1) / 100;
                        return `Less than ${formatValue(purchasePrice * percentage, 'currency')}`;
                    });
                     labelText = labelText.replace(/More than (\d+(\.\d+)?)% of Purchase Price/g, (match, p1) => {
                        const percentage = parseFloat(p1) / 100;
                        return `More than ${formatValue(purchasePrice * percentage, 'currency')}`;
                    });
                }
                fieldHtml += `
                    <div class="snapshot-option">
                        <input type="radio" id="${optionId}" name="snapshot-radio-${field.id}" value="${option.value}" ${isChecked ? 'checked' : ''} data-field-id="${field.id}">
                        <label for="${optionId}">${labelText}</label>
                    </div>`;
            });
            fieldHtml += `</div>`; // Close snapshot-options
            fieldHtml += `</div>`; // Close form-group
            break;
         case 'instruction':
             fieldHtml = `<p class="snapshot-instruction field-instruction">${field.text}</p>`;
             break;
        default:
            console.warn(`Unhandled field type: ${field.type}`);
            fieldHtml = `<div class="snapshot-form-group"><p>Unsupported field type: ${field.type}</p></div>`;
    }
    return fieldHtml;
}


function renderAdjustSection(adjustConfig, state) {
    let adjustHtml = `<div class="snapshot-adjust-section" style="display: none;">`;
    adjustHtml += `<h3>${adjustConfig.headline}</h3>`;

    if (adjustConfig.fields && adjustConfig.fields.length > 0) {
        adjustConfig.fields.forEach(field => {
             const value = state.collectedData[field.id] !== undefined ? state.collectedData[field.id] : (field.defaultValue !== undefined ? field.defaultValue : 0);
             if (state.collectedData[field.id] === undefined) {
                 state.collectedData[field.id] = value;
             }
            adjustHtml += renderField(field, state);
        });
    }

    if (adjustConfig.totalDisplay) {
        let initialTotal = 0;
        adjustConfig.fields.forEach(f => {
            initialTotal += Number(state.collectedData[f.id] || 0);
        });
         adjustHtml += `<div class="updated-total"><strong>${adjustConfig.totalDisplay.label}</strong> <span id="${adjustConfig.totalDisplay.id}">${formatValue(initialTotal, 'currency')}</span></div>`;
    }

    if (adjustConfig.buttons && adjustConfig.buttons.length > 0) {
        adjustHtml += '<div class="snapshot-buttons adjust-buttons">';
        adjustConfig.buttons.forEach(button => {
            const buttonClass = button.type === 'secondary' ? 'snapshot-button secondary' : 'snapshot-button';
            adjustHtml += `<button id="snapshot-btn-${button.id}" class="${buttonClass}" data-action="${button.id}">${button.text}</button>`;
        });
        adjustHtml += '</div>';
    }

    adjustHtml += `</div>`;
    return adjustHtml;
}

function renderClosingCostsSection(ccConfig, initialData) {
    let ccHtml = `<div class="snapshot-closing-costs">`;
    ccHtml += `<h4>${ccConfig.headline}</h4>`;
    ccHtml += `<ul>`;

    let totalCosts = 0;
    const purchasePrice = Number(initialData.purchasePriceGoal) || 0;

    ccConfig.items.forEach(item => {
        let itemValue = 0;
        if (item.valueKey) {
            itemValue = Number(initialData[item.valueKey]) || 0;
        } else if (item.percentageKey && purchasePrice > 0) {
            const baseValue = Number(initialData[item.percentageKey]) || 0;
            itemValue = baseValue * (item.factor || 0);
        }
        totalCosts += itemValue;
        ccHtml += `<li><span>${item.label}:</span> <span>${formatValue(itemValue, 'currency')}</span></li>`;
    });

    ccHtml += `</ul>`;
    ccHtml += `<p class="total-costs"><strong>${ccConfig.totalLabel}</strong> <span>${formatValue(totalCosts, 'currency')}</span></p>`;
    ccHtml += `</div>`;
    return ccHtml;
}

// --- New Function for Multi-DTI Summary Rendering ---
function renderMultiDtiSummary(stepConfig, state) {
    let summaryHtml = `<div class="snapshot-step snapshot-summary-step" data-step-id="${stepConfig.id}">`;
    summaryHtml += `<h2>${stepConfig.headline}</h2>`;

    if (stepConfig.instruction) {
        summaryHtml += `<p class="snapshot-instruction">${stepConfig.instruction}</p>`;
    }

    summaryHtml += `<div class="snapshot-dti-summary">`;
    summaryHtml += `<h4>Estimated Max DTI Ratios:</h4>`;
    summaryHtml += `<ul class="dti-list">`; // Use a list for better structure

    const allEstimatedDTIs = state.allEstimatedDTIs || {};

    // Define a preferred order
    const loanOrder = ['Conventional', 'FHA', 'VA', 'USDA'];
    const orderedEntries = loanOrder
        .filter(type => allEstimatedDTIs.hasOwnProperty(type)) // Filter out types not present in data
        .map(type => [type, allEstimatedDTIs[type]]); // Map to [key, value] pairs

    // Append any types present in data but not in loanOrder (fallback)
    Object.entries(allEstimatedDTIs).forEach(([type, dtiValue]) => {
        if (!loanOrder.includes(type)) {
            orderedEntries.push([type, dtiValue]);
        }
    });


    if (orderedEntries.length > 0) {
         orderedEntries.forEach(([loanType, dtiValue]) => {
            const formattedDti = formatValue(dtiValue, 'percentage'); // Use local formatValue
            summaryHtml += `<li class="dti-item">
                              <span class="dti-loan-type">${loanType}:</span>
                              <span class="dti-value">${formattedDti}</span>
                            </li>`;
        });
    } else {
        summaryHtml += `<li>No DTI estimates calculated.</li>`;
    }


    summaryHtml += `</ul>`; // Close dti-list
    summaryHtml += `</div>`; // Close snapshot-dti-summary

    // Add the button
    if (stepConfig.buttons && stepConfig.buttons.length > 0) {
        summaryHtml += '<div class="snapshot-buttons summary-buttons">';
        stepConfig.buttons.forEach(button => {
            const buttonClass = button.type === 'secondary' ? 'snapshot-button secondary' : 'snapshot-button';
            summaryHtml += `<button id="snapshot-btn-${button.id}" class="${buttonClass}" data-action="${button.id}">${button.text}</button>`;
        });
        summaryHtml += '</div>';
    }

    summaryHtml += `</div>`; // Close snapshot-step
    return summaryHtml;
}
// --- End New Function ---


// --- UI Update Functions ---

export function showAdjustSection() {
    const adjustSection = modalContentElement?.querySelector('.snapshot-adjust-section');
    const initialButtons = modalContentElement?.querySelector('.initial-buttons'); // Use the specific class
    if (adjustSection) {
        adjustSection.style.display = 'block';
    }
     if (initialButtons) {
        initialButtons.style.display = 'none';
    }
}

export function updateAdjustedTotal() {
     const adjustSection = modalContentElement?.querySelector('.snapshot-adjust-section');
     if (!adjustSection) return 0;

     const estimateDebtsStep = snapshotSteps.find(s => s.id === 'estimateDebts');
     const totalDisplayId = estimateDebtsStep?.adjustSection?.totalDisplay?.id;
     if (!totalDisplayId) return 0;

     const totalDisplaySpan = adjustSection.querySelector(`#${totalDisplayId}`);
     const inputs = adjustSection.querySelectorAll('.snapshot-input[type="number"]');
     let currentTotal = 0;
     inputs.forEach(input => {
         currentTotal += Number(input.value) || 0;
     });

     if (totalDisplaySpan) {
         totalDisplaySpan.textContent = formatValue(currentTotal, 'currency');
     }
     return currentTotal;
}
