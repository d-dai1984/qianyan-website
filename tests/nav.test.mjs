import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

let page;
before(async () => { page = await openPage({ reducedMotion: true }); });
after(() => page?.close());

const state = () => page.evaluate(`${HELPERS}const n=document.querySelector('.nav');return {light:n.classList.contains('is-light'),bg:rgb(getComputedStyle(n).backgroundColor),fg:lum(rgb(getComputedStyle(n.querySelector('.nav-links a')).color))}`);
const scrollUnderNav = (sel) => page.evaluate(`const t=document.querySelector('${sel}');scrollTo(0,t.getBoundingClientRect().top+scrollY-20);await new Promise(r=>setTimeout(r,400));`);

test('nav is dark over the hero', async () => {
  await page.scrollTo(0);
  const s = await state();
  assert.equal(s.light, false);
  assert.ok((s.bg.r + s.bg.g + s.bg.b) / 3 < 30, JSON.stringify(s.bg));
});

test('nav turns light over a paper floor, with dark links', async () => {
  await scrollUnderNav('#solutions');
  const s = await state();
  assert.equal(s.light, true);
  assert.deepEqual([s.bg.r, s.bg.g, s.bg.b], [238, 241, 248]);
  assert.ok(s.fg < .5, `link luminance ${s.fg}`);
});

test('at the bottom of the page the nav matches the floor under it', async () => {
  await page.evaluate(`scrollTo(0,document.documentElement.scrollHeight);await new Promise(r=>setTimeout(r,400));`);
  const r = await page.evaluate(`const n=document.querySelector('.nav');const b=n.getBoundingClientRect().bottom;const under=document.elementFromPoint(innerWidth/2,b+2).closest('section,footer');return {light:n.classList.contains('is-light'),underLight:under.classList.contains('tone-light'),under:under.id||under.tagName}`);
  assert.equal(r.light, r.underLight, `nav light=${r.light} over ${r.under}`);
});

test('nav is dark over the contact band', async () => {
  await page.evaluate(`const c=document.getElementById('contact');c.style.minHeight='200vh';scrollTo(0,c.getBoundingClientRect().top+scrollY-20);await new Promise(r=>setTimeout(r,400));`);
  const s = await state();
  await page.evaluate(`document.getElementById('contact').style.minHeight='';`);
  assert.equal(s.light, false);
});

test('nav tone survives a language switch', async () => {
  await scrollUnderNav('#platform');
  await page.evaluate(`document.getElementById('language').click();await new Promise(r=>setTimeout(r,400));`);
  const s = await state();
  assert.equal(s.light, true);
});
