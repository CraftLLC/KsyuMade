document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const adminPanel = document.getElementById('admin-panel');
    const loginContainer = document.querySelector('.login-container');
    const logoutButton = document.getElementById('logout-button');
    const galleryContainer = document.getElementById('gallery-container');
    const uploadForm = document.getElementById('upload-form');
    const saveOrderButton = document.getElementById('save-order-button');

    const token = localStorage.getItem('ksyumade_jwt');

    if (token) {
        adminPanel.classList.remove('hidden');
        loginContainer.classList.add('hidden');
        loadGallery();
    } else {
        adminPanel.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    }

    if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('ksyumade_jwt');
            window.location.reload();
        });
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
                    throw new Error(errorData.error || 'ÐŸÐ¾Ð¼Ð¸Ð»ÐºÐ° Ð°Ð²Ñ‚ÐµÐ½Ñ‚Ð¸Ñ„Ñ–ÐºÐ°Ñ†Ñ–Ñ—');
                }

                const { token } = await response.json();
                localStorage.setItem('ksyumade_jwt', token);

                window.location.reload();

            } catch (error) {
                errorMessage.textContent = error.message;
                console.error('Login failed:', error);
            }
        });
    }

    async function loadGallery() {
        try {
            const response = await fetch('/api/images');
            const images = await response.json();

            galleryContainer.innerHTML = '';

            images.forEach(imageUrl => {
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('gallery-item');
                imgContainer.setAttribute('data-filename', imageUrl.split('/').pop());

                const img = document.createElement('img');
                img.src = imageUrl;

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('delete-button');
                deleteButton.addEventListener('click', async () => {
                    const filename = imageUrl.split('/').pop();
                    if (confirm(`Are you sure you want to delete ${filename}?`)) {
                        try {
                            const deleteResponse = await fetch(`/api/admin/images/${filename}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });

                            if (deleteResponse.ok) {
                                loadGallery();
                            } else {
                                const errorData = await deleteResponse.json();
                                alert(`Failed to delete image: ${errorData.error}`);
                            }
                        } catch (error) {
                            console.error('Delete failed:', error);
                            alert('Failed to delete image.');
                        }
                    }
                });

                imgContainer.appendChild(img);
                imgContainer.appendChild(deleteButton);
                galleryContainer.appendChild(imgContainer);
            });

            new Sortable(galleryContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost'
            });

        } catch (error) {
            console.error('Failed to load gallery:', error);
            galleryContainer.innerHTML = '<p>Failed to load gallery.</p>';
        }
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('file-input');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file to upload.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/admin/images', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (response.ok) {
                    loadGallery();
                } else {
                    const errorData = await response.json();
                    alert(`Upload failed: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Upload failed:', error);
                alert('Upload failed.');
            }
        });
    }
});
