import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://localhost:3210', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 3000));
await p.screenshot({ path: 'public/work/seven.jpg', type: 'jpeg', quality: 82 });
console.log('ok', await p.title()); await b.close();
