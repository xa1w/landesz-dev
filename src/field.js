import { init, surface, effect, frame, clock } from 'vgpu';
import gsap from 'gsap';
import shader from './brand/field.wgsl';

// WebGPU section: a vgpu effect on a layout-backed canvas, pointer-reactive.
// Returns false when WebGPU is unavailable so the section can show its fallback.
export async function field(section) {
  if (!navigator.gpu) return false;
  let gpu;
  try { gpu = await init(); } catch { return false; }
  const canvas = section.querySelector('canvas');
  const surf = surface(gpu, canvas, { dpr: [1, 1.5] });
  const fx = effect(gpu, shader, { set: { params: { time: 0, aspect: 1, strength: 0, pad: 0, pointer: [0.5, 0.5] } } });
  surf.onResize(({ width, height }) => fx.set({ params: { aspect: width / height } }));

  const target = { x: 0.5, y: 0.5 }, cur = { x: 0.5, y: 0.5, s: 0 };
  let lastUser = 0;
  section.addEventListener('pointermove', (e) => {
    const r = section.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width; target.y = (e.clientY - r.top) / r.height;
    lastUser = performance.now();
  }, { passive: true });

  let active = false;
  new IntersectionObserver(([e]) => (active = e.isIntersecting), { threshold: 0.05 }).observe(section);
  const time = clock(gpu);
  gsap.ticker.add((_, deltaMs) => {
    if (!active) return;
    const idle = performance.now() - lastUser > 2500;
    if (idle) { const t = performance.now() / 1000; target.x = 0.5 + 0.3 * Math.sin(t * 0.5); target.y = 0.5 + 0.25 * Math.cos(t * 0.8); }
    cur.x += (target.x - cur.x) * 0.08; cur.y += (target.y - cur.y) * 0.08;
    cur.s += ((idle ? 0.6 : 1) - cur.s) * 0.05;
    time.advance(Math.max(0, deltaMs) / 1000);
    fx.set({ params: { time: time.time, strength: cur.s, pointer: [cur.x, cur.y] } });
    frame(gpu, (f) => f.pass(surf, fx));
  });
  return true;
}
