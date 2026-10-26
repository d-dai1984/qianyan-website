import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage } from './harness.mjs';

let page;
before(async () => { page = await openPage(); });
after(() => page?.close());

test('the page runs the cobalt edition, not the ryugi edition', async () => {
  const cls = await page.evaluate(`return document.documentElement.className`);
  assert.match(cls, /\bcobalt-edition\b/);
  assert.doesNotMatch(cls, /\bryugi-edition\b/);
});

test('cobalt and paper tokens resolve to the approved palette', async () => {
  const v = await page.evaluate(`const s=getComputedStyle(document.documentElement);return ['--c-cobalt','--c-paper','--c-ink-0','--c-sky'].map(k=>s.getPropertyValue(k).trim().toLowerCase())`);
  assert.deepEqual(v, ['#2f55f4', '#eef1f8', '#04060c', '#a9bdff']);
});

test('ryugi.css is not loaded and cobalt.css loads last', async () => {
  const sheets = await page.evaluate(`return [...document.styleSheets].map(s=>s.href&&new URL(s.href).pathname.split('/').pop()).filter(Boolean)`);
  assert.ok(!sheets.includes('ryugi.css'), sheets.join());
  assert.equal(sheets.at(-1), 'cobalt.css');
});

test('tone scopes switch the surface colour', async () => {
  const v = await page.evaluate(`const d=document.createElement('div');d.className='tone-light';document.body.append(d);const l=getComputedStyle(d).getPropertyValue('--bg').trim().toLowerCase();d.className='tone-dark';const k=getComputedStyle(d).getPropertyValue('--bg').trim().toLowerCase();d.remove();return [l,k]`);
  assert.deepEqual(v, ['#eef1f8', '#04060c']);
});
