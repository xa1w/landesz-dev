// Haven Lyon: warm painterly amber, domain-warped noise with faint brush strokes
import { fbmSimplex3d, simplex3d } from "@vgpu/wgsl-std/noise/simplex";

struct Params { time: f32, aspect: f32 }
@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time;
  let p = vec2f(uv.x * params.aspect, uv.y);
  let warp = vec2f(
    simplex3d(vec3f(p * 1.2, t * 0.07)),
    simplex3d(vec3f(p * 1.2 + vec2f(5.3, 1.7), t * 0.07)));
  let n = fbmSimplex3d(vec3f(p * 1.9 + warp * 0.7, t * 0.09), 5, 2.17, 0.55) * 0.5 + 0.5;
  let ember = vec3f(0.42, 0.10, 0.05);
  let deep = vec3f(0.82, 0.31, 0.08);
  let amber = vec3f(0.99, 0.64, 0.20);
  var col = mix(ember, deep, smoothstep(0.18, 0.58, n));
  col = mix(col, amber, smoothstep(0.6, 0.96, n));
  let stroke = sin(p.y * 46.0 + n * 14.0 + t * 0.3) * 0.5 + 0.5;
  col = col + vec3f(0.07, 0.05, 0.02) * pow(stroke, 10.0);
  col = col * (1.0 - 0.35 * length(uv - vec2f(0.5)));
  return vec4f(col, 1.0);
}
