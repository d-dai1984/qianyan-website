// Second motion pass: the system "runs" — signals flow, layers part and assemble, the page has depth.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };
const spread = (sel) => `const y=[...document.querySelectorAll('${sel}')].map(g=>new DOMMatrix(getComputedStyle(g).transform).f);return Math.max(...y)-Math.min(...y)`;

for (const sel of ['.hero-art', '.system-iso']) {
  test(`signals travel along the connectors in ${sel}`, async () => {
    const page = await open();
    const r = await page.evaluate(`const s=document.querySelector('${sel}');return {signals:s.querySelectorAll('.signal animateMotion').length,paused:s.animationsPaused()}`);
    assert.ok(r.signals >= 2, `found ${r.signals}`);
    assert.equal(r.paused, false);
  });
}

test('signals and node pulses stop under reduced motion', async () => {
  const page = await open({ reducedMotion: true });
  const r = await page.evaluate(`return [...document.querySelectorAll('.hero-art,.system-iso')].map(s=>s.animationsPaused())`);
  assert.deepEqual(r, [true, true]);
});

test('the hero stack opens like an exploded view as the hero scrolls away', async () => {
  const page = await open();
  await page.scrollTo(0);
  const closed = await page.evaluate(spread('.hero-art [data-slab]'));
  await page.scrollTo(450);
  const open_ = await page.evaluate(spread('.hero-art [data-slab]'));
  assert.ok(closed < 1, `at rest ${closed}`);
  assert.ok(open_ >= 16 && open_ <= 48, `opened ${open_}`);
});

test('the platform stack assembles as it reaches the middle of the screen', async () => {
  const page = await open();
  const at = (f) => page.evaluate(`document.documentElement.style.scrollBehavior='auto';const s=document.querySelector('.system-stage');const r=s.getBoundingClientRect();scrollTo(0,scrollY+r.top-innerHeight*${f});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,80))));${spread('.system-stage [data-layer]')}`);
  const entering = await at(0.85);
  const centred = await at(0.2);
  assert.ok(entering >= 20, `entering ${entering}`);
  assert.ok(centred <= 2, `centred ${centred}`);
});

test('hero copy has its parallax and entrance back', async () => {
  const page = await open();
  await page.scrollTo(300);
  const r = await page.evaluate(`const c=getComputedStyle(document.querySelector('.hero-copy'));return {translate:c.translate,anim:c.animationName}`);
  assert.notEqual(r.translate, 'none');
  assert.notEqual(r.translate, '0px');
  assert.notEqual(r.anim, 'none');
});

test('every floor heading takes part in the parallax', async () => {
  const page = await open();
  const n = await page.evaluate(`return [...document.querySelectorAll('#main>section .section-head')].filter(h=>h.closest('[data-scroll-layer]')||h.hasAttribute('data-scroll-layer')).length`);
  const total = await page.evaluate(`return document.querySelectorAll('#main>section .section-head').length`);
  assert.equal(n, total);
});

test('the hero drawing tilts toward the pointer, and not under reduced motion', async () => {
  for (const reducedMotion of [false, true]) {
    const page = await open({ reducedMotion });
    const t = await page.evaluate(`const f=document.querySelector('.hero-figure');const r=f.getBoundingClientRect();f.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.right-10,clientY:r.top+10,pointerType:'mouse'}));await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,60)));return getComputedStyle(document.querySelector('.hero-art')).transform`);
    if (reducedMotion) assert.equal(t, 'none');
    else assert.notEqual(t, 'none');
  }
});

test('changing the demo state sends an NFC ripple across the device', async () => {
  const page = await open();
  const r = await page.evaluate(`document.querySelector('[data-state="2"]').click();await new Promise(r=>setTimeout(r,50));const ring=document.querySelector('#inspection .nfc-ripple');return {ring:!!ring,anim:ring&&getComputedStyle(ring).animationName}`);
  assert.equal(r.ring, true);
  assert.notEqual(r.anim, 'none');
});
