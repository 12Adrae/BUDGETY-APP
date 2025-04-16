// Add this at the beginning of your dashboard.js file for global access
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '/';
        return;
    }

    // Set user name in profile section
    const profileNameElement = document.querySelector('.profile-name');
    if (profileNameElement) {
        profileNameElement.textContent = user.full_name;
    }

    // Initialize the dashboard
    initializeDashboard();

    // Setup event listeners
    setupEventListeners();
});

// Function to setup all event listeners
function setupEventListeners() {
    // Logout button
    document.querySelector('.logout-button').addEventListener('click', logout);

    // Add Budget Button
    document.getElementById('addBudgetBtn').addEventListener('click', showBudgetModal);

    // Export Report Button
    document.getElementById('exportReportBtn').addEventListener('click', exportBudgetReport);

    // Add Category Button in the budget form
    document.getElementById('addCategoryBtn').addEventListener('click', addCategoryAllocation);
    
    // Close modal buttons
    document.querySelectorAll('.close, .close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Form submissions
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', saveBudgetData);
    }
    
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', saveExpense);
    }
    
    // "Add Category" button in the grid
    setupCategoryGridButtons();
}

// Function to update the dashboard data
function initializeDashboard() {
    fetch('/api/budget', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch budget data');
        }
        return response.json();
    })
    .then(data => {
        updateDashboardWithBudgetData(data);
    })
    .catch(error => {
        console.error('Error fetching budget data:', error);
    });
}

// Update dashboard with fetched data
function updateDashboardWithBudgetData(data) {
    // If there's no budget data yet, display default values
    if (!data.budget) {
        document.getElementById('totalBudget').textContent = '0.00';
        document.getElementById('totalExpenses').textContent = '0.00';
        document.getElementById('remainingBudget').textContent = '0.00';
        document.getElementById('expensePercentage').textContent = '0';
        
        // Clear categories grid and add a message
        updateCategoriesGrid([]);
        return;
    }
    
    // Update budget summary information
    const totalBudget = parseFloat(data.budget.totalBudget);
    document.getElementById('totalBudget').textContent = totalBudget.toFixed(2);
    
    // Calculate total expenses
    let totalExpenses = 0;
    if (data.categories && data.categories.length > 0) {
        data.categories.forEach(category => {
            totalExpenses += parseFloat(category.spent);
        });
    }
    
    document.getElementById('totalExpenses').textContent = totalExpenses.toFixed(2);
    
    // Calculate remaining budget
    const remainingBudget = totalBudget - totalExpenses;
    document.getElementById('remainingBudget').textContent = remainingBudget.toFixed(2);
    
    // Calculate percentage of budget spent
    const expensePercentage = totalBudget > 0 ? Math.round((totalExpenses / totalBudget) * 100) : 0;
    document.getElementById('expensePercentage').textContent = expensePercentage;
    
    // Update categories grid
    updateCategoriesGrid(data.categories);
}

// Update categories grid with data and action buttons
function updateCategoriesGrid(categories) {
    const categoriesGrid = document.querySelector('.categories-grid');
    if (!categoriesGrid) return;
    
    let gridHTML = '';
    
    // Add each category to the grid
    if (categories && categories.length > 0) {
        categories.forEach(category => {
            const percentage = category.allocated > 0 ? (category.spent / category.allocated) * 100 : 0;
            let progressColor = '';
            
            // Set color based on percentage spent
            if (percentage < 50) {
                progressColor = 'green-progress';
            } else if (percentage < 75) {
                progressColor = 'yellow-progress';
            } else {
                progressColor = 'red-progress';
            }
            
            gridHTML += `
                <div class="category-item" data-category-id="${category.id}" data-category-name="${category.name}">
                    <div class="category-actions">
                        <button class="btn-action btn-expense" title="Ajouter une dépense" onclick="event.stopPropagation(); showAddExpenseModal('${category.name}')">
                            <i class="fas fa-plus-circle"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Supprimer la catégorie" onclick="event.stopPropagation(); deleteCategory(${category.id}, '${category.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="category-header">
                        <span class="category-icon"><i class="fas fa-folder"></i></span>
                        <h4>${category.name}</h4>
                    </div>
                    <div class="category-progress">
                        <div class="progress-bar">
                            <div class="progress-fill ${progressColor}" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="category-amounts">
                            <span class="spent">€${category.spent.toFixed(2)}</span>
                            <span class="allocated">€${category.allocated.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    // Add the "Add Category" item
    gridHTML += `
        <div class="category-item add-category-item">
            <div class="category-header">
                <span class="category-icon"><i class="fas fa-plus"></i></span>
                <h4>Ajouter Catégorie</h4>
            </div>
            <div class="category-add">
                <button class="btn btn-outline btn-block">Ajouter Nouveau</button>
            </div>
        </div>
    `;
    
    categoriesGrid.innerHTML = gridHTML;
    
    // Set up event handlers for the new buttons
    setupCategoryGridButtons();
}

// Setup click handlers for the grid buttons
function setupCategoryGridButtons() {
    // "Add Category" button
    const addCategoryButton = document.querySelector('.add-category-item .btn-outline');
    if (addCategoryButton) {
        addCategoryButton.addEventListener('click', showBudgetModal);
    }
}

// Delete a category
function deleteCategory(categoryId, categoryName) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" et toutes ses dépenses associées ?`)) {
        fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete category');
            }
            return response.json();
        })
        .then(data => {
            // Refresh dashboard data
            initializeDashboard();
            alert('Catégorie supprimée avec succès');
        })
        .catch(error => {
            console.error('Error deleting category:', error);
            alert('Erreur lors de la suppression de la catégorie.');
        });
    }
}

// Show add expense modal
function showAddExpenseModal(categoryName) {
    const expenseModal = document.getElementById('expenseModal');
    const expenseCategory = document.getElementById('expenseCategory');
    const expenseDate = document.getElementById('expenseDate');
    
    // Set category name and today's date
    if (expenseCategory) expenseCategory.value = categoryName;
    if (expenseDate) expenseDate.valueAsDate = new Date();
    
    // Clear previous values
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDescription').value = '';
    
    // Show the modal
    if (expenseModal) expenseModal.style.display = 'block';
}

// Save expense to the server
function saveExpense(e) {
    e.preventDefault();
    
    const categoryName = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const description = document.getElementById('expenseDescription').value;
    const date = document.getElementById('expenseDate').value;
    
    // Send data to the server
    fetch('/api/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            category: categoryName,
            amount: amount,
            description: description,
            date: date
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save expense');
        }
        return response.json();
    })
    .then(data => {
        // Close the modal
        document.getElementById('expenseModal').style.display = 'none';
        
        // Refresh dashboard data
        initializeDashboard();
        
        // Show success message
        alert('Dépense ajoutée avec succès!');
    })
    .catch(error => {
        console.error('Error saving expense:', error);
        alert('Erreur lors de l\'enregistrement de la dépense.');
    });
}

// Show budget modal
function showBudgetModal() {
    // Set today's date as the default start date
    const today = new Date();
    document.getElementById('budgetStartDate').valueAsDate = today;
    
    // Set end date to one month from today
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('budgetEndDate').valueAsDate = nextMonth;
    
    // Clear previous allocations
    document.getElementById('categoryAllocations').innerHTML = '';
    
    // Fetch existing budget data to pre-populate the form
    fetch('/api/budget', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.budget) {
            // Pre-fill the form with existing budget data
            document.getElementById('totalBudgetInput').value = data.budget.totalBudget;
            document.getElementById('budgetStartDate').value = data.budget.startDate;
            document.getElementById('budgetEndDate').value = data.budget.endDate;
            
            // Add existing categories
            if (data.categories && data.categories.length > 0) {
                data.categories.forEach(category => {
                    addCategoryAllocation(category.name, category.allocated);
                });
            } else {
                // Add at least one empty category field
                addCategoryAllocation();
            }
        } else {
            // Add initial empty category field if no budget exists
            addCategoryAllocation();
        }
    })
    .catch(error => {
        console.error('Error fetching budget data:', error);
        // Add initial empty category field even if fetch fails
        addCategoryAllocation();
    });
    
    // Show the modal
    document.getElementById('budgetModal').style.display = 'block';
}

// Add a new category allocation field to the budget form
// Add a new category allocation field to the budget form
function addCategoryAllocation(name = '', amount = '') {
    // Check if name is an event object and set it to empty string if it is
    if (name && typeof name === 'object' && name.type === 'click') {
        name = '';
        amount = '';
    }
    
    const container = document.getElementById('categoryAllocations');
    if (!container) return;
    
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category-allocation';
    categoryDiv.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <input type="text" placeholder="Nom de la catégorie" class="category-name" value="${name}" required>
            </div>
            <div class="form-group">
                <input type="number" placeholder="Montant (€)" class="category-amount" min="0" step="0.01" value="${amount}" required>
            </div>
            <button type="button" class="btn-remove-category">
                Remove
            </button>
        <br>
        <hr style="border: none; height: 1px; background-color:rgba(133, 133, 133, 0.7); margin: 10px 0;">
        <br>
        </div>
    `;
    
    // Add event listener to remove button
    categoryDiv.querySelector('.btn-remove-category').addEventListener('click', function() {
        container.removeChild(categoryDiv);
    });
    
    container.appendChild(categoryDiv);
}

// Save budget data to the server
function saveBudgetData(e) {
    e.preventDefault();
    
    const totalBudget = parseFloat(document.getElementById('totalBudgetInput').value);
    const startDate = document.getElementById('budgetStartDate').value;
    const endDate = document.getElementById('budgetEndDate').value;
    
    // Collect category allocations
    const categoryElements = document.querySelectorAll('.category-allocation');
    const categories = [];
    
    categoryElements.forEach(element => {
        const nameInput = element.querySelector('.category-name');
        const amountInput = element.querySelector('.category-amount');
        
        if (nameInput.value && amountInput.value) {
            categories.push({
                name: nameInput.value,
                allocated: parseFloat(amountInput.value),
                spent: 0 // New categories start with 0 spent
            });
        }
    });
    
    // Send data to the server
    fetch('/api/budget', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            totalBudget: totalBudget,
            startDate: startDate,
            endDate: endDate,
            categories: categories
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to save budget');
        }
        return response.json();
    })
    .then(data => {
        // Close the modal
        document.getElementById('budgetModal').style.display = 'none';
        
        // Refresh dashboard data
        initializeDashboard();
        
        // Show success message
        alert('Budget enregistré avec succès!');
    })
    .catch(error => {
        console.error('Error saving budget:', error);
        alert('Erreur lors de l\'enregistrement du budget.');
    });
}

// Export budget report as PDF
function exportBudgetReport() {
    // Use jsPDF (which you've already included in your HTML)
    const { jsPDF } = window.jspdf;
    
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(22);
    doc.text('Rapport Budget Étudiant', 105, 20, { align: 'center' });
    
    // Add user info
    const user = JSON.parse(localStorage.getItem('user'));
    doc.setFontSize(14);
    doc.text(`Étudiant: ${user.full_name}`, 20, 40);
    
    // Add date
    const today = new Date();
    doc.text(`Date d'exportation: ${today.toLocaleDateString()}`, 20, 50);
    
    // Add budget summary
    doc.setFontSize(16);
    doc.text('Résumé du Budget', 20, 70);
    
    const totalBudget = document.getElementById('totalBudget').textContent;
    const totalExpenses = document.getElementById('totalExpenses').textContent;
    const remainingBudget = document.getElementById('remainingBudget').textContent;
    const expensePercentage = document.getElementById('expensePercentage').textContent;
    
    doc.setFontSize(12);
    doc.text(`Budget Total: €${totalBudget}`, 30, 85);
    doc.text(`Dépenses Totales: €${totalExpenses} (${expensePercentage}%)`, 30, 95);
    doc.text(`Budget Restant: €${remainingBudget}`, 30, 105);
    
    // Add categories
    doc.setFontSize(16);
    doc.text('Catégories de Budget', 20, 130);
    
    // Create table data for categories
    const categoryRows = [];
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach(item => {
        // Skip the "Add Category" item
        if (item.classList.contains('add-category-item')) {
            return;
        }
        
        const name = item.querySelector('h4').textContent;
        const spent = item.querySelector('.spent').textContent;
        const allocated = item.querySelector('.allocated').textContent;
        
        // Calculate percentage
        const spentValue = parseFloat(spent.replace('€', ''));
        const allocatedValue = parseFloat(allocated.replace('€', ''));
        const usedPercentage = allocatedValue > 0 ? (spentValue / allocatedValue) * 100 : 0;
        
        categoryRows.push([
            name,
            spent,
            allocated,
            `${Math.round(usedPercentage)}%`
        ]);
    });
    
    // Add the category table if there are categories
    if (categoryRows.length > 0) {
        doc.autoTable({
            startY: 140,
            head: [['Catégorie', 'Dépensé', 'Alloué', 'Utilisé']],
            body: categoryRows
        });
    } else {
        doc.text('Aucune catégorie définie.', 30, 145);
    }
    
    // Add tips section
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 160;
    
    doc.setFontSize(16);
    doc.text('Conseils Budgétaires', 20, finalY);
    
    doc.setFontSize(12);
    doc.text('• Établir un Budget Réaliste', 30, finalY + 15);
    doc.text('• Économiser Méthodiquement (10% des revenus)', 30, finalY + 25);
    doc.text('• Optimiser les Frais Alimentaires', 30, finalY + 35);
    
    // Add footer
    doc.setFontSize(10);
    doc.text('Généré par Budgety - Votre outil de gestion de budget étudiant', 105, 285, { align: 'center' });
    
    // Save the PDF
    doc.save('budget-report.pdf');
}

// Logout function
function logout() {
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(() => {
        localStorage.removeItem('user');
        window.location.href = '/';
    })
    .catch(error => {
        console.error('Error logging out:', error);
    });
}