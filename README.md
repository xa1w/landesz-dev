# landesz.dev

Personal site. Vite + three.js + GSAP ScrollTrigger + Lenis + vgpu. One page, no framework.

Live: Vercel team `tomlol`, project `landesz-dev` (`vercel deploy --prod --scope tomlol`).
`index.html` is a single contact screen (2026-10-30). The interactive pieces below
are still in `src/` and can be wired back into the page; the earlier structure was
hero with the chrome form, four full-screen pieces, then contact.

| Section | File | What it is |
|---------|------|------------|
| `#fluid` | `src/fluid.js` | GPU fluid sim (Navier–Stokes on three.js render targets), ink follows the pointer; an idle wanderer keeps it alive |
| `#ascii` | `src/ascii.js` | "landesz" typeset to a canvas, sampled to a glyph grid; cells are springs the cursor pushes |
| `#field` | `src/field.js`, `src/brand/field.wgsl` | vgpu/WebGPU contour field bending around the pointer; falls back to a gradient without WebGPU |
| `#skills` | `src/skills.js` | rows that open on hover and drop their tags as matter-js bodies (tap on touch) |

The fluid, ASCII and skills pieces are ports of demos from the Hover Effects pack
(Cappen fluid, Artefakt ASCII logo, Griflan hover), rewritten section-scoped and
only simulating while on screen.

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
npm run preview    # serves dist/ on http://localhost:4173
node shots/qa.mjs  # desktop + mobile screenshots of every section into shots/out/
```

## /bio.html — the card

A second page in the guns.lol / e-z style: click-to-enter splash, frosted glass
card over the live chrome form, typing bio, a Discord presence card, a
latest-build card, glowing links and a music player. Files: `bio.html`,
`src/bio.css`, `src/bio.js`; QA with `node shots/bio.mjs`.

- **Avatar** is `public/avatar.jpg` (pulled from github.com/xa1w).
- **Live Discord status:** put your Discord user id in `data-discord-id` on the
  `.presence` element and join the Lanyard server once; the card then polls
  api.lanyard.rest every 30s.
- **Music:** drop `public/music/track.mp3` (and optional `cover.jpg`); the player
  wakes up and starts after the splash click.

## Drop-in content

The page looks for these files and swaps the placeholders when they exist:

| File | Used for | Aspect |
|------|----------|--------|
| `public/portrait.jpg` | About section portrait | 4:5 |
| `public/photos/01.jpg` … `05.jpg` | Photographs row | 3:2 |

Project screenshots live in `public/work/*.jpg` (1440x900). Regenerate them from the
live sites with `node shots/sites.mjs`. Projects, copy and links are the `projects`
array at the top of `src/main.js`.

## Design

Reference-locked, not templated:

- Canvas `#12130f`, type `#e4dfda`, hairlines `#3c3c38`, mono metadata at 12px,
  pill ghost buttons, no shadows. Foundation: yinger.dev.
- Display face Host Grotesk 600, natural case, tight tracking.
- `#1a2ffb` is the only chromatic accent and appears on interactive states only
  (hover borders, focus rings, link hover). Never as a surface.
- Media frames use 15px radius. Everything else is either hairline or pill.

## How the 3D works

`src/scene.js` renders the hero form (an icosphere displaced by simplex noise in
the vertex shader, chrome `MeshPhysicalMaterial`, studio environment map) and one
rounded slab per project. Grab the form with the mouse and pull: a patch of the
surface around the grab point stretches toward the cursor like dough (a pull
term in the same vertex shader, normals recomputed) and springs back with an
elastic wobble on release. Touch is excluded so it never fights page scrolling.
The form collapses as the first slab rises when the pinned `#work` section begins. `src/main.js` owns
the scroll choreography; poses are functions of viewport width and
`invalidateOnRefresh` recomputes them on resize.

## vgpu / WebGPU

`src/field.js` renders `src/brand/field.wgsl` with [vgpu](https://github.com/vercel-labs/vgpu)
on a layout-backed canvas, driven from the GSAP ticker via `clock.advance`. The
older project-slab shaders (`src/brand/{isl,haven,bugaroos,seven}.wgsl`, `src/brand.js`,
`public/work`, `public/logos`) are kept for the work-deck version of the page and are
not used by `index.html` now.

```sh
npm exec --no -- vgpu docs ls          # bundled docs for the installed version
node shots/drag.mjs                     # drag test + slight-scroll screenshot
```

`shots/qa.mjs` launches Chrome with `--enable-unsafe-webgpu --ignore-gpu-blocklist
--use-gl=angle --use-angle=metal`, which is what makes WebGPU work headless on macOS.
