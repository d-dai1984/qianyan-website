// Text and graphics are separate parallax layers: on scroll they visibly part.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };
const ownY = (sel) => `(()=>{const e=document.querySelector('${sel}');const t=getComputedStyle(e).translate;return t==='none'?0:parseFloat(t.split(' ')[1]||0)})()`;

const FLOORS = [
  ['#solutions', '#solutions .product-list', '#solutions .feature-panel'],
  ['#platform', '#platform .arch-item h3', '#platform .arch-item .arch-glyph'],
  ['#inspection', '#inspection .inspection-copy', '#inspection .inspection-demo'],
  ['#contact', '#contact .contact-copy', '#contact .brief'],
];

for (const [floor, text, graphic] of FLOORS) {
  test(`${floor}: text and graphic layers part as the floor scrolls by`, async () => {
    const page = await open();
    const r = await page.evaluate(`document.documentElement.style.scrollBehavior='auto';const f=document.querySelector('${floor}');scrollTo(0,f.getBoundingClientRect().top+scrollY-innerHeight*.6);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,80))));return {text:${ownY(text)},graphic:${ownY(graphic)}}`);
    assert.ok(Math.abs(r.text - r.graphic) >= 14, `text ${r.text} vs graphic ${r.graphic}`);
  });
}

test('hero copy and drawing part as the hero scrolls away', async () => {
  const page = await open();
  await page.scrollTo(320);
  const r = await page.evaluate(`return {text:${ownY('.hero-copy')},graphic:${ownY('.hero-figure')}}`);
  assert.ok(Math.abs(r.text - r.graphic) >= 14, `text ${r.text} vs graphic ${r.graphic}`);
});

test('layers stay put under reduced motion', async () => {
  const page = await open({ reducedMotion: true });
  await page.scrollTo(1800);
  const ys = await page.evaluate(`return [...document.querySelectorAll('[data-scroll-layer]')].map(e=>{const t=getComputedStyle(e).translate;return t==='none'?0:parseFloat(t.split(' ')[1]||0)})`);
  for (const y of ys) assert.equal(y, 0);
});

test('state buttons carry no leftover underline', async () => {
  const page = await open();
  const w = await page.evaluate(`return getComputedStyle(document.querySelector('.state-buttons')).borderBottomWidth`);
  assert.equal(w, '0px');
});
