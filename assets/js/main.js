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
                galleryContainer.innerHTML = '<p>No images in the gallery yet.</p>';
                return;
            }

            galleryContainer.innerHTML = ''; // Clear static images

            imageUrls.forEach((url, index) => {
                const img = document.createElement('img');
                img.className = 'gallery-image';
                img.src = (index === 0) ? url : ''; // Load first image, rest are lazy
                img.dataset.src = url;
                img.alt = `Plaid ${index + 1}`;
                if (index !== 0) {
                    img.style.display = 'none'; // Hide non-first images as per original CSS
                }
                galleryContainer.appendChild(img);
            });

            setupLightbox(imageUrls);

        } catch (error) {
            console.error('Failed to initialize gallery:', error);
            galleryContainer.innerHTML = '<p>Could not load gallery. Please try again later.</p>';
        }
    }

    function setupLightbox(imageSources) {
        const galleryImages = document.querySelectorAll('.gallery-image');
        const lightbox = document.getElementById('lightbox');
        const lightboxImage = document.getElementById('lightbox-image');
        const closeButton = document.querySelector('.close-button');
        const prevButton = document.querySelector('.prev-button');
        const nextButton = document.querySelector('.next-button');
        const imageCounter = document.querySelector('.image-counter');

        if (!lightbox) return; // Exit if lightbox elements are not on the page

        let currentImageIndex = 0;
        let isTransitioning = false;

        function showImage(index, direction = 0) {
            if (isTransitioning) return;

            if (index < 0) {
                currentImageIndex = imageSources.length - 1;
            } else if (index >= imageSources.length) {
                currentImageIndex = 0;
            } else {
                currentImageIndex = index;
            }

            const newSrc = imageSources[currentImageIndex];
            if (!newSrc) return;

            const displayImage = () => {
                lightboxImage.src = newSrc;
                imageCounter.textContent = `${currentImageIndex + 1} / ${imageSources.length}`;
                preloadImage(currentImageIndex + 1, imageSources);
                preloadImage(currentImageIndex - 1, imageSources);
            };

            if (direction !== 0) {
                isTransitioning = true;
                const initialTransform = direction === 1 ? 'translateX(100%)' : 'translateX(-100%)';
                lightboxImage.style.transition = 'none';
                lightboxImage.style.transform = initialTransform;

                void lightboxImage.offsetWidth;

                lightboxImage.style.transition = 'transform 0.3s ease-out';
                lightboxImage.style.transform = 'translateX(0)';
                displayImage();

                setTimeout(() => { isTransitioning = false; }, 300);
            } else {
                displayImage();
            }
        }

        galleryImages.forEach((image, index) => {
            image.addEventListener('click', () => {
                lightbox.classList.add('open');
                showImage(index);
            });
        });

        closeButton.addEventListener('click', () => lightbox.classList.remove('open'));
        prevButton.addEventListener('click', () => showImage(currentImageIndex - 1, -1));
        nextButton.addEventListener('click', () => showImage(currentImageIndex + 1, 1));

        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('open')) return;
            if (e.key === 'Escape') lightbox.classList.remove('open');
            if (e.key === 'ArrowLeft') showImage(currentImageIndex - 1, -1);
            if (e.key === 'ArrowRight') showImage(currentImageIndex + 1, 1);
        });

        let touchStartX = 0;
        lightbox.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
        lightbox.addEventListener('touchmove', (e) => {
            if (touchStartX === 0) return;
            const touchEndX = e.touches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                showImage(currentImageIndex + (diff > 0 ? 1 : -1), diff > 0 ? 1 : -1);
                touchStartX = 0;
            }
        });
    }

    initializeGallery();

    const copyrightYearEl = document.getElementById('copyright-year');
    if (copyrightYearEl) {
        const startYear = 2025;
        const currentYear = new Date().getFullYear();
        copyrightYearEl.textContent = (currentYear > startYear) ? `${startYear}–${currentYear}` : startYear;
    }
});
