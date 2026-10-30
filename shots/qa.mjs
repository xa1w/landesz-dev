// node shots/qa.mjs [baseUrl]  -> shots/out/*.png
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:4173';
fs.mkdirSync('shots/out', { recursive: true });
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=metal'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stops = ['#hero', '#fluid', '#ascii', '#field', '#skills', '#contact'];
for (const [tag, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await p.goto(base, { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(4000);
  for (const sel of stops) {
    await p.evaluate((s) => window.scrollTo(0, document.querySelector(s).offsetTop), sel);
    await sleep(1200);
    // sweep the pointer through the section so the interactive pieces have something to show
    for (let i = 0; i <= 12; i++) { await p.mouse.move(w * (0.2 + 0.6 * i / 12), h * (0.35 + 0.25 * Math.sin(i))); await sleep(40); }
    if (sel === '#skills') { await p.mouse.move(w * 0.3, (await p.evaluate(() => document.querySelector('.skill').getBoundingClientRect().top)) + 40); await sleep(1400); }
    await sleep(900);
    await p.screenshot({ path: `shots/out/${tag}_${sel.slice(1)}.png` });
    console.log(tag, sel, 'title/note opacity', await p.evaluate((s) => [...document.querySelectorAll(s + ' .piece__title, ' + s + ' .piece__note')].map((e) => getComputedStyle(e).opacity).join(','), sel));
  }
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(tag, 'horizontal overflow px:', overflow, 'scrollHeight:', await p.evaluate(() => document.documentElement.scrollHeight));
  await p.close();
}
await b.close();
console.log('done');
