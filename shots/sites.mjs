import puppeteer from 'puppeteer-core';
const sites = [
  ['isl', 'https://islrobotics.com'],
  ['haven', 'https://haven-lyon.vercel.app'],
  ['bugaroos', 'https://www.bugaroos.com'],
  ['atomifys', 'https://atomifys.com'],
];
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
for (const [name, url] of sites) {
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  try {
    await p.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 2500));
    await p.screenshot({ path: `public/work/${name}.jpg`, type: 'jpeg', quality: 82 });
    console.log('ok', name, await p.title());
  } catch (e) { console.log('fail', name, e.message); }
  await p.close();
}
await b.close();
