// ISL Robotics: navy field, orange dot-matrix rain shaped by drifting noise
import { fbmSimplex3d } from "@vgpu/wgsl-std/noise/simplex";
import { hash2 } from "@vgpu/wgsl-std/hash";

struct Params { time: f32, aspect: f32 }
@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time;
  let p = vec2f(uv.x * params.aspect, uv.y);
  let g = vec2f(uv.x * 60.0 * params.aspect, uv.y * 60.0);
  let id = floor(g);
  let f = fract(g) - vec2f(0.5);
  let rnd = hash2(id);
  let flow = fract(rnd.x * 7.0 + t * (0.12 + rnd.y * 0.3) - uv.y * 1.2);
  let field = fbmSimplex3d(vec3f(p * 1.5, t * 0.1), 4, 2.17, 0.5) * 0.5 + 0.5;
  let on = smoothstep(0.38, 0.78, field) * (0.2 + 0.8 * pow(flow, 3.0));
  let dot = smoothstep(0.32, 0.16, length(f)) * on;
  let navy = vec3f(0.043, 0.102, 0.169);
  let orange = vec3f(0.91, 0.52, 0.17);
  var col = navy + orange * dot * 0.95;
  col = col * (1.0 - 0.5 * length(uv - vec2f(0.5)));
  return vec4f(col, 1.0);
}
