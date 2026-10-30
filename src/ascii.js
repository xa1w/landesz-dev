// A word rendered as a grid of ASCII glyphs that the cursor pushes aside; each glyph
// springs back. After the Artefakt interactive logo, with a typeset word as the source.
export function ascii(section, text) {
  const canvas = section.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const CHARS = '.:+*#%@0369';
  const GRID = '#1a1b17', INK = '#e4dfda';
  const PUSH_RADIUS = 5, PUSH_FORCE = 30, SPRING = 0.025, DAMPING = 0.5;
  let size, gap, step, cols, rows, W, H, cells = [];

  function source() {
    // typeset the word to a small canvas the size of the grid it will occupy
    const wordCols = Math.floor(cols * 0.86);
    const fontPx = wordCols * 0.27; // Host Grotesk 600: "landesz" is ~3.7 em wide
    const wordRows = Math.ceil(fontPx * 1.1);
    const c = document.createElement('canvas');
    c.width = wordCols; c.height = wordRows;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, wordCols, wordRows);
    g.fillStyle = '#fff';
    g.font = `600 ${fontPx}px "Host Grotesk", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, wordCols / 2, wordRows / 2 + fontPx * 0.04);
    return { data: g.getImageData(0, 0, wordCols, wordRows).data, wordCols, wordRows };
  }

  function build() {
    const r = section.getBoundingClientRect();
    W = r.width; H = r.height;
    size = W < 768 ? 4 : 8; gap = W < 768 ? 1 : 2; step = size + gap;
    cols = Math.floor(W / step); rows = Math.floor(H / step);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { data, wordCols, wordRows } = source();
    const startCol = Math.floor((cols - wordCols) / 2), startRow = Math.floor((rows - wordRows) / 2);
    cells = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      let lit = false, ch = ' ';
      const cc = col - startCol, rr = row - startRow;
      if (cc >= 0 && cc < wordCols && rr >= 0 && rr < wordRows) {
        const b = data[(rr * wordCols + cc) * 4] / 255;
        lit = b > 0.5;
        ch = lit ? CHARS[Math.min(CHARS.length - 1, Math.floor(b * CHARS.length))] : ' ';
      }
      cells.push({ col, row, ch, lit, ox: 0, oy: 0, vx: 0, vy: 0 });
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = GRID;
    for (const { col, row } of cells) ctx.fillRect(col * step, row * step, size, size);
    ctx.font = `${size + 2}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    for (const c of cells) {
      if (!c.lit) continue;
      ctx.fillText(c.ch, (c.col + Math.round(c.ox)) * step + size / 2, (c.row + Math.round(c.oy)) * step);
    }
  }

  const mouse = { col: -999, row: -999, moving: false };
  let idle;
  section.addEventListener('pointermove', (e) => {
    const r = section.getBoundingClientRect();
    mouse.col = (e.clientX - r.left) / step; mouse.row = (e.clientY - r.top) / step; mouse.moving = true;
    clearTimeout(idle); idle = setTimeout(() => (mouse.moving = false), 50);
  }, { passive: true });
  section.addEventListener('pointerleave', () => { mouse.col = mouse.row = -999; mouse.moving = false; });

  function physics() {
    for (const c of cells) {
      if (!c.lit) continue;
      if (mouse.moving) {
        const dx = c.col + c.ox - mouse.col, dy = c.row + c.oy - mouse.row;
        const d = Math.hypot(dx, dy);
        if (d < PUSH_RADIUS && d > 0) { const f = (1 - d / PUSH_RADIUS) ** 2 * PUSH_FORCE; c.vx += (dx / d) * f; c.vy += (dy / d) * f; }
      }
      c.vx += -c.ox * SPRING; c.vy += -c.oy * SPRING; c.vx *= DAMPING; c.vy *= DAMPING;
      c.ox += c.vx; c.oy += c.vy;
      if (Math.abs(c.ox) < 0.01 && Math.abs(c.vx) < 0.01) c.ox = c.vx = 0;
      if (Math.abs(c.oy) < 0.01 && Math.abs(c.vy) < 0.01) c.oy = c.vy = 0;
    }
  }

  let active = false, frame = 0;
  new IntersectionObserver(([e]) => (active = e.isIntersecting), { threshold: 0.05 }).observe(section);
  function loop() {
    requestAnimationFrame(loop);
    if (!active) return;
    if (++frame % 3 === 0) for (const c of cells) if (c.lit) c.ch = CHARS[(Math.random() * CHARS.length) | 0];
    physics(); render();
  }
  document.fonts.load('600 100px "Host Grotesk"').then(() => { build(); render(); loop(); });
  window.addEventListener('resize', build);
}
