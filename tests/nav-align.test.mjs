import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };

for (const width of [1440, 1920, 834]) {
  test(`nav, hero and floors share one content edge (${width}px)`, async () => {
    const page = await open({ width, height: 900, reducedMotion: true });
    const r = await page.evaluate(`const edge=s=>{const e=document.querySelector(s);const b=e.getBoundingClientRect();const c=getComputedStyle(e);return [Math.round(b.left+parseFloat(c.paddingLeft)),Math.round(b.right-parseFloat(c.paddingRight))]};
      return {nav:edge('.nav-inner'),hero:edge('#home>.wrap'),fog:edge('.fog-band .wrap'),floor:edge('#platform>.wrap')}`);
    assert.deepEqual(r.hero, r.nav, `hero ${r.hero} vs nav ${r.nav}`);
    assert.deepEqual(r.fog, r.nav);
    assert.deepEqual(r.floor, r.nav);
  });
}

test('the nav has no fill of its own, over dark or paper', async () => {
  const page = await open({ reducedMotion: true });
  const top = await page.evaluate(`${HELPERS}return rgb(getComputedStyle(document.querySelector('.nav')).backgroundColor).a`);
  await page.evaluate(`document.documentElement.style.scrollBehavior='auto';scrollTo(0,document.getElementById('solutions').offsetTop+40);await new Promise(r=>setTimeout(r,400));`);
  const paper = await page.evaluate(`${HELPERS}const n=document.querySelector('.nav');return {a:rgb(getComputedStyle(n).backgroundColor).a,light:n.classList.contains('is-light')}`);
  assert.equal(top, 0);
  assert.equal(paper.a, 0);
  assert.equal(paper.light, true, 'link colours still follow the floor');
});

for (const width of [1440, 390]) {
  test(`the hero's ink runs up behind the transparent nav (${width}px)`, async () => {
    const page = await open({ width, height: 844, reducedMotion: true });
    const r = await page.evaluate(`const n=document.querySelector('.nav').getBoundingClientRect();const h=document.getElementById('home').getBoundingClientRect();return {navBottom:n.bottom,heroTop:h.top,x:Math.round(innerWidth*.45),y:Math.round(n.height/2)}`);
    assert.ok(r.heroTop <= 0, `hero starts at ${r.heroTop}px, below the nav`);
    const px = await page.pixel(r.x, r.y);
    assert.ok((px.r + px.g + px.b) / 3 < 40, `behind the nav ${JSON.stringify(px)}`);
  });
}
