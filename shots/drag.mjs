import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=metal'] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await sleep(4000);
await p.mouse.move(1000, 330); await sleep(300);
console.log('cursor over blob:', await p.evaluate(() => document.getElementById('hero').style.cursor));
await p.mouse.down();
for (let i = 1; i <= 24; i++) { await p.mouse.move(1000 - i * 22, 330 + i * 10); await sleep(30); }
await sleep(400);
await p.screenshot({ path: 'shots/out/d_stretch_held.png' });
await p.mouse.up(); await sleep(250);
await p.screenshot({ path: 'shots/out/d_stretch_snap.png' });
await sleep(2000);
await p.screenshot({ path: 'shots/out/d_stretch_rest.png' });
await b.close(); console.log('done');
