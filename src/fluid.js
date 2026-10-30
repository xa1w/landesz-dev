import * as THREE from 'three';

// Section-scoped GPU fluid simulation (Navier-Stokes on render targets), after the
// classic Pavel Dobryakov scheme as packaged in the Cappen demo. Ink is quartz on
// the section's own background. Simulates only while the section is on screen.
const v = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.); }';
const P = 'precision highp float; precision mediump sampler2D;';
const S = {
  splat: `${P} uniform sampler2D uTarget; uniform float aspectRatio,radius; uniform vec3 color; uniform vec2 point; varying vec2 vUv;
    void main(){ vec2 p=vUv-point; p.x*=aspectRatio; gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+exp(-dot(p,p)/radius)*color,1.); }`,
  advection: `${P} uniform sampler2D uVelocity,uSource; uniform vec2 texelSize; uniform float dt,dissipation; varying vec2 vUv;
    void main(){ gl_FragColor=vec4(dissipation*texture2D(uSource,vUv-dt*texture2D(uVelocity,vUv).xy*texelSize).rgb,1.); }`,
  divergence: `${P} uniform sampler2D uVelocity; uniform vec2 texelSize; varying vec2 vUv;
    vec2 vel(vec2 uv){ vec2 e=vec2(1.); if(uv.x<0.){uv.x=0.;e.x=-1.;} if(uv.x>1.){uv.x=1.;e.x=-1.;} if(uv.y<0.){uv.y=0.;e.y=-1.;} if(uv.y>1.){uv.y=1.;e.y=-1.;} return e*texture2D(uVelocity,uv).xy; }
    void main(){ vec2 L=vUv-vec2(texelSize.x,0.),R=vUv+vec2(texelSize.x,0.),T=vUv+vec2(0.,texelSize.y),B=vUv-vec2(0.,texelSize.y); gl_FragColor=vec4(.5*(vel(R).x-vel(L).x+vel(T).y-vel(B).y),0.,0.,1.); }`,
  curl: `${P} uniform sampler2D uVelocity; uniform vec2 texelSize; varying vec2 vUv;
    void main(){ vec2 L=vUv-vec2(texelSize.x,0.),R=vUv+vec2(texelSize.x,0.),T=vUv+vec2(0.,texelSize.y),B=vUv-vec2(0.,texelSize.y); gl_FragColor=vec4(texture2D(uVelocity,R).y-texture2D(uVelocity,L).y-texture2D(uVelocity,T).x+texture2D(uVelocity,B).x,0.,0.,1.); }`,
  vorticity: `${P} uniform sampler2D uVelocity,uCurl; uniform vec2 texelSize; uniform float curlStrength,dt; varying vec2 vUv;
    void main(){ vec2 L=vUv-vec2(texelSize.x,0.),R=vUv+vec2(texelSize.x,0.),T=vUv+vec2(0.,texelSize.y),B=vUv-vec2(0.,texelSize.y); vec2 f=normalize(vec2(abs(texture2D(uCurl,T).x)-abs(texture2D(uCurl,B).x),abs(texture2D(uCurl,R).x)-abs(texture2D(uCurl,L).x))+.0001)*curlStrength*texture2D(uCurl,vUv).x; gl_FragColor=vec4(texture2D(uVelocity,vUv).xy+f*dt,0.,1.); }`,
  pressure: `${P} uniform sampler2D uPressure,uDivergence; uniform vec2 texelSize; varying vec2 vUv;
    void main(){ vec2 L=clamp(vUv-vec2(texelSize.x,0.),0.,1.),R=clamp(vUv+vec2(texelSize.x,0.),0.,1.),T=clamp(vUv+vec2(0.,texelSize.y),0.,1.),B=clamp(vUv-vec2(0.,texelSize.y),0.,1.); gl_FragColor=vec4((texture2D(uPressure,L).x+texture2D(uPressure,R).x+texture2D(uPressure,T).x+texture2D(uPressure,B).x-texture2D(uDivergence,vUv).x)*.25,0.,0.,1.); }`,
  gradientSubtract: `${P} uniform sampler2D uPressure,uVelocity; uniform vec2 texelSize; varying vec2 vUv;
    void main(){ float pL=texture2D(uPressure,clamp(vUv-vec2(texelSize.x,0.),0.,1.)).x,pR=texture2D(uPressure,clamp(vUv+vec2(texelSize.x,0.),0.,1.)).x,pT=texture2D(uPressure,clamp(vUv+vec2(0.,texelSize.y),0.,1.)).x,pB=texture2D(uPressure,clamp(vUv-vec2(0.,texelSize.y),0.,1.)).x; gl_FragColor=vec4(texture2D(uVelocity,vUv).xy-vec2(pR-pL,pT-pB),0.,1.); }`,
  clear: `${P} uniform sampler2D uTexture; uniform float value; varying vec2 vUv; void main(){ gl_FragColor=value*texture2D(uTexture,vUv); }`,
  display: `${P} uniform sampler2D uTexture; uniform float threshold,edgeSoftness; uniform vec3 inkColor; varying vec2 vUv;
    void main(){ float d=clamp(length(texture2D(uTexture,vUv).rgb),0.,1.); float a=smoothstep(threshold-edgeSoftness*.5,threshold+edgeSoftness*.5,d); gl_FragColor=vec4(inkColor*a,a); }`,
};

export function fluid(section, opts = {}) {
  const canvas = section.querySelector('canvas');
  const c = {
    simResolution: window.innerWidth < 768 ? 128 : 192,
    dyeResolution: window.innerWidth < 768 ? 512 : 1024,
    curl: 40, pressureIterations: 28,
    velocityDissipation: 0.97, dyeDissipation: 0.965,
    splatRadius: 0.0028, forceStrength: 7,
    pressureDecay: 0.8, threshold: 0.45, edgeSoftness: 0.5,
    inkColor: new THREE.Color(0xe4dfda),
    ...opts,
  };
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const dpr = renderer.getPixelRatio();
  let W = 1, H = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  scene.add(quad);

  const rtOpts = { type: THREE.HalfFloatType, depthBuffer: false };
  const single = (w, h) => new THREE.WebGLRenderTarget(w, h, rtOpts);
  const double = (w, h) => ({ read: single(w, h), write: single(w, h), swap() { [this.read, this.write] = [this.write, this.read]; } });
  let velocity, dye, divergence, curl, pressure, simSize, dyeSize;
  function targets() {
    const aspect = W / H;
    simSize = { w: c.simResolution, h: Math.round(c.simResolution / aspect) };
    dyeSize = { w: c.dyeResolution, h: Math.round(c.dyeResolution / aspect) };
    velocity = double(simSize.w, simSize.h); dye = double(dyeSize.w, dyeSize.h);
    divergence = single(simSize.w, simSize.h); curl = single(simSize.w, simSize.h); pressure = double(simSize.w, simSize.h);
  }
  function resize() {
    const r = section.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    W = r.width * dpr; H = r.height * dpr;
    targets();
  }
  resize();
  window.addEventListener('resize', resize);

  const make = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: v, fragmentShader: frag, uniforms });
  const tex = () => ({ value: null }), num = (x = 0) => ({ value: x }), vec2 = () => ({ value: new THREE.Vector2() });
  const m = {
    splat: make(S.splat, { uTarget: tex(), aspectRatio: num(), radius: num(), color: { value: new THREE.Vector3() }, point: { value: new THREE.Vector2() } }),
    advection: make(S.advection, { uVelocity: tex(), uSource: tex(), texelSize: vec2(), dt: num(), dissipation: num() }),
    divergence: make(S.divergence, { uVelocity: tex(), texelSize: vec2() }),
    curl: make(S.curl, { uVelocity: tex(), texelSize: vec2() }),
    vorticity: make(S.vorticity, { uVelocity: tex(), uCurl: tex(), texelSize: vec2(), curlStrength: num(), dt: num() }),
    pressure: make(S.pressure, { uPressure: tex(), uDivergence: tex(), texelSize: vec2() }),
    gradientSubtract: make(S.gradientSubtract, { uPressure: tex(), uVelocity: tex(), texelSize: vec2() }),
    clear: make(S.clear, { uTexture: tex(), value: num() }),
    display: make(S.display, { uTexture: tex(), threshold: num(), edgeSoftness: num(), inkColor: { value: new THREE.Color() } }),
  };
  const set = (mat, vals) => { for (const k in vals) mat.uniforms[k].value = vals[k]; return mat; };
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target ?? null); renderer.render(scene, camera); };

  function splat(x, y, vx, vy) {
    set(m.splat, { aspectRatio: W / H, point: new THREE.Vector2(x / W, 1 - y / H), radius: c.splatRadius });
    set(m.splat, { uTarget: velocity.read.texture, color: new THREE.Vector3(vx, -vy, 0) });
    pass(m.splat, velocity.write); velocity.swap();
    set(m.splat, { uTarget: dye.read.texture, color: new THREE.Vector3(3, 3, 3) });
    pass(m.splat, dye.write); dye.swap();
  }
  function simulate(dt) {
    const st = new THREE.Vector2(1 / simSize.w, 1 / simSize.h);
    pass(set(m.curl, { uVelocity: velocity.read.texture, texelSize: st }), curl);
    pass(set(m.vorticity, { uVelocity: velocity.read.texture, uCurl: curl.texture, texelSize: st, curlStrength: c.curl, dt }), velocity.write); velocity.swap();
    pass(set(m.divergence, { uVelocity: velocity.read.texture, texelSize: st }), divergence);
    pass(set(m.clear, { uTexture: pressure.read.texture, value: c.pressureDecay }), pressure.write); pressure.swap();
    set(m.pressure, { uDivergence: divergence.texture, texelSize: st });
    for (let i = 0; i < c.pressureIterations; i++) { m.pressure.uniforms.uPressure.value = pressure.read.texture; pass(m.pressure, pressure.write); pressure.swap(); }
    pass(set(m.gradientSubtract, { uPressure: pressure.read.texture, uVelocity: velocity.read.texture, texelSize: st }), velocity.write); velocity.swap();
    pass(set(m.advection, { uVelocity: velocity.read.texture, uSource: velocity.read.texture, texelSize: st, dt, dissipation: c.velocityDissipation }), velocity.write); velocity.swap();
    pass(set(m.advection, { uSource: dye.read.texture, texelSize: new THREE.Vector2(1 / dyeSize.w, 1 / dyeSize.h), dissipation: c.dyeDissipation }), dye.write); dye.swap();
  }

  // input: pointer relative to the section; an idle wanderer keeps the ink alive until the user moves
  const mouse = { x: 0, y: 0, vx: 0, vy: 0, moved: false, lastUser: 0 };
  const onMove = (cx, cy) => {
    const r = section.getBoundingClientRect();
    const x = (cx - r.left) * dpr, y = (cy - r.top) * dpr;
    mouse.vx = (x - mouse.x) * c.forceStrength; mouse.vy = (y - mouse.y) * c.forceStrength;
    mouse.x = x; mouse.y = y; mouse.moved = true;
  };
  section.addEventListener('pointermove', (e) => { onMove(e.clientX, e.clientY); mouse.lastUser = performance.now(); }, { passive: true });

  let active = false;
  new IntersectionObserver(([e]) => (active = e.isIntersecting), { threshold: 0.05 }).observe(section);
  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.016); last = now;
    if (!active) return;
    if (now - mouse.lastUser > 2500) {
      const t = now / 1000;
      const px = W * (0.5 + 0.32 * Math.sin(t * 0.7)), py = H * (0.5 + 0.28 * Math.sin(t * 1.1 + 1.3));
      mouse.vx = (px - mouse.x) * 2.2; mouse.vy = (py - mouse.y) * 2.2; mouse.x = px; mouse.y = py; mouse.moved = true;
    }
    if (mouse.moved) { splat(mouse.x, mouse.y, mouse.vx, mouse.vy); mouse.moved = false; }
    simulate(dt);
    pass(set(m.display, { uTexture: dye.read.texture, threshold: c.threshold, edgeSoftness: c.edgeSoftness, inkColor: c.inkColor }), null);
  }
  requestAnimationFrame(tick);
}
