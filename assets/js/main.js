function preloadImage(index, sources) {
    if (index < 0 || index >= sources.length) {
        return;
    }
    const img = new Image();
    img.src = sources[index];
}

document.addEventListener('DOMContentLoaded', () => {
    const animationWrapper = document.getElementById('animation-wrapper');
    const truck = document.getElementById('truck');
    const galleryContainer = document.querySelector('.gallery');

    if (animationWrapper && truck) {
        truck.addEventListener('animationend', () => {
            animationWrapper.style.display = 'none';
        });
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

            imageUrls.forEach((url, index) => {
                const img = document.createElement('img');
                img.className = 'gallery-image';
                img.src = url; // Load all images for the grid layout
                img.dataset.src = url;
                img.alt = `Plaid ${index + 1}`;
                // Removed the hiding logic to support the grid layout
                galleryContainer.appendChild(img);
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
});
