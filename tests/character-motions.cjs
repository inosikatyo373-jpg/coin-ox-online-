// Run with NODE_PATH pointing to installed @napi-rs/canvas.
// Exercises the shipped renderer (not a duplicated animation implementation).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {createCanvas, loadImage} = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '../public');
const ids = ['gunslinger','swordswoman','mage','merchant','doctor','dog','robot','zombie'];
const pending = [];
let Motion;
let now = 0;
const reduced = {matches:false};
class Element {
  constructor() { this.attrs = new Map(); this.classList={contains: () => false}; this.isConnected=true; }
  getAttribute(k) { return this.attrs.get(k); }
  setAttribute(k,v) { this.attrs.set(k,v); }
  attachShadow() {
    const canvas=createCanvas(512,512), img={};
    return {set innerHTML(value) {},querySelector: tag => tag==='canvas'?canvas:img};
  }
}
const ctx = {
  HTMLElement: Element,
  Image: class {
    set src(src) {
      pending.push(loadImage(path.join(root,src)).then(img => {
        // The renderer calls drawImage(this); forward through a native image.
        this.native=img; this.naturalWidth=img.width;this.naturalHeight=img.height;
        this.onload();
      }).catch(error=>{console.error(error);this.onerror();}));
    }
  },
  document: {hidden:false, createElement() {
    const c=createCanvas(1,1), get=c.getContext.bind(c);
    c.getContext=(...args)=>{
      const g=get(...args), draw=g.drawImage.bind(g);
      g.drawImage=(source,...rest)=>draw(source.native||source,...rest);
      return g;
    };return c;
  }},
  customElements: {define(name,ctor){Motion=ctor;}},
  matchMedia:()=>reduced, performance:{now:()=>now},
  setInterval:()=>{},console,window:{},getCharacterDef:id=>({name:id})
};
vm.runInNewContext(fs.readFileSync(path.join(root,'character-motions.js'),'utf8'),ctx);
(async()=>{
  for (const id of ids) {
    const sprite=new Motion(); sprite.setAttribute('character',id);sprite.connectedCallback();
    assert.equal(sprite.getAttribute('ready'),undefined,'fallback remains during decode');
    await Promise.all(pending);await new Promise(resolve=>setImmediate(resolve));
    assert.equal(sprite.getAttribute('ready'),'');
    const hashes = new Set();
    for (let t=0;t<3500;t+=60) {
      sprite.draw(t);
      const pixels=sprite.ctx.getImageData(0,0,512,512).data;
      let opaque=0;
      for(let i=3;i<pixels.length;i+=4) if(pixels[i])opaque++;
      assert(opaque>30000 && opaque<220000,`${id}: no blank frame or solid background`);
      assert.equal(pixels[3],0,`${id}: matte removed`);
      hashes.add(require('node:crypto').createHash('sha1').update(pixels).digest('hex'));
    }
    assert.equal(hashes.size,6,`${id}: all six distinct frames rendered`);
    sprite.classList.contains=()=>true;sprite.draw(5000);assert.equal(sprite.lastFrame,0);
    sprite.classList.contains=()=>false;reduced.matches=true;sprite.draw(5400);assert.equal(sprite.lastFrame,0);reduced.matches=false;
    const replacement=new Motion();replacement.setAttribute('character',id);now=5400;replacement.connectedCallback();
    assert.equal(replacement.getAttribute('ready'),'','cached sheet draws synchronously on rerender');
    replacement.disconnectedCallback();sprite.disconnectedCallback();
    console.log(`${id}: six nonblank keyed frames, static/reduced motion, synchronous cached rerender OK`);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
