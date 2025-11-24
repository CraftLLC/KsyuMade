document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const adminPanel = document.getElementById('admin-panel');
    const loginContainer = document.querySelector('.login-container');
    const logoutButton = document.getElementById('logout-button');
    const galleryContainer = document.getElementById('gallery-container');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const totalImagesEl = document.getElementById('total-images');

    const token = localStorage.getItem('ksyumade_jwt');

    if (token) {
        adminPanel.classList.remove('hidden');
        loginContainer.classList.add('hidden');
        loadGallery();
    } else {
        adminPanel.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    }

    // Logout handler
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('ksyumade_jwt');
            window.location.reload();
        });
    }

    // Login form handler
    if (loginForm) {
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
                    throw new Error(errorData.error || 'Помилка аутентифікації');
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

    // Update file input label
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name;
            const label = document.querySelector('.file-label');
            if (fileName) {
                label.innerHTML = `<i class="fas fa-check"></i> ${fileName}`;
            }
        });
    }

    // Create progress bar
    function createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'loading-progress';
        progressContainer.innerHTML = `
            <div class="progress-bar" id="progress-bar"></div>
        `;
        document.body.appendChild(progressContainer);

        return {
            progressBar: document.getElementById('progress-bar'),
            container: progressContainer
        };
    }

    // Update progress
    function updateProgress(progressElements, current, total) {
        const percentage = Math.round((current / total) * 100);
        progressElements.progressBar.style.width = `${percentage}%`;

        // Remove progress bar when complete
        if (current === total) {
            setTimeout(() => {
                progressElements.container.style.opacity = '0';
                setTimeout(() => {
                    progressElements.container.remove();
                }, 300);
            }, 500);
        }
    }

    // Load gallery with skeleton loaders
    async function loadGallery() {
        try {
            const response = await fetch('/api/images');
            const images = await response.json();

            galleryContainer.innerHTML = '';

            // Update stats
            if (totalImagesEl) {
                totalImagesEl.textContent = images.length;
            }

            if (images.length === 0) {
                galleryContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">Галерея порожня. Завантажте перше зображення!</p>';
                return;
            }

            let loadedCount = 0;
            const progressElements = createProgressBar();

            images.forEach(imageUrl => {
                const imgContainer = document.createElement('div');
                imgContainer.classList.add('gallery-item');
                imgContainer.setAttribute('data-filename', imageUrl.split('/').pop());

                // Create skeleton loader
                const skeleton = document.createElement('div');
                skeleton.className = 'skeleton-loader';
                skeleton.textContent = 'Завантаження...';
                imgContainer.appendChild(skeleton);

                // Create image
                const img = document.createElement('img');
                img.dataset.src = imageUrl;
                img.alt = 'Gallery image';

                // Image load handler
                img.onload = () => {
                    loadedCount++;
                    updateProgress(progressElements, loadedCount, images.length);
                    skeleton.remove();
                };

                // Image error handler
                img.onerror = () => {
                    loadedCount++;
                    updateProgress(progressElements, loadedCount, images.length);
                    skeleton.textContent = '❌';
                };

                img.src = imageUrl;

                // Create delete button
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                deleteButton.classList.add('delete-button');
                deleteButton.addEventListener('click', async () => {
                    const filename = imageUrl.split('/').pop();
                    if (confirm(`Ви впевнені, що хочете видалити ${filename}?`)) {
                        try {
                            const deleteResponse = await fetch(`/api/admin/images/${filename}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });

                            if (deleteResponse.ok) {
                                // Animate removal
                                imgContainer.style.opacity = '0';
                                imgContainer.style.transform = 'scale(0.8)';
                                setTimeout(() => {
                                    loadGallery();
                                }, 300);
                            } else {
                                const errorData = await deleteResponse.json();
                                alert(`Помилка видалення: ${errorData.error}`);
                            }
                        } catch (error) {
                            console.error('Delete failed:', error);
                            alert('Помилка видалення зображення.');
                        }
                    }
                });

                imgContainer.appendChild(img);
                imgContainer.appendChild(deleteButton);
                galleryContainer.appendChild(imgContainer);
            });

            // Initialize drag and drop sorting
            new Sortable(galleryContainer, {
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    // Optional: Save new order to server
                    console.log('Gallery order changed');
                }
            });

        } catch (error) {
            console.error('Failed to load gallery:', error);
            galleryContainer.innerHTML = '<p style="text-align: center; color: var(--error-color); padding: 40px;">Помилка завантаження галереї.</p>';
        }
    }

    // Upload form handler
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = fileInput.files[0];

            if (!file) {
                alert('Будь ласка, оберіть файл для завантаження.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            const uploadBtn = uploadForm.querySelector('.upload-btn');
            const originalText = uploadBtn.innerHTML;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Завантаження...';
            uploadBtn.disabled = true;

            try {
                const response = await fetch('/api/admin/images', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (response.ok) {
                    // Reset form
                    uploadForm.reset();
                    const label = document.querySelector('.file-label');
                    label.innerHTML = '<i class="fas fa-folder-open"></i> Обрати файл';

                    // Reload gallery
                    loadGallery();

                    // Show success message
                    uploadBtn.innerHTML = '<i class="fas fa-check"></i> Успіх!';
                    setTimeout(() => {
                        uploadBtn.innerHTML = originalText;
                    }, 2000);
                } else {
                    const errorData = await response.json();
                    alert(`Помилка завантаження: ${errorData.error}`);
                    uploadBtn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Upload failed:', error);
                alert('Помилка завантаження.');
                uploadBtn.innerHTML = originalText;
            } finally {
                uploadBtn.disabled = false;
            }
        });
    }

    // Update copyright year for both footers
    const copyrightYearEl = document.getElementById('copyright-year');
    const copyrightYearLoginEl = document.getElementById('copyright-year-login');
    const startYear = 2025;
    const currentYear = new Date().getFullYear();
    const yearText = (currentYear > startYear) ? `${startYear}–${currentYear}` : startYear;

    if (copyrightYearEl) {
        copyrightYearEl.textContent = yearText;
    }
    if (copyrightYearLoginEl) {
        copyrightYearLoginEl.textContent = yearText;
    }
});
