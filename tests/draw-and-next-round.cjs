const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server/server.js'),'utf8');
const emitted=[];
const ctx={Date,log(){},send(){},recordMatchStats(){},io:{to:()=>({emit:(...args)=>emitted.push(args)})}};
vm.createContext(ctx);
vm.runInContext(server.slice(server.indexOf('function endRound('),server.indexOf('function nextTurn(')),ctx);
for(const deadlock of [false,true]){
 for(const [before,after,winner,draw] of [
  [[0,0],[1,1],null,false], [[1,0],[2,1],0,false],
  [[0,1],[1,2],1,false], [[1,1],[2,2],null,true]
 ]){
  const r={coins:deadlock?[9,1]:[0,0],matchWins:[...before],roundNumber:1,matchWinner:null};
  if(deadlock)ctx.endEqualBidDeadlock(r);else ctx.endRound(r,-1);
  assert.deepEqual(r.matchWins,after);assert.equal(r.matchWinner,winner);assert.equal(r.matchDraw,draw);
  assert.equal(r.phase,winner!==null||draw?'matchEnd':'roundEnd');
  assert.equal(emitted.at(-1)[1].matchDraw,draw);
  ctx.endRound(r,-1);assert.deepEqual(r.matchWins,after,'duplicate finish must not score twice');
 }
}
const coinWinner={coins:[3,1],matchWins:[0,0],roundNumber:1};
ctx.endRound(coinWinner,-1);assert.deepEqual(coinWinner.matchWins,[1,0]);
for(const winner of [0,1]){
 const r={coins:[0,0],matchWins:[1,1],roundNumber:3};ctx.endRound(r,winner);
 assert.equal(r.matchWinner,winner);assert.equal(r.matchDraw,false);
}
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
let now=0,id=0;const timers=new Map(),elements=new Map(),sent=[];
const el=name=>{if(!elements.has(name))elements.set(name,{innerHTML:'',onclick:null});return elements.get(name);};
const ui={state:{room:'test',phase:'roundEnd',roundNumber:1,readyNext:[false,false],roundResultWaitMs:10000},slot:0,$:el,s:{emit:x=>sent.push(x)},
 setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
vm.createContext(ui);
vm.runInContext(html.slice(html.indexOf('let nextRoundActionTimer='),html.indexOf('function chooseMatch(')),ui);
const advance=ms=>{now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}};
ui.prepareNextRoundAction({roundNumber:1});advance(9999);assert.match(el('matchActions').innerHTML,/roundResultOk/);
ui.prepareNextRoundAction({roundNumber:1});advance(1);assert.match(el('matchActions').innerHTML,/onclick="goNextRound/);assert.equal(sent.length,0);
ui.goNextRound();advance(10000);assert.deepEqual(sent,['nextRound']);assert.match(el('matchActions').innerHTML,/準備OK/);
ui.clearNextRoundAction();ui.prepareNextRoundAction({roundNumber:2});el('roundResultOk').onclick();assert.match(el('matchActions').innerHTML,/onclick="goNextRound/);assert.equal(timers.size,0);
ui.clearNextRoundAction();ui.prepareNextRoundAction({roundNumber:3});ui.state.phase='countdown';ui.clearNextRoundAction();el('matchActions').innerHTML='new round';advance(10000);assert.equal(el('matchActions').innerHTML,'new round');
ui.state.phase='roundEnd';ui.state.roundResultWaitMs=0;ui.prepareNextRoundAction({roundNumber:4});advance(0);assert.match(el('matchActions').innerHTML,/onclick="goNextRound/);
console.log('PASS: 8 draw combinations, duplicate finish, coin tie-break, winners, inline syntax, 10-second reveal, early OK, no auto-start, timer cleanup and reconnect deadline');
