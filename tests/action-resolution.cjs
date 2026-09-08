const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../public');
const classes=new Map(),pending=[],timers=[],requests=[];
class Element {
 constructor(){this.attrs=new Map();this.isConnected=true;this.classList={contains:()=>false};}
 getAttribute(k){return this.attrs.get(k);} setAttribute(k,v){this.attrs.set(k,v);}
 attachShadow(){const canvas=createCanvas(512,512);return {set innerHTML(v){},querySelector:s=>s==='canvas'?canvas:{}};}
}
const context={HTMLElement:Element,window:{},console,performance:{now:()=>0},matchMedia:()=>({matches:false}),setInterval:()=>{},setTimeout:(fn,ms)=>timers.push({fn,ms}),
 customElements:{get:n=>classes.get(n),define:(n,c)=>classes.set(n,c)},
 document:{querySelector:()=>({}),createElement:()=>{const c=createCanvas(1,1),get=c.getContext.bind(c);c.getContext=(...a)=>{const ctx=get(...a),draw=ctx.drawImage.bind(ctx);ctx.drawImage=(img,...rest)=>draw(img.native||img,...rest);return ctx;};return c;}},
 Image:class{set src(src){requests.push(src);pending.push(loadImage(path.join(root,src.split('?')[0])).then(native=>{this.native=native;this.naturalWidth=native.width;this.naturalHeight=native.height;this.onload();}).catch(()=>this.onerror()));}}
};
vm.runInNewContext(fs.readFileSync(path.join(root,'character-motions.js'),'utf8'),context);
(async()=>{
for(const id of ['gunslinger','swordswoman','mage','merchant','doctor','dog','robot','zombie']){
 const count=requests.length;
 for(const motion of ['attack','hit']){
  const el=new (classes.get('bid-action-motion-v3159'))();el.setAttribute('character',id);el.setAttribute('motion',motion);el.connectedCallback();
  await Promise.all(pending);await new Promise(r=>setImmediate(r));
  const tasks=timers.splice(0);assert.deepEqual(tasks.map(t=>t.ms),motion==='hit'?[0,95,190]:[0,400,800]);
  const hashes=[];
  for(const t of tasks){t.fn();assert.equal(el.getAttribute('ready'),'');const p=el.ctx.getImageData(0,0,512,512).data;let visible=0;for(let i=3;i<p.length;i+=4)if(p[i])visible++;assert(visible>20000&&visible<250000);hashes.push(require('node:crypto').createHash('sha1').update(p).digest('hex'));}
  assert.equal(new Set(hashes).size,3);el.disconnectedCallback();
 }
 assert.equal(requests.length-count,1,'attack and hit share one cached high-resolution sheet');
 console.log(id+': 512px source cells, six nonblank transparent frames, cache and timing OK');
}
assert(!requests.some(x=>x.includes('atlas.part')));
})().catch(e=>{console.error(e);process.exitCode=1;});
