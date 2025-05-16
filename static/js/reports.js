// Reports functionality

document.addEventListener('DOMContentLoaded', function() {
    // Add event listener to report cards
    document.querySelectorAll('.report-card').forEach(card => {
        card.addEventListener('click', function() {
            const reportType = this.getAttribute('data-report');
            loadReport(reportType);
            
            // Add active class to selected card
            document.querySelectorAll('.report-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

let reportChart = null;

async function loadReport(reportType) {
    try {
        const response = await fetch(`/api/reports/${reportType}`);
        const data = await response.json();
        
        if (response.ok) {
            displayReport(reportType, data);
        } else {
            console.error('Error loading report:', data.error);
            showAlert(`Error loading report: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error fetching report:', error);
        showAlert('Error loading report data', 'danger');
    }
}

function displayReport(reportType, data) {
    // Update report title
    let reportTitle = '';
    let chartType = 'bar';
    let chartOptions = {};
    
    switch (reportType) {
        case 'inventory_value':
            reportTitle = 'Inventory Value by Category';
            chartType = 'bar';
            chartOptions = {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            };
            break;
        case 'stock_levels':
            reportTitle = 'Current Stock Levels';
            chartType = 'bar';
            chartOptions = {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            };
            break;
        case 'transaction_history':
            reportTitle = 'Transaction History Summary';
            chartType = 'pie';
            chartOptions = {};
            break;
    }
    
    document.getElementById('report-title').textContent = reportTitle;
    
    // Show report container
    document.getElementById('report-container').style.display = 'block';
    
    // Create or update chart
    generateChart(reportType, chartType, data.labels, data.data, chartOptions);
}

function generateChart(reportType, chartType, labels, values, options) {
    const ctx = document.getElementById('reportChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (reportChart) {
        reportChart.destroy();
    }
    
    // Set chart colors based on report type
    let backgroundColor;
    let borderColor;
    
    if (chartType === 'pie' || chartType === 'doughnut') {
        backgroundColor = [
            '#2563EB', // Primary
            '#DC2626', // Danger
            '#16A34A', // Success
            '#F59E0B', // Warning
            '#475569', // Secondary
            '#4F46E5', 
            '#7C3AED',
            '#9333EA',
            '#C026D3',
            '#DB2777'
        ];
        borderColor = '#FFFFFF';
    } else {
        backgroundColor = '#2563EB';
        borderColor = '#1D4ED8';
    }
    
    // Create chart
    reportChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Value',
                data: values,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: chartType === 'pie' || chartType === 'doughnut' ? 'right' : 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (reportType === 'inventory_value') {
                                label += '₱' + context.parsed.y;
                            } else {
                                label += context.parsed.y || context.parsed;
                            }
                            return label;
                        }
                    }
                }
            },
            ...options
        }
    });
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to the page
    const main = document.querySelector('main');
    main.insertBefore(alertDiv, main.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}
