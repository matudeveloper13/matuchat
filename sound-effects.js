// ==========================================
// MATU UI SOUND EFFECTS SYSTEM (EXPANDED)
// ==========================================

(function () {
    const hoverAudio = new Audio('matuhover.mp3');
    const clickAudio = new Audio('matuclick.mp3');

    hoverAudio.load();
    clickAudio.load();

    hoverAudio.volume = 0.5;
    clickAudio.volume = 0.7;

    const playSound = (audio) => {
        const clone = audio.cloneNode();
        clone.volume = audio.volume;
        clone.play().catch((err) => {
            console.debug("Audio blocked:", err);
        });
    };

    // Expanded selector to catch buttons, links, inputs, and custom interactive elements/classes
    const selector = 'button, .btn, [role="button"], input[type="submit"], input[type="button"], a, .clickable, .icon, li, span[onclick], div[onclick]';

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest(selector);
        if (target && !target.dataset.hovered) {
            target.dataset.hovered = "true";
            playSound(hoverAudio);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest(selector);
        if (target) {
            delete target.dataset.hovered;
        }
    });

    document.addEventListener('click', (e) => {
        const target = e.target.closest(selector);
        if (target) {
            playSound(clickAudio);
        }
    });
})();