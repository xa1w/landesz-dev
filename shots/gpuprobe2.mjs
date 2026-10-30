import puppeteer from 'puppeteer-core';
const combos = [
  { headless: true, args: ['--enable-unsafe-webgpu','--enable-features=WebGPU,Vulkan','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=metal'] },
  { headless: 'shell', args: ['--enable-unsafe-webgpu','--ignore-gpu-blocklist'] },
  { headless: true, args: ['--enable-unsafe-webgpu','--ignore-gpu-blocklist','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader'] },
];
for (const c of combos) {
  try {
    const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ...c });
    const p = await b.newPage();
    await p.goto('http://localhost:4173/');
    const r = await p.evaluate(async () => { if (!navigator.gpu) return 'no navigator.gpu'; const a = await navigator.gpu.requestAdapter(); return a ? 'adapter ok' : 'no adapter'; });
    console.log(JSON.stringify(c), '->', r); await b.close();
  } catch (e) { console.log(JSON.stringify(c), 'launch err', e.message.slice(0, 120)); }
}
