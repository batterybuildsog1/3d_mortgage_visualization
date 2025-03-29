# Mortgage Visualization & Optimization Tool Implementation Plan

This document provides a step-by-step implementation plan for our mortgage calculator application with 3D visualization and AI-driven optimization features. The plan is designed to guide junior developers through the implementation process with clear, actionable tasks.

## Table of Contents
1. [Project Architecture Setup](#1-project-architecture-setup)
2. [Core Engine Implementation](#2-core-engine-implementation)
3. [User Interface: Initial Assessment Flow](#3-user-interface-initial-assessment-flow)
4. [Visualization Components](#4-visualization-components)
5. [AI Integration](#5-ai-integration)
6. [Financial Optimization Workflow](#6-financial-optimization-workflow)
7. [Testing & Validation](#7-testing--validation)

## Implementation Checklist

### 1. Project Architecture Setup
- [x] Create project directory structure
- [x] Setup ESLint and formatting configuration
- [x] Configure package dependencies
- [ ] Setup build and development environment

### 2. Core Engine Implementation
- [x] Refactor calculator.js module (Task 2.1)
- [x] Implement APR Calculator (Task 2.2)
- [x] Implement Loan Factory and Loan Type Classes (Task 2.3)
- [x] Implement LLPA Calculator (Task 2.4)
- [x] Implement Mortgage Insurance Calculator (Task 2.5)
- [ ] Implement Closing Costs Calculator (Task 2.6)
- [ ] Implement Loan Eligibility Calculator
- [ ] Implement DTI Calculator Integration
- [ ] Implement Data Service for external data

### 3. User Interface: Initial Assessment Flow
- [ ] Create entrance page with AI-guided form
- [ ] Implement data collection components
  - [ ] Income and debt inputs
  - [ ] Credit score selection
  - [ ] Location picker
  - [ ] Purchase price and down payment calculators
- [ ] Implement data enrichment module
  - [ ] Property tax rate estimation
  - [ ] Insurance rate estimation 
  - [ ] Interest rate fetching
- [ ] Create results summary dashboard
  - [ ] Loan recommendations panel
  - [ ] Affordability summary
  - [ ] Closing costs breakdown
  - [ ] Eligibility status indicators

### 4. Visualization Components
- [ ] Enhance 3D visualization
  - [ ] Implement comparison view for different loan types
  - [ ] Add labels and information overlays
  - [ ] Create interactive controls
- [ ] Implement visualization adapter with calculator engine
- [ ] Add tooltips and drill-down features

### 5. AI Integration
- [ ] Setup AI-guided workflow
  - [ ] Configure AI chat interface
  - [ ] Implement context-aware prompts
  - [ ] Create streaming response UI
- [ ] Implement AI recommendations engine
  - [ ] Loan type selection logic
  - [ ] Financial improvement suggestions

### 6. Financial Optimization Workflow
- [ ] Implement factor impact explorer
  - [ ] Interactive FICO score slider
  - [ ] Debt reduction calculator
  - [ ] Income growth projector
  - [ ] Down payment optimizer
- [ ] Create scenario modeling interface
  - [ ] "What-if" analysis tools
  - [ ] AI-driven scenario suggestions
- [ ] Develop strategic pathway planning
  - [ ] Goal-setting interface
  - [ ] Action plan generator
  - [ ] Progress tracking dashboard

### 7. Testing & Validation
- [ ] Unit tests for calculator engine
- [ ] Integration tests for UI flows
- [ ] User acceptance testing
- [ ] Performance optimization

## Detailed Implementation Guide

### 1. Project Architecture Setup

The project structure should follow the organization outlined in the refactoring plan:

```
mortgage-calculator/
├── src/
│   ├── engine/                  # Core calculation engine
│   │   ├── calculator.js        # Main orchestrator
│   │   ├── loan-types/          # Specialized loan calculators
│   │   ├── adjustments/         # LLPA, MI, closing costs
│   │   └── utils/               # Math utilities, eligibility
│   ├── services/                # Data and API services
│   │   ├── data-service.js      # Data loading & caching
│   │   └── api-service.js       # External API interactions
│   ├── visualization/           # 3D visualization components
│   │   ├── index.js             # Main entry point
│   │   ├── Visualization.js     # Three.js integration
│   │   ├── BarManager.js        # Bar visualization
│   │   ├── UIManager.js         # UI controls/tooltips
│   │   ├── InteractionManager.js # Mouse/touch handling
│   │   └── helpers.js           # Utility functions
│   ├── ui/                      # User interface components
│   │   ├── workflow/            # Workflow screens
│   │   │   ├── initial-assessment/
│   │   │   └── optimization/
│   │   ├── components/          # Reusable UI components
│   │   └── styles/              # CSS and styling
│   └── ai/                      # AI assistant integration
│       ├── ai-assistant.js      # Assistant UI component
│       └── ai-service.js        # Backend API connector
├── public/                      # Static assets
│   ├── data/                    # JSON data files
│   │   ├── llpa/                # Loan-level price adjustments data
│   │   ├── mortgage_insurance/  # MI, MIP, funding fee data
│   │   ├── location/            # Property tax & insurance data
│   │   └── rates/               # Interest rate data
│   └── images/                  # Image assets
├── server/                      # Backend services
│   ├── ai_server.py             # AI chat server
│   └── data/                    # Data files for server
└── tests/                       # Testing infrastructure
    ├── unit/                    # Unit tests
    └── integration/             # Integration tests
```

### 2. Core Engine Implementation

#### 2.1. Calculator Module (calculator.js)

The main calculator module handles all mortgage calculations and serves as the orchestrator for the entire calculation process.

**Implementation Notes:**
- Use the singleton pattern for global access
- Implement caching for repeated calculations
- Create a standardized response format

#### 2.2. APR Calculator (apr-calculator.js)

The APR (Annual Percentage Rate) calculator implements Regulation Z requirements for accurate APR calculations.

**Implementation Notes:**
- Use iterative Newton-Raphson method for finding APR
- Handle finance charges appropriately
- No fallbacks in calculation - throw clear errors

#### 2.3. Loan Type Implementation

Implement loan type-specific calculators:
- Conventional loans
- FHA loans
- VA loans
- USDA loans

Each loan type has specific rules for:
- Interest rate calculation
- Mortgage insurance/funding fees
- DTI limits
- Eligibility criteria

#### 2.4-2.5. LLPA and Mortgage Insurance

Implement detailed calculations for:
- Loan-Level Price Adjustments based on credit score, LTV, etc.
- Private Mortgage Insurance for conventional loans
- FHA MIP calculations
- VA funding fee calculations
- USDA guarantee fee calculations

#### 2.6. Closing Costs Calculator

**Task Details:**
- Implement comprehensive closing costs estimation
- Calculate prepaids (taxes, insurance, interest)
- Handle state-specific variations
- Support user overrides for known costs

The closing costs calculator should:
1. Estimate lender fees (origination, processing, underwriting)
2. Calculate third-party fees (appraisal, title insurance, etc.)
3. Compute prepaid items (interest, taxes, insurance)
4. Support state-specific calculations

**Important Regulatory Considerations:**
- Properly flag Regulation Z finance charges for APR calculation
- Follow RESPA guidelines for escrow calculations
- Implement accurate prepaid interest calculations based on closing date

### 3. User Interface: Initial Assessment Flow

Follow the workflow outlined in master_plan.md:

1. **Entrance & Initial Data Gathering**
   - Create an AI-guided form that collects essential information
   - Use a conversational interface to improve user experience
   - Implement real-time validation

2. **Data Enrichment**
   - Use APIs or AI search to fetch location-specific data
   - Implement eligibility checks for different loan types
   - Calculate DTI and purchasing power

3. **Visualization & Results**
   - Display 3D visualization of different loan options
   - Show detailed breakdown of costs and affordability
   - Provide clear recommendations

### 4. Visualization Components

Enhance the existing 3D visualization by:
1. Supporting comparison between loan types
2. Adding interactive controls for exploration
3. Implementing tooltips and information overlays
4. Creating drill-down features for detailed analysis

### 5. AI Integration

Implement AI-driven features:
1. **Conversational Data Collection**
   - Guide users through information gathering
   - Explain concepts and requirements

2. **Personalized Recommendations**
   - Analyze user financial situation
   - Suggest optimal loan options
   - Identify improvement opportunities

3. **Goal Setting Assistance**
   - Help users define realistic financial goals
   - Create customized action plans

### 6. Financial Optimization Workflow

Implement the second workflow focusing on optimization:

1. **Factor Impact Explorer**
   - Interactive sliders for FICO, debt, income, down payment
   - Real-time visualization updates
   - AI-generated insights on most impactful changes

2. **Scenario Modeling**
   - "What-if" analysis tools
   - AI-suggested scenarios
   - Multiple scenario comparison

3. **Strategic Planning**
   - Goal-setting interface
   - Prioritized action steps
   - Progress tracking

## Next Steps

Our immediate focus should be completing the core engine implementation, specifically the closing costs calculator (Task 2.6) which we were interrupted during. This component is critical for accurate APR calculations and total cost estimation.

After finishing the core engine, we'll move on to building the user interface for the initial assessment workflow, then enhancing the visualization components, and finally implementing the financial optimization features.
