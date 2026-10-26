// Drives the system Chrome over the DevTools protocol. No npm dependencies:
// a static server for the repo root, Node's built-in WebSocket for CDP.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try {
      const file = path === '/' ? 'index.html' : path;
      const body = await readFile(join(ROOT, file));
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function launch() {
  const profile = await mkdtemp(join(tmpdir(), 'qy-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((ok, fail) => {
    let buf = '';
    proc.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
    proc.on('exit', () => fail(new Error('chrome exited: ' + buf)));
  });
  return { proc, profile, wsUrl };
}

function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) { const { ok, fail } = pending.get(msg.id); pending.delete(msg.id); msg.error ? fail(new Error(msg.error.message)) : ok(msg.result); }
    else listeners.forEach(l => l(msg));
  };
  const ready = new Promise(ok => { ws.onopen = ok; });
  const send = (method, params = {}, sessionId) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });
  const once = (method, sessionId) => new Promise(ok => { const l = m => { if (m.method === method && m.sessionId === sessionId) { listeners.splice(listeners.indexOf(l), 1); ok(m.params); } }; listeners.push(l); });
  return { ready, send, once, close: () => ws.close() };
}

const frame = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,60))))';

export async function openPage({ width = 1440, height = 900, lang = 'zh', reducedMotion = false, webfonts = false } = {}) {
  const server = await serve();
  const { proc, profile, wsUrl } = await launch();
  const cdp = client(wsUrl); await cdp.ready;
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => cdp.send(m, p, sessionId);
  await s('Page.enable');
  // Webfonts are external; block them so runs are deterministic and offline-safe.
  await s('Network.enable');
  if (!webfonts) await s('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] });
  await s('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/${lang === 'en' ? '?lang=en' : ''}` });
  for (let t = 0; ; t += 100) {
    const r = await s('Runtime.evaluate', { expression: `document.readyState+'|'+location.href`, returnByValue: true });
    if (r.result.value.startsWith('complete|http')) break;
    if (t > 15000) throw new Error('page load timed out: ' + r.result.value);
    await new Promise(ok => setTimeout(ok, 100));
  }
  const evaluate = async (expression) => {
    const r = await s('Runtime.evaluate', { expression: `(async()=>{${expression}})()`, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await evaluate(`await document.fonts.ready; await ${frame};`);
  return {
    evaluate,
    scrollTo: (y) => evaluate(`document.documentElement.style.scrollBehavior='auto';scrollTo(0,${y});await ${frame};await ${frame};`),
    // One viewport pixel as {r,g,b}: capture the viewport and decode the PNG by hand (8-bit RGB/RGBA, all five filters).
    async pixel(x, y) {
      const { data } = await s('Page.captureScreenshot', { format: 'png' });
      const png = Buffer.from(data, 'base64'); const idat = []; let w = 0, ch = 4;
      for (let i = 8; i < png.length;) { const len = png.readUInt32BE(i); const type = png.toString('ascii', i + 4, i + 8);
        if (type === 'IHDR') { w = png.readUInt32BE(i + 8); ch = png[i + 17] === 6 ? 4 : 3; }
        if (type === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len)); i += 12 + len; }
      const raw = inflateSync(Buffer.concat(idat)); const stride = w * ch; let prev = Buffer.alloc(stride), row;
      for (let r = 0; r <= y; r++) {
        const f = raw[r * (stride + 1)]; row = Buffer.from(raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1)));
        for (let i = 0; i < stride; i++) { const a = i >= ch ? row[i - ch] : 0, up = prev[i], c = i >= ch ? prev[i - ch] : 0;
          const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
          row[i] = (row[i] + [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][f]) & 255; }
        prev = row; }
      return { r: row[x * ch], g: row[x * ch + 1], b: row[x * ch + 2] };
    },
    // PNG bytes of a page region (document coordinates), for visual evidence.
    async screenshot(clip) {
      const { data } = await s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}) });
      return Buffer.from(data, 'base64');
    },
    async close() { cdp.close(); proc.kill(); server.close(); await rm(profile, { recursive: true, force: true }).catch(() => {}); },
  };
}

// Shared page-side helpers, injected into evaluate() calls.
export const HELPERS = `
const rgb = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
const hex = (h) => { const n = parseInt(h.trim().slice(1), 16); return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 }; };
const lum = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const inside = (a, b, tol = 1) => a.left >= b.left - tol && a.right <= b.right + tol && a.top >= b.top - tol && a.bottom <= b.bottom + tol;
`;
