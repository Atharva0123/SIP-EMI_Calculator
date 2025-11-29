// --- State Management ---
let state = {
    mainMode: 'investment', // 'investment' | 'emi'
    investType: 'sip',      // 'sip' | 'lumpsum' | 'goal'
    freq: 'monthly',        // 'daily' | 'weekly' | 'monthly' | 'quarterly'
    values: { v1: 5000, v2: 10, v3: 12 } // v1=Amount/Target, v2=Years, v3=Rate
};

let pieChart = null;
let lineChart = null;

// --- Utility Functions ---
function getFrequencyFactor(freq) {
    const freqMap = { 'daily': 365, 'weekly': 52, 'monthly': 12, 'quarterly': 4 };
    return freqMap[freq] || 12;
}

function formatCurrency(num) {
    if (isNaN(num) || !isFinite(num)) return "₹ 0";
    if (num >= 10000000) return "₹ " + (num / 10000000).toFixed(2) + " Cr";
    if (num >= 100000) return "₹ " + (num / 100000).toFixed(2) + " L";
    return "₹ " + Math.round(num).toLocaleString('en-IN');
}

// --- Initial Load ---
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateUI();
    calculate();
});

// --- Navigation & UI Toggles ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

function toggleFaq(element) {
    const item = element.closest('.faq-item');
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    if (!isActive) {
        item.classList.add('active');
    }
}

// --- Mode Switching ---
function setMainMode(mode) {
    state.mainMode = mode;
    // Reset to defaults
    if (mode === 'emi') {
        state.investType = null;
        state.values = { v1: 500000, v2: 5, v3: 9.5 }; // Default Loan values
    } else {
        state.investType = 'sip';
        state.values = { v1: 5000, v2: 10, v3: 12 }; // Default SIP values
    }
    updateUI();
    calculate();
}

function setInvestType(type) {
    state.investType = type;
    // Adjust defaults and ranges based on type
    if (type === 'lumpsum') {
        state.values.v1 = 100000;
        document.getElementById('rng-1').max = 5000000;
        document.getElementById('rng-1').step = 5000;
    } else if (type === 'goal') {
        state.values.v1 = 1000000; // Target Amount
        document.getElementById('rng-1').max = 10000000;
        document.getElementById('rng-1').step = 10000;
    } else { // sip
        state.values.v1 = 5000;
        document.getElementById('rng-1').max = 100000;
        document.getElementById('rng-1').step = 500;
    }
    updateUI();
    calculate();
}

function setFreq(freq) {
    state.freq = freq;
    // Update active button visually
    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    calculate();
}

// --- Input Sync Logic ---
function syncSlider(id) {
    const val = document.getElementById(`inp-${id}`).value;
    document.getElementById(`rng-${id}`).value = val;
    state.values[`v${id}`] = parseFloat(val);
    calculate();
}

function syncInput(id) {
    const val = document.getElementById(`rng-${id}`).value;
    document.getElementById(`inp-${id}`).value = val;
    state.values[`v${id}`] = parseFloat(val);
    calculate();
}

// --- UI Updates ---
function updateUI() {
    // Main Tabs Styling
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('onclick').includes(state.mainMode)) b.classList.add('active');
    });

    // Sub-Tabs and Frequency Visibility
    const subTabs = document.getElementById('invest-type-tabs');
    const freqRow = document.getElementById('freq-row');

    if (state.mainMode === 'emi') {
        subTabs.classList.add('hidden');
        freqRow.classList.add('hidden');
    } else {
        subTabs.classList.remove('hidden');
        document.querySelectorAll('.sub-tab-btn').forEach(b => {
            b.classList.remove('active');
            if (b.getAttribute('onclick').includes(state.investType)) b.classList.add('active');
        });
        
        if (state.investType === 'lumpsum') {
            freqRow.classList.add('hidden');
        } else {
            freqRow.classList.remove('hidden');
            // Re-select active frequency button if visible
            document.querySelectorAll('.freq-btn').forEach(b => {
                b.classList.remove('active');
                if (b.getAttribute('onclick').includes(state.freq)) b.classList.add('active');
            });
        }
    }
    

    // Dynamic Labels & Sliders
    const lbl1 = document.getElementById('lbl-1');
    const lbl3 = document.getElementById('lbl-3');
    const inputTitle = document.getElementById('input-title');
    
    if (state.mainMode === 'emi') {
        inputTitle.innerText = "Calculate Loan EMI";
        lbl1.innerText = "Loan Principal Amount";
        lbl3.innerText = "Interest Rate (p.a)";
    } else { // Investment Mode
        lbl3.innerText = "Expected Return (p.a)";
        if (state.investType === 'sip') {
            inputTitle.innerText = "SIP Calculator";
            lbl1.innerText = "Periodic Investment";
        } else if (state.investType === 'lumpsum') {
            inputTitle.innerText = "Lumpsum Calculator";
            lbl1.innerText = "Total One-Time Investment";
        } else if (state.investType === 'goal') {
            inputTitle.innerText = "Goal SIP Planner";
            lbl1.innerText = "Target Future Goal Amount";
        }
    }

    // Sync Inputs to State
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`inp-${i}`).value = state.values[`v${i}`];
        document.getElementById(`rng-${i}`).value = state.values[`v${i}`];
    }
}

// --- Calculation Core ---
function calculate() {
    let P = state.values.v1; // Input 1: Amount / Target
    let N = state.values.v2; // Input 2: Years
    let R = state.values.v3; // Input 3: Rate
    
    let result = 0, invested = 0, returns = 0;
    let f = getFrequencyFactor(state.freq);

    if (state.mainMode === 'emi') {
        // EMI Calculation
        let r = R / 12 / 100; // Monthly Rate
        let n = N * 12; // Total Months
        
        let emi = 0;
        if (r > 0) {
            emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        } else {
            emi = P / n; // Simple payback if rate is zero
        }
        
        result = emi;
        invested = P; // Principal Loan
        returns = (emi * n) - P; // Total Interest Paid
        
        document.getElementById('res-lbl-main').innerText = "Monthly EMI";
        document.getElementById('res-lbl-1').innerText = "Loan Principal";
        document.getElementById('res-lbl-2').innerText = "Total Interest";

    } else { // Investment Mode
        let i = R / 100 / f; // Periodic Rate
        let n = N * f;       // Total Periods

        if (state.investType === 'sip') {
            // SIP: Calculate Future Value (FV) from periodic investment (P)
            // FV = P * [ ((1+i)^n - 1) / i ] * (1+i)
            if (i > 0) {
                result = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
            } else {
                result = P * n; // Simple addition if rate is zero
            }
            
            invested = P * n;
            returns = result - invested;
            
            document.getElementById('res-lbl-main').innerText = "Expected Maturity Value";
            document.getElementById('res-lbl-1').innerText = "Total Invested";
            document.getElementById('res-lbl-2').innerText = "Est. Returns";

        } else if (state.investType === 'lumpsum') {
            // LUMPSUM: Calculate FV from one-time investment (P)
            // FV = P * (1 + R/100)^N
            result = P * Math.pow((1 + R / 100), N);
            invested = P;
            returns = result - invested;

            document.getElementById('res-lbl-main').innerText = "Expected Maturity Value";
            document.getElementById('res-lbl-1').innerText = "Invested Capital";
            document.getElementById('res-lbl-2').innerText = "Est. Returns";

        } else if (state.investType === 'goal') {
            // GOAL SIP: Calculate Required Periodic Investment (X) for Future Value (P)
            let target = P;
            let requiredInv = 0;
            
            // Formula solves for X in FV = X * [ ((1+i)^n - 1) / i ] * (1+i)
            // X = FV / [ ((1+i)^n - 1) / i ] / (1+i)
            if (i > 0) {
                let factor = ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
                requiredInv = target / factor;
            } else {
                requiredInv = target / n; // Simple division if rate is zero
            }

            result = requiredInv; // This is the Periodic Amount needed
            invested = requiredInv * n; // Total money you put in
            returns = target - invested; // Gain (Target - Invested)
            
            // If the goal is impossible (e.g., target amount too low or rate too high)
            if (!isFinite(result) || result <= 0) {
                 result = 0;
                 invested = 0;
                 returns = 0;
            }

            document.getElementById('res-lbl-main').innerText = "Required " + state.freq + " Investment";
            document.getElementById('res-lbl-1').innerText = "Total Investment Cost";
            document.getElementById('res-lbl-2').innerText = "Wealth Created";
        }
    }
    
    // Update DOM. Note: For Goal SIP, result is the periodic payment, which is formatted as currency.
    if (state.investType === 'goal') {
        document.getElementById('res-val-main').innerText = formatCurrency(result);
    } else if (state.mainMode === 'emi') {
        document.getElementById('res-val-main').innerText = formatCurrency(result);
    } else {
        document.getElementById('res-val-main').innerText = formatCurrency(result);
    }
    
    document.getElementById('res-val-1').innerText = formatCurrency(invested);
    document.getElementById('res-val-2').innerText = formatCurrency(returns);

    updateCharts(invested, returns, N);
}


// --- Charts ---
function initCharts() {
    // Pie Chart
    const ctxP = document.getElementById('myPieChart').getContext('2d');
    pieChart = new Chart(ctxP, {
        type: 'doughnut',
        data: {
            labels: ['Invested', 'Returns'],
            datasets: [{
                data: [50, 50],
                backgroundColor: ['#ffffff', '#00d2ff'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.7)', usePointStyle: true } }
            },
            cutout: '70%'
        }
    });

    // Line Chart (Growth Curve)
    const ctxL = document.getElementById('myLineChart').getContext('2d');
    lineChart = new Chart(ctxL, {
        type: 'line',
        data: {
            labels: ['Yr 0', 'Yr 10'],
            datasets: [
                {
                    label: 'Maturity Value',
                    data: [],
                    borderColor: '#00d2ff',
                    backgroundColor: 'rgba(0, 210, 255, 0.1)',
                    fill: 'start', // Fill from start point
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Invested Amount',
                    data: [],
                    borderColor: '#ffffff',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { display: false } },
                y: { 
                    ticks: { color: 'rgba(255,255,255,0.5)', callback: function(value) { return formatCurrency(value); } },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            },
            plugins: { 
                legend: { 
                    position: 'top', 
                    labels: { color: 'rgba(255,255,255,0.7)', usePointStyle: true } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function updateCharts(val1, val2, years) {
    const investedTotal = Math.max(0, val1);
    const returns = Math.max(0, val2);
    const totalValue = investedTotal + returns;
    
    // --- 1. Update Pie Chart ---
    pieChart.data.datasets[0].data = [investedTotal, returns];
    
    if (state.mainMode === 'emi') {
        pieChart.data.labels = ['Loan Amount', 'Total Interest'];
        pieChart.data.datasets[0].backgroundColor = ['#ffffff', '#a0616a'];
    } else {
        pieChart.data.labels = ['Invested', 'Returns'];
        pieChart.data.datasets[0].backgroundColor = ['#ffffff', '#00d2ff'];
    }
    pieChart.update();

    // --- 2. Update Line Chart ---
    let labels = [];
    let investedPoints = [];
    let compoundedPoints = [];
    let step = 1; // Show data yearly

    if (years < 10) step = 0.5;

    // Use specific calculation functions for the line plot to ensure accuracy
    const R_annual = state.values.v3 / 100; // Annual Rate
    const P_periodic = state.values.v1; // The main input (e.g., SIP amount, Lumpsum amount, or Goal Target)
    const f = getFrequencyFactor(state.freq); // Frequency factor for periodic calcs
    const i_periodic = R_annual / f; // Periodic Rate

    // Determine the base periodic investment (X)
    let X;
    if (state.investType === 'sip') {
        X = P_periodic; // P is the periodic investment
    } else if (state.investType === 'lumpsum') {
        X = 0; // Lumpsum has no periodic investment
    } else if (state.investType === 'goal') {
        // Goal SIP: X is the required periodic investment calculated in the main 'calculate' function (stored in 'result' if Goal SIP)
        X = calculatePeriodicInvestmentForGoal(P_periodic, years, R_annual, f);
    } else if (state.mainMode === 'emi') {
        // For Loan, X is the monthly EMI (since we are plotting Principal paid)
        X = calculateEMI(P_periodic, years, R_annual);
    } else {
        X = 0;
    }


    // --- Investment Plot Generation ---
    if (state.mainMode === 'investment') {
        const initialInvestment = state.investType === 'lumpsum' ? P_periodic : 0;
        
        for (let y = 0; y <= years; y += step) {
            labels.push(`Yr ${y}`);
            let n_compounded = y * f;
            let n_years = y;

            // Current Invested Amount
            let currentInvested = initialInvestment + (X * n_compounded);
            investedPoints.push(currentInvested);
            
            // Current Compounded Value
            let currentCompounded = 0;
            if (state.investType === 'lumpsum') {
                currentCompounded = P_periodic * Math.pow((1 + R_annual), n_years);
            } else { // SIP or Goal SIP
                if (i_periodic > 0) {
                    currentCompounded = X * ((Math.pow(1 + i_periodic, n_compounded) - 1) / i_periodic) * (1 + i_periodic) + initialInvestment * Math.pow((1 + R_annual), n_years);
                } else {
                    currentCompounded = currentInvested;
                }
            }
            compoundedPoints.push(currentCompounded);
        }
        
        // Ensure final points are exact calculated values
        labels[labels.length - 1] = `Yr ${years}`;
        investedPoints[investedPoints.length - 1] = investedTotal;
        compoundedPoints[compoundedPoints.length - 1] = totalValue;

        lineChart.data.datasets[0].label = 'Maturity Value';
        lineChart.data.datasets[1].label = 'Total Invested';
        lineChart.data.datasets[0].borderColor = '#00d2ff';
        lineChart.data.datasets[1].borderColor = '#ffffff';
        lineChart.data.datasets[0].backgroundColor = 'rgba(0, 210, 255, 0.1)';
        lineChart.data.datasets[1].backgroundColor = 'transparent';


    } else {
        // --- EMI Plot Generation (Principal Paid) ---
        // For EMI, we plot two things: Principal remaining and Total Paid (P+I)
        let totalPaidPoints = [];
        let principalRemainingPoints = [];
        let r_monthly = R_annual / 12;
        let n_months_total = years * 12;

        for (let y = 0; y <= years; y += step) {
            labels.push(`Yr ${y}`);
            let n_months = y * 12;
            
            let principalPaid;
            if (r_monthly > 0) {
                // Calculate Principal Paid by finding the remaining balance and subtracting from total principal
                let remainingBalance = P_periodic * Math.pow(1 + r_monthly, n_months) - (X / r_monthly) * (Math.pow(1 + r_monthly, n_months) - 1);
                principalPaid = P_periodic - Math.max(0, remainingBalance);
            } else {
                principalPaid = P_periodic * (n_months / n_months_total);
            }
            
            investedPoints.push(principalPaid); // Re-use investedPoints for Principal Paid
            compoundedPoints.push(X * n_months); // Re-use compoundedPoints for Total Money Paid (P+I)

        }
        
        // Ensure final points are exact calculated values
        labels[labels.length - 1] = `Yr ${years}`;
        investedPoints[investedPoints.length - 1] = investedTotal; // Should be Loan Principal P
        compoundedPoints[compoundedPoints.length - 1] = totalValue; // Should be Total Paid (P + Interest)

        lineChart.data.datasets[0].label = 'Total Repayment';
        lineChart.data.datasets[1].label = 'Principal Repaid';
        lineChart.data.datasets[0].borderColor = '#a0616a';
        lineChart.data.datasets[1].borderColor = '#ffffff';
        lineChart.data.datasets[0].backgroundColor = 'rgba(160, 97, 106, 0.1)';
        lineChart.data.datasets[1].backgroundColor = 'transparent';

    }
    
    lineChart.data.labels = labels;
    lineChart.data.datasets[0].data = compoundedPoints;
    lineChart.data.datasets[1].data = investedPoints;
    lineChart.update();
}

// Helper for Goal SIP (required periodic investment)
function calculatePeriodicInvestmentForGoal(target, years, R_annual, f) {
    const i_periodic = R_annual / f;
    const n_periods = years * f;
    
    if (i_periodic > 0) {
        // FV annuity factor: [ ((1+i)^n - 1) / i ] * (1+i)
        const factor = ((Math.pow(1 + i_periodic, n_periods) - 1) / i_periodic) * (1 + i_periodic);
        return target / factor;
    } else {
        return target / n_periods;
    }
}

// Helper for EMI (required periodic payment)
function calculateEMI(principal, years, R_annual) {
    const r_monthly = R_annual / 12;
    const n_months = years * 12;
    
    if (r_monthly > 0) {
        return (principal * r_monthly * Math.pow(1 + r_monthly, n_months)) / (Math.pow(1 + r_monthly, n_months) - 1);
    } else {
        return principal / n_months;
    }
}