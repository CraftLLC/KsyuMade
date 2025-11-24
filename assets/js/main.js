document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.querySelector('.gallery');
    let loadedImagesCount = 0;
    let totalImages = 0;

    // Створюємо прогрес-бар
    function createProgressBar() {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'loading-progress';
        progressContainer.innerHTML = `
            <div class="progress-bar" id="progress-bar"></div>
        `;
        document.body.appendChild(progressContainer);

        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.innerHTML = `
            <span class="loading-percentage" id="loading-percentage">0%</span>
            <span>Завантаження галереї...</span>
        `;
        document.body.appendChild(loadingText);

        return {
            progressBar: document.getElementById('progress-bar'),
            loadingPercentage: document.getElementById('loading-percentage'),
            container: progressContainer,
            text: loadingText
        };
    }

    // Оновлюємо прогрес
    function updateProgress(progressElements) {
        const percentage = Math.round((loadedImagesCount / totalImages) * 100);
        progressElements.progressBar.style.width = `${percentage}%`;
        progressElements.loadingPercentage.textContent = `${percentage}%`;

        // Видаляємо прогрес-бар коли все завантажено
        if (loadedImagesCount === totalImages) {
            setTimeout(() => {
                progressElements.container.style.opacity = '0';
                progressElements.text.style.opacity = '0';
                setTimeout(() => {
                    progressElements.container.remove();
                    progressElements.text.remove();
                }, 300);
            }, 500);
        }
    }

    async function initializeGallery() {
        try {
            const response = await fetch('/api/images');
            if (!response.ok) {
                throw new Error(`Failed to fetch images: ${response.statusText}`);
            }
            const imageUrls = await response.json();

            if (!imageUrls || imageUrls.length === 0) {
                galleryContainer.innerHTML = '<p>Наразі в галереї немає зображень.</p>';
                return;
            }

            galleryContainer.innerHTML = ''; // Clear static images
            totalImages = imageUrls.length;
            loadedImagesCount = 0;

            // Створюємо прогрес-бар
            const progressElements = createProgressBar();

            imageUrls.forEach((url, index) => {
                // Створюємо контейнер для зображення
                const itemContainer = document.createElement('div');
                itemContainer.className = 'gallery-item';

                // Створюємо skeleton loader
                const skeleton = document.createElement('div');
                skeleton.className = 'skeleton-loader';
                skeleton.textContent = 'Завантаження...';
                itemContainer.appendChild(skeleton);

                // Створюємо зображення
                const img = document.createElement('img');
                img.className = 'gallery-image';
                img.dataset.src = url;
                img.alt = `Plaid ${index + 1}`;
                img.loading = 'eager'; // Завантажуємо одразу для точного прогресу
                img.decoding = 'async';

                // Обробник завантаження
                img.onload = () => {
                    loadedImagesCount++;
                    updateProgress(progressElements);
                    skeleton.remove();
                    img.classList.add('loaded');
                };

                // Обробник помилки
                img.onerror = () => {
                    loadedImagesCount++;
                    updateProgress(progressElements);
                    skeleton.textContent = 'Помилка завантаження';
                    skeleton.style.color = '#ff4444';
                };

                img.src = url;
                itemContainer.appendChild(img);
                galleryContainer.appendChild(itemContainer);
            });

        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            galleryContainer.innerHTML = '<p>Could not load gallery. Please try again later.</p>';
        }
    }

    initializeGallery();

    const copyrightYearEl = document.getElementById('copyright-year');
    if (copyrightYearEl) {
        const startYear = 2025;
        const currentYear = new Date().getFullYear();
        copyrightYearEl.textContent = (currentYear > startYear) ? `${startYear}–${currentYear}` : startYear;
    }

    // Обробник зміни орієнтації екрану
    let resizeTimer;
    const handleOrientationChange = () => {
        // Очищаємо попередній таймер
        clearTimeout(resizeTimer);

        // Встановлюємо новий таймер для оптимізації
        resizeTimer = setTimeout(() => {
            // Оновлюємо висоту viewport
            document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);

            // Перемальовуємо галерею для правильного відображення
            const images = galleryContainer.querySelectorAll('.gallery-image');
            images.forEach(img => {
                // Примусово перемальовуємо зображення
                img.style.display = 'none';
                img.offsetHeight; // Trigger reflow
                img.style.display = 'block';
            });
        }, 100);
    };

    // Слухачі подій для зміни орієнтації та розміру вікна
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    // Ініціалізуємо при завантаженні
    handleOrientationChange();
});
