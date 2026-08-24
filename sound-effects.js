// ==========================================
// FULL UI SOUND EFFECTS SCRIPT (sound-effects.js)
// ==========================================

(function () {
    // 1. Initialize audio objects with your asset filenames
    const hoverSound = new Audio('matuhover.mp3');
    const clickSound = new Audio('matuclick.mp3');

    // Preload audio assets for instant playback
    hoverSound.load();
    clickSound.load();

    // Set volumes (0.0 to 1.0)
    hoverSound.volume = 0.4;
    clickSound.volume = 0.6;

    // 2. Safe audio playback handler to bypass browser autoplay blocks
    const playAudio = (audioElement) => {
        const soundClone = audioElement.cloneNode();
        soundClone.volume = audioElement.volume;
        soundClone.play().catch((err) => {
            // Silently catches and ignores browser restrictions until user interaction occurs
            console.debug("Audio playback restricted by browser policy:", err);
        });
    };

    // 3. Global Event Delegation for Hovers
    document.addEventListener('mouseover', (event) => {
        const targetElement = event.target.closest('button, .btn, [role="button"], input[type="submit"], input[type="button"], a');
        
        // Triggers once when entering the interactive element
        if (targetElement && !targetElement.dataset.isHovered) {
            targetElement.dataset.isHovered = "true";
            playAudio(hoverSound);
        }
    });

    document.addEventListener('mouseout', (event) => {
        const targetElement = event.target.closest('button, .btn, [role="button"], input[type="submit"], input[type="button"], a');
        if (targetElement) {
            delete targetElement.dataset.isHovered;
        }
    });

    // 4. Global Event Delegation for Clicks
    document.addEventListener('click', (event) => {
        const targetElement = event.target.closest('button, .btn, [role="button"], input[type="submit"], input[type="button"], a');
        
        if (targetElement) {
            playAudio(clickSound);
        }
    });

    console.log("[Sound Effects System] Initialized successfully.");
})();