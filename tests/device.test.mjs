import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

let page;
before(async () => { page = await openPage({ reducedMotion: true }); });
after(() => page?.close());

test('device and phone shells are line-drawn: no metal gradient, no glow', async () => {
  const r = await page.evaluate(`return [...document.querySelectorAll('.device,.phone')].map(d=>{const s=getComputedStyle(d);return {img:s.backgroundImage,shadow:s.boxShadow,border:s.borderTopWidth}})`);
  assert.ok(r.length >= 3);
  for (const d of r) assert.deepEqual(d, { img: 'none', shadow: 'none', border: '1px' });
});

test('the e-paper keeps its real three colours', async () => {
  const r = await page.evaluate(`const d=document.querySelector('#inspection .device');return {paper:getComputedStyle(d.querySelector('.eink')).backgroundColor,status:getComputedStyle(d.querySelector('.eink-status')).backgroundColor,ink:getComputedStyle(d.querySelector('.eink-id')).color}`);
  assert.deepEqual(r, { paper: 'rgb(233, 236, 243)', status: 'rgb(200, 69, 58)', ink: 'rgb(32, 38, 58)' });
});

test('every colour inside the mock-ups comes from the token palette', async () => {
  const bad = await page.evaluate(`${HELPERS}
  const root=getComputedStyle(document.documentElement);
  const tokens=[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch{return []}}).filter(r=>r.selectorText===':root').flatMap(r=>[...r.style]).filter(k=>k.startsWith('--c-')).map(k=>hex(root.getPropertyValue(k)));
  const ok=c=>{const v=rgb(c);return !v||v.a===0||tokens.some(t=>t.r===v.r&&t.g===v.g&&t.b===v.b)};
  const out=[];
  for(const el of document.querySelectorAll('.device,.device *,.phone,.phone *')){const s=getComputedStyle(el);if(!el.getClientRects().length)continue;
    const props=['color','backgroundColor'];for(const side of ['Top','Right','Bottom','Left'])if(parseFloat(s['border'+side+'Width'])>0)props.push('border'+side+'Color');
    for(const p of props)if(!ok(s[p]))out.push(el.className+' '+p+' '+s[p]);}
  return [...new Set(out)].slice(0,20)`);
  assert.deepEqual(bad, []);
});
