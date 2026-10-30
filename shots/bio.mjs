// node shots/bio.mjs -> shots/out/bio_d.png, bio_m.png (after clicking through the splash)
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=metal'] });
for (const [tag, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  p.on('console', (m) => m.type() === 'error' && !m.text().includes('track.mp3') && console.log('CONSOLE', m.text()));
  await p.goto('http://localhost:4173/bio.html', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await p.screenshot({ path: `shots/out/bio_${tag}_splash.png` });
  await p.click('[data-enter]');
  await sleep(2500);
  await p.screenshot({ path: `shots/out/bio_${tag}.png`, fullPage: tag === 'm' });
  console.log(tag, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await p.close();
}
await b.close();
console.log('done');
