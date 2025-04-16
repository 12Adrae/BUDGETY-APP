// Budget Management JavaScript - Complete Updated Version
const API_BASE_URL = "http://127.0.0.1:5000/api";
// Add this near the top of your frontend.js file
document.addEventListener('DOMContentLoaded', function() {
    // Check if page requires authentication
    const requiresAuth = document.body.getAttribute('data-auth-required') === 'true';
    
    if (requiresAuth) {
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            // Redirect to login page
            window.location.href = 'index.html';
            return;
        }
        
        // Update UI with user info if needed
        const profileName = document.querySelector('.profile-name');
        if (profileName && user.full_name) {
            profileName.textContent = user.full_name;
        }
    }
    
    // Handle logout button
    const logoutBtn = document.querySelector('.logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            fetch('http://127.0.0.1:5000/api/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => {
                // Clear user data and redirect to login
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            })
            .catch(error => {
                console.error('Logout error:', error);
            });
        });
    }
});
// DOM Elements - Fixed to match HTML
const addBudgetBtn = document.getElementById('addBudgetBtn');

// Function to get elements or create references once the DOM is fully loaded
function getElements() {
    return {
        totalBudgetElement: document.getElementById('totalBudget'),
        totalExpensesElement: document.getElementById('totalExpenses'),
        remainingBudgetElement: document.getElementById('remainingBudget'),
        expensePercentageElement: document.getElementById('expensePercentage'),
        daysLeftElement: document.getElementById('daysLeft')
    };
}

// Budget Modal Elements
let budgetModal;

// Ensure we don't duplicate the modal
function ensureBudgetModal() {
    budgetModal = document.getElementById('budgetModal');
    if (!budgetModal) {
        budgetModal = document.createElement('div');
        budgetModal.id = 'budgetModal';
        budgetModal.className = 'modal';
        document.body.appendChild(budgetModal);
    }
}

// State Management
let budgetData = {
    totalBudget: 0,
    totalExpenses: 0,
    categories: [
        { name: 'Alimentation', allocated: 0, spent: 0 },
        { name: 'Logement', allocated: 0, spent: 0 },
        { name: 'Éducation', allocated: 0, spent: 0 },
        { name: 'Transport', allocated: 0, spent: 0 },
        { name: 'Divertissement', allocated: 0, spent: 0 }
    ],
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 30)) // 30 days from now
};

// Load budget data from the server
async function loadBudgetData() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(`${API_BASE_URL}/budget`, {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Loaded budget data:', data);
        
        if (data.budget) {
            budgetData.totalBudget = parseFloat(data.budget.totalBudget) || 0;
            
            if (data.budget.startDate) {
                budgetData.startDate = new Date(data.budget.startDate);
            }
            
            if (data.budget.endDate) {
                budgetData.endDate = new Date(data.budget.endDate);
            }
        }
        if (data.categories && Array.isArray(data.categories)) {
            budgetData.categories = data.categories.map(cat => ({
                name: cat.name,
                allocated: cat.allocated || 0,
                spent: cat.spent || 0,
                id: cat.id
            }));
        }
        
        // Update the UI with the loaded data
        updateBudgetDisplay();
        
    } catch (error) {
        console.error('Error loading budget data:', error);
        
        // Show a more user-friendly error message based on the error type
        if (error.name === 'AbortError') {
            showOfflineAlert('Le serveur ne répond pas. Vérifiez que le backend est en cours d\'exécution.');
        } else if (error.message.includes('Failed to fetch')) {
            showOfflineAlert('Impossible de se connecter au serveur. Vérifiez que le backend est en cours d\'exécution sur http://127.0.0.1:5000');
        } else {
            showOfflineAlert(`Erreur lors du chargement des données: ${error.message}`);
        }
        
        // Load demo data in offline mode
        loadDemoData();
    }
}

// Add this function to show a persistent alert about offline status
function showOfflineAlert(message) {
    // Remove any existing alert
    const existingAlert = document.getElementById('offline-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert
    const alert = document.createElement('div');
    alert.id = 'offline-alert';
    alert.className = 'alert alert-warning';
    alert.style.position = 'fixed';
    alert.style.top = '10px';
    alert.style.left = '50%';
    alert.style.transform = 'translateX(-50%)';
    alert.style.zIndex = '9999';
    alert.style.padding = '15px 20px';
    alert.style.borderRadius = '5px';
    alert.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    alert.style.display = 'flex';
    alert.style.alignItems = 'center';
    alert.style.gap = '10px';
    
    alert.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
        <button class="close-alert" style="background:none; border:none; cursor:pointer; margin-left:10px;">×</button>
    `;
    
    document.body.appendChild(alert);
    
    // Add event listener to close button
    const closeBtn = alert.querySelector('.close-alert');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            alert.remove();
        });
    }
}

// Add this function to load demo data when in offline mode
function loadDemoData() {
    console.log('Loading demo data for offline mode');
    
    budgetData = {
        totalBudget: 1000,
        totalExpenses: 650,
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        categories: [
            { name: 'Alimentation', allocated: 300, spent: 210, id: 1 },
            { name: 'Logement', allocated: 400, spent: 400, id: 2 },
            { name: 'Transport', allocated: 150, spent: 40, id: 3 },
            { name: 'Divertissement', allocated: 100, spent: 0, id: 4 },
            { name: 'Éducation', allocated: 50, spent: 0, id: 5 }
        ]
    };
    
    // Update the UI with demo data
    updateBudgetDisplay();
}
// Initialize the dashboard
function initializeDashboard() {
    // Create the budget modal
    ensureBudgetModal();
    createBudgetModal();
    
    // Update the UI with initial data
    updateBudgetDisplay();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log("Dashboard initialized");
}

// Create the Budget Modal
function createBudgetModal() {
    budgetModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Définir Votre Budget Mensuel</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="budgetForm">
                    <div class="form-group">
                        <label for="totalBudgetInput">Budget Mensuel Total (€)</label>
                        <input type="number" id="totalBudgetInput" placeholder="0.00" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="budgetStartDate">Date de Début</label>
                        <input type="date" id="budgetStartDate" required>
                    </div>
                    <div class="form-group">
                        <label for="budgetEndDate">Date de Fin</label>
                        <input type="date" id="budgetEndDate" required>
                    </div>
                    <div class="category-budget-section">
                        <h4>Allouer Votre Budget (Optionnel)</h4>
                        <div id="categoryAllocations">
                            <!-- Categories will be added here dynamically -->
                        </div>
                        <button type="button" id="addCategoryBtn" class="btn btn-outline btn-sm">
                            <i class="fas fa-plus"></i> Ajouter Catégorie
                        </button>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">Annuler</button>
                        <button type="submit" class="btn btn-success">Enregistrer Budget</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    console.log("Budget modal created");
}

// Set up event listeners
function setupEventListeners() {
    // Open budget modal when "Add Budget" button is clicked
    if (addBudgetBtn) {
        addBudgetBtn.addEventListener('click', () => {
            console.log("Add Budget button clicked");
            openBudgetModal();
        });
    } else {
        console.error("Add Budget button not found");
    }
    
    // Also add event listener to any "Add Category" buttons in the UI
    const addCategoryElements = document.querySelectorAll('.category-add button, .add-category');
    addCategoryElements.forEach(button => {
        button.addEventListener('click', () => {
            console.log("Add Category button clicked");
            openBudgetModal();
        });
    });
    
    // Close modal when clicking the X or Cancel button
    const closeButtons = document.querySelectorAll('#budgetModal .close, #budgetModal .close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            budgetModal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === budgetModal) {
            budgetModal.style.display = 'none';
        }
    });
    
    // Handle budget form submission
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Budget form submitted");
            saveBudget();
        });
    } else {
        console.error("Budget form not found");
    }
    
    // Add Category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', addNewCategoryInput);
    }
    
    console.log("Event listeners set up");
}

// Open the budget modal and pre-fill with existing data
function openBudgetModal() {
    // Make sure the modal exists in the DOM
    ensureBudgetModal();
    
    const budgetStartDateInput = document.getElementById('budgetStartDate');
    const budgetEndDateInput = document.getElementById('budgetEndDate');
    const totalBudgetInput = document.getElementById('totalBudgetInput');
    
    if (!budgetStartDateInput || !budgetEndDateInput || !totalBudgetInput) {
        console.error("Budget modal inputs not found");
        return;
    }
    
    // Pre-fill with existing data if available
    totalBudgetInput.value = budgetData.totalBudget > 0 ? budgetData.totalBudget : '';
    
    // Set today as default start date if not set
    if (!budgetData.startDate) {
        budgetData.startDate = new Date();
    }
    
    // Format dates for inputs
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };
    
    budgetStartDateInput.value = formatDate(new Date(budgetData.startDate));
    budgetEndDateInput.value = formatDate(new Date(budgetData.endDate));
    
    // Generate category allocation inputs
    generateCategoryInputs();
    
    // Show the modal
    budgetModal.style.display = 'block';
    
    console.log("Budget modal opened");
}

// Generate category allocation inputs
function generateCategoryInputs() {
    const categoryAllocations = document.getElementById('categoryAllocations');
    if (!categoryAllocations) {
        console.error("Category allocations container not found");
        return;
    }
    
    categoryAllocations.innerHTML = '';
    
    budgetData.categories.forEach((category, index) => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-allocation-item';
        categoryElement.innerHTML = `
            <div class="form-row">
                <div class="form-group category-name">
                    <label>Nom de Catégorie</label>
                    <input type="text" class="category-name-input" value="${category.name}" required>
                </div>
                <div class="form-group category-amount">
                    <label>Montant Alloué (€)</label>
                    <input type="number" class="category-amount-input" value="${category.allocated}" min="0" step="0.01" required>
                </div>
                <button type="button" class="remove-category" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        categoryAllocations.appendChild(categoryElement);
    });
    
    // Add event listeners to remove buttons
    const removeButtons = document.querySelectorAll('.remove-category');
    removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            budgetData.categories.splice(index, 1);
            generateCategoryInputs();
        });
    });
}

// Add a new category input field
function addNewCategoryInput() {
    budgetData.categories.push({ name: '', allocated: 0, spent: 0 });
    generateCategoryInputs();
}

// Save budget data from the form
function saveBudget() {
    const totalBudgetInput = document.getElementById('totalBudgetInput');
    const budgetStartDateInput = document.getElementById('budgetStartDate');
    const budgetEndDateInput = document.getElementById('budgetEndDate');
    
    if (!totalBudgetInput || !budgetStartDateInput || !budgetEndDateInput) {
        console.error("Budget form inputs not found");
        return;
    }
    
    // Update budget total
    budgetData.totalBudget = parseFloat(totalBudgetInput.value) || 0;
    
    // Update dates
    budgetData.startDate = new Date(budgetStartDateInput.value);
    budgetData.endDate = new Date(budgetEndDateInput.value);
    
    // Update categories
    const categoryNameInputs = document.querySelectorAll('.category-name-input');
    const categoryAmountInputs = document.querySelectorAll('.category-amount-input');
    
    // Create new categories array
    const newCategories = [];
    
    for (let i = 0; i < categoryNameInputs.length; i++) {
        const name = categoryNameInputs[i].value;
        // Parse the allocated amount, default to 0 if NaN
        const allocated = parseFloat(categoryAmountInputs[i].value) || 0;
        
        // Find existing category to preserve spent amount
        const existingCategory = budgetData.categories.find(cat => cat.name === name);
        const spent = existingCategory ? existingCategory.spent : 0;
        
        newCategories.push({ name, allocated, spent });
    }
    
    // Use the new categories array
    budgetData.categories = newCategories;
    
    // Log the updated data for debugging
    console.log("Budget data saved:", JSON.stringify(budgetData, null, 2));
    
    // Try to save to the server
    saveBudgetToServer(budgetData).catch(error => {
        console.error('Error saving budget data:', error);
        showOfflineAlert('Impossible de sauvegarder les données sur le serveur. Changements sauvegardés localement uniquement.');
    });
    
    // Update the UI
    updateBudgetDisplay();
    
    // Close the modal
    budgetModal.style.display = 'none';
    
    // Show success message
    alert('Budget a été mis à jour avec succès!');
}

// Function to save budget data to the server
async function saveBudgetToServer(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/budget`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Budget saved to server:', result);
        return result;
    } catch (error) {
        console.error('Error saving to server:', error);
        // Re-throw to allow the calling function to handle it
        throw error;
    }
}

// Update the budget display with current data
function updateBudgetDisplay() {
    // Get the latest references to DOM elements
    const elements = getElements();
    
    // Check if elements exist before updating
    if (!elements.totalBudgetElement) {
        console.error("Total budget element not found");
        return;
    }
    
    // Ensure numeric values by explicitly converting to numbers
    const totalBudget = parseFloat(budgetData.totalBudget) || 0;
    
    // Calculate total expenses from categories - ensure numeric values
    budgetData.totalExpenses = budgetData.categories.reduce((total, category) => 
        total + (parseFloat(category.spent) || 0), 0);
    
    // Update overview numbers
    elements.totalBudgetElement.textContent = totalBudget.toFixed(2);
    elements.totalExpensesElement.textContent = budgetData.totalExpenses.toFixed(2);
    
    const remainingBudget = totalBudget - budgetData.totalExpenses;
    elements.remainingBudgetElement.textContent = remainingBudget.toFixed(2);
    
    // Calculate and update expense percentage
    const expensePercentage = totalBudget > 0 
        ? Math.round((budgetData.totalExpenses / totalBudget) * 100) 
        : 0;
    elements.expensePercentageElement.textContent = expensePercentage;
    
    // Calculate days left in budget period
    const today = new Date();
    const endDate = new Date(budgetData.endDate);
    const daysLeft = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
    elements.daysLeftElement.textContent = daysLeft;
    
    console.log("Budget display updated");
    
    // Update category displays
    updateCategoryDisplay();
}

// Update the category display in the UI
function updateCategoryDisplay() {
    const categoriesGrid = document.querySelector('.categories-grid');
    if (!categoriesGrid) {
        console.error("Categories grid not found");
        return;
    }
    
    // Clear the existing content
    categoriesGrid.innerHTML = '';
    
    // Debug log to check categories
    console.log("Categories before display update:", JSON.stringify(budgetData.categories, null, 2));
    
    // Add updated category items
    budgetData.categories.forEach(category => {
        // Ensure values are numbers, default to 0 if invalid
        const allocated = parseFloat(category.allocated) || 0;
        const spent = parseFloat(category.spent) || 0;
        
        const percentage = allocated > 0 
            ? Math.round((spent / allocated) * 100) 
            : 0;
        
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        
        // Determine color based on percentage
        let colorClass = 'success';
        if (percentage > 80) {
            colorClass = 'danger';
        } else if (percentage > 60) {
            colorClass = 'warning';
        }
        
        // Get appropriate icon based on category name
        let iconClass = 'fa-folder';
        if (category.name.toLowerCase().includes('aliment')) {
            iconClass = 'fa-utensils';
        } else if (category.name.toLowerCase().includes('logement') || category.name.toLowerCase().includes('maison')) {
            iconClass = 'fa-home';
        } else if (category.name.toLowerCase().includes('éducat') || category.name.toLowerCase().includes('educat')) {
            iconClass = 'fa-graduation-cap';
        } else if (category.name.toLowerCase().includes('transport')) {
            iconClass = 'fa-bus';
        } else if (category.name.toLowerCase().includes('divert') || category.name.toLowerCase().includes('entertain')) {
            iconClass = 'fa-film';
        }
        
        categoryItem.innerHTML = `
            <div class="category-header">
                <span class="category-icon"><i class="fas ${iconClass}"></i></span>
                <h4>${category.name}</h4>
            </div>
            <div class="category-progress">
                <div class="progress-bar">
                    <div class="progress-fill ${colorClass}" style="width: ${percentage}%"></div>
                </div>
                <div class="category-amounts">
                    <span class="spent">€${spent.toFixed(2)}</span>
                    <span class="allocated">€${allocated.toFixed(2)}</span>
                </div>
            </div>
            <div class="category-actions">
                <button class="btn btn-sm add-expense-btn" data-category="${category.name}">
                    <i class="fas fa-plus-circle"></i> Ajouter Dépense
                </button>
            </div>
        `;
        
        categoriesGrid.appendChild(categoryItem);
        
        // Add event listener for the expense button
        const addExpenseBtn = categoryItem.querySelector('.add-expense-btn');
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                openExpenseModal(category.name);
            });
        }
    });
    // Expense Modal Variables
let expenseModal;
let currentCategory;

// Create expense modal
function createExpenseModal() {
    // Check if modal already exists
    expenseModal = document.getElementById('expenseModal');
    if (expenseModal) {
        document.body.removeChild(expenseModal);
    }
    
    // Create new modal
    expenseModal = document.createElement('div');
    expenseModal.id = 'expenseModal';
    expenseModal.className = 'modal';
    
    expenseModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Ajouter une Dépense</h3>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <form id="expenseForm">
                    <div class="form-group">
                        <label for="expenseCategory">Catégorie</label>
                        <input type="text" id="expenseCategory" readonly>
                    </div>
                    <div class="form-group">
                        <label for="expenseAmount">Montant (€)</label>
                        <input type="number" id="expenseAmount" placeholder="0.00" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="expenseDescription">Description (optionnelle)</label>
                        <input type="text" id="expenseDescription" placeholder="Description de la dépense">
                    </div>
                    <div class="form-group">
                        <label for="expenseDate">Date</label>
                        <input type="date" id="expenseDate" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary close-modal">Annuler</button>
                        <button type="submit" class="btn btn-success">Enregistrer Dépense</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(expenseModal);
    
    // Add event listeners
    const closeButtons = expenseModal.querySelectorAll('.close, .close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            expenseModal.style.display = 'none';
        });
    });
    // Add CSS for the expense modal and buttons
function addExpenseStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Category action buttons */
        .category-actions {
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
        }
        
        .add-expense-btn {
            font-size: 0.8rem;
            padding: 5px 10px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .add-expense-btn:hover {
            background-color: #0069d9;
        }
        
        /* Expense modal styles */
        #expenseModal .modal-content {
            max-width: 500px;
        }
        
        #expenseForm .form-group {
            margin-bottom: 15px;
        }
        
        #expenseCategory {
            background-color: #f8f9fa;
            cursor: not-allowed;
        }
    `;
    
    document.head.appendChild(styleElement);
    console.log("Expense styles added");
}
    // Close when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === expenseModal) {
            expenseModal.style.display = 'none';
        }
    });
    
    // Form submission
    const expenseForm = document.getElementById('expenseForm');
    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveExpense();
    });
    
    console.log("Expense modal created");
}

// Open expense modal
function openExpenseModal(categoryName) {
    // Make sure we have a modal
    if (!expenseModal) {
        createExpenseModal();
    }
    
    // Set current category
    currentCategory = categoryName;
    
    // Fill form fields
    const categoryInput = document.getElementById('expenseCategory');
    const dateInput = document.getElementById('expenseDate');
    
    categoryInput.value = categoryName;
    dateInput.value = new Date().toISOString().split('T')[0]; // Today's date
    
    // Show the modal
    expenseModal.style.display = 'block';
}

// Save expense from form
function saveExpense() {
    const amountInput = document.getElementById('expenseAmount');
    const descriptionInput = document.getElementById('expenseDescription');
    const dateInput = document.getElementById('expenseDate');
    
    // Validate inputs
    if (!amountInput || !currentCategory) {
        console.error("Missing expense data");
        return;
    }
    
    // Parse amount
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Veuillez entrer un montant valide");
        return;
    }
    
    // Add expense to category
    const success = addExpense(currentCategory, amount);
    
    if (success) {
        // Store expense details if needed for future features
        const expenseDetails = {
            category: currentCategory,
            amount: amount,
            description: descriptionInput.value,
            date: new Date(dateInput.value)
        };
        
        console.log("New expense added:", expenseDetails);
        
        // Close the modal
        expenseModal.style.display = 'none';
        
        // Show success message
        alert(`Dépense de €${amount.toFixed(2)} ajoutée à ${currentCategory}`);
    } else {
        alert(`Erreur: Catégorie "${currentCategory}" non trouvée`);
    }
}
    // Create and add the "Add Category" button
    const addCategoryItem = document.createElement('div');
    addCategoryItem.className = 'category-item add-category';
    addCategoryItem.innerHTML = `
        <div class="add-category-content">
            <i class="fas fa-plus"></i>
            <span>Ajouter Catégorie</span>
        </div>
    `;
    
    // Add event listener to the "Add Category" button
    addCategoryItem.addEventListener('click', () => {
        openBudgetModal();
    });
    
    categoriesGrid.appendChild(addCategoryItem);
    
    console.log("Category display updated with", budgetData.categories.length, "categories");
}
// Add CSS for the budget modal and category allocations
function addModalStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Category allocation styles */
        .category-budget-section {
            margin-top: 20px;
            border-top: 1px solid #e9ecef;
            padding-top: 15px;
        }
        
        .category-budget-section h4 {
            margin-bottom: 15px;
            font-size: 1rem;
            color: #495057;
        }
        
        .category-allocation-item {
            margin-bottom: 10px;
        }
        
        .form-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        
        .category-name {
            flex: 3;
        }
        
        .category-amount {
            flex: 2;
        }
        
        .remove-category {
            background: none;
            border: none;
            color: #dc3545;
            cursor: pointer;
            padding: 5px;
            margin-bottom: 8px;
        }
        
        .remove-category:hover {
            color: #bd2130;
        }
        
        #addCategoryBtn {
            margin-top: 10px;
        }
        
        /* Progress fill color classes */
        .progress-fill.success {
            background-color: #28a745;
        }
        
        .progress-fill.warning {
            background-color: #ffc107;
        }
        
        .progress-fill.danger {
            background-color: #dc3545;
        }
        
        /* Add Category button styles */
        .add-category {
            border: 2px dashed #dee2e6;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .add-category:hover {
            border-color: #adb5bd;
            background-color: #f8f9fa;
        }
        
        .add-category-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            color: #6c757d;
        }
        
        .add-category-content i {
            font-size: 24px;
            margin-bottom: 8px;
        }
    `;
    
    document.head.appendChild(styleElement);
    
    console.log("Modal styles added");
}

// Function to add expense to a category
function addExpense(categoryName, amount) {
    const category = budgetData.categories.find(cat => cat.name === categoryName);
    if (category) {
        category.spent = (parseFloat(category.spent) || 0) + (parseFloat(amount) || 0);
        updateBudgetDisplay();
        return true;
    }
    return false;
}

// For debugging: Check if elements exist and log current state
function debugElements() {
    console.log("Debug check:");
    console.log("addBudgetBtn:", document.getElementById('addBudgetBtn'));
    console.log("totalBudgetElement:", document.getElementById('totalBudget'));
    console.log("budgetModal:", document.getElementById('budgetModal'));
    console.log("categoriesGrid:", document.querySelector('.categories-grid'));
    console.log("Current budgetData:", JSON.stringify(budgetData, null, 2));
}

// Function to add sample data for testing
function addSampleData() {
    budgetData = {
        totalBudget: 1500,
        totalExpenses: 0,
        categories: [
            { name: 'Alimentation', allocated: 300, spent: 195 },
            { name: 'Logement', allocated: 1000, spent: 800 },
            { name: 'Éducation', allocated: 300, spent: 120 },
            { name: 'Transport', allocated: 150, spent: 45 },
            { name: 'Divertissement', allocated: 100, spent: 75 }
        ],
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 30))
    };
    updateBudgetDisplay();
    console.log("Sample data added");
}
function checkBackendConnection() {
    fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            updateConnectionStatus(true);
        } else {
            updateConnectionStatus(false);
        }
    })
    .catch(error => {
        console.log('Backend connection check failed:', error);
        updateConnectionStatus(false);
    });
}

// Update the connection status indicator
function updateConnectionStatus(isConnected) {
    const statusElement = document.getElementById('connection-status');
    
    if (!statusElement) {
        // Create status indicator if it doesn't exist
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'connection-status';
        statusIndicator.style.position = 'fixed';
        statusIndicator.style.bottom = '10px';
        statusIndicator.style.right = '10px';
        statusIndicator.style.padding = '5px 10px';
        statusIndicator.style.borderRadius = '4px';
        statusIndicator.style.fontSize = '12px';
        statusIndicator.style.display = 'flex';
        statusIndicator.style.alignItems = 'center';
        statusIndicator.style.gap = '5px';
        statusIndicator.style.zIndex = '9999';
        
        document.body.appendChild(statusIndicator);
    }
    
    const statusElement2 = document.getElementById('connection-status');
    if (isConnected) {
        statusElement2.style.backgroundColor = 'rgba(40, 167, 69, 0.9)';
        statusElement2.innerHTML = '<i class="fas fa-wifi"></i> Connecté';
    } else {
        statusElement2.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
        statusElement2.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Hors ligne';
    }
}

// Initialize the dashboard when the DOM is loaded
// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing dashboard");
    
    // Try to load data from the server first
    loadBudgetData();
    
    // Initialize the dashboard UI
    initializeDashboard();
    addModalStyles();
    
    // Initial connection check
    checkBackendConnection();
    
    // Check connection every 30 seconds
    setInterval(checkBackendConnection, 30000);
    
    // Uncomment to add sample data for testing
    // setTimeout(addSampleData, 1500);
    
    // Debug check to ensure elements are found
    setTimeout(debugElements, 1000);
    
    // Connect the export report button if present
    const exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportBudgetReport);
    }
});

function exportBudgetReport() {
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        console.error("jsPDF is not available");
        alert("La fonction d'exportation PDF n'est pas disponible. Veuillez vérifier que jsPDF est chargé correctement.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Ensure numeric values
    const totalBudget = parseFloat(budgetData.totalBudget) || 0;
    const totalExpenses = parseFloat(budgetData.totalExpenses) || 0;
    const remainingBudget = totalBudget - totalExpenses;
    
    // Add title
    doc.setFontSize(18);
    doc.text("Rapport de Budget Étudiant", 105, 20, { align: 'center' });
    
    // Add date
    const today = new Date();
    doc.setFontSize(10);
    doc.text(`Généré le: ${today.toLocaleDateString()}`, 105, 30, { align: 'center' });
    
    // Add budget period
    const startDate = new Date(budgetData.startDate || new Date());
    const endDate = new Date(budgetData.endDate || new Date());
    doc.text(`Période de budget: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 105, 35, { align: 'center' });
    
    // Add budget summary
    doc.setFontSize(14);
    doc.text("Résumé du Budget", 20, 50);
    
    doc.setFontSize(12);
    doc.text(`Budget Total: €${totalBudget.toFixed(2)}`, 30, 60);
    doc.text(`Dépenses Totales: €${totalExpenses.toFixed(2)}`, 30, 70);
    doc.text(`Budget Restant: €${remainingBudget.toFixed(2)}`, 30, 80);
    
    // Add category breakdown table
    doc.setFontSize(14);
    doc.text("Répartition par Catégorie", 20, 100);
    
    // Create category table data
    const tableColumns = ["Catégorie", "Alloué (€)", "Dépensé (€)", "Restant (€)", "% Utilisé"];
    const tableData = (budgetData.categories || []).map(cat => {
        const allocated = parseFloat(cat.allocated) || 0;
        const spent = parseFloat(cat.spent) || 0;
        const remaining = allocated - spent;
        const percentage = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
        
        return [
            cat.name || "Sans nom",
            allocated.toFixed(2),
            spent.toFixed(2),
            remaining.toFixed(2),
            `${percentage}%`
        ];
    });
    
    // Add the table
    doc.autoTable({
        head: [tableColumns],
        body: tableData,
        startY: 110,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] }
    });
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text("Budgety - Application de Gestion de Budget pour Étudiants", 105, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    // Save the PDF
    doc.save("rapport_budget_etudiant.pdf");
    
    console.log("PDF export completed");
}