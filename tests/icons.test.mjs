import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage } from './harness.mjs';

let page;
before(async () => { page = await openPage(); });
after(() => page?.close());

test('no typed glyphs stand in for icons in controls and diagrams', async () => {
  const hits = await page.evaluate(`const els=[...document.querySelectorAll('#app a,#app button,.arch-arrow,.platform-bottom,.platform-bottom *')].filter(e=>!e.closest('.device,.phone'));
  return els.flatMap(e=>[...e.childNodes].filter(n=>n.nodeType===3&&/[↗☰+↓↔↳]/.test(n.textContent)).map(n=>(e.id||e.className)+': '+n.textContent.trim()))`);
  assert.deepEqual(hits, []);
});

test('menu, product toggles and link arrows use line icons', async () => {
  const r = await page.evaluate(`return {menu:!!document.querySelector('#menu svg.ui-icon'),toggles:[...document.querySelectorAll('.product-toggle')].every(b=>b.querySelector('svg.ui-icon')),links:[...document.querySelectorAll('.text-link,.button')].every(a=>a.querySelector('svg.ui-icon')),stroke:getComputedStyle(document.querySelector('#menu svg.ui-icon path')).strokeWidth}`);
  assert.equal(r.menu, true);
  assert.equal(r.toggles, true);
  assert.equal(r.links, true);
  assert.equal(r.stroke, '1.4px');
});
