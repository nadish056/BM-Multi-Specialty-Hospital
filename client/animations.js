// animations.js - Luxury Motion & Interaction Layer

document.addEventListener('DOMContentLoaded', () => {
    initLoadingScreen();
    initScrollReveal();
    initNumberCounters();
});

// 0. Loading Screen (GSAP Timeline)
function initLoadingScreen() {
    if (typeof gsap === 'undefined') {
        const loader = document.getElementById('luxury-loader');
        if (loader) loader.style.display = 'none';
        return;
    }

    const tl = gsap.timeline();

    tl.to('.loader-logo-ring', { opacity: 1, duration: 0.5, ease: 'power2.out' })
        .to('.loader-ecg', { opacity: 1, duration: 0.3 })
        .to('.loader-ecg-svg polyline', { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' })
        .to('.luxury-loader', { opacity: 0, duration: 0.6, ease: 'power2.inOut', delay: 0.2 })
        .set('.luxury-loader', { display: 'none' });
}

// 2. Scroll Reveal Stagger
function initScrollReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const revealElements = document.querySelectorAll('.lux-section, .lux-card, .hero-copy');

    revealElements.forEach((el) => {
        gsap.fromTo(el,
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 1.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: el,
                    start: "top 85%", // Trigger when 85% down the viewport
                    toggleActions: "play none none none"
                }
            }
        );
    });
}

// 3. Number Counter
function initNumberCounters() {
    const statNumbers = document.querySelectorAll('.stat-number');

    statNumbers.forEach(stat => {
        const targetNumber = parseInt(stat.innerText.replace(/\D/g, ''), 10);
        if (isNaN(targetNumber)) return;

        const suffix = stat.innerText.replace(/[0-9,]/g, '').trim();

        gsap.fromTo(stat,
            { innerHTML: 0 },
            {
                innerHTML: targetNumber,
                duration: 2,
                ease: "power2.out",
                snap: { innerHTML: 1 },
                scrollTrigger: {
                    trigger: stat,
                    start: "top 90%",
                },
                onUpdate: function () {
                    // Format with commas and append suffix (e.g. 16+)
                    stat.innerHTML = Math.round(this.targets()[0].innerHTML).toLocaleString() + (suffix ? '+' : '');
                }
            }
        );
    });
}
