# Master Plan: Mortgage Visualization & Optimization Tool

This document outlines the envisioned user workflows for the mortgage visualization and financial goal-setting application.

## Workflow 1: Initial Assessment & Visualization

This workflow focuses on gathering initial user information, calculating their current mortgage options, and visualizing the results.

**Goal:** Provide the user with a clear understanding of their current mortgage eligibility, affordability, and potential loan scenarios.

**Steps:**

1.  **Entrance & Initial Data Gathering:**
    *   User accesses the website/application.
    *   An interactive interface (potentially AI-driven chat or guided form) collects essential preliminary information:
        *   Annual Income
        *   Monthly Debts (approximations for credit cards, car loans, student loans, etc.)
        *   Estimated Credit Score (FICO range)
        *   Property Location (State, potentially County)
        *   Estimated Purchase Price (approximate target)
        *   Estimated Down Payment Amount/Percentage

2.  **Data Enrichment & Initial Eligibility:**
    *   **External Data Fetching:** Use APIs or AI search to estimate location-specific costs:
        *   Property Tax Rate/Amount
        *   Homeowners Insurance Rate/Amount
        *   Base Interest Rates (e.g., from Mortgage News Daily API or similar source)
    *   **HOA Fees:** Prompt user for HOA fees or use a default (e.g., $100/month) with clear indication for user correction.
    *   **Eligibility Check:** Based on FICO, estimated LTV (from Purchase Price & Down Payment), and potentially preliminary DTI, determine which loan types (Conventional, FHA, VA, USDA) the user might qualify for (`eligibility.js`).
    *   **DTI Calculation:** Perform a more detailed DTI calculation using gathered income, debts, and estimated PITI (`dti-calculator`). Determine maximum qualifying DTI per eligible loan type.

3.  **Core Calculation & Visualization:**
    *   **Mortgage Engine:** Run the core mortgage calculator (`calculator.js`) for each eligible loan type, incorporating:
        *   Adjusted Interest Rates (Base Rate + LLPAs based on FICO/LTV)
        *   Estimated Closing Costs (location-specific, potentially overridden) (`closing-costs.js`)
        *   Mortgage Insurance (MI/PMI/MIP/Funding Fee) (`mi.js`)
        *   PITI + MI + HOA
    *   **3D Visualization:** Present the results in the interactive 3D visualizer, comparing key metrics across different loan types and potentially FICO/LTV scenarios:
        *   Purchasing Power
        *   Total Monthly Payment
        *   Interest Rate / RepAPR
        *   Cash-to-Close

4.  **Results Summary & Recommendation:**
    *   Display a clear summary for the user:
        *   **Recommendation:** Suggest the potentially "best" loan option based on current inputs (e.g., lowest payment, lowest cash-to-close).
        *   **Qualification:** Clearly state which loan types they likely qualify for and the maximum DTI for each.
        *   **Affordability:** Show the estimated maximum house price they can afford.
        *   **Costs:** Provide an itemized list of estimated closing costs and the total cash-to-close.
        *   **APR:** Display the calculated Representative APR (RepAPR) for comparison.

**Diagram:**

```mermaid
graph LR
    A[User Enters Website] --> B(Interactive Data Gathering);
    B -- Income, Debts, FICO, Location, Price, DP --> C{Data Enrichment};
    C -- Fetch Estimates --> D[External APIs / AI Search <br> (Taxes, HOI, Rates)];
    C -- Prompt/Default --> E[HOA Fees];
    D --> F{Initial Calculations};
    E --> F;
    B --> F;
    F -- FICO, LTV, DTI --> G[Eligibility Check <br> (Loan Types, Max DTI)];
    G --> H{Core Mortgage Engine <br> (calculator.js)};
    F -- Inputs --> H;
    H -- Calculate PITI, MI, Costs, RepAPR --> I[3D Visualization <br> (Comparison)];
    I --> J(Results Summary <br> Recommendation, Affordability, Costs);

    subgraph "Data Input"
        B
    end

    subgraph "Processing"
        C
        D
        E
        F
        G
        H
    end

    subgraph "Output"
        I
        J
    end

    style B fill:#f9f,stroke:#333,stroke-width:2px
    style I fill:#ccf,stroke:#333,stroke-width:2px
    style J fill:#cfc,stroke:#333,stroke-width:2px
```

## Workflow 2: Financial Optimization & Goal Setting

This workflow builds upon the initial assessment, allowing users to explore how changes in their financial situation impact their mortgage options and helps them create a plan to achieve their homeownership goals.

**Goal:** Empower users to understand the factors affecting their mortgage potential and provide actionable strategies for improvement.

**Steps:**

1.  **Baseline Review:**
    *   Start from the user's current situation as determined in Workflow 1 ("You can afford X because of factors Y").

2.  **Factor Impact Exploration:**
    *   Present an interactive interface (e.g., expandable charts, sliders) showing the sensitivity of key outcomes (Purchasing Power, Monthly Payment, Interest Rate/APR) to changes in input factors:
        *   **Credit Score:** "If your FICO score was 640 instead of 580, your purchasing power could increase by $X."
        *   **Debt Reduction:** "If you paid off $5000 in revolving debt, your DTI would decrease, potentially increasing your purchasing power by $Y." (Could also model FICO score impact).
        *   **Income Increase:** "If your income increased by $10,000/year, your purchasing power could increase by $Z."
        *   **Down Payment:** "Increasing your down payment by $X could lower your monthly payment by $Y and potentially reduce/eliminate MI."
        *   **Interest Rate Changes:** Show impact of potential market rate fluctuations.

3.  **Scenario Modeling (AI-Powered):**
    *   Allow users to run "what-if" scenarios, potentially guided by AI suggestions:
        *   "What happens if I get a $5,000 raise next year?"
        *   "What if I pay off my car loan ($300/month)?"
        *   "Show me the impact of improving my FICO score by 30 points."
    *   The engine recalculates mortgage options based on the scenario inputs.

4.  **Strategic Pathway Planning:**
    *   Based on a user's desired target (e.g., specific purchase price, lower monthly payment), use AI or optimization logic to suggest the most effective pathway:
        *   "To reach a $400,000 purchase price, the fastest path might be focusing on increasing your FICO score by X points and saving an additional $Y for down payment."
        *   Provide a prioritized list of actions (e.g., pay down specific debts first, then save).

5.  **Progress Tracking & Notifications:**
    *   Allow users to save their profile and goals.
    *   **Track Market Changes:** Monitor external factors like average interest rates and potentially home price indices (if integrated).
    *   **Track User Progress:** Allow users to update their income, debts, savings, and FICO score over time.
    *   **Real-time Goal Adjustment:** Recalculate affordability and progress towards goals based on market and user updates.
    *   **Notifications:** Alert the user when they are close to achieving their target affordability or when significant market changes impact their plan.

**Diagram:**

```mermaid
graph TD
    K[Workflow 1 Results <br> (Current Situation)] --> L{Factor Impact Exploration};
    L -- Explore FICO --> M[Show FICO Impact];
    L -- Explore Debt --> N[Show DTI/Debt Impact];
    L -- Explore Income --> O[Show Income Impact];
    L -- Explore Down Payment --> P[Show DP/LTV Impact];

    subgraph "Sensitivity Analysis"
        L
        M
        N
        O
        P
    end

    L --> Q{Scenario Modeling (What-If)};
    Q -- User Input / AI Suggestion --> R[Recalculate Mortgage Options];
    R --> Q;

    Q --> S{Strategic Pathway Planning};
    S -- User Goal (e.g., Target Price) --> T[Generate Action Plan <br> (Prioritized Steps)];

    T --> U{Progress Tracking};
    U -- User Updates (Income, Debt, FICO) --> V[Recalculate & Update Goals];
    U -- Market Data (Rates, Prices) --> V;
    V --> U;
    V -- Goal Threshold Met --> W[Send Notification];

    style L fill:#f9f,stroke:#333,stroke-width:2px
    style Q fill:#ccf,stroke:#333,stroke-width:2px
    style S fill:#cfc,stroke:#333,stroke-width:2px
    style U fill:#ffc,stroke:#333,stroke-width:2px
```

This master plan provides a high-level overview of the intended user experience, integrating data gathering, calculation, visualization, and AI-driven optimization features.
