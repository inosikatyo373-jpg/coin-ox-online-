const path=require("path");
const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const crypto=require("crypto");

const app=express();
const server=http.createServer(app);
const io=new Server(server);
app.use(express.static(path.join(__dirname,"../public")));

const rooms=new Map();
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function makeCode(){
  let c;
  do{
    c=crypto.randomBytes(3).toString("hex").toUpperCase();
  }while(rooms.has(c));
  return c;
}

function randomCoins(){
  return 20+Math.floor(Math.random()*21);
}

function newRoom(id,creator){
  return {
    id,
    players:[{id:creator.id,name:creator.name||"プレイヤー1"},null],
    phase:"waiting",
    roundNumber:0,
    matchWins:[0,0],
    roundWinner:null,
    matchWinner:null,
    choice:[null,null],
    readyNext:[false,false],
    countdownUntil:0,
    coins:[0,0],
    board:Array(9).fill(null),
    first:null,
    selector:null,
    selected:null,
    auctionCount:0,
    middleUnlocked:false,
    gameOver:false,
    deadline:0,
    bids:[null,null],
    bidDrafts:[0,0]
  };
}

function setupRound(r){
  const first=Math.random()<0.5?0:1;
  const c=randomCoins();
  r.coins=[c,c];
  r.board=Array(9).fill(null);
  r.first=first;
  r.selector=first;
  r.phase="select";
  r.selected=null;
  r.auctionCount=0;
  r.middleUnlocked=false;
  r.gameOver=false;
  r.deadline=Date.now()+60000;
  r.bids=[null,null];
  r.bidDrafts=[0,0];
  r.roundWinner=null;
  r.readyNext=[false,false];
  r.countdownUntil=0;
  r.roundNumber++;
}

function publicState(r){
  return {
    room:r.id,
    players:r.players.map(p=>p?{name:p.name}:null),
    phase:r.phase,
    roundNumber:r.roundNumber,
    matchWins:[...r.matchWins],
    matchWinner:r.matchWinner,
    roundWinner:r.roundWinner,
    coins:[...r.coins],
    board:[...r.board],
    first:r.first,
    selector:r.selector,
    selected:r.selected,
    auctionCount:r.auctionCount,
    middleUnlocked:r.middleUnlocked,
    readyNext:[...(r.readyNext||[false,false])],
    countdownLeft:r.countdownUntil?Math.max(0,Math.ceil((r.countdownUntil-Date.now())/1000)):0,
    timeLeft:r.deadline?Math.max(0,Math.ceil((r.deadline-Date.now())/1000)):0
  };
}

function send(r){
  io.to(r.id).emit("state",publicState(r));
}

function log(r,m){
  io.to(r.id).emit("log",m);
}

function boardWinner(board){
  for(const [a,b,c] of LINES){
    if(board[a]!==null && board[a]===board[b] && board[a]===board[c]){
      return board[a];
    }
  }
  return null;
}

function endRound(r,w){
  if(w===-1){
    if(r.coins[0]>r.coins[1]) w=0;
    else if(r.coins[1]>r.coins[0]) w=1;
  }

  r.roundWinner=w;
  r.gameOver=true;
  r.deadline=0;
  r.readyNext=[false,false];

  if(w===0 || w===1) r.matchWins[w]++;

  if(r.matchWins[0]>=2){
    r.matchWinner=0;
    r.phase="matchEnd";
  }else if(r.matchWins[1]>=2){
    r.matchWinner=1;
    r.phase="matchEnd";
  }else{
    r.phase="roundEnd";
  }

  log(r,w===0?`第${r.roundNumber}戦：〇の勝利！`:w===1?`第${r.roundNumber}戦：×の勝利！`:`第${r.roundNumber}戦：引き分け`);
  send(r);
  io.to(r.id).emit("roundResult",{
    winner:w,
    coins:[...r.coins],
    matchWins:[...r.matchWins],
    matchWinner:r.matchWinner,
    roundNumber:r.roundNumber
  });
}

function nextTurn(r){
  const w=boardWinner(r.board);
  if(w!==null) return endRound(r,w);

  if(r.board.every(x=>x!==null) || (r.coins[0]===0 && r.coins[1]===0)){
    return endRound(r,-1);
  }

  r.selector=1-r.selector;
  r.phase="select";
  r.selected=null;
  r.bids=[null,null];
  r.bidDrafts=[0,0];
  r.deadline=Date.now()+60000;
  send(r);
}

function resolveBid(r,b){
  if(r.phase!=="bid" || r.gameOver) return;

  for(let i=0;i<2;i++){
    if(!Number.isInteger(b[i]) || b[i]<0 || b[i]>r.coins[i]) b[i]=0;
  }

  r.coins[0]-=b[0];
  r.coins[1]-=b[1];
  const c=r.selected;
  let auctionWinner=-1;

  if(b[0]>b[1]){
    r.board[c]=0;
    auctionWinner=0;
    log(r,`〇 ${b[0]}枚 vs × ${b[1]}枚 → 〇がマス${c+1}を獲得`);
  }else if(b[1]>b[0]){
    r.board[c]=1;
    auctionWinner=1;
    log(r,`〇 ${b[0]}枚 vs × ${b[1]}枚 → ×がマス${c+1}を獲得`);
  }else{
    log(r,`両者 ${b[0]}枚 → 同額。双方没収、マス${c+1}は空白`);
  }

  io.to(r.id).emit("auctionResult",{winner:auctionWinner,bids:[...b],cell:c});

  r.auctionCount++;
  if(r.auctionCount>=2) r.middleUnlocked=true;
  r.bids=[null,null];
  r.bidDrafts=[0,0];

  // 競売結果を2秒見せてから次のターンへ
  r.phase="auctionPause";
  r.deadline=0;
  send(r);

  setTimeout(()=>{
    if(!rooms.has(r.id) || r.phase!=="auctionPause") return;
    nextTurn(r);
  },2000);
}

function timeout(r){
  if(r.phase==="select"){
    const choices=r.board
      .map((v,i)=>v===null && (i!==4 || r.middleUnlocked)?i:null)
      .filter(x=>x!==null);

    if(!choices.length) return endRound(r,-1);

    r.selected=choices[Math.floor(Math.random()*choices.length)];
    r.phase="bid";
    r.bids=[null,null];
    r.bidDrafts=[0,0];
    r.deadline=Date.now()+60000;
    io.to(r.id).emit("selected",{cell:r.selected,auto:true});
    send(r);
  }else if(r.phase==="bid"){
    resolveBid(r,[
      r.bids[0] ?? r.bidDrafts[0] ?? 0,
      r.bids[1] ?? r.bidDrafts[1] ?? 0
    ]);
  }
}

function startCountdown(r){
  r.phase="countdown";
  r.deadline=0;
  r.countdownUntil=Date.now()+5000;
  send(r);
  io.to(r.id).emit("countdownStart",{seconds:5});
}

function beginRoundAfterCountdown(r){
  if(r.phase!=="countdown") return;
  r.countdownUntil=0;
  setupRound(r);
  send(r);
}

function startMatch(r){
  r.matchWins=[0,0];
  r.matchWinner=null;
  r.roundWinner=null;
  r.roundNumber=0;
  r.choice=[null,null];
  r.readyNext=[false,false];
  r.countdownUntil=0;
  setupRound(r);
  log(r,"連戦を開始しました。");
  send(r);
}

function returnToRoom(r){
  r.phase="waiting";
  r.matchWins=[0,0];
  r.matchWinner=null;
  r.roundWinner=null;
  r.roundNumber=0;
  r.coins=[0,0];
  r.board=Array(9).fill(null);
  r.first=null;
  r.selector=null;
  r.selected=null;
  r.deadline=0;
  r.bids=[null,null];
  r.bidDrafts=[0,0];
  r.auctionCount=0;
  r.middleUnlocked=false;
  r.gameOver=false;
  r.choice=[null,null];
  r.readyNext=[false,false];
  r.countdownUntil=0;
  send(r);
}

io.on("connection",s=>{
  s.on("create",({name},cb)=>{
    const id=makeCode();
    const r=newRoom(id,{id:s.id,name:name||"プレイヤー1"});
    rooms.set(id,r);
    s.join(id);
    s.data={room:id,slot:0};
    cb({ok:true,room:id,slot:0});
    send(r);
    log(r,"ルームを作成しました。友達の入室を待っています。");
  });

  s.on("join",({room,name},cb)=>{
    const r=rooms.get((room||"").toUpperCase());
    if(!r) return cb({ok:false,error:"ルームが見つかりません。"});
    if(r.players[1]) return cb({ok:false,error:"このルームは満員です。"});

    r.players[1]={id:s.id,name:name||"プレイヤー2"};
    s.join(r.id);
    s.data={room:r.id,slot:1};
    cb({ok:true,room:r.id,slot:1});

    if(r.phase==="waiting"){
      setupRound(r);
      log(r,"2人そろいました。先手・後手が決定しました！");
    }
    send(r);
  });

  s.on("select",({cell})=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="select" || r.gameOver) return;
    if(s.data.slot!==r.selector) return;
    if(!Number.isInteger(cell) || cell<0 || cell>8) return;
    if(r.board[cell]!==null) return;
    if(cell===4 && !r.middleUnlocked) return;

    r.selected=cell;
    r.phase="bid";
    r.bids=[null,null];
    r.bidDrafts=[0,0];
    r.deadline=Date.now()+60000;
    io.to(r.id).emit("selected",{cell,auto:false});
    send(r);
  });

  s.on("bidDraft",({amount})=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="bid" || r.gameOver) return;
    const i=s.data.slot;
    const n=Number(amount);
    if(Number.isInteger(n) && n>=0 && n<=r.coins[i]){
      r.bidDrafts[i]=n;
    }
  });

  s.on("bid",({amount})=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="bid" || r.gameOver) return;

    const i=s.data.slot;
    const n=Number(amount);
    if(r.bids[i]!==null) return;

    if(!Number.isInteger(n) || n<0 || n>r.coins[i]){
      return s.emit("errorMsg","入札額が不正です。");
    }

    r.bids[i]=n;
    r.bidDrafts[i]=n;
    s.emit("bidAccepted");

    if(r.bids[0]!==null && r.bids[1]!==null){
      resolveBid(r,[...r.bids]);
    }
  });

  s.on("nextRound",()=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="roundEnd" || r.matchWinner!==null) return;

    r.readyNext[s.data.slot]=true;
    send(r);

    if(r.readyNext[0] && r.readyNext[1]){
      startCountdown(r);
    }
  });

  s.on("matchChoice",({choice})=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="matchEnd") return;
    if(choice!=="rematch" && choice!=="room") return;

    r.choice[s.data.slot]=choice;

    if(r.choice[0]===choice && r.choice[1]===choice){
      if(choice==="rematch") startMatch(r);
      else returnToRoom(r);
    }else{
      send(r);
    }
  });

  s.on("disconnect",()=>{
    const r=rooms.get(s.data.room);
    if(r) io.to(r.id).emit("playerDisconnected");
  });
});

setInterval(()=>{
  for(const r of rooms.values()){
    if(r.phase==="countdown"){
      if(Date.now()>=r.countdownUntil){
        beginRoundAfterCountdown(r);
      }else{
        io.to(r.id).emit("countdownTick",Math.max(1,Math.ceil((r.countdownUntil-Date.now())/1000)));
      }
      continue;
    }

    if((r.phase==="select" || r.phase==="bid") && r.deadline){
      if(Date.now()>=r.deadline){
        timeout(r);
      }else{
        io.to(r.id).emit("tick",Math.ceil((r.deadline-Date.now())/1000));
      }
    }
  }
},250);

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Coin OX server listening on ${PORT}`));
