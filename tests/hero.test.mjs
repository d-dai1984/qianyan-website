import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };

for (const lang of ['zh', 'en']) {
  test(`hero shows the isometric stack, not the old device scene (${lang})`, async () => {
    const page = await open({ lang });
    const r = await page.evaluate(`const h=document.getElementById('home');return {
      art: !!h.querySelector('svg.hero-art'),
      old: ['.device','.dashboard','.gateway','.exhibit-side','.exhibit-word','.exhibit-spec','.hero-edition'].filter(s=>document.querySelector('#home '+s)),
      foot: !!h.querySelector('.hero-foot'),
      caption: h.querySelector('.scene-caption')?.textContent.trim()||'' }`);
    assert.equal(r.art, true);
    assert.deepEqual(r.old, []);
    assert.equal(r.foot, false, 'hero-foot moves out of the hero');
    assert.match(r.caption, lang === 'zh' ? /产品形态与界面示意/ : /CONCEPT VISUAL/);
  });

  test(`surface labels sit inside the face they are printed on (${lang})`, async () => {
    const page = await open({ lang });
    const r = await page.evaluate(`${HELPERS}return [...document.querySelectorAll('#home .iso-label')].map(t=>{const f=document.querySelector('#home [data-face="'+t.dataset.on+'"]');return {label:t.textContent,ok:!!f&&inside(t.getBoundingClientRect(),f.getBoundingClientRect())}})`);
    assert.ok(r.length >= 2, 'expects PLATFORM and EDGE labels');
    for (const l of r) assert.ok(l.ok, `${l.label} spills outside its face`);
  });
}

test('hero fills at least one viewport', async () => {
  const page = await open({ width: 1440, height: 900 });
  const h = await page.evaluate(`return document.getElementById('home').getBoundingClientRect().height`);
  assert.ok(h >= 900 - 90, `hero is ${h}px; the sticky nav may take its own height`);
});

test('hero strokes do not thicken when the drawing scales', async () => {
  const page = await open();
  const bad = await page.evaluate(`const ps=[...document.querySelectorAll('#home svg.hero-art path')];return ps.length?ps.filter(p=>getComputedStyle(p).vectorEffect!=='non-scaling-stroke').length:-1`);
  assert.equal(bad, 0);
});

test('hero callout labels stay at 11px or larger', async () => {
  const page = await open();
  const sizes = await page.evaluate(`return [...document.querySelectorAll('#home svg.hero-art text')].map(t=>t.getBoundingClientRect().height)`);
  assert.ok(sizes.length >= 5);
  for (const s of sizes) assert.ok(s >= 10.5, `label renders ${s}px tall`);
});

for (const width of [1440, 390]) {
  test(`hero sits on the dark ink, not on the page paper (${width}px)`, async () => {
    const page = await open({ width, height: 900 });
    const bg = await page.evaluate(`return getComputedStyle(document.getElementById('home')).backgroundColor`);
    assert.equal(bg, 'rgb(4, 6, 12)');
  });
}
