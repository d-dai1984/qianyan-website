import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openPage, HELPERS } from './harness.mjs';

const pages = [];
after(() => Promise.all(pages.map(p => p.close())));
const open = async (o) => { const p = await openPage(o); pages.push(p); return p; };

// Every painted colour must share its RGB with a --c-* token (any alpha).
// The inspection device mock-up is checked on its own in device.test.mjs.
const COLLECT = `${HELPERS}
const root=getComputedStyle(document.documentElement);
const tokens=[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch{return []}}).filter(r=>r.selectorText===':root').flatMap(r=>[...r.style]).filter(k=>k.startsWith('--c-')).map(k=>root.getPropertyValue(k).trim()).filter(v=>v.startsWith('#')).map(hex);
const ok=(c)=>{const v=rgb(c);return !v||v.a===0||tokens.some(t=>t.r===v.r&&t.g===v.g&&t.b===v.b)};
const bad=[];
for(const el of document.querySelectorAll('#app *')){
  if(el.closest('.device,.phone,[hidden]'))continue;
  const s=getComputedStyle(el);
  if(s.display==='none'||s.visibility==='hidden'||!el.getClientRects().length)continue;
  const props=['color','backgroundColor'];
  for(const side of ['Top','Right','Bottom','Left']) if(parseFloat(s['border'+side+'Width'])>0) props.push('border'+side+'Color');
  const shape=el instanceof SVGGeometryElement||el instanceof SVGTextContentElement;
  if(el instanceof SVGElement){ props.length=0; if(shape&&s.fill.startsWith('rgb')) props.push('fill'); if(shape&&s.stroke.startsWith('rgb')&&parseFloat(s.strokeWidth)>0) props.push('stroke'); }
  for(const p of props) if(!ok(s[p])) bad.push((el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+[...el.classList].join('.'))+' '+p+' '+s[p]);
}
return [...new Set(bad)].slice(0,25);`;

for (const lang of ['zh', 'en']) {
  test(`every painted colour comes from the token palette (${lang})`, async () => {
    // Reduced motion freezes the older layers' colour transitions mid-way.
    const page = await open({ lang, reducedMotion: true });
    const bad = await page.evaluate(COLLECT);
    assert.deepEqual(bad, []);
  });
}

test('content floors are paper, the closing band is dark', async () => {
  const page = await open();
  const r = await page.evaluate(`${HELPERS}const bg=id=>getComputedStyle(document.getElementById(id)).backgroundColor;return {floors:['solutions','platform','inspection','approach'].map(bg),contact:lum(rgb(bg('contact'))),footer:lum(rgb(getComputedStyle(document.querySelector('footer')).backgroundColor))}`);
  assert.deepEqual(r.floors, Array(4).fill('rgb(238, 241, 248)'));
  assert.ok(r.contact < .2, `contact luminance ${r.contact}`);
  assert.ok(r.footer < .1, `footer luminance ${r.footer}`);
});

test('floor titles read as a dim line and an accent line', async () => {
  const page = await open();
  const r = await page.evaluate(`return ['solutions','platform','inspection','approach'].map(id=>{const h=document.querySelector('#'+id+' h2');return {dim:!!h.querySelector('.dim'),em:getComputedStyle(h.querySelector('em')||h).color}})`);
  for (const f of r) { assert.ok(f.dim); assert.equal(f.em, 'rgb(47, 85, 244)'); }
});

test('type stays readable: body ≥ 14px on light floors, nothing visible under 11px', async () => {
  const page = await open();
  const r = await page.evaluate(`const own=el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());const vis=el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length&&!el.closest('.sr-only,[hidden],.device,.phone')};
  const small=[...document.querySelectorAll('#app *')].filter(el=>own(el)&&vis(el)&&parseFloat(getComputedStyle(el).fontSize)<11).map(el=>el.tagName+'.'+el.className+' '+getComputedStyle(el).fontSize);
  const body=[...document.querySelectorAll('.tone-light p')].filter(el=>vis(el)&&parseFloat(getComputedStyle(el).fontSize)<14).map(el=>(el.className||el.parentElement.className)+' '+getComputedStyle(el).fontSize);
  return {small:[...new Set(small)],body:[...new Set(body)]}`);
  assert.deepEqual(r.small, []);
  assert.deepEqual(r.body, []);
});
