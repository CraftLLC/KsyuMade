document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // Check if already logged in
    if (localStorage.getItem('ksyumade_jwt')) {
        // For now, just show a success state. Later, this will render the admin panel.
        document.body.innerHTML = '<h1>Вхід виконано. Адмін-панель у розробці.</h1><button id="logout-button">Вийти</button>';
        
        const logoutButton = document.getElementById('logout-button');
        if(logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('ksyumade_jwt');
                window.location.reload();
            });
        }
        return;
    }

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.textContent = '';

            const login = loginForm.login.value;
            const password = loginForm.password.value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ login, password }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Помилка автентифікації');
                }

                const { token } = await response.json();
                localStorage.setItem('ksyumade_jwt', token);

                // Success! Reload the page to show the "logged in" state.
                window.location.reload();

            } catch (error) {
                errorMessage.textContent = error.message;
                console.error('Login failed:', error);
            }
        });
    }
});
