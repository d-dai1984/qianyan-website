// Regressions found in the final whole-branch review.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };
const contrast = (a, b) => { const L = ({ r, g, b }) => { const c = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * c(r) + .7152 * c(g) + .0722 * c(b); }; const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

for (const width of [390, 834]) {
  test(`open menu has an opaque panel (${width}px)`, async () => {
    const page = await open({ width, height: 844, reducedMotion: true });
    const bg = await page.evaluate(`${HELPERS}document.getElementById('menu').click();await new Promise(r=>setTimeout(r,100));return rgb(getComputedStyle(document.getElementById('navigation')).backgroundColor)`);
    assert.ok(bg && bg.a >= .9, JSON.stringify(bg));
  });
}

test('hero keeps its text hierarchy: dim line, sky accent, muted body', async () => {
  const page = await open({ reducedMotion: true });
  const r = await page.evaluate(`const c=s=>getComputedStyle(document.querySelector(s)).color;return [c('#home h1 .dim'),c('#home h1 em'),c('.hero-copy>p'),c('.scene-caption')]`);
  assert.deepEqual(r, ['rgb(140, 149, 176)', 'rgb(169, 189, 255)', 'rgb(154, 163, 189)', 'rgb(154, 163, 189)']);
});

for (const [width, lang] of [[390, 'zh'], [390, 'en'], [1440, 'zh'], [1440, 'en']]) {
  test(`fog text keeps 4.5:1 against what is really behind it (${width}px ${lang})`, async () => {
    const page = await open({ width, height: 844, lang, reducedMotion: true });
    const spots = await page.evaluate(`document.documentElement.style.scrollBehavior='auto';const b=document.querySelector('.fog-band');scrollTo(0,b.getBoundingClientRect().top+scrollY-100);await new Promise(r=>setTimeout(r,200));
      const items=[...b.querySelectorAll('.hero-foot>span,.hero-foot strong')];const out=items.map(e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.left+r.width*.75),y:Math.round(r.top+r.height/2),fg:getComputedStyle(e).color}});
      b.style.color='transparent';b.querySelectorAll('*').forEach(e=>e.style.color='transparent');b.querySelectorAll('svg').forEach(e=>e.style.visibility='hidden');return out`);
    for (const s of spots) {
      const bg = await page.pixel(s.x, s.y);
      const ratio = contrast({ r: 242, g: 244, b: 251 }, bg);
      assert.ok(ratio >= 4.5, `at ${s.x},${s.y} bg ${JSON.stringify(bg)} gives ${ratio.toFixed(2)}:1`);
    }
  });
}

test('the capability strip sits inside the blue, not in the black top of the band (1440px)', async () => {
  const page = await open({ reducedMotion: true });
  const y = await page.evaluate(`document.documentElement.style.scrollBehavior='auto';const b=document.querySelector('.fog-band');scrollTo(0,b.getBoundingClientRect().top+scrollY-100);await new Promise(r=>setTimeout(r,200));const s=b.querySelector('.hero-foot strong').getBoundingClientRect();b.style.color='transparent';b.querySelectorAll('*').forEach(e=>e.style.color='transparent');b.querySelectorAll('svg').forEach(e=>e.style.visibility='hidden');return {x:Math.round(s.left+s.width*.75),y:Math.round(s.top+s.height/2)}`);
  const bg = await page.pixel(y.x, y.y);
  assert.ok(bg.b - Math.max(bg.r, bg.g) >= 60, `behind the strip ${JSON.stringify(bg)}`);
});

for (const width of [1440, 834]) {
  test(`hero callouts render at 11px or more on screen (${width}px)`, async () => {
    const page = await open({ width, height: 900 });
    const sizes = await page.evaluate(`return [...document.querySelectorAll('.hero-art text')].filter(t=>t.getClientRects().length).map(t=>parseFloat(getComputedStyle(t).fontSize)*Math.hypot(t.getScreenCTM().a,t.getScreenCTM().b))`);
    for (const s of sizes) assert.ok(s >= 10.9, `label renders at ${s.toFixed(1)}px`);
  });
}

test('phone surface labels render at 11px or more', async () => {
  const page = await open({ width: 390, height: 844 });
  const sizes = await page.evaluate(`return [...document.querySelectorAll('.hero-art .iso-label')].map(t=>parseFloat(getComputedStyle(t).fontSize)*Math.hypot(t.getScreenCTM().a,t.getScreenCTM().b))`);
  for (const s of sizes) assert.ok(s >= 10.9, `label renders at ${s.toFixed(1)}px`);
});

test('state buttons have room around their labels', async () => {
  const page = await open();
  const pad = await page.evaluate(`return [...document.querySelectorAll('.state-button')].map(b=>parseFloat(getComputedStyle(b).paddingLeft))`);
  for (const p of pad) assert.ok(p >= 12, `padding ${p}`);
});

test('system stage drawing is not clipped and has side padding', async () => {
  const page = await open();
  const r = await page.evaluate(`const s=document.querySelector('.system-iso');const vb=s.viewBox.baseVal;const b=s.getBBox();const st=getComputedStyle(document.querySelector('.system-stage'));
    return {fits:b.x>=vb.x&&b.y>=vb.y&&b.x+b.width<=vb.x+vb.width&&b.y+b.height<=vb.y+vb.height,box:[b.x,b.y,b.width,b.height].map(Math.round),vb:[vb.x,vb.y,vb.width,vb.height],pad:parseFloat(st.paddingLeft)}`);
  assert.ok(r.fits, `content ${r.box} outside viewBox ${r.vb}`);
  assert.ok(r.pad >= 20, `padding ${r.pad}`);
});
