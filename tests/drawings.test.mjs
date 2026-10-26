import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage } from './harness.mjs';

let page;
before(async () => { page = await openPage({ reducedMotion: false }); });
after(() => page?.close());

test('each platform layer is an isometric drawing with its spec line', async () => {
  const r = await page.evaluate(`return [...document.querySelectorAll('.arch-item')].map(a=>({iso:!!a.querySelector('svg.iso'),old:!!a.querySelector('svg[viewBox="0 0 64 64"]'),spec:a.querySelector('.iso-spec')?.textContent.trim(),w:a.querySelector('svg.iso')?.getBoundingClientRect().width,text:a.querySelectorAll('svg text').length}))`);
  assert.equal(r.length, 3);
  assert.deepEqual(r.map(x => x.spec), ['E-INK · LED · NFC', 'SUB-1G · BLE · LOCAL CACHE', 'ON-PREM · API · MQTT']);
  for (const x of r) { assert.ok(x.iso); assert.ok(!x.old); assert.equal(x.text, 0, 'small drawings carry no leader text'); assert.ok(x.w >= 200 && x.w <= 360, `drawing is ${x.w}px wide`); }
});

test('the system stage is the three-slab stack and follows the story', async () => {
  const n = await page.evaluate(`return document.querySelectorAll('.system-stage [data-layer]').length`);
  assert.equal(n, 3);
  await page.evaluate(`document.documentElement.style.scrollBehavior='auto';const a=document.querySelectorAll('.arch-item')[1].getBoundingClientRect();scrollTo(0,scrollY+a.top+a.height/2-innerHeight/2);await new Promise(r=>setTimeout(r,500));`);
  const r = await page.evaluate(`return [0,1,2].map(i=>{const g=document.querySelector('.system-stage [data-layer="'+i+'"]');const p=g.querySelector('path.top');return {current:g.classList.contains('is-current'),opacity:+getComputedStyle(g).opacity,stroke:parseFloat(getComputedStyle(p).strokeWidth)}})`);
  assert.equal(r[1].current, true);
  assert.equal(r[1].stroke, 1.5);
  assert.ok(r[0].opacity < 1 && r[2].opacity < 1, JSON.stringify(r));
});

test('products 2–4 show an isometric concept in the feature panel', async () => {
  for (const i of [1, 2, 3]) {
    const r = await page.evaluate(`document.querySelector('[data-product="${i}"]').click();await new Promise(r=>setTimeout(r,100));const alt=document.querySelector('.feature-panel .alternative-concept');return {iso:!!alt.querySelector('svg.iso'),visible:alt.getBoundingClientRect().height>100,visual:getComputedStyle(document.querySelector('.feature-visual')).visibility}`);
    assert.ok(r.iso, `product ${i}`);
    assert.ok(r.visible, `product ${i} concept is visible`);
    assert.equal(r.visual, 'hidden', 'the inspection device steps aside');
  }
});
