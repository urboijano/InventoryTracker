// Transactions functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DataTable
    initTransactionsTable();
    
    // Load transactions
    loadTransactions();
});

let transactionsTable;

function initTransactionsTable() {
    transactionsTable = $('#transactions-table').DataTable({
        responsive: true,
        ordering: true,
        order: [[0, 'desc']], // Order by date, most recent first
        paging: true,
        info: true,
        language: {
            emptyTable: "No transactions found"
        }
    });
}

async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions');
        const data = await response.json();
        
        if (response.ok) {
            displayTransactions(data.transactions);
        } else {
            console.error('Error loading transactions:', data.error);
            showAlert('Error loading transactions', 'danger');
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
        showAlert('Error loading transactions', 'danger');
    }
}

function displayTransactions(transactions) {
    // Clear existing data
    transactionsTable.clear();
    
    // Add transactions to table
    transactions.forEach(transaction => {
        // Format date
        const date = new Date(transaction.timestamp);
        const formattedDate = date.toLocaleString();
        
        // Create transaction type badge
        const typeClass = transaction.type === 'in' ? 'transaction-in' : 'transaction-out';
        const typeLabel = transaction.type === 'in' ? 'Stock In' : 'Stock Out';
        
        // Add row to table
        transactionsTable.row.add([
            formattedDate,
            `<span class="${typeClass}">${typeLabel}</span>`,
            transaction.item_name,
            transaction.sku,
            transaction.quantity,
            transaction.previous_quantity,
            transaction.new_quantity,
            transaction.notes || '-'
        ]);
    });
    
    // Redraw table
    transactionsTable.draw();
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
