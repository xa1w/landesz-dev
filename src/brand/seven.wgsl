// Seven: basalt field with slow quartz contour lines
import { fbmSimplex3d } from "@vgpu/wgsl-std/noise/simplex";

struct Params { time: f32, aspect: f32 }
@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time;
  let p = vec2f(uv.x * params.aspect, uv.y);
  let n = fbmSimplex3d(vec3f(p * 1.5, t * 0.05), 4, 2.17, 0.5);
  let bands = abs(fract(n * 8.0) - 0.5);
  let line = smoothstep(0.07, 0.0, bands);
  let weight = 0.25 + 0.75 * smoothstep(-0.6, 0.6, n);
  var col = vec3f(0.071, 0.075, 0.059) + vec3f(0.894, 0.875, 0.855) * line * 0.32 * weight;
  col = col * (1.0 - 0.3 * length(uv - vec2f(0.5)));
  return vec4f(col, 1.0);
}
