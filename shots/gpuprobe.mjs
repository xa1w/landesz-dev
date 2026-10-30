import puppeteer from 'puppeteer-core';
for (const args of [['--enable-unsafe-webgpu'], ['--enable-unsafe-webgpu','--use-angle=metal'], ['--enable-unsafe-webgpu','--enable-features=Vulkan']]) {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args });
  const p = await b.newPage();
  await p.setContent('<canvas id=c width=64 height=64></canvas>');
  const r = await p.evaluate(async () => {
    if (!navigator.gpu) return 'no navigator.gpu';
    const a = await navigator.gpu.requestAdapter(); if (!a) return 'no adapter';
    const d = await a.requestDevice();
    const c = document.getElementById('c'); const ctx = c.getContext('webgpu');
    ctx.configure({ device: d, format: navigator.gpu.getPreferredCanvasFormat() });
    const enc = d.createCommandEncoder();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: 'clear', clearValue: [1, 0, 0, 1], storeOp: 'store' }] }); pass.end();
    d.queue.submit([enc.finish()]);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const gl = document.createElement('canvas').getContext('2d'); gl.drawImage(c, 0, 0);
    return 'adapter ok, pixel=' + Array.from(gl.getImageData(1, 1, 1, 1).data).join(',');
  }).catch(e => 'err ' + e.message);
  console.log(args.join(' '), '->', r);
  await b.close();
}
