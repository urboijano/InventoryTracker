// Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard data
    loadDashboardData();
    
    // Initialize charts with empty data (will be updated when data is fetched)
    initCharts();
});

async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        
        if (response.ok) {
            updateDashboardStats(data);
            updateCategoryChart(data.category_distribution);
            updateRecentTransactions(data.recent_transactions);
        } else {
            console.error('Error loading dashboard data:', data.error);
            showAlert('Error loading dashboard data', 'danger');
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showAlert('Error loading dashboard data', 'danger');
    }
}

function updateDashboardStats(data) {
    // Update summary statistics
    document.getElementById('total-items').textContent = data.total_items;
    document.getElementById('total-value').textContent = formatCurrency(data.total_value);
    document.getElementById('low-stock').textContent = data.low_stock_items;
    document.getElementById('out-of-stock').textContent = data.out_of_stock_items;
}

function updateRecentTransactions(transactions) {
    const tableBody = document.getElementById('recent-transactions');
    tableBody.innerHTML = '';
    
    if (transactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="text-center">No recent transactions</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // Format date
        const date = new Date(transaction.timestamp);
        const formattedDate = date.toLocaleString();
        
        // Create transaction badge
        const typeClass = transaction.type === 'in' ? 'transaction-in' : 'transaction-out';
        const typeLabel = transaction.type === 'in' ? 'Stock In' : 'Stock Out';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><span class="${typeClass}">${typeLabel}</span></td>
            <td>${transaction.item_name}</td>
            <td>${transaction.sku}</td>
            <td>${transaction.quantity}</td>
            <td>${transaction.new_quantity}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

let categoryChart = null;
let valueChart = null;

function initCharts() {
    // Create empty Category Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#2563EB', // Primary
                    '#4F46E5', 
                    '#7C3AED',
                    '#9333EA',
                    '#C026D3',
                    '#DB2777',
                    '#E11D48',
                    '#F97316',
                    '#F59E0B',
                    '#EAB308'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Items by Category'
                }
            }
        }
    });
    
    // Create empty Value Chart
    const valueCtx = document.getElementById('valueChart').getContext('2d');
    valueChart = new Chart(valueCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Inventory Value',
                data: [],
                backgroundColor: '#2563EB',
                borderColor: '#1D4ED8',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Value by Category'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₱' + value;
                        }
                    }
                }
            }
        }
    });
}

function updateCategoryChart(categoryData) {
    if (!categoryData || Object.keys(categoryData).length === 0) {
        return;
    }
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    // Update category distribution chart
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = data;
    categoryChart.update();
    
    // Fetch inventory value data for the value chart
    fetchInventoryValueData();
}

async function fetchInventoryValueData() {
    try {
        const response = await fetch('/api/reports/inventory_value');
        const data = await response.json();
        
        if (response.ok) {
            // Update value chart
            valueChart.data.labels = data.labels;
            valueChart.data.datasets[0].data = data.data;
            valueChart.update();
        }
    } catch (error) {
        console.error('Error fetching inventory value data:', error);
    }
}

// Helper functions
function formatCurrency(value) {
    return '₱' + parseFloat(value).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
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
