import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };
const slabs = (page) => page.evaluate(`return [...document.querySelectorAll('.hero-art [data-slab]')].map(g=>new DOMMatrix(getComputedStyle(g).transform).f)`);

test('hero slabs drift apart as the page scrolls, never more than 12px', async () => {
  const page = await open({ width: 1440, height: 900 });
  await page.scrollTo(300);
  const y = await slabs(page);
  assert.equal(y.length, 3);
  assert.equal(new Set(y.map(v => v.toFixed(2))).size, 3, `offsets ${y}`);
  assert.ok(y.some(v => Math.abs(v) > 0.5), `offsets ${y}`);
  for (const v of y) assert.ok(Math.abs(v) <= 12, `offset ${v}`);
});

test('the drift caps at 12px even far below the hero', async () => {
  const page = await open({ width: 1440, height: 900 });
  await page.scrollTo(2400);
  for (const v of await slabs(page)) assert.ok(Math.abs(v) <= 12, `offset ${v}`);
});

test('reduced motion keeps the stack still', async () => {
  const page = await open({ width: 1440, height: 900, reducedMotion: true });
  await page.scrollTo(300);
  assert.deepEqual(await slabs(page), [0, 0, 0]);
});
