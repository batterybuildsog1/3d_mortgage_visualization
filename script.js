document.addEventListener('DOMContentLoaded', function() {
    console.log('Cyberpunk Mortgage Calculator initialized');
    
    // Get elements
    const incomeInput = document.getElementById('income');
    const locationInput = document.getElementById('location');
    const ltvSlider = document.getElementById('ltv');
    const ltvValue = document.getElementById('ltv-value');
    const ficoSlider = document.getElementById('fico');
    const ficoValue = document.getElementById('fico-value');
    const loanTypeButtons = document.querySelectorAll('.loan-type-btn');
    const calculateBtn = document.querySelector('.calculate-btn');
    
    // Results elements
    const loanAmountEl = document.getElementById('loan-amount');
    const purchasingPowerEl = document.getElementById('purchasing-power');
    const downPaymentEl = document.getElementById('down-payment');
    const monthlyPaymentEl = document.getElementById('monthly-payment');
    const interestRateEl = document.getElementById('interest-rate');
    const selectedLoanTypeEl = document.getElementById('selected-loan-type');
    
    // Initialize values
    let income = 75000;
    let ltv = 95;
    let ficoScore = 680;
    let loanType = 'FHA';
    
    // Update slider displays
    ltvSlider.addEventListener('input', function() {
        ltv = this.value;
        ltvValue.textContent = `${ltv}%`;
        
        // Update slider background gradient
        const percentage = (ltv - 70) / (100 - 70) * 100;
        this.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, #374151 ${percentage}%, #374151 100%)`;
    });
    
    ficoSlider.addEventListener('input', function() {
        ficoScore = this.value;
        ficoValue.textContent = ficoScore;
        
        // Update slider background gradient
        const percentage = (ficoScore - 580) / (850 - 580) * 100;
        this.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${percentage}%, #374151 ${percentage}%, #374151 100%)`;
    });
    
    // Set initial slider backgrounds
    ltvSlider.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${(ltv-70)/(100-70)*100}%, #374151 ${(ltv-70)/(100-70)*100}%, #374151 100%)`;
    ficoSlider.style.background = `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${(ficoScore-580)/(850-580)*100}%, #374151 ${(ficoScore-580)/(850-580)*100}%, #374151 100%)`;
    
    // Loan type selection
    loanTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            loanTypeButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to the clicked button
            this.classList.add('active');
            
            // Update loan type
            loanType = this.dataset.loanType;
            selectedLoanTypeEl.textContent = loanType;
            
            // Update calculations
            calculateMortgage();
        });
    });
    
    // Add typing effect to input
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
    });
    
    // Calculate function
    function calculateMortgage() {
        // Show loading effect
        addLoadingEffect();
        
        // Get current values
        income = parseFloat(incomeInput.value) || 75000;
        
        // This is a very simplified model for demonstration purposes
        const dti = 0.41; // Max DTI for FHA without manual underwriting
        const monthlyIncome = income / 12;
        const monthlyPrincipalAndInterest = monthlyIncome * dti * 0.8; // Estimating P&I as 80% of allowable DTI
        
        // Estimate interest rate based on FICO score and LTV (simplified)
        let interestRate = 0.065; // Base rate of 6.5%
        
        // Adjust for FICO
        if (ficoScore >= 760) interestRate -= 0.005;
        else if (ficoScore >= 720) interestRate -= 0.0025;
        else if (ficoScore <= 640) interestRate += 0.005;
        
        // Adjust for LTV
        if (ltv > 95) interestRate += 0.0025;
        else if (ltv < 80) interestRate -= 0.0025;
        
        // Adjust for loan type
        if (loanType === 'VA') interestRate -= 0.0025;
        else if (loanType === 'FHA' && ficoScore < 680) interestRate -= 0.001;
        else if (loanType === 'Conventional' && ficoScore < 700) interestRate += 0.002;
        
        // Calculate loan amount based on monthly payment (simplified formula)
        const monthlyRate = interestRate / 12;
        const termMonths = 30 * 12; // 30-year fixed
        
        // Present value of annuity formula
        const loanAmount = monthlyPrincipalAndInterest * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
        
        // Calculate total purchasing power
        const downPaymentPercentage = 100 - ltv;
        const totalPurchasingPower = loanAmount / (1 - (downPaymentPercentage / 100));
        const downPayment = totalPurchasingPower - loanAmount;
        
        // Simulate delay for visual effect
        setTimeout(() => {
            // Update result elements with animation
            animateValue(loanAmountEl, 0, Math.round(loanAmount), 500, true);
            animateValue(purchasingPowerEl, 0, Math.round(totalPurchasingPower), 500, true);
            animateValue(downPaymentEl, 0, Math.round(downPayment), 500, true);
            animateValue(monthlyPaymentEl, 0, Math.round(monthlyPrincipalAndInterest), 300, true);
            
            // Update interest rate
            interestRateEl.textContent = `${(interestRate * 100).toFixed(2)}%`;
            
            // Remove loading effect
            removeLoadingEffect();
            
            // Update the 3D visualization
            console.log('Triggering visualization update');
            if (typeof window.updateVisualization === 'function') {
                window.updateVisualization({
                    loanAmount,
                    totalPurchasingPower,
                    downPayment,
                    monthlyPayment: monthlyPrincipalAndInterest,
                    interestRate,
                    ficoScore,
                    ltv,
                    loanType
                });
            } else {
                console.error('Visualization update function not found!');
            }
            
            console.log('Calculated results:', {
                loanAmount,
                totalPurchasingPower,
                downPayment,
                monthlyPayment: monthlyPrincipalAndInterest,
                interestRate,
                ficoScore,
                ltv,
                loanType
            });
        }, 300);
    }
    
    // Add loading effect
    function addLoadingEffect() {
        document.querySelectorAll('.result-value').forEach(el => {
            if (el.id !== 'selected-loan-type') {
                el.classList.add('loading');
            }
        });
    }
    
    // Remove loading effect
    function removeLoadingEffect() {
        document.querySelectorAll('.result-value').forEach(el => {
            el.classList.remove('loading');
        });
    }
    
    // Animate number values
    function animateValue(element, start, end, duration, isCurrency = false) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            
            if (isCurrency) {
                element.textContent = `$${value.toLocaleString()}`;
            } else {
                element.textContent = value.toLocaleString();
            }
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
    
    // Event listeners
    calculateBtn.addEventListener('click', calculateMortgage);
    
    // Add cyberpunk button effect
    calculateBtn.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.98)';
    });
    
    calculateBtn.addEventListener('mouseup', function() {
        this.style.transform = 'scale(1)';
    });
    
    calculateBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
    
    // Call calculate initially to populate values
    calculateMortgage();
    
    // Add loading class for animation
    document.querySelectorAll('.result-value').forEach(el => {
        el.style.transition = 'all 0.3s ease';
    });
});

// Add to CSS for loading animation
document.head.insertAdjacentHTML('beforeend', `
<style>
    @keyframes loading {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }
    
    .result-value.loading {
        animation: loading 1s infinite;
    }
</style>
`);
