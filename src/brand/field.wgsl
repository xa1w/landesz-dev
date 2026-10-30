// Contour field: slow fBM isolines that bend away from the pointer, with a soft bloom under it
import { fbmSimplex3d } from "@vgpu/wgsl-std/noise/simplex";

struct Params { time: f32, aspect: f32, strength: f32, pad: f32, pointer: vec2f }
@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time;
  let p = vec2f(uv.x * params.aspect, uv.y);
  let m = vec2f(params.pointer.x * params.aspect, params.pointer.y);
  let d = p - m;
  let dist = length(d);
  let push = d * params.strength * 0.9 * exp(-dist * dist * 6.0); // d (not normalized) keeps the centre smooth
  let q = p + push;
  let n = fbmSimplex3d(vec3f(q * 1.6, t * 0.05), 4, 2.17, 0.5);
  let bands = abs(fract(n * 9.0) - 0.5);
  let line = smoothstep(0.08, 0.0, bands);
  let weight = 0.3 + 0.7 * smoothstep(-0.6, 0.6, n);
  let bloom = exp(-dist * dist * 12.0) * params.strength;
  var col = vec3f(0.071, 0.075, 0.059) + vec3f(0.894, 0.875, 0.855) * (line * (0.3 + 0.5 * bloom) * weight + bloom * 0.06);
  col = col * (1.0 - 0.25 * length(uv - vec2f(0.5)));
  return vec4f(col, 1.0);
}
