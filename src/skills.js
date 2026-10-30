import gsap from 'gsap';
import Matter from 'matter-js';

// Rows that open on hover and drop their tags as rigid bodies (after the Griflan
// services hover, without the image column). Tap toggles on touch.
const { Engine, World, Bodies, Body } = Matter;

function measure(label) {
  const ghost = document.createElement('span');
  ghost.className = 'tag';
  ghost.textContent = label;
  document.body.appendChild(ghost);
  const size = { w: ghost.offsetWidth, h: ghost.offsetHeight };
  ghost.remove();
  return size;
}

export function skills(root) {
  root.querySelectorAll('.skill').forEach((row) => {
    const labels = row.dataset.tags.split(',').map((s) => s.trim());
    const sizes = labels.map(measure);
    let engine = null, box = null, raf = null, els = [], bodies = [], open = false, timer = null;

    function drop() {
      clear();
      const w = row.offsetWidth, h = row.offsetHeight;
      box = document.createElement('div');
      box.className = 'tags';
      row.appendChild(box);
      engine = Engine.create({ gravity: { x: 0, y: 2 } });
      const T = 20, floorOff = window.innerWidth < 768 ? 16 : 28;
      World.add(engine.world, [
        Bodies.rectangle(w / 2, h - floorOff + T / 2, w * 3, T, { isStatic: true }),
        Bodies.rectangle(-T / 2, h / 2, T, h * 3, { isStatic: true }),
        Bodies.rectangle(w + T / 2, h / 2, T, h * 3, { isStatic: true }),
      ]);
      labels.forEach((label, i) => {
        const el = document.createElement('span');
        el.className = 'tag';
        el.textContent = label;
        box.appendChild(el);
        const { w: tw, h: th } = sizes[i];
        const body = Bodies.rectangle(w * 0.3 + Math.random() * w * 0.5, -th / 2 - i * 6, tw, th, {
          chamfer: { radius: th / 2 }, restitution: 0.18, friction: 0.6, density: 0.002,
        });
        Body.setAngle(body, (Math.random() - 0.5) * 0.5);
        World.add(engine.world, body);
        gsap.to(el, { opacity: 1, duration: 0.3, delay: i * 0.04 });
        els.push(el); bodies.push(body);
      });
      const step = () => {
        Engine.update(engine, 1000 / 60);
        els.forEach((el, i) => {
          const b = bodies[i], { w: tw, h: th } = sizes[i];
          el.style.transform = `translate(${b.position.x - tw / 2}px, ${b.position.y - th / 2}px) rotate(${b.angle}rad)`;
        });
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    function clear() {
      if (raf) cancelAnimationFrame(raf);
      if (engine) Engine.clear(engine);
      if (box) box.remove();
      els = []; bodies = []; engine = null; raf = null; box = null;
    }
    function enter() {
      if (open) return;
      open = true;
      gsap.killTweensOf(row);
      gsap.to(row, { height: window.innerWidth < 768 ? '15rem' : '22rem', duration: 0.75, ease: 'elastic.out(1,0.5)' });
      row.classList.add('is-open');
      timer = gsap.delayedCall(0.2, () => open && drop());
    }
    function leave() {
      if (!open) return;
      open = false;
      timer?.kill();
      gsap.killTweensOf(row);
      row.classList.remove('is-open');
      if (els.length) gsap.to(els, { opacity: 0, duration: 0.2, onComplete: clear }); else clear();
      gsap.to(row, { height: window.innerWidth < 768 ? '4.5rem' : '6.5rem', duration: 0.5, ease: 'elastic.out(1,0.75)' });
    }
    row.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && enter());
    row.addEventListener('pointerleave', (e) => e.pointerType !== 'touch' && leave());
    row.addEventListener('click', (e) => { if (matchMedia('(hover: none)').matches) (open ? leave() : enter()); });
  });
}
