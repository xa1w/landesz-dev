import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadLogo, glyphCanvas } from './brand.js';

// Hero: a liquid-chrome form, displaced by noise on the GPU, lit by a studio
// environment so it reflects the dark room. Work: one slab per project textured
// with a real screenshot. main.js owns the scroll choreography.

const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export function createScene(canvas, projects, brand) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 4, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe4dfda, 0.8);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  /* hero form */
  const uniforms = {
    uTime: { value: 0 }, uAmp: { value: 0.26 }, uFreq: { value: 0.55 },
    // dough pull: a patch around uPullOrigin (object space) is dragged along uPullVec
    uPullOrigin: { value: new THREE.Vector3(0, 0, 1.5) },
    uPullVec: { value: new THREE.Vector3() },
    uPullAmt: { value: 0 },
  };
  const hold = { value: false }; // true while a pull is held: idle spin pauses
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0x8f8a84, metalness: 1, roughness: 0.2,
    clearcoat: 1, clearcoatRoughness: 0.12,
    iridescence: 0.35, iridescenceIOR: 1.3, iridescenceThicknessRange: [140, 420],
    envMapIntensity: 0.55,
  });
  chrome.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = `uniform float uTime; uniform float uAmp; uniform float uFreq;
      uniform vec3 uPullOrigin; uniform vec3 uPullVec; uniform float uPullAmt;\n${SNOISE}
      vec3 disp(vec3 p){
        vec3 q = p * uFreq + vec3(0.0, uTime * 0.18, uTime * 0.11);
        float n = snoise(q) + 0.3 * snoise(q * 2.1 + 11.0);
        vec3 r = p + normalize(p) * n * uAmp;
        // dough: a soft patch follows the pull, tapering to a thin tip the further it goes
        float len = length(uPullVec);
        float radius = 0.85 + 0.12 * len;
        float w = pow(smoothstep(radius, 0.0, distance(p, uPullOrigin)), 1.0 + 0.5 * len);
        return r + uPullVec * w * uPullAmt;
      }\n` + s.vertexShader
      .replace('#include <beginnormal_vertex>', `
        vec3 upv = abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 tA = normalize(cross(normal, upv));
        vec3 bA = normalize(cross(normal, tA));
        float eps = 0.015;
        vec3 d0 = disp(position);
        vec3 d1 = disp(position + tA * eps);
        vec3 d2 = disp(position + bA * eps);
        vec3 objectNormal = normalize(cross(d1 - d0, d2 - d0));
        #ifdef USE_TANGENT
        vec3 objectTangent = vec3( tangent.xyz );
        #endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = d0;');
  };
  const heroObj = new THREE.Group();
  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 56), chrome);
  heroObj.add(blob);
  scene.add(heroObj);

  /* work slabs */
  const group = new THREE.Group();
  scene.add(group);
  const W = 3.2, H = 2.0, D = 0.08;
  const geo = new RoundedBoxGeometry(W, H, D, 4, 0.06);
  const side = new THREE.MeshStandardMaterial({ color: 0x1e1f1b, roughness: 0.5, metalness: 0.25 });
  const loader = new THREE.TextureLoader();
  const liveTex = [];
  const logos = [];
  const slabs = projects.map((p, i) => {
    // brand mode: a live WebGPU canvas per project; fallback: the static screenshot
    const tex = brand ? new THREE.CanvasTexture(brand.canvases[i]) : loader.load(p.image);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (brand) liveTex.push(tex);
    const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.02, envMapIntensity: 0.35 });
    const mesh = new THREE.Mesh(geo, [side, side, side, side, front, side]);
    group.add(mesh);
    if (brand) {
      const ready = p.logo
        ? loadLogo(p.logo)
        : document.fonts.load('600 420px "Host Grotesk"').then(() => glyphCanvas(p.glyph));
      ready.then((c) => {
        if (!c) return;
        const lt = new THREE.CanvasTexture(c);
        lt.colorSpace = THREE.SRGBColorSpace;
        lt.anisotropy = 8;
        const h = 0.82, w = h * (c.width / c.height);
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, toneMapped: false }),
        );
        plane.position.z = D / 2 + 0.03;
        mesh.add(plane);
        logos[i] = plane;
      });
    }
    return mesh;
  });

  /* pointer: tilt + a little extra turbulence while moving */
  const pointer = { x: 0, y: 0, v: 0 };
  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.v = Math.min(1, pointer.v + Math.hypot(nx - pointer.x, ny - pointer.y) * 4);
    pointer.x = nx; pointer.y = ny;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const t0 = performance.now();
  let last = t0;
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    const t = (now - t0) / 1000;
    uniforms.uTime.value = t;
    pointer.v *= 0.94;
    const targetAmp = 0.26 + pointer.v * 0.2;
    uniforms.uAmp.value += (targetAmp - uniforms.uAmp.value) * 0.08;
    heroObj.rotation.y += dt * (hold.value ? 0 : 0.12);
    heroObj.rotation.x += (-pointer.y * 0.25 - heroObj.rotation.x) * 0.04;
    heroObj.rotation.z += (pointer.x * 0.18 - heroObj.rotation.z) * 0.04;
    group.rotation.y += (pointer.x * 0.1 - group.rotation.y) * 0.05;
    group.rotation.x += (-pointer.y * 0.06 - group.rotation.x) * 0.05;
    if (brand) {
      brand.tick(dt);
      for (const tex of liveTex) tex.needsUpdate = true;
      logos.forEach((l, i) => { if (l) l.position.y = Math.sin(t * 1.1 + i * 1.7) * 0.025; });
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { group, slabs, heroObj, blob, uniforms, hold, camera, W, H };
}
