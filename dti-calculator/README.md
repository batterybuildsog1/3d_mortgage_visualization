# Mortgage DTI Calculator

This module provides a comprehensive Debt-to-Income (DTI) calculator for mortgage applications with AI-guided assistance for understanding compensating factors.

## Features

- Calculate front-end and back-end DTI ratios
- Evaluate eligibility across multiple loan types (FHA, VA, Conventional, Freddie Mac, USDA)
- Identify and analyze compensating factors that may help qualify with higher DTI
- AI-guided assistant to help users understand their options
- Simple integration with existing mortgage visualization tools

## Implementation

The DTI calculator is built as a standalone module that can be easily integrated with your existing 3D mortgage visualization. The implementation follows these principles:

1. **Minimal coupling** - The calculator is self-contained and doesn't require changes to your existing codebase
2. **Modern JavaScript** - Uses ES6 modules for clean organization
3. **Simple DOM integration** - Can be added to any container in your UI
4. **Rich user experience** - Provides immediate feedback and helpful guidance

## Directory Structure

```
dti-calculator/
│
├── css/
│   └── dti-calculator.css       # Styles for the calculator UI
│
├── js/
│   ├── loan-guidelines.js       # Loan type guidelines data
│   ├── dti-utils.js             # Utility functions for calculations
│   ├── dti-calculator.js        # Main calculator component
│   ├── ai-assistant.js          # AI assistant module
│   └── integration.js           # Helper for integrating with your app
│
├── index.html                   # Standalone calculator page
└── README.md                    # Documentation
```

## Integration Guide

### Basic Integration

The simplest way to add the DTI calculator to your application is using the provided integration helpers:

```javascript
import { addDTICalculatorButton } from './dti-calculator/js/integration.js';

// Add a DTI Calculator button to your UI
addDTICalculatorButton('#your-container', currentMortgageData, function(dtiData) {
  // This callback runs when DTI is calculated
  console.log('DTI Calculated:', dtiData);
  
  // You can update your visualization based on DTI results
  if (dtiData.calculations) {
    const backEndDTI = parseFloat(dtiData.calculations.backEndDTI);
    // Update visualization based on DTI value...
  }
});
```

### Advanced Integration

For more control, you can directly instantiate the calculator:

```javascript
import DTICalculator from './dti-calculator/js/dti-calculator.js';
import MortgageAIAssistant from './dti-calculator/js/ai-assistant.js';

// Create calculator instance
const calculator = new DTICalculator('your-container-id');

// When you need to show the AI assistant
const assistant = new MortgageAIAssistant('ai-assistant-container', {
  calculations: calculator.state.calculations,
  eligibility: calculator.state.eligibility
});
```

## Customization

### Styling

You can customize the appearance by modifying the CSS or adding your own styles. The calculator uses BEM-like class naming for specificity.

### Loan Guidelines

To update loan guidelines (e.g., when guidelines change in future years), modify the `loan-guidelines.js` file.

## AI Assistant Implementation

The current implementation includes a simple pattern-matching AI assistant. For a full AI experience, connect to an actual AI service by modifying the `processUserMessage` function in `ai-assistant.js`:

```javascript
async processUserMessage(message) {
  // Show typing indicator
  this.setTyping(true);
  
  try {
    // Call your AI service
    const response = await fetch('/api/mortgage-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        dtiData: this.dtiData,
        previousMessages: this.state.messages
      })
    });
    
    const data = await response.json();
    this.addMessage('assistant', data.response);
  } catch (error) {
    console.error('Error calling AI service:', error);
    this.addMessage('assistant', 'Sorry, I encountered an error processing your request.');
  } finally {
    this.setTyping(false);
  }
}
```

## Example File

See `dti-integration-example.html` for a complete working example of integrating the DTI calculator with a simple visualization.
