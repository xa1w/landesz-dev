// node shots/one.mjs [baseUrl] -> shots/out/one_d.png, one_m.png
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:4173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
for (const [tag, w, h] of [['d', 1440, 900], ['m', 390, 844]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await p.goto(base, { waitUntil: 'networkidle0' });
  await sleep(2500);
  await p.screenshot({ path: `shots/out/one_${tag}.png` });
  console.log(tag, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 'height', await p.evaluate(() => document.documentElement.scrollHeight));
  await p.close();
}
await b.close();
