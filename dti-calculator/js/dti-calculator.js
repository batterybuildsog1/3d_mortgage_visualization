/**
 * DTI Calculator Component
 * Core calculator functionality for determining DTI ratios and loan eligibility
 */

import { calculateDTI, determineLoanEligibility, evaluateCompensatingFactors, getSuggestions, formatCurrency, formatPercentage } from './dti-utils.js';
import DTI_GUIDELINES from './loan-guidelines.js';

class DTICalculator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container element with ID "${containerId}" not found.`);
      return;
    }
    
    // Default state
    this.state = {
      income: {
        primary: 0,
        secondary: 0,
        other: 0
      },
      housingExpenses: {
        mortgagePayment: 0,
        propertyTax: 0,
        insurance: 0,
        hoa: 0,
        other: 0
      },
      monthlyDebts: {
        carPayment: 0,
        studentLoan: 0,
        creditCard: 0,
        personalLoan: 0,
        other: 0
      },
      loanDetails: {
        loanAmount: 300000,
        interestRate: 6.5,
        termYears: 30,
        downPayment: 20,
        propertyType: 'singleFamily',
        propertyValue: 375000,
        propertyUse: 'primaryResidence'
      },
      calculations: {
        totalMonthlyIncome: 0,
        totalHousingExpense: 0,
        totalOtherDebts: 0,
        frontEndDTI: 0,
        backEndDTI: 0,
        loanToValue: 0,
        estimatedPayment: 0
      },
      eligibility: {
        fha: { status: 'Unknown', reasons: [] },
        va: { status: 'Unknown', reasons: [] },
        conventional: { status: 'Unknown', reasons: [] },
        usda: { status: 'Unknown', reasons: [] },
        freddieMac: { status: 'Unknown', reasons: [] }
      },
      creditInfo: {
        score: '700-719',
        latePayments: 0,
        derogatory: false,
        bankruptcyForeclosure: false
      },
      compensatingFactors: {
        residualIncome: false,
        reserves: false,
        lowLTV: false,
        energyEfficient: false,
        firstTimeHomebuyer: false
      },
      results: {
        visible: false,
        suggestions: []
      }
    };
    
    // Initialize calculator
    this.initialize();
  }
  
  /**
   * Initialize the calculator
   */
  initialize() {
    // Render the calculator UI
    this.render();
    
    // Add event listeners
    this.attachEventListeners();
    
    // Initialize with default values
    this.calculateDTIRatios();
  }
  
  /**
   * Generate a system prompt for the AI assistant
   */
  generateAISystemPrompt() {
    const { calculations, eligibility, creditInfo, compensatingFactors } = this.state;
    
    return `
You are a mortgage advisor helping a potential homebuyer understand their debt-to-income (DTI) situation and mortgage options.

The user's current financial information:
- Front-end DTI: ${calculations.frontEndDTI}%
- Back-end DTI: ${calculations.backEndDTI}%
- Monthly Income: ${formatCurrency(calculations.totalMonthlyIncome)}
- Monthly Housing Expenses: ${formatCurrency(calculations.totalHousingExpense)}
- Other Monthly Debts: ${formatCurrency(calculations.totalOtherDebts)}
- Credit Score Range: ${creditInfo.score}

Loan eligibility assessment:
- FHA: ${eligibility.fha.status}
- VA: ${eligibility.va.status}
- Conventional: ${eligibility.conventional.status}
- Freddie Mac: ${eligibility.freddieMac.status}
- USDA: ${eligibility.usda.status}

Based on 2025 mortgage guidelines:
- FHA loans typically require 31% front-end DTI and 43% back-end DTI, but can go higher with compensating factors
- Conventional loans generally require 28% front-end DTI and 36% back-end DTI, but can go up to 45-50% with strong credit
- VA loans have no maximum DTI but generally prefer under 41% back-end DTI
- USDA loans prefer 29% front-end DTI and 41% back-end DTI

Respond to the user's questions about their mortgage situation in a helpful, friendly manner. Provide specific advice based on their DTI ratios and eligibility. Explain concepts clearly and suggest potential next steps or improvements they could make.
`;
  }
  
  /**
   * Render the calculator interface
   */
  render() {
    // Note: The CSS uses dti-calc__button--primary etc, but the JS uses btn-primary.
    // We'll keep the JS button classes for now and assume they might be styled elsewhere or need separate CSS update.
    this.container.innerHTML = `
      <div class="dti-calc">
        <div class="dti-calc__header">
          <h2 class="dti-calc__title">DTI Calculator</h2>
          <p>Calculate your Debt-to-Income ratio and check mortgage eligibility</p>
        </div>
        
        <div class="dti-form">
          <div class="dti-form__section"> <!-- Assuming form-section maps to dti-form__section -->
            <h3 class="dti-calc__section-title">Monthly Income</h3>
            <div class="dti-form__group">
              <label class="dti-form__label" for="income-primary">Primary Income</label>
              <input type="number" id="income-primary" class="dti-form__input" value="${this.state.income.primary}" data-field="income.primary">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="income-secondary">Secondary Income</label>
              <input type="number" id="income-secondary" class="dti-form__input" value="${this.state.income.secondary}" data-field="income.secondary">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="income-other">Other Income</label>
              <input type="number" id="income-other" class="dti-form__input" value="${this.state.income.other}" data-field="income.other">
            </div>
          </div>
          
          <div class="dti-form__section">
            <h3 class="dti-calc__section-title">Housing Expenses</h3>
            <div class="dti-form__group">
              <label class="dti-form__label" for="housing-mortgage">Mortgage Payment</label>
              <input type="number" id="housing-mortgage" class="dti-form__input" value="${this.state.housingExpenses.mortgagePayment}" data-field="housingExpenses.mortgagePayment">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="housing-tax">Property Tax</label>
              <input type="number" id="housing-tax" class="dti-form__input" value="${this.state.housingExpenses.propertyTax}" data-field="housingExpenses.propertyTax">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="housing-insurance">Home Insurance</label>
              <input type="number" id="housing-insurance" class="dti-form__input" value="${this.state.housingExpenses.insurance}" data-field="housingExpenses.insurance">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="housing-hoa">HOA Fees</label>
              <input type="number" id="housing-hoa" class="dti-form__input" value="${this.state.housingExpenses.hoa}" data-field="housingExpenses.hoa">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="housing-other">Other Housing Costs</label>
              <input type="number" id="housing-other" class="dti-form__input" value="${this.state.housingExpenses.other}" data-field="housingExpenses.other">
            </div>
          </div>
          
          <div class="dti-form__section">
            <h3 class="dti-calc__section-title">Monthly Debt Payments</h3>
            <div class="dti-form__group">
              <label class="dti-form__label" for="debt-car">Car Payment</label>
              <input type="number" id="debt-car" class="dti-form__input" value="${this.state.monthlyDebts.carPayment}" data-field="monthlyDebts.carPayment">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="debt-student">Student Loan</label>
              <input type="number" id="debt-student" class="dti-form__input" value="${this.state.monthlyDebts.studentLoan}" data-field="monthlyDebts.studentLoan">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="debt-credit">Credit Card Payments</label>
              <input type="number" id="debt-credit" class="dti-form__input" value="${this.state.monthlyDebts.creditCard}" data-field="monthlyDebts.creditCard">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="debt-personal">Personal Loan</label>
              <input type="number" id="debt-personal" class="dti-form__input" value="${this.state.monthlyDebts.personalLoan}" data-field="monthlyDebts.personalLoan">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="debt-other">Other Debts</label>
              <input type="number" id="debt-other" class="dti-form__input" value="${this.state.monthlyDebts.other}" data-field="monthlyDebts.other">
            </div>
          </div>
          
          <div class="dti-form__section">
            <h3 class="dti-calc__section-title">Loan Details</h3>
            <div class="dti-form__group">
              <label class="dti-form__label" for="loan-amount">Loan Amount</label>
              <input type="number" id="loan-amount" class="dti-form__input" value="${this.state.loanDetails.loanAmount}" data-field="loanDetails.loanAmount">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="interest-rate">Interest Rate (%)</label>
              <input type="number" id="interest-rate" class="dti-form__input" step="0.125" value="${this.state.loanDetails.interestRate}" data-field="loanDetails.interestRate">
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="loan-term">Loan Term (Years)</label>
              <select id="loan-term" class="dti-form__select" data-field="loanDetails.termYears">
                <option value="30" ${this.state.loanDetails.termYears === 30 ? 'selected' : ''}>30 Years</option>
                <option value="20" ${this.state.loanDetails.termYears === 20 ? 'selected' : ''}>20 Years</option>
                <option value="15" ${this.state.loanDetails.termYears === 15 ? 'selected' : ''}>15 Years</option>
                <option value="10" ${this.state.loanDetails.termYears === 10 ? 'selected' : ''}>10 Years</option>
              </select>
            </div>
            <div class="dti-form__group">
              <label class="dti-form__label" for="down-payment">Down Payment (%)</label>
              <input type="number" id="down-payment" class="dti-form__input" min="0" max="100" value="${this.state.loanDetails.downPayment}" data-field="loanDetails.downPayment">
            </div>
          </div>
          
          <div class="dti-form__section">
            <h3 class="dti-calc__section-title">Credit Information</h3>
            <div class="dti-form__group">
              <label class="dti-form__label" for="credit-score">Credit Score Range</label>
              <select id="credit-score" class="dti-form__select" data-field="creditInfo.score">
                <option value="760+" ${this.state.creditInfo.score === '760+' ? 'selected' : ''}>760+</option>
                <option value="740-759" ${this.state.creditInfo.score === '740-759' ? 'selected' : ''}>740-759</option>
                <option value="720-739" ${this.state.creditInfo.score === '720-739' ? 'selected' : ''}>720-739</option>
                <option value="700-719" ${this.state.creditInfo.score === '700-719' ? 'selected' : ''}>700-719</option>
                <option value="680-699" ${this.state.creditInfo.score === '680-699' ? 'selected' : ''}>680-699</option>
                <option value="660-679" ${this.state.creditInfo.score === '660-679' ? 'selected' : ''}>660-679</option>
                <option value="640-659" ${this.state.creditInfo.score === '640-659' ? 'selected' : ''}>640-659</option>
                <option value="620-639" ${this.state.creditInfo.score === '620-639' ? 'selected' : ''}>620-639</option>
                <option value="580-619" ${this.state.creditInfo.score === '580-619' ? 'selected' : ''}>580-619</option>
                <option value="below-580" ${this.state.creditInfo.score === 'below-580' ? 'selected' : ''}>Below 580</option>
              </select>
            </div>
          </div>
          
          <div class="dti-form__section">
            <h3 class="dti-calc__section-title">Compensating Factors</h3>
            <div class="dti-form__checkbox-group">
              <input type="checkbox" class="dti-form__checkbox" id="factor-reserves" ${this.state.compensatingFactors.reserves ? 'checked' : ''} data-field="compensatingFactors.reserves">
              <label class="dti-form__label dti-form__label--checkbox" for="factor-reserves">Significant cash reserves (3+ months of payments)</label>
            </div>
            <div class="dti-form__checkbox-group">
              <input type="checkbox" class="dti-form__checkbox" id="factor-residual" ${this.state.compensatingFactors.residualIncome ? 'checked' : ''} data-field="compensatingFactors.residualIncome">
              <label class="dti-form__label dti-form__label--checkbox" for="factor-residual">High residual income</label>
            </div>
            <div class="dti-form__checkbox-group">
              <input type="checkbox" class="dti-form__checkbox" id="factor-ltv" ${this.state.compensatingFactors.lowLTV ? 'checked' : ''} data-field="compensatingFactors.lowLTV">
              <label class="dti-form__label dti-form__label--checkbox" for="factor-ltv">Low loan-to-value ratio</label>
            </div>
            <div class="dti-form__checkbox-group">
              <input type="checkbox" class="dti-form__checkbox" id="factor-first-time" ${this.state.compensatingFactors.firstTimeHomebuyer ? 'checked' : ''} data-field="compensatingFactors.firstTimeHomebuyer">
              <label class="dti-form__label dti-form__label--checkbox" for="factor-first-time">First-time homebuyer</label>
            </div>
            <div class="dti-form__checkbox-group">
              <input type="checkbox" class="dti-form__checkbox" id="factor-energy" ${this.state.compensatingFactors.energyEfficient ? 'checked' : ''} data-field="compensatingFactors.energyEfficient">
              <label class="dti-form__label dti-form__label--checkbox" for="factor-energy">Energy-efficient home</label>
            </div>
          </div>
          
          <div class="dti-form__actions">
            <button id="calculate-dti-btn" class="dti-calc__button--primary">Calculate DTI</button>
            <button id="reset-form-btn" class="dti-calc__button--secondary">Reset Form</button>
            <button id="ai-assistant-btn" class="dti-calc__button--accent">AI Advisor</button> <!-- Assuming btn-accent maps to dti-calc__button--accent -->
          </div>
        </div>
        
        <div id="dti-results" class="dti-results ${this.state.results.visible ? 'dti-results--visible' : ''}"> <!-- Added modifier -->
          <div class="dti-results__header">
            <h3 class="dti-calc__section-title">DTI Calculation Results</h3>
          </div>
          <div class="dti-results__grid"> <!-- Added element -->
            <div class="dti-results__item"> <!-- Added element -->
              <label class="dti-results__item-label">Front-End DTI:</label> <!-- Added element -->
              <div class="dti-results__item-value">${formatPercentage(this.state.calculations.frontEndDTI)}</div> <!-- Added element -->
            </div>
            <div class="dti-results__item">
              <label class="dti-results__item-label">Back-End DTI:</label>
              <div class="dti-results__item-value">${formatPercentage(this.state.calculations.backEndDTI)}</div>
            </div>
            <div class="dti-results__item">
              <label class="dti-results__item-label">Monthly Income:</label>
              <div class="dti-results__item-value">${formatCurrency(this.state.calculations.totalMonthlyIncome)}</div>
            </div>
            <div class="dti-results__item">
              <label class="dti-results__item-label">Housing Expenses:</label>
              <div class="dti-results__item-value">${formatCurrency(this.state.calculations.totalHousingExpense)}</div>
            </div>
            <div class="dti-results__item">
              <label class="dti-results__item-label">Other Debts:</label>
              <div class="dti-results__item-value">${formatCurrency(this.state.calculations.totalOtherDebts)}</div>
            </div>
            <div class="dti-results__item">
              <label class="dti-results__item-label">Est. Mortgage Payment:</label>
              <div class="dti-results__item-value">${formatCurrency(this.state.calculations.estimatedPayment)}</div>
            </div>
            <div class="dti-results__item">
              <label class="dti-results__item-label">Loan-to-Value Ratio:</label>
              <div class="dti-results__item-value">${formatPercentage(this.state.calculations.loanToValue)}</div>
            </div>
          </div> <!-- Close dti-results__grid -->
          
          <div class="dti-results__eligibility">
            <h4 class="dti-calc__subsection-title">Loan Program Eligibility</h4>
            <div class="dti-results__eligibility-grid">
              <!-- Headers (optional, could be added via CSS pseudo-elements if needed) -->
              <!-- <div class="dti-results__eligibility-header">Program</div> -->
              <!-- <div class="dti-results__eligibility-header">Status</div> -->
              <!-- <div class="dti-results__eligibility-header">Notes</div> -->

              <!-- FHA Row -->
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--loan-type">FHA Loan</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--status ${this._getEligibilityStatusClass(this.state.eligibility.fha.status)}">${this.state.eligibility.fha.status}</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--notes">
                ${this.state.eligibility.fha.reasons.map(reason => `<div class="dti-results__eligibility-item-reason">${reason}</div>`).join('')}
              </div>

              <!-- VA Row -->
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--loan-type">VA Loan</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--status ${this._getEligibilityStatusClass(this.state.eligibility.va.status)}">${this.state.eligibility.va.status}</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--notes">
                ${this.state.eligibility.va.reasons.map(reason => `<div class="dti-results__eligibility-item-reason">${reason}</div>`).join('')}
              </div>

              <!-- Conventional Row -->
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--loan-type">Conventional Loan</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--status ${this._getEligibilityStatusClass(this.state.eligibility.conventional.status)}">${this.state.eligibility.conventional.status}</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--notes">
                ${this.state.eligibility.conventional.reasons.map(reason => `<div class="dti-results__eligibility-item-reason">${reason}</div>`).join('')}
              </div>

              <!-- USDA Row -->
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--loan-type">USDA Loan</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--status ${this._getEligibilityStatusClass(this.state.eligibility.usda.status)}">${this.state.eligibility.usda.status}</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--notes">
                ${this.state.eligibility.usda.reasons.map(reason => `<div class="dti-results__eligibility-item-reason">${reason}</div>`).join('')}
              </div>

              <!-- Freddie Mac Row -->
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--loan-type">Freddie Mac Home Possible</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--status ${this._getEligibilityStatusClass(this.state.eligibility.freddieMac.status)}">${this.state.eligibility.freddieMac.status}</div>
              <div class="dti-results__eligibility-cell dti-results__eligibility-cell--notes">
                  ${this.state.eligibility.freddieMac.reasons.map(reason => `<div class="dti-results__eligibility-item-reason">${reason}</div>`).join('')}
              </div>
            </div> <!-- Close dti-results__eligibility-grid -->
          </div> <!-- Close dti-results__eligibility -->
          
          <div class="dti-results__suggestions">
            <h4 class="dti-calc__subsection-title">Suggestions to Improve Eligibility</h4>
            <div class="dti-results__suggestions-list">
              ${this.state.results.suggestions.map(suggestion => `
                <div class="dti-results__suggestion"> <!-- Assuming default priority -->
                  <div class="dti-results__suggestion-icon">💡</div> <!-- Added element -->
                  <div class="dti-results__suggestion-text">${suggestion}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div> <!-- Close dti-results -->
      </div> <!-- Close dti-calc -->
    `;
  }
  
  /**
   * Attach event listeners to form elements
   */
  attachEventListeners() {
    // Get form elements
    const inputs = this.container.querySelectorAll('input[data-field]');
    const selects = this.container.querySelectorAll('select[data-field]');
    const calculateBtn = this.container.querySelector('#calculate-dti-btn');
    const resetBtn = this.container.querySelector('#reset-form-btn');
    
    // Add event listeners to all input fields
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        this.handleFieldChange(e.target);
      });
    });
    
    // Add event listeners to all select fields
    selects.forEach(select => {
      select.addEventListener('change', (e) => {
        this.handleFieldChange(e.target);
      });
    });
    
    // Add event listener to calculate button
    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => {
        this.calculateDTIRatios();
        this.showResults();
      });
    }
    
    // Add event listener to reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetForm();
      });
    }
  }
  
  /**
   * Handle changes to a form field
   */
  handleFieldChange(field) {
    const fieldPath = field.dataset.field;
    let fieldValue;
    
    if (field.type === 'checkbox') {
      fieldValue = field.checked;
    } else if (field.type === 'number') {
      fieldValue = parseFloat(field.value) || 0;
    } else {
      fieldValue = field.value;
    }
    
    // Update state
    this.updateStateField(fieldPath, fieldValue);
  }
  
  /**
   * Update a field in the state object using a dot-notation path
   */
  updateStateField(path, value) {
    const parts = path.split('.');
    let obj = this.state;
    
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    
    obj[parts[parts.length - 1]] = value;
  }
  
  /**
   * Calculate DTI ratios and eligibility
   */
  calculateDTIRatios() {
    const { income, housingExpenses, monthlyDebts, loanDetails, creditInfo, compensatingFactors } = this.state;
    
    // Calculate DTI ratios
    const dtiCalc = calculateDTI(income, housingExpenses, monthlyDebts, loanDetails);
    this.state.calculations = { ...dtiCalc };
    
    // Determine loan eligibility
    this.state.eligibility = determineLoanEligibility(
      dtiCalc, 
      loanDetails, 
      creditInfo, 
      compensatingFactors,
      DTI_GUIDELINES
    );
    
    // Evaluate compensating factors
    evaluateCompensatingFactors(this.state);
    
    // Generate suggestions
    this.state.results.suggestions = getSuggestions(this.state);
  }
  
  /**
   * Show the results section
   */
  showResults() {
    this.state.results.visible = true;
    const resultsContainer = this.container.querySelector('#dti-results');
    
    if (resultsContainer) {
      resultsContainer.classList.add('dti-results--visible'); // Use BEM modifier
      
      // Update results display
      this.updateResultsDisplay(resultsContainer);
    }
  }
  
  /**
   * Update the results display with current calculation values
   */
  updateResultsDisplay(resultsContainer) {
    const { calculations, eligibility, results } = this.state;
    
    // Update calculation result values using BEM classes
    resultsContainer.querySelector('.dti-results__item:nth-child(1) .dti-results__item-value').textContent = formatPercentage(calculations.frontEndDTI);
    resultsContainer.querySelector('.dti-results__item:nth-child(2) .dti-results__item-value').textContent = formatPercentage(calculations.backEndDTI);
    resultsContainer.querySelector('.dti-results__item:nth-child(3) .dti-results__item-value').textContent = formatCurrency(calculations.totalMonthlyIncome);
    resultsContainer.querySelector('.dti-results__item:nth-child(4) .dti-results__item-value').textContent = formatCurrency(calculations.totalHousingExpense);
    resultsContainer.querySelector('.dti-results__item:nth-child(5) .dti-results__item-value').textContent = formatCurrency(calculations.totalOtherDebts);
    resultsContainer.querySelector('.dti-results__item:nth-child(6) .dti-results__item-value').textContent = formatCurrency(calculations.estimatedPayment);
    resultsContainer.querySelector('.dti-results__item:nth-child(7) .dti-results__item-value').textContent = formatPercentage(calculations.loanToValue);
    
    // Update eligibility display using BEM classes
    const eligibilityCells = resultsContainer.querySelectorAll('.dti-results__eligibility-cell--status');
    
    // FHA
    this.updateEligibilityItem(eligibilityCells[0].parentElement, eligibility.fha); // Pass the row (parent of status cell)
    
    // VA
    this.updateEligibilityItem(eligibilityCells[1].parentElement, eligibility.va);
    
    // Conventional
    this.updateEligibilityItem(eligibilityCells[2].parentElement, eligibility.conventional);
    
    // USDA
    this.updateEligibilityItem(eligibilityCells[3].parentElement, eligibility.usda);
    
    // Freddie Mac
    this.updateEligibilityItem(eligibilityCells[4].parentElement, eligibility.freddieMac);
    
    // Update suggestions using BEM classes
    const suggestionsContainer = resultsContainer.querySelector('.dti-results__suggestions-list');
    suggestionsContainer.innerHTML = `
          ${results.suggestions.map(suggestion => `
                <div class="dti-results__suggestion">
                  <div class="dti-results__suggestion-icon">💡</div>
                  <div class="dti-results__suggestion-text">${suggestion}</div>
                </div>
          `).join('')}
    `;
  }
  
  /**
   * Update an eligibility item (row) with status and reasons
   */
  updateEligibilityItem(rowElement, eligibility) {
      const statusCell = rowElement.querySelector('.dti-results__eligibility-cell--status');
      const reasonsCell = rowElement.querySelector('.dti-results__eligibility-cell--notes'); // Assuming notes cell holds reasons

      // Update status class on the status cell
      statusCell.className = 'dti-results__eligibility-cell dti-results__eligibility-cell--status'; // Reset classes
      statusCell.classList.add(this._getEligibilityStatusClass(eligibility.status));

      // Update status text
      statusCell.textContent = eligibility.status;

      // Update reasons
      reasonsCell.innerHTML = eligibility.reasons.map(reason => `<div class="dti-results__eligibility-item-reason">${reason}</div>`).join('');
  }

  /**
   * Helper to get the BEM modifier class for eligibility status
   */
   _getEligibilityStatusClass(status) {
       switch (status) {
           case 'Eligible': return 'dti-results__eligibility-cell--status-eligible';
           case 'Potentially Eligible': return 'dti-results__eligibility-cell--status-likely'; // Map 'Potentially Eligible' to 'likely' class
           case 'Ineligible': return 'dti-results__eligibility-cell--status-warning'; // Map 'Ineligible' to 'warning' class
           default: return ''; // Unknown status
       }
   }
  
  /**
   * Reset the form to default values
   */
  resetForm() {
    // Reset state to default values
    this.state = {
      income: {
        primary: 0,
        secondary: 0,
        other: 0
      },
      housingExpenses: {
        mortgagePayment: 0,
        propertyTax: 0,
        insurance: 0,
        hoa: 0,
        other: 0
      },
      monthlyDebts: {
        carPayment: 0,
        studentLoan: 0,
        creditCard: 0,
        personalLoan: 0,
        other: 0
      },
      loanDetails: {
        loanAmount: 300000,
        interestRate: 6.5,
        termYears: 30,
        downPayment: 20,
        propertyType: 'singleFamily',
        propertyValue: 375000,
        propertyUse: 'primaryResidence'
      },
      calculations: {
        totalMonthlyIncome: 0,
        totalHousingExpense: 0,
        totalOtherDebts: 0,
        frontEndDTI: 0,
        backEndDTI: 0,
        loanToValue: 0,
        estimatedPayment: 0
      },
      eligibility: {
        fha: { status: 'Unknown', reasons: [] },
        va: { status: 'Unknown', reasons: [] },
        conventional: { status: 'Unknown', reasons: [] },
        usda: { status: 'Unknown', reasons: [] },
        freddieMac: { status: 'Unknown', reasons: [] }
      },
      creditInfo: {
        score: '700-719',
        latePayments: 0,
        derogatory: false,
        bankruptcyForeclosure: false
      },
      compensatingFactors: {
        residualIncome: false,
        reserves: false,
        lowLTV: false,
        energyEfficient: false,
        firstTimeHomebuyer: false
      },
      results: {
        visible: false,
        suggestions: []
      }
    };
    
    // Re-render the form
    this.render();
    
    // Re-attach event listeners
    this.attachEventListeners();
    
    // Hide results
    const resultsContainer = this.container.querySelector('#dti-results');
    if (resultsContainer) {
      resultsContainer.classList.remove('dti-results--visible'); // Use BEM modifier
    }
  }
}

export default DTICalculator;
