const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const listeners = new Map();
const target = name => ({
  addEventListener(t, f) { listeners.set(name + ':' + t, f); },
  removeEventListener() {}
});
let inGame = false;
let plays = 0;
let loads = 0;
const buttons = [];
const lobby = {...target('lobby'), classList:{contains:()=>inGame}, appendChild:b=>buttons.push(b)};
const game = {...target('game'), classList:{contains:()=>!inGame}, prepend:b=>buttons.push(b)};
class Audio {
  constructor(){ Object.assign(this,target('audio')); this.paused=true; this.currentTime=0; this.src=''; }
  play(){ this.paused=false; plays++; return Promise.resolve(); }
  pause(){ this.paused=true; }
  load(){ loads++; }
  removeAttribute(name){ if(name==='src') this.src=''; }
}
const document={...target('doc'),hidden:false,getElementById:id=>id==='lobby'?lobby:game,createElement:()=>({...target('button'+buttons.length),style:{},setAttribute(){},contains:()=>false,remove(){}})};
const window={...target('win')};
const sandbox={window,document,Audio,MutationObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>{},setTimeout:()=>{}};
vm.runInNewContext(fs.readFileSync('public/opening-music.js','utf8'), sandbox);
(async()=>{
  const controller=window.__BIDGRID_BGM__;
  assert.equal(controller.audio.loop,true);
  assert.match(controller.audio.src,/booth\.pm\/downloadables\/5761628/);
  assert.equal(controller.audio.currentTime,0);
  listeners.get('doc:pointerdown')({target:{}});
  await Promise.resolve();
  assert.ok(plays>=1);
  inGame=true; controller.sync(); await Promise.resolve();
  assert.equal(controller.audio.src,'/audio/lucky-girl-game.mp3?v=3');
  inGame=false; controller.sync(); await Promise.resolve();
  assert.match(controller.audio.src,/booth\.pm\/downloadables\/5761628/);
  controller.audio.currentTime=84.5;
  listeners.get('audio:ended')();
  assert.equal(controller.audio.currentTime,0);
  assert.ok(loads>=3);
  controller.destroy();
  console.log('PASS: complete-track native loop, track switching, ended fallback, cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
