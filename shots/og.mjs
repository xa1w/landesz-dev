// node shots/og.mjs -> public/og.png : just the wordmark, same type as the site
import puppeteer from 'puppeteer-core';
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@600&display=swap" rel="stylesheet">
<style>html,body{margin:0;width:1200px;height:630px;background:#12130f;overflow:hidden}
.w{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:600 190px/1 "Host Grotesk",system-ui,sans-serif;letter-spacing:-.045em;color:#e4dfda;white-space:nowrap}
.w span{color:rgba(228,223,218,.55);font-weight:400}</style></head>
<body><div class="w">landesz<span>.dev</span></div></body></html>`;
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await p.setContent(html, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: 'public/og.png' });
await b.close();
console.log('ok');
