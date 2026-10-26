import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };

test('fog band follows the hero and carries the three capability items unchanged', async () => {
  const page = await open();
  const r = await page.evaluate(`const b=document.querySelector('.fog-band');return {
    after: document.getElementById('home').nextElementSibling===b,
    text: b?.textContent.replace(/\\s+/g,' ')||'',
    links: b?.querySelectorAll('a').length,
    glyphs: [...(b?.querySelectorAll('.hero-foot strong')||[])].map(s=>{const g=s.querySelector('svg.iso-glyph');return g?g.getBoundingClientRect().width:0}) }`);
  assert.equal(r.after, true);
  for (const t of ['从现场感知，到业务协同', '智能终端与现场标识', '边缘部署与离线作业', '开放接口与系统集成']) assert.ok(r.text.includes(t), t);
  assert.equal(r.links, 0, 'capability items are plain text');
  assert.equal(r.glyphs.length, 3);
  for (const w of r.glyphs) assert.ok(w >= 28 && w <= 36, `glyph is ${w}px wide`);
});

test('the transition from the hero to the first light floor is long enough on desktop', async () => {
  const page = await open({ width: 1440, height: 900 });
  const r = await page.evaluate(`const b=document.querySelector('.fog-band').getBoundingClientRect();const h=document.getElementById('home').getBoundingClientRect();const s=document.getElementById('solutions').getBoundingClientRect();return {band:b.height,gap:s.top-h.bottom}`);
  assert.ok(r.band >= 380 && r.band <= 460, `band is ${r.band}px`);
  assert.ok(r.gap >= 380, `light floor starts ${r.gap}px after the hero`);
});

test('capability text is white on the mist', async () => {
  const page = await open();
  const l = await page.evaluate(`${HELPERS}return [...document.querySelectorAll('.fog-band .hero-foot strong')].map(s=>lum(rgb(getComputedStyle(s).color)))`);
  for (const v of l) assert.ok(v > .8, `luminance ${v}`);
});

test('the mist ends on the paper colour', async () => {
  const page = await open();
  const bg = await page.evaluate(`return getComputedStyle(document.querySelector('.fog-band')).backgroundImage`);
  assert.match(bg, /rgb\(238, 241, 248\)\)?\s*(100%)?\)?$/);
});

test('the band shortens on phones', async () => {
  const page = await open({ width: 390, height: 844 });
  const h = await page.evaluate(`return document.querySelector('.fog-band').getBoundingClientRect().height`);
  assert.ok(h >= 240 && h <= 320, `band is ${h}px`);
});
