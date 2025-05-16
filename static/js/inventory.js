// Inventory Management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize DataTable
    initInventoryTable();
    
    // Load categories for filters and forms
    loadCategories();
    
    // Add event listeners
    document.getElementById('applyFilters').addEventListener('click', loadInventoryItems);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    document.getElementById('saveItemBtn').addEventListener('click', saveInventoryItem);
    document.getElementById('updateItemBtn').addEventListener('click', updateInventoryItem);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteInventoryItem);
    document.getElementById('saveTransactionBtn').addEventListener('click', saveTransaction);
    
    // Initial data load
    loadInventoryItems();
});

let inventoryTable;

function initInventoryTable() {
    inventoryTable = $('#inventory-table').DataTable({
        responsive: true,
        ordering: true,
        searching: false, // We'll use our own search
        paging: true,
        info: true,
        language: {
            emptyTable: "No inventory items found"
        }
    });
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        if (response.ok) {
            populateCategoryDropdowns(data.categories);
        } else {
            console.error('Error loading categories:', data.error);
            showAlert('Error loading categories', 'danger');
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
        showAlert('Error loading categories', 'danger');
    }
}

function populateCategoryDropdowns(categories) {
    const filterDropdown = document.getElementById('categoryFilter');
    const addDropdown = document.getElementById('itemCategory');
    const editDropdown = document.getElementById('editItemCategory');
    
    // Clear existing options (except first one for filter)
    filterDropdown.innerHTML = '<option value="All">All Categories</option>';
    addDropdown.innerHTML = '';
    editDropdown.innerHTML = '';
    
    // Add categories to dropdowns
    categories.forEach(category => {
        filterDropdown.innerHTML += `<option value="${category}">${category}</option>`;
        addDropdown.innerHTML += `<option value="${category}">${category}</option>`;
        editDropdown.innerHTML += `<option value="${category}">${category}</option>`;
    });
}

async function loadInventoryItems() {
    // Get filter values
    const search = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    const stockLevel = document.getElementById('stockFilter').value;
    
    // Build query parameters
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category !== 'All') params.append('category', category);
    if (stockLevel !== 'All') params.append('stock_level', stockLevel);
    
    try {
        const response = await fetch(`/api/inventory?${params.toString()}`);
        const data = await response.json();
        
        if (response.ok) {
            displayInventoryItems(data.items);
        } else {
            console.error('Error loading inventory:', data.error);
            showAlert('Error loading inventory items', 'danger');
        }
    } catch (error) {
        console.error('Error fetching inventory:', error);
        showAlert('Error loading inventory items', 'danger');
    }
}

function displayInventoryItems(items) {
    // Clear existing data
    inventoryTable.clear();
    
    // Add items to table
    items.forEach(item => {
        // Create stock level indicator
        let stockLevelClass = 'stock-level-normal';
        let stockLevelText = 'In Stock';
        
        if (item.quantity === 0) {
            stockLevelClass = 'stock-level-out';
            stockLevelText = 'Out of Stock';
        } else if (item.quantity <= 10) {
            stockLevelClass = 'stock-level-low';
            stockLevelText = 'Low Stock';
        }
        
        // Create action buttons
        const actions = `
            <button class="btn btn-sm btn-primary action-btn edit-btn" data-id="${item.id}">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-success action-btn transaction-btn" data-id="${item.id}" data-name="${item.name}">
                <i class="fas fa-exchange-alt"></i>
            </button>
            <button class="btn btn-sm btn-danger action-btn delete-btn" data-id="${item.id}" data-name="${item.name}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Add row to table
        inventoryTable.row.add([
            item.name,
            item.sku,
            item.category,
            item.description,
            formatCurrency(item.price),
            `<span class="stock-level ${stockLevelClass}">${item.quantity} (${stockLevelText})</span>`,
            actions
        ]);
    });
    
    // Redraw table
    inventoryTable.draw();
    
    // Add event listeners to action buttons
    addActionButtonListeners();
}

function addActionButtonListeners() {
    // Edit button listeners
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            loadItemForEdit(itemId);
        });
    });
    
    // Delete button listeners
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            const itemName = this.getAttribute('data-name');
            
            // Set values in delete confirmation modal
            document.getElementById('deleteItemId').value = itemId;
            document.getElementById('deleteItemName').textContent = itemName;
            
            // Show modal
            new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
        });
    });
    
    // Transaction button listeners
    document.querySelectorAll('.transaction-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            const itemName = this.getAttribute('data-name');
            
            // Set values in transaction modal
            document.getElementById('transactionItemId').value = itemId;
            document.getElementById('transactionModalLabel').textContent = `Add Transaction for ${itemName}`;
            
            // Reset form
            document.getElementById('transactionForm').reset();
            
            // Show modal
            new bootstrap.Modal(document.getElementById('transactionModal')).show();
        });
    });
}

async function saveInventoryItem() {
    // Get form values
    const name = document.getElementById('itemName').value;
    const sku = document.getElementById('itemSKU').value;
    const description = document.getElementById('itemDescription').value;
    const category = document.getElementById('itemCategory').value;
    const price = document.getElementById('itemPrice').value;
    const quantity = document.getElementById('itemQuantity').value;
    
    // Validate form
    if (!name || !sku || !category || !price || !quantity) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Prepare data
    const itemData = {
        name,
        sku,
        description,
        category,
        price,
        quantity
    };
    
    try {
        // Get CSRF token from meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        const response = await fetch('/api/inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(itemData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addItemModal'));
            modal.hide();
            
            // Reset form
            document.getElementById('addItemForm').reset();
            
            // Reload inventory items
            loadInventoryItems();
            
            // Show success message
            showAlert('Inventory item added successfully', 'success');
        } else {
            console.error('Error adding item:', data.error);
            showAlert(`Error adding item: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving item:', error);
        showAlert('Error adding inventory item', 'danger');
    }
}

async function loadItemForEdit(itemId) {
    try {
        const response = await fetch(`/api/inventory/${itemId}`);
        const data = await response.json();
        
        if (response.ok) {
            // Populate edit form
            const item = data.item;
            document.getElementById('editItemId').value = item.id;
            document.getElementById('editItemName').value = item.name;
            document.getElementById('editItemSKU').value = item.sku;
            document.getElementById('editItemDescription').value = item.description;
            document.getElementById('editItemCategory').value = item.category;
            document.getElementById('editItemPrice').value = item.price;
            document.getElementById('editItemQuantity').value = item.quantity;
            
            // Show modal
            new bootstrap.Modal(document.getElementById('editItemModal')).show();
        } else {
            console.error('Error loading item:', data.error);
            showAlert(`Error loading item: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error fetching item:', error);
        showAlert('Error loading item details', 'danger');
    }
}

async function updateInventoryItem() {
    // Get form values
    const itemId = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value;
    const sku = document.getElementById('editItemSKU').value;
    const description = document.getElementById('editItemDescription').value;
    const category = document.getElementById('editItemCategory').value;
    const price = document.getElementById('editItemPrice').value;
    const quantity = document.getElementById('editItemQuantity').value;
    
    // Validate form
    if (!name || !sku || !category || !price || !quantity) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Prepare data
    const itemData = {
        name,
        sku,
        description,
        category,
        price,
        quantity
    };
    
    try {
        // Get CSRF token from meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        const response = await fetch(`/api/inventory/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(itemData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
            modal.hide();
            
            // Reload inventory items
            loadInventoryItems();
            
            // Show success message
            showAlert('Inventory item updated successfully', 'success');
        } else {
            console.error('Error updating item:', data.error);
            showAlert(`Error updating item: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error updating item:', error);
        showAlert('Error updating inventory item', 'danger');
    }
}

async function deleteInventoryItem() {
    const itemId = document.getElementById('deleteItemId').value;
    
    try {
        // Get CSRF token from meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        const response = await fetch(`/api/inventory/${itemId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrfToken
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
            modal.hide();
            
            // Reload inventory items
            loadInventoryItems();
            
            // Show success message
            showAlert('Inventory item deleted successfully', 'success');
        } else {
            console.error('Error deleting item:', data.error);
            showAlert(`Error deleting item: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showAlert('Error deleting inventory item', 'danger');
    }
}

async function saveTransaction() {
    // Get form values
    const itemId = document.getElementById('transactionItemId').value;
    const type = document.getElementById('transactionType').value;
    const quantity = document.getElementById('transactionQuantity').value;
    const notes = document.getElementById('transactionNotes').value;
    
    // Validate form
    if (!itemId || !type || !quantity || quantity <= 0) {
        showAlert('Please enter a valid quantity', 'warning');
        return;
    }
    
    // Prepare data
    const transactionData = {
        item_id: itemId,
        type,
        quantity,
        notes
    };
    
    try {
        // Get CSRF token from meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(transactionData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('transactionModal'));
            modal.hide();
            
            // Reload inventory items
            loadInventoryItems();
            
            // Show success message
            showAlert('Transaction added successfully', 'success');
        } else {
            console.error('Error adding transaction:', data.error);
            showAlert(`Error: ${data.error}`, 'danger');
        }
    } catch (error) {
        console.error('Error saving transaction:', error);
        showAlert('Error adding transaction', 'danger');
    }
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = 'All';
    document.getElementById('stockFilter').value = 'All';
    
    loadInventoryItems();
}

// Helper functions
function formatCurrency(value) {
    return '₱' + parseFloat(value).toFixed(2);
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
