const path=require("path");
const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const crypto=require("crypto");

const app=express(), server=http.createServer(app), io=new Server(server);
app.use(express.static(path.join(__dirname,"../public")));
const rooms=new Map();

function makeCode(){let c;do{c=crypto.randomBytes(3).toString("hex").toUpperCase()}while(rooms.has(c));return c}
function newState(){const coins=20+Math.floor(Math.random()*21),first=Math.random()<.5?0:1;return{
 coins:[coins,coins],board:Array(9).fill(null),first,selector:first,phase:"select",
 selected:null,auctionCount:0,middleUnlocked:false,gameOver:false,deadline:Date.now()+30000,bids:[null,null]
}}
function pub(r){return {...r,players:r.players.map(p=>p?{name:p.name}:null),timeLeft:Math.max(0,Math.ceil((r.deadline-Date.now())/1000)),bids:undefined,deadline:undefined,id:undefined}}
function send(r){io.to(r.id).emit("state",pub(r))}
function log(r,m){io.to(r.id).emit("log",m)}
function winner(b){for(const [a,c,d] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])if(b[a]!==null&&b[a]===b[c]&&b[a]===b[d])return b[a];return null}
function finish(r,w){r.gameOver=true;r.phase="end";io.to(r.id).emit("result",{winner:w,coins:r.coins});send(r)}
function next(r){
 const w=winner(r.board);if(w!==null)return finish(r,w);
 if(r.board.every(x=>x!==null)||(r.coins[0]===0&&r.coins[1]===0))return finish(r,-1);
 r.selector=1-r.selector;r.phase="select";r.selected=null;r.deadline=Date.now()+30000;send(r)
}
function resolve(r,b){
 if(r.phase!=="bid"||r.gameOver)return;
 for(let i=0;i<2;i++)if(!Number.isInteger(b[i])||b[i]<0||b[i]>r.coins[i])b[i]=0;
 r.coins[0]-=b[0];r.coins[1]-=b[1];const c=r.selected;
 if(b[0]>b[1]){r.board[c]=0;log(r,`〇 ${b[0]}枚 vs × ${b[1]}枚 → 〇がマス${c+1}を獲得`)}
 else if(b[1]>b[0]){r.board[c]=1;log(r,`〇 ${b[0]}枚 vs × ${b[1]}枚 → ×がマス${c+1}を獲得`)}
 else log(r,`両者 ${b[0]}枚 → 同額。双方没収、マス${c+1}は空白`);
 r.auctionCount++;if(r.auctionCount>=2)r.middleUnlocked=true;r.bids=[null,null];next(r)
}
function timeout(r){
 if(r.gameOver)return;
 if(r.phase==="select"){
  const a=r.board.map((v,i)=>v===null&&(i!==4||r.middleUnlocked)?i:null).filter(x=>x!==null);
  if(!a.length)return finish(r,-1);
  r.selected=a[Math.floor(Math.random()*a.length)];r.phase="bid";r.deadline=Date.now()+30000;
  io.to(r.id).emit("selected",{cell:r.selected});send(r)
 }else if(r.phase==="bid")resolve(r,[r.bids[0]??0,r.bids[1]??0])
}

io.on("connection",s=>{
 s.on("create",({name},cb)=>{const id=makeCode(),r=newState();r.id=id;r.players=[{id:s.id,name:name||"プレイヤー1"},null];rooms.set(id,r);s.join(id);s.data={room:id,slot:0};cb({ok:true,room:id,slot:0});send(r);log(r,"ルームを作成しました。")});
 s.on("join",({room,name},cb)=>{const r=rooms.get((room||"").toUpperCase());if(!r)return cb({ok:false,error:"ルームが見つかりません。"});if(r.players[1])return cb({ok:false,error:"このルームは満員です。"});r.players[1]={id:s.id,name:name||"プレイヤー2"};s.join(r.id);s.data={room:r.id,slot:1};cb({ok:true,room:r.id,slot:1});send(r);log(r,"2人そろいました。対戦開始！")});
 s.on("select",({cell})=>{const r=rooms.get(s.data.room);if(!r||r.gameOver||r.phase!=="select"||s.data.slot!==r.selector||r.board[cell]!==null)return;if(cell===4&&!r.middleUnlocked)return;r.selected=cell;r.phase="bid";r.bids=[null,null];r.deadline=Date.now()+30000;io.to(r.id).emit("selected",{cell});send(r)});
 s.on("bid",({amount})=>{const r=rooms.get(s.data.room);if(!r||r.gameOver||r.phase!=="bid")return;const n=Number(amount),i=s.data.slot;if(r.bids[i]!==null)return;if(!Number.isInteger(n)||n<0||n>r.coins[i])return s.emit("errorMsg","入札額が不正です。");r.bids[i]=n;s.emit("bidAccepted");if(r.bids[0]!==null&&r.bids[1]!==null)resolve(r,r.bids)});
 s.on("disconnect",()=>{const r=rooms.get(s.data.room);if(r)io.to(r.id).emit("playerDisconnected")})
});
setInterval(()=>{for(const r of rooms.values())if(!r.gameOver){if(Date.now()>=r.deadline)timeout(r);else io.to(r.id).emit("tick",Math.ceil((r.deadline-Date.now())/1000))}},250);
server.listen(process.env.PORT||3000);
