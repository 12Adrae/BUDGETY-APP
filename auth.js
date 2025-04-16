document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for error styling to head
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes shake {
            0% { transform: translateX(0); }
            20% { transform: translateX(-10px); }
            40% { transform: translateX(10px); }
            60% { transform: translateX(-10px); }
            80% { transform: translateX(10px); }
            100% { transform: translateX(0); }
        }
        
        .shake {
            animation: shake 0.5s ease-in-out;
        }
        
        .auth-error {
            color: #e74c3c;
            background-color: #fdeaea;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid #e74c3c;
            display: none;
            transition: all 0.3s ease;
        }

        .auth-error.visible {
            display: block;
        }

        .input-error {
            border-color: #e74c3c !important;
            box-shadow: 0 0 0 1px rgba(231, 76, 60, 0.25);
        }
    `;
    document.head.appendChild(styleElement);

    /**
     * Displays an error message and highlights related input field
     * @param {HTMLElement} container - Error container element
     * @param {string} message - Error message to display
     * @param {HTMLElement} inputField - Optional input field to highlight
     * @param {boolean} animate - Whether to animate the error container
     */
    function showError(container, message, inputField = null, animate = false) {
        container.textContent = message;
        container.style.display = 'block';
        
        if (animate) {
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 500);
        }
        
        if (inputField) {
            inputField.classList.add('input-error');
            inputField.addEventListener('input', function removeError() {
                this.classList.remove('input-error');
                this.removeEventListener('input', removeError);
            });
        }
    }

    /**
     * Generic error handler for fetch responses
     * @param {Response} response - Fetch response object
     * @returns {Promise} - Promise that resolves to JSON or rejects with error
     */
    function handleFetchResponse(response) {
        return response.json().then(data => {
            if (!response.ok) {
                const error = new Error(data.error || 'Une erreur est survenue');
                error.statusCode = response.status;
                error.data = data;
                throw error;
            }
            return data;
        });
    }

    // Handle signup form submission
    const signupForm = document.querySelector('.signup-form');
    if (signupForm) {
        // Add error container after form
        const errorContainer = document.createElement('div');
        errorContainer.className = 'auth-error';
        signupForm.after(errorContainer);
        
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Hide any existing error messages
            errorContainer.style.display = 'none';
            
            // Remove any input error classes
            this.querySelectorAll('.input-error').forEach(el => {
                el.classList.remove('input-error');
            });
            
            const emailInput = this.querySelector('input[type="email"]');
            const fullNameInput = this.querySelector('input[placeholder="Nom Complet"]');
            const passwordInput = this.querySelector('input[type="password"]');
            const universityInput = this.querySelector('input[placeholder="Votre université"]');
            const ageInput = this.querySelector('input[placeholder="Votre âge"]');
            
            // Basic validation before sending to server
            if (!emailInput.value.trim()) {
                showError(errorContainer, "L'adresse email est requise", emailInput, true);
                return;
            }
            
            if (!passwordInput.value) {
                showError(errorContainer, "Le mot de passe est requis", passwordInput, true);
                return;
            }
            
            fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    fullName: fullNameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value,
                    university: universityInput.value.trim(),
                    age: parseInt(ageInput.value) || 0
                }),
            })
            .then(handleFetchResponse)
            .then(data => {
                if (data.error) {
                    let animateError = false;
                    let fieldWithError = null;
                    
                    // Determine which field has the error
                    if (data.error.toLowerCase().includes('email') && 
                        (data.error.toLowerCase().includes('utilisé') || 
                         data.error.toLowerCase().includes('existe') || 
                         data.error.toLowerCase().includes('already in use'))) {
                        animateError = true;
                        fieldWithError = emailInput;
                    } else if (data.error.toLowerCase().includes('mot de passe') || 
                              data.error.toLowerCase().includes('password')) {
                        fieldWithError = passwordInput;
                    }
                    
                    showError(errorContainer, data.error, fieldWithError, animateError);
                } else {
                    // Save user data to localStorage
                    localStorage.setItem('user', JSON.stringify(data));
                    
                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Handle specific error cases
                if (error.statusCode === 409) {
                    showError(errorContainer, "Cette adresse email est déjà utilisée", emailInput, true);
                } else if (error.statusCode === 400) {
                    showError(errorContainer, error.data?.error || "Données d'inscription invalides", null, false);
                } else {
                    showError(errorContainer, "Une erreur est survenue lors de l'inscription", null, false);
                }
            });
        });
    }
    
    // Handle login form submission
    const loginForm = document.querySelector('.login form');
    if (loginForm) {
        // Add error container after form
        const loginErrorContainer = document.createElement('div');
        loginErrorContainer.className = 'auth-error';
        loginForm.after(loginErrorContainer);
        
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Hide any existing error messages
            loginErrorContainer.style.display = 'none';
            
            // Remove any input error classes
            this.querySelectorAll('.input-error').forEach(el => {
                el.classList.remove('input-error');
            });
            
            const emailInput = this.querySelector('input[type="email"]');
            const passwordInput = this.querySelector('input[type="password"]');
            
            // Basic validation before sending to server
            if (!emailInput.value.trim()) {
                showError(loginErrorContainer, "L'adresse email est requise", emailInput, true);
                return;
            }
            
            if (!passwordInput.value) {
                showError(loginErrorContainer, "Le mot de passe est requis", passwordInput, true);
                return;
            }
            
            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                }),
            })
            .then(handleFetchResponse)
            .then(data => {
                if (data.error) {
                    let fieldWithError = null;
                    
                    // Determine which field has the error
                    if (data.error.toLowerCase().includes('email') || 
                        data.error.toLowerCase().includes('utilisateur') ||
                        data.error.toLowerCase().includes('user')) {
                        fieldWithError = emailInput;
                    } else if (data.error.toLowerCase().includes('mot de passe') || 
                              data.error.toLowerCase().includes('password')) {
                        fieldWithError = passwordInput;
                    }
                    
                    showError(loginErrorContainer, data.error, fieldWithError, false);
                } else {
                    // Save user data to localStorage
                    localStorage.setItem('user', JSON.stringify(data));
                    
                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Handle specific error cases
                if (error.statusCode === 401) {
                    showError(loginErrorContainer, "Email ou mot de passe incorrect", null, true);
                } else if (error.statusCode === 404) {
                    showError(loginErrorContainer, "Aucun utilisateur trouvé avec cet email", emailInput, false);
                } else {
                    showError(loginErrorContainer, "Impossible de se connecter. Veuillez réessayer plus tard.", null, false);
                }
            });
        });
    }
});