/**
 * Loan Guidelines Data - 2025
 * Based on comprehensive research of DTI requirements for different loan types
 */

const DTI_GUIDELINES = {
  // FHA Loan Guidelines
  fha: {
    standardLimits: {
      frontEndDTI: 31,
      backEndDTI: 43
    },
    // FHA may allow higher DTIs with strong compensating factors
    expandedLimits: {
      backEndDTI: 57 // Maximum with strong compensating factors and good credit
    },
    compensatingFactors: [
      {
        name: "High Credit Score",
        description: "Credit score of 680 or higher",
        impact: "May allow for higher DTI limits"
      },
      {
        name: "Substantial Cash Reserves",
        description: "3+ months of mortgage payments in reserves",
        impact: "Significantly improves approval chances"
      },
      {
        name: "Minimal Payment Shock",
        description: "New housing payment is similar to previous rent/mortgage",
        impact: "Demonstrates payment sustainability"
      },
      {
        name: "Minimal Discretionary Debt",
        description: "Low credit utilization and few non-essential debts",
        impact: "Shows responsible credit management"
      },
      {
        name: "Additional Income",
        description: "Income sources not counted in standard calculations",
        impact: "Provides additional repayment capacity"
      }
    ]
  },
  
  // VA Loan Guidelines
  va: {
    standardLimits: {
      backEndDTI: 41
    },
    notes: "VA prioritizes residual income over DTI. Strong residual income can offset higher DTI ratios.",
    compensatingFactors: [
      {
        name: "Tax-Free Income",
        description: "Significant amount of income exempt from federal taxes",
        impact: "Stronger effective income for debt service"
      },
      {
        name: "High Residual Income",
        description: "Residual income exceeding VA's requirement by 20%+",
        impact: "Major compensating factor for higher DTI"
      },
      {
        name: "Excellent Credit History",
        description: "Long history of on-time payments",
        impact: "Demonstrates reliable debt management"
      },
      {
        name: "Conservative Credit Use",
        description: "Low credit utilization and few revolving accounts",
        impact: "Shows responsible financial habits"
      },
      {
        name: "Military Benefits",
        description: "Additional military-specific income sources",
        impact: "Provides additional financial stability"
      }
    ]
  },
  
  // Conventional Loan Guidelines (Fannie Mae)
  conventional: {
    manualUnderwriting: {
      standardLimits: {
        frontEndDTI: 36,
        backEndDTI: 36
      },
      // With strong compensating factors
      expandedLimits: {
        backEndDTI: 45
      }
    },
    desktopUnderwriter: {
      standardLimits: {
        backEndDTI: 50 // DU can approve up to 50% with strong factors
      }
    },
    compensatingFactors: [
      {
        name: "High Credit Score",
        description: "Credit score of 740 or higher",
        impact: "May allow for DTI up to 50% with DU approval"
      },
      {
        name: "Significant Reserves",
        description: "6+ months of mortgage payments in reserves",
        impact: "Major compensating factor for higher DTI"
      },
      {
        name: "Low Loan-to-Value Ratio",
        description: "Larger down payment resulting in lower LTV",
        impact: "Reduces overall lending risk"
      },
      {
        name: "HomeReady Eligibility",
        description: "Meets income requirements for HomeReady program",
        impact: "May consider non-borrower household income"
      }
    ]
  },
  
  // Freddie Mac Loan Guidelines
  freddieMac: {
    standardLimits: {
      backEndDTI: 45
    },
    expandedLimits: {
      backEndDTI: 49 // With qualifying factors
    },
    homePossible: {
      automated: {
        backEndDTI: 43
      },
      manual: {
        backEndDTI: 45
      }
    },
    compensatingFactors: [
      {
        name: "High Credit Score",
        description: "Credit score of 740 or higher",
        impact: "May allow for higher DTI approval"
      },
      {
        name: "Substantial Reserves",
        description: "Significant liquid assets beyond down payment",
        impact: "Demonstrates financial stability"
      },
      {
        name: "Lower LTV Ratio",
        description: "Higher down payment percentage",
        impact: "Reduces lending risk"
      }
    ]
  },
  
  // USDA Loan Guidelines
  usda: {
    standardLimits: {
      frontEndDTI: 29,
      backEndDTI: 41
    },
    // With strong compensating factors and manual underwriting
    expandedLimits: {
      backEndDTI: 44
    },
    compensatingFactors: [
      {
        name: "Strong Credit History",
        description: "Credit score of 680 or higher",
        impact: "May allow for slightly higher DTI"
      },
      {
        name: "Cash Reserves",
        description: "3+ months of mortgage payments in savings",
        impact: "Demonstrates financial stability"
      },
      {
        name: "Stable Employment",
        description: "2+ years with same employer",
        impact: "Shows reliable income source"
      },
      {
        name: "Emergency Fund",
        description: "Dedicated emergency savings",
        impact: "Provides financial safety net"
      }
    ]
  }
};

// Export the guidelines for use in other files
export default DTI_GUIDELINES;