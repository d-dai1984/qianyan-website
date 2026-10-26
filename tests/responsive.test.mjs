import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };

for (const [width, height] of [[1440, 900], [1280, 800], [834, 1194], [390, 844]]) {
  for (const lang of ['zh', 'en']) {
    test(`${width}px ${lang}: no sideways scroll and every surface label stays on its face`, async () => {
      const page = await open({ width, height, lang, reducedMotion: true });
      const r = await page.evaluate(`${HELPERS}
        const wide=[...document.querySelectorAll('#app *')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>innerWidth+1&&!e.closest('svg')&&getComputedStyle(e).position!=='fixed'}).slice(0,5).map(e=>e.className||e.tagName);
        const labels=[...document.querySelectorAll('.iso-label')].filter(t=>t.getClientRects().length).map(t=>{const f=t.closest('svg').querySelector('[data-face="'+t.dataset.on+'"]');return inside(t.getBoundingClientRect(),f.getBoundingClientRect())?null:t.textContent}).filter(Boolean);
        return {scroll:document.documentElement.scrollWidth-innerWidth,wide,labels}`);
      assert.ok(r.scroll <= 0, `page is ${r.scroll}px too wide: ${r.wide.join(', ')}`);
      assert.deepEqual(r.labels, []);
    });
  }
}

test('phone hero: drawing below the copy, full width, callouts hidden, surface labels kept', async () => {
  const page = await open({ width: 390, height: 844 });
  const r = await page.evaluate(`const art=document.querySelector('.hero-art').getBoundingClientRect();const copy=document.querySelector('.hero-copy').getBoundingClientRect();const wrap=document.querySelector('#home .wrap').getBoundingClientRect();
    return {below:art.top>=copy.bottom-1,full:art.width>=wrap.width-48,callouts:[...document.querySelectorAll('.hero-art .iso-callout')].map(c=>getComputedStyle(c).display),labels:[...document.querySelectorAll('.hero-art .iso-label')].filter(t=>t.getClientRects().length).length}`);
  assert.equal(r.below, true);
  assert.equal(r.full, true);
  assert.deepEqual(r.callouts, ['none', 'none']);
  assert.equal(r.labels, 2);
});

test('phone platform: the three layers stack vertically', async () => {
  const page = await open({ width: 390, height: 844 });
  const lefts = await page.evaluate(`return [...document.querySelectorAll('.arch-item')].map(a=>Math.round(a.getBoundingClientRect().left))`);
  assert.equal(new Set(lefts).size, 1, `lefts ${lefts}`);
});
