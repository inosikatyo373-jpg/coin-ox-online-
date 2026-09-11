const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const listeners = new Map();
const target = (name) => ({addEventListener(t,f){listeners.set(name+':'+t,f)},removeEventListener(){}});
let inGame=false, starts=0, stops=0, context;
const buttons=[];
const lobby={...target('lobby'),classList:{contains:()=>inGame},appendChild:b=>buttons.push(b)};
const game={...target('game'),classList:{contains:()=>!inGame},prepend:b=>buttons.push(b)};
class Audio {
 constructor(){Object.assign(this,target('audio'));this.paused=true;this.currentTime=0;}
 play(){this.paused=false;return Promise.resolve()}
 pause(){this.paused=true}
 load(){} removeAttribute(){}
}
class Context {
 constructor(){context=this;this.currentTime=0;this.state='running';this.destination={};}
 createMediaElementSource(){return {connect(){}}}
 createGain(){return {gain:{value:0},connect(){}}}
 decodeAudioData(){return Promise.resolve({duration:64})}
 createBufferSource(){return {connect(){},disconnect(){},start(){assert.equal(this.loop,true);starts++},stop(){stops++}}}
 close(){return Promise.resolve()}
}
const document={...target('doc'),hidden:false,getElementById:id=>id==='lobby'?lobby:game,createElement:()=>({...target('button'+buttons.length),style:{},setAttribute(){},contains:()=>false,remove(){}})};
const window={...target('win'),AudioContext:Context};
const sandbox={window,document,Audio,MutationObserver:class{observe(){}disconnect(){}},fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)}),requestAnimationFrame:()=>{},setTimeout:()=>{}};
vm.runInNewContext(fs.readFileSync('public/opening-music.js','utf8'),sandbox);
(async()=>{
 listeners.get('doc:pointerdown')({target:{}});
 for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(starts,1);
 window.__BIDGRID_BGM__.sync();assert.equal(starts,1,'sync must not restart opening');
 document.hidden=true;window.__BIDGRID_BGM__.sync();assert.equal(stops,1);
 document.hidden=false;window.__BIDGRID_BGM__.sync();assert.equal(starts,2);
 inGame=true;window.__BIDGRID_BGM__.sync();assert.equal(stops,2);assert.equal(window.__BIDGRID_BGM__.audio.paused,false);
 inGame=false;window.__BIDGRID_BGM__.sync();assert.equal(starts,3);
 listeners.get('button0:click')();assert.equal(stops,3);assert.equal(window.__BIDGRID_BGM__.audio.paused,true);
 listeners.get('button0:click')();assert.equal(starts,4);
 window.__BIDGRID_BGM__.destroy();assert.equal(stops,4);
 console.log('PASS: seamless source, repeated sync, visibility, track changes, mute, cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
