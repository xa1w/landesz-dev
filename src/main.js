import gsap from 'gsap';

/* local time */
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const tick = () => document.querySelectorAll('[data-time]').forEach((el) => (el.textContent = fmt.format(new Date())));
tick();
setInterval(tick, 15000);

/* entrance: JS owns the hidden state, so the page reads fine if this never runs */
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } })
    .from('.statement', { y: 24, autoAlpha: 0 }, 0.1)
    .from('.actions .pill', { y: 14, autoAlpha: 0, stagger: 0.07 }, 0.3)
    .from('.meta', { y: 10, autoAlpha: 0 }, 0.45)
    .from('.name', { y: 50, autoAlpha: 0, duration: 1.3 }, 0.25)
    .from('.nav, .foot', { autoAlpha: 0, duration: 0.8 }, 0.7);
}
