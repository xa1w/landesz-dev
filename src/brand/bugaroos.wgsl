// Bugaroos: night-blue sky, twinkling sparkles and slow soap bubbles
import { simplex3d } from "@vgpu/wgsl-std/noise/simplex";
import { hash1, hash2 } from "@vgpu/wgsl-std/hash";

struct Params { time: f32, aspect: f32 }
@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time;
  let p = vec2f(uv.x * params.aspect, uv.y);
  let haze = simplex3d(vec3f(p * 1.1, t * 0.05)) * 0.5 + 0.5;
  var col = mix(vec3f(0.02, 0.07, 0.26), vec3f(0.08, 0.22, 0.58), smoothstep(0.1, 0.9, uv.y * 0.5 + haze * 0.6));

  let g = p * 26.0;
  let id = floor(g);
  let f = fract(g) - vec2f(0.5);
  let r = hash2(id);
  let tw = 0.5 + 0.5 * sin(t * (1.2 + r.y * 3.0) + r.x * 6.2831);
  let star = smoothstep(0.07, 0.0, length(f - (r - vec2f(0.5)) * 0.6)) * step(0.86, r.x) * tw;
  col = col + vec3f(1.0, 0.96, 0.82) * star;

  for (var i = 0; i < 7; i = i + 1) {
    let fi = f32(i);
    let rad = 0.05 + hash1(fi + 3.0) * 0.09;
    let cx = hash1(fi) * params.aspect;
    let cy = fract(hash1(fi + 20.0) + t * (0.018 + 0.012 * hash1(fi + 40.0)));
    let c = vec2f(cx + sin(t * 0.4 + fi) * 0.03, 1.0 - cy);
    let d = length(p - c);
    let ring = smoothstep(0.012, 0.0, abs(d - rad));
    let fill = smoothstep(rad, rad * 0.4, d) * 0.08;
    let hi = smoothstep(0.02, 0.0, length(p - c + vec2f(rad * 0.45, rad * 0.45)));
    col = col + vec3f(0.65, 0.85, 1.0) * (ring * 0.45 + fill) + vec3f(1.0) * hi * 0.5;
  }
  col = col * (1.0 - 0.35 * length(uv - vec2f(0.5)));
  return vec4f(col, 1.0);
}
