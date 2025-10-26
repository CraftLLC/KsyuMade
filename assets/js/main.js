document.addEventListener('DOMContentLoaded', () => {
    const animationWrapper = document.getElementById('animation-wrapper');
    const truck = document.getElementById('truck');

    if (animationWrapper && truck) {
        truck.addEventListener('animationend', () => {
            animationWrapper.style.display = 'none';
        });
    }

    const galleryImages = document.querySelectorAll('.gallery-image');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const closeButton = document.querySelector('.close-button');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    const imageCounter = document.querySelector('.image-counter');

    let currentImageIndex = 0;
    const imageSources = Array.from(galleryImages).map(img => img.src);

    function showImage(index, direction = 0) { // direction: 0 for no slide, -1 for left, 1 for right
        const previousImageIndex = currentImageIndex;

        if (index < 0) {
            currentImageIndex = imageSources.length - 1;
        } else if (index >= imageSources.length) {
            currentImageIndex = 0;
        } else {
            currentImageIndex = index;
        }

        if (direction !== 0) { // Only apply slide effect if navigating
            // Determine initial position for the new image
            const initialTransform = direction === 1 ? 'translateX(100%)' : 'translateX(-100%)';
            lightboxImage.style.transition = 'none'; // Disable transition temporarily
            lightboxImage.style.transform = initialTransform;
            // lightboxImage.style.opacity = '0'; // Removed fade effect

            // Force reflow to apply the initial transform immediately
            void lightboxImage.offsetWidth;

            // Set the new image source
            lightboxImage.src = imageSources[currentImageIndex];
            imageCounter.textContent = `${currentImageIndex + 1} / ${imageSources.length}`;

            // Re-enable transition and slide into view
            lightboxImage.style.transition = 'transform 0.3s ease-out'; // Only transition transform
            lightboxImage.style.transform = 'translateX(0)';
            // lightboxImage.style.opacity = '1'; // Removed fade effect
        } else { // Initial open or no navigation
            lightboxImage.style.transition = 'none'; // No slide on initial open
            lightboxImage.src = imageSources[currentImageIndex];
            imageCounter.textContent = `${currentImageIndex + 1} / ${imageSources.length}`;
            // Fade in effect for initial open is handled by the click listener
            lightboxImage.style.transform = 'translateX(0)';
            lightboxImage.style.opacity = '1';
        }
    }

    galleryImages.forEach((image, index) => {
        image.addEventListener('click', () => {
            lightbox.classList.add('open');
            showImage(index);
        });
    });

    closeButton.addEventListener('click', () => {
        lightbox.classList.remove('open');
        // Reset image styles when closing lightbox
        lightboxImage.style.transform = 'translateX(0)';
        lightboxImage.style.opacity = '1';
    });

    prevButton.addEventListener('click', () => {
        showImage(currentImageIndex - 1, -1);
    });

    nextButton.addEventListener('click', () => {
        showImage(currentImageIndex + 1, 1);
    });

    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('open')) {
            if (e.key === 'Escape') {
                lightbox.classList.remove('open');
            } else if (e.key === 'ArrowLeft') {
                showImage(currentImageIndex - 1, -1);
            } else if (e.key === 'ArrowRight') {
                showImage(currentImageIndex + 1, 1);
            }
        }
    });

    // Swipe functionality
    let touchStartX = 0;
    let touchEndX = 0;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    });

    lightbox.addEventListener('touchmove', (e) => {
        touchEndX = e.touches[0].clientX;
    });

    lightbox.addEventListener('touchend', () => {
        if (touchStartX - touchEndX > 50) { // Swiped left
            showImage(currentImageIndex + 1, 1);
        } else if (touchEndX - touchStartX > 50) { // Swiped right
            showImage(currentImageIndex - 1, -1);
        }
        touchStartX = 0;
        touchEndX = 0;
    });
});
