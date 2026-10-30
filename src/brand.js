import { init, surface, effect, frame, clock } from 'vgpu';
import isl from './brand/isl.wgsl';
import haven from './brand/haven.wgsl';
import bugaroos from './brand/bugaroos.wgsl';
import seven from './brand/seven.wgsl';

const shaders = { isl, haven, bugaroos, seven };

// One WebGPU canvas per project, rendered by vgpu and sampled by three.js as a
// CanvasTexture. Returns null when WebGPU is unavailable so the caller can fall
// back to the static screenshots.
export async function createBrand(projects, size = [1024, 640]) {
  if (!navigator.gpu) return null;
  let gpu;
  try { gpu = await init(); } catch { return null; }
  const time = clock(gpu);
  const items = projects.map((p) => {
    const canvas = document.createElement('canvas');
    canvas.width = size[0]; canvas.height = size[1];
    const surf = surface(gpu, canvas, { size, dpr: 1 });
    const fx = effect(gpu, shaders[p.id], { set: { params: { time: 0, aspect: size[0] / size[1] } } });
    return { canvas, surf, fx };
  });
  return {
    canvases: items.map((i) => i.canvas),
    tick(dt) {
      time.advance(dt);
      frame(gpu, (f) => {
        for (const i of items) {
          i.fx.set({ params: { time: time.time } });
          f.pass(i.surf, i.fx);
        }
      });
    },
  };
}

// Logo bitmap -> canvas with the flat background keyed out (ISL's icon ships on navy).
export function loadLogo(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height);
      const [r0, g0, b0, a0] = d.data;
      if (a0 > 250) {
        for (let i = 0; i < d.data.length; i += 4) {
          const dist = Math.abs(d.data[i] - r0) + Math.abs(d.data[i + 1] - g0) + Math.abs(d.data[i + 2] - b0);
          if (dist < 60) d.data[i + 3] = 0;
        }
        ctx.putImageData(d, 0, 0);
      }
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Typeset glyph for projects without a mark.
export function glyphCanvas(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e4dfda';
  ctx.font = '600 420px "Host Grotesk", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 276);
  return c;
}
