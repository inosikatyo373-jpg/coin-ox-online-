const path=require("path");
const express=require("express");
const http=require("http");
const {Server}=require("socket.io");
const crypto=require("crypto");

const app=express();
const server=http.createServer(app);
const io=new Server(server);
app.use(express.json({limit:"32kb"}));

const SUPABASE_URL=(process.env.SUPABASE_URL||"").replace(/\/$/,"");
const SUPABASE_ANON_KEY=process.env.SUPABASE_ANON_KEY||"";
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";

function accountConfigured(){
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
}

async function sbFetch(pathname,{method="GET",key=SUPABASE_ANON_KEY,token=null,body=null,headers={}}={}){
  if(!accountConfigured()) throw new Error("ACCOUNT_NOT_CONFIGURED");

  const res=await fetch(`${SUPABASE_URL}${pathname}`,{
    method,
    headers:{
      apikey:key,
      Authorization:`Bearer ${token||key}`,
      ...(body?{"Content-Type":"application/json"}:{}),
      ...headers
    },
    body:body?JSON.stringify(body):undefined
  });

  const text=await res.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch(e){data={message:text}}

  if(!res.ok){
    const err=new Error(data?.msg||data?.message||data?.error_description||data?.error||`Supabase HTTP ${res.status}`);
    err.status=res.status;
    err.data=data;
    throw err;
  }
  return data;
}

function cleanDisplayName(value,fallback="PLAYER"){
  const s=String(value||"").trim().replace(/[<>]/g,"").slice(0,24);
  return s||fallback;
}

async function authUserFromToken(token){
  if(!token) return null;
  return sbFetch("/auth/v1/user",{token,key:SUPABASE_ANON_KEY});
}

async function fetchProfile(userId){
  const rows=await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,display_name,rating,highest_rating,wins,losses,draws,created_at`,{
    key:SUPABASE_SERVICE_ROLE_KEY,
    headers:{Accept:"application/json"}
  });
  return Array.isArray(rows)?rows[0]||null:null;
}

async function ensureProfile(user){
  if(!user?.id) return null;
  let profile=await fetchProfile(user.id);
  if(profile) return profile;

  const displayName=cleanDisplayName(user.user_metadata?.display_name,user.email?.split("@")[0]||"PLAYER");
  const rows=await sbFetch("/rest/v1/profiles?on_conflict=id",{
    method:"POST",
    key:SUPABASE_SERVICE_ROLE_KEY,
    headers:{Prefer:"resolution=merge-duplicates,return=representation"},
    body:[{
      id:user.id,
      display_name:displayName,
      rating:1500,
      highest_rating:1500,
      wins:0,
      losses:0,
      draws:0
    }]
  });
  return Array.isArray(rows)?rows[0]||null:null;
}

async function resolveAccount(token){
  if(!token) return null;
  const user=await authUserFromToken(token);
  const profile=await ensureProfile(user);
  return {user,profile};
}

async function recordProfileResult(userId,result){
  const rows=await sbFetch("/rest/v1/rpc/record_match_result",{
    method:"POST",
    key:SUPABASE_SERVICE_ROLE_KEY,
    headers:{Prefer:"return=representation"},
    body:{p_user_id:userId,p_result:result}
  });
  if(Array.isArray(rows)) return rows[0]||await fetchProfile(userId);
  return rows||await fetchProfile(userId);
}

async function recordMatchStats(r){
  if(!accountConfigured() || r.statsRecorded || r.phase!=="matchEnd") return;
  r.statsRecorded=true;

  await Promise.all(r.players.map(async(p,i)=>{
    if(!p?.userId) return;
    const result=r.matchDraw?"draw":r.matchWinner===i?"win":"loss";
    try{
      const profile=await recordProfileResult(p.userId,result);
      if(profile){
        p.rating=profile.rating;
        p.highestRating=profile.highest_rating;
        if(p.id) io.to(p.id).emit("accountStatsUpdated",profile);
      }
    }catch(err){
      console.error("recordMatchStats failed",p.userId,err.message);
    }
  }));

  send(r);
}

app.get("/api/account/config",(req,res)=>{
  res.json({configured:accountConfigured()});
});

app.post("/api/account/signup",async(req,res)=>{
  if(!accountConfigured()) return res.status(503).json({error:"アカウント機能がまだ設定されていません。"});
  const email=String(req.body?.email||"").trim().toLowerCase();
  const password=String(req.body?.password||"");
  const displayName=cleanDisplayName(req.body?.displayName,email.split("@")[0]||"PLAYER");

  if(!email || !email.includes("@")) return res.status(400).json({error:"メールアドレスを確認してください。"});
  if(password.length<6) return res.status(400).json({error:"パスワードは6文字以上にしてください。"});

  try{
    const data=await sbFetch("/auth/v1/signup",{
      method:"POST",
      key:SUPABASE_ANON_KEY,
      body:{email,password,data:{display_name:displayName}}
    });

    const session=data?.access_token?{
      access_token:data.access_token,
      refresh_token:data.refresh_token,
      expires_in:data.expires_in,
      expires_at:data.expires_at
    }:null;

    res.json({
      ok:true,
      session,
      requiresEmailConfirmation:!session,
      user:data?.user||data
    });
  }catch(err){
    res.status(err.status||400).json({error:err.message});
  }
});

app.post("/api/account/login",async(req,res)=>{
  if(!accountConfigured()) return res.status(503).json({error:"アカウント機能がまだ設定されていません。"});
  const email=String(req.body?.email||"").trim().toLowerCase();
  const password=String(req.body?.password||"");

  try{
    const data=await sbFetch("/auth/v1/token?grant_type=password",{
      method:"POST",
      key:SUPABASE_ANON_KEY,
      body:{email,password}
    });
    res.json({
      ok:true,
      session:{
        access_token:data.access_token,
        refresh_token:data.refresh_token,
        expires_in:data.expires_in,
        expires_at:data.expires_at
      },
      user:data.user
    });
  }catch(err){
    res.status(err.status||400).json({error:"メールアドレスまたはパスワードを確認してください。"});
  }
});

app.post("/api/account/refresh",async(req,res)=>{
  if(!accountConfigured()) return res.status(503).json({error:"アカウント機能がまだ設定されていません。"});
  const refreshToken=String(req.body?.refreshToken||"");
  if(!refreshToken) return res.status(400).json({error:"再ログインしてください。"});

  try{
    const data=await sbFetch("/auth/v1/token?grant_type=refresh_token",{
      method:"POST",
      key:SUPABASE_ANON_KEY,
      body:{refresh_token:refreshToken}
    });
    res.json({
      ok:true,
      session:{
        access_token:data.access_token,
        refresh_token:data.refresh_token,
        expires_in:data.expires_in,
        expires_at:data.expires_at
      },
      user:data.user
    });
  }catch(err){
    res.status(401).json({error:"ログイン期限が切れました。再ログインしてください。"});
  }
});

app.get("/api/account/me",async(req,res)=>{
  if(!accountConfigured()) return res.status(503).json({error:"アカウント機能がまだ設定されていません。"});
  const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  if(!token) return res.status(401).json({error:"ログインしてください。"});

  try{
    const user=await authUserFromToken(token);
    const profile=await ensureProfile(user);
    res.json({ok:true,user:{id:user.id,email:user.email},profile});
  }catch(err){
    res.status(401).json({error:"ログイン期限が切れました。"});
  }
});

app.patch("/api/account/profile",async(req,res)=>{
  if(!accountConfigured()) return res.status(503).json({error:"アカウント機能がまだ設定されていません。"});
  const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  const displayName=cleanDisplayName(req.body?.displayName,"PLAYER");

  try{
    const user=await authUserFromToken(token);
    const rows=await sbFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,{
      method:"PATCH",
      key:SUPABASE_SERVICE_ROLE_KEY,
      headers:{Prefer:"return=representation"},
      body:{display_name:displayName,updated_at:new Date().toISOString()}
    });
    const profile=Array.isArray(rows)?rows[0]:rows;
    res.json({ok:true,profile});
  }catch(err){
    res.status(err.status||400).json({error:err.message});
  }
});

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

function makeReconnectToken(){
  return crypto.randomBytes(18).toString("hex");
}

function newRoom(id,creator){
  return {
    id,
    players:[{
      id:creator.id,
      name:creator.name||"プレイヤー1",
      token:creator.token||makeReconnectToken(),
      connected:true,
      userId:creator.userId||null,
      rating:Number.isInteger(creator.rating)?creator.rating:null,
      highestRating:Number.isInteger(creator.highestRating)?creator.highestRating:null
    },null],
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
    bidDrafts:[0,0],
    equalBidStreak:0,
    roundEndReason:null,
    matchDraw:false,
    matchEndReason:null,
    disconnectDeadlines:[0,0],
    disconnectCounts:[0,0],
    pausedForDisconnect:false,
    pausedDeadlineRemaining:0,
    pausedCountdownRemaining:0,
    auctionPauseUntil:0,
    pendingDeadlockDraw:false,
    statsRecorded:false
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
  r.equalBidStreak=0;
  r.roundWinner=null;
  r.roundEndReason=null;
  r.matchEndReason=null;
  r.readyNext=[false,false];
  r.countdownUntil=0;
  r.auctionPauseUntil=0;
  r.pendingDeadlockDraw=false;
  r.roundNumber++;
}

function publicState(r,viewerSlot=null){
  const validViewer=viewerSlot===0 || viewerSlot===1;
  const myBidLocked=validViewer ? r.bids[viewerSlot]!==null : false;
  const canChangeBid=validViewer
    && r.phase==="bid"
    && myBidLocked
    && r.bids[1-viewerSlot]===null;

  return {
    room:r.id,
    players:r.players.map(p=>p?{
      name:p.name,
      rating:Number.isInteger(p.rating)?p.rating:null,
      account:!!p.userId
    }:null),
    phase:r.phase,
    roundNumber:r.roundNumber,
    matchWins:[...r.matchWins],
    matchWinner:r.matchWinner,
    matchDraw:!!r.matchDraw,
    roundWinner:r.roundWinner,
    roundEndReason:r.roundEndReason,
    matchEndReason:r.matchEndReason,
    equalBidStreak:r.equalBidStreak||0,
    connected:r.players.map(p=>!!p?.connected),
    disconnectCounts:[...(r.disconnectCounts||[0,0])],
    pausedForDisconnect:!!r.pausedForDisconnect,
    coins:[...r.coins],
    board:[...r.board],
    first:r.first,
    selector:r.selector,
    selected:r.selected,
    auctionCount:r.auctionCount,
    middleUnlocked:r.middleUnlocked,
    readyNext:[...(r.readyNext||[false,false])],
    countdownLeft:r.countdownUntil?Math.max(0,Math.ceil((r.countdownUntil-Date.now())/1000)):0,
    timeLeft:r.deadline?Math.max(0,Math.ceil((r.deadline-Date.now())/1000)):0,

    // 入札額そのものや、未確定時の相手の確定状況は送らない。
    myBidLocked,
    canChangeBid
  };
}

function send(r){
  // プレイヤーごとに必要最小限の入札状態だけ送る。
  r.players.forEach((p,i)=>{
    if(p?.id) io.to(p.id).emit("state",publicState(r,i));
  });
}

function log(r,m){
  io.to(r.id).emit("log",m);
}

function logRoundStart(r){
  io.to(r.id).emit("logRoundStart",{roundNumber:r.roundNumber});
}

function activeRoundPhase(r){
  return ["select","bid","auctionPause"].includes(r.phase);
}

function scheduleAuctionAdvance(r,delayMs=null){
  const remaining=delayMs===null
    ? Math.max(0,(r.auctionPauseUntil||Date.now())-Date.now())
    : Math.max(0,delayMs);

  setTimeout(()=>{
    if(!rooms.has(r.id) || r.phase!=="auctionPause") return;
    if(r.pausedForDisconnect) return;

    r.auctionPauseUntil=0;
    if(r.pendingDeadlockDraw) endEqualBidDeadlock(r);
    else nextTurn(r);
  },remaining);
}

function pauseForDisconnect(r){
  if(r.pausedForDisconnect) return;

  r.pausedForDisconnect=true;
  r.pausedDeadlineRemaining=r.deadline
    ? Math.max(0,r.deadline-Date.now())
    : 0;
  r.pausedCountdownRemaining=r.countdownUntil
    ? Math.max(0,r.countdownUntil-Date.now())
    : 0;

  r.deadline=0;
  r.countdownUntil=0;
}

function resumeAfterDisconnect(r){
  if(!r.pausedForDisconnect) return;
  if(r.players.some(p=>p && !p.connected)) return;

  r.pausedForDisconnect=false;

  if(r.phase==="select" || r.phase==="bid"){
    r.deadline=Date.now()+Math.max(1000,r.pausedDeadlineRemaining||60000);
  }else if(r.phase==="countdown"){
    r.countdownUntil=Date.now()+Math.max(1000,r.pausedCountdownRemaining||5000);
  }else if(r.phase==="auctionPause"){
    const remain=Math.max(200,r.auctionPauseUntil-Date.now());
    r.auctionPauseUntil=Date.now()+remain;
    scheduleAuctionAdvance(r,remain);
  }

  r.pausedDeadlineRemaining=0;
  r.pausedCountdownRemaining=0;
  io.to(r.id).emit("playerReconnected");
  log(r,"切断していたプレイヤーが復帰しました。対戦を再開します。");
  send(r);
}

function finishDisconnectForfeit(r,loserSlot,reason="timeout"){
  if(!rooms.has(r.id)) return;
  const loser=r.players[loserSlot];
  if(!loser || loser.connected) return;

  const winner=1-loserSlot;
  const winnerPlayer=r.players[winner];

  // 両者とも不在なら勝敗を付けず、ルームを閉じる。
  if(!winnerPlayer || !winnerPlayer.connected){
    if(r.players.every(p=>!p || !p.connected)){
      io.to(r.id).emit("roomClosed");
      rooms.delete(r.id);
    }
    return;
  }

  r.pausedForDisconnect=false;
  r.disconnectDeadlines=[0,0];
  r.deadline=0;
  r.countdownUntil=0;
  r.auctionPauseUntil=0;
  r.gameOver=true;
  r.roundWinner=winner;
  r.matchWinner=winner;
  r.matchDraw=false;
  r.matchEndReason=reason==="secondDisconnect"?"secondDisconnect":"disconnect";
  r.roundEndReason=r.matchEndReason;
  r.phase="matchEnd";

  // 表示上も勝者が2勝へ到達した形にする。
  r.matchWins[winner]=Math.max(2,r.matchWins[winner]);

  if(reason==="secondDisconnect"){
    log(r,`${loser.name} が同一マッチ中に2回目の切断をしたため、${winnerPlayer.name} の不戦勝です。`);
  }else{
    log(r,`${loser.name} が20秒以内に復帰しなかったため、${winnerPlayer.name} の不戦勝です。`);
  }

  send(r);
  void recordMatchStats(r);
  io.to(r.id).emit("disconnectForfeit",{
    winner,
    loser:loserSlot,
    reason,
    matchWins:[...r.matchWins]
  });
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
  r.roundEndReason=r.roundEndReason||"normal";
  if(w===-1){
    if(r.coins[0]>r.coins[1]) w=0;
    else if(r.coins[1]>r.coins[0]) w=1;
  }

  r.roundWinner=w;
  r.gameOver=true;
  if(r.roundEndReason!=="disconnect") r.matchEndReason=null;
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
  if(r.phase==="matchEnd") void recordMatchStats(r);
  io.to(r.id).emit("roundResult",{
    winner:w,
    coins:[...r.coins],
    matchWins:[...r.matchWins],
    matchWinner:r.matchWinner,
    reason:r.roundEndReason,
    roundNumber:r.roundNumber
  });
}


function endEqualBidDeadlock(r){
  if(r.gameOver) return;

  const before=[...r.matchWins];

  r.roundWinner=-1;
  r.roundEndReason="fourEqualBids";
  r.gameOver=true;
  r.deadline=0;
  r.readyNext=[false,false];

  // この引き分けは両者1勝扱い（ダイヤを1個ずつ追加）
  r.matchWins[0]++;
  r.matchWins[1]++;

  // 1勝-1勝の状態から発生した時だけ、マッチ全体を本当の引き分けにする
  if(before[0]===1 && before[1]===1){
    r.matchWinner=null;
    r.matchDraw=true;
    r.phase="matchEnd";
  }else if(r.matchWins[0]>=2 && r.matchWins[1]<2){
    r.matchWinner=0;
    r.matchDraw=false;
    r.phase="matchEnd";
  }else if(r.matchWins[1]>=2 && r.matchWins[0]<2){
    r.matchWinner=1;
    r.matchDraw=false;
    r.phase="matchEnd";
  }else{
    r.matchWinner=null;
    r.matchDraw=false;
    r.phase="roundEnd";
  }

  log(r,`第${r.roundNumber}戦：同額入札が4回連続したため引き分け。両者に1勝を付与しました。`);
  send(r);
  if(r.phase==="matchEnd") void recordMatchStats(r);
  io.to(r.id).emit("roundResult",{
    winner:-1,
    reason:"fourEqualBids",
    coins:[...r.coins],
    matchWins:[...r.matchWins],
    matchWinner:r.matchWinner,
    matchDraw:!!r.matchDraw,
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

function revealDurationMs(maxBid,hasWinner=true){
  let total=0;
  for(let i=1;i<=maxBid;i++){
    total+=Math.max(105,720*Math.pow(.90,i-1));
  }

  // コイン積み上げ後:
  // 勝敗表示 → 盤面チップ落下 → 着地余韻。
  // DRAWは盤面チップ演出がないので短め。
  return Math.ceil(total+(hasWinner?2850:1700));
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

  if(b[0]===b[1]){
    r.equalBidStreak=(r.equalBidStreak||0)+1;
    log(r,`同額入札 ${r.equalBidStreak}/4`);
  }else{
    r.equalBidStreak=0;
  }

  const deadlockDraw=(r.equalBidStreak>=4);
  io.to(r.id).emit("auctionResult",{
    winner:auctionWinner,
    bids:[...b],
    cell:c,
    equalBidStreak:r.equalBidStreak,
    deadlockDraw
  });

  r.auctionCount++;
  if(r.auctionCount>=2) r.middleUnlocked=true;
  r.bids=[null,null];
  r.bidDrafts=[0,0];

  // v2.9.3: 1枚目から徐々に加速するコイン演出に同期。
  const revealMs=revealDurationMs(Math.max(b[0],b[1]),auctionWinner!==-1);
  r.phase="auctionPause";
  r.deadline=0;
  r.pendingDeadlockDraw=deadlockDraw;
  r.auctionPauseUntil=Date.now()+revealMs;
  send(r);
  scheduleAuctionAdvance(r,revealMs);
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
  if(r.players.some(p=>p && !p.connected)) return;
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
  logRoundStart(r);
  send(r);
}

function startMatch(r){
  r.matchWins=[0,0];
  r.matchWinner=null;
  r.matchDraw=false;
  r.roundWinner=null;
  r.roundEndReason=null;
  r.matchEndReason=null;
  r.equalBidStreak=0;
  r.roundNumber=0;
  r.choice=[null,null];
  r.readyNext=[false,false];
  r.countdownUntil=0;
  r.disconnectCounts=[0,0];
  r.disconnectDeadlines=[0,0];
  r.statsRecorded=false;
  io.to(r.id).emit("logReset");
  setupRound(r);
  logRoundStart(r);
  log(r,"連戦を開始しました。");
  send(r);
}

function returnToRoom(r){
  r.phase="waiting";
  r.matchWins=[0,0];
  r.matchWinner=null;
  r.matchDraw=false;
  r.roundWinner=null;
  r.roundEndReason=null;
  r.matchEndReason=null;
  r.equalBidStreak=0;
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
  r.disconnectDeadlines=[0,0];
  r.disconnectCounts=[0,0];
  r.pausedForDisconnect=false;
  r.pausedDeadlineRemaining=0;
  r.pausedCountdownRemaining=0;
  r.auctionPauseUntil=0;
  r.pendingDeadlockDraw=false;
  r.statsRecorded=false;
  send(r);
}

io.on("connection",s=>{
  s.on("create",async({name,authToken},cb)=>{
    let account=null;
    try{
      if(authToken) account=await resolveAccount(authToken);
    }catch(err){
      return cb({ok:false,error:"ログイン期限が切れています。もう一度ログインしてください。"});
    }

    const id=makeCode();
    const token=makeReconnectToken();
    const playerName=account?.profile?.display_name||cleanDisplayName(name,"プレイヤー1");
    const r=newRoom(id,{
      id:s.id,
      name:playerName,
      token,
      userId:account?.user?.id||null,
      rating:account?.profile?.rating??null,
      highestRating:account?.profile?.highest_rating??null
    });
    rooms.set(id,r);
    s.join(id);
    s.data={room:id,slot:0};
    cb({
      ok:true,
      room:id,
      slot:0,
      reconnectToken:token,
      account:account?{rating:account.profile.rating}:null
    });
    send(r);
    log(r,"ルームを作成しました。友達の入室を待っています。");
  });

  s.on("join",async({room,name,authToken},cb)=>{
    const r=rooms.get((room||"").toUpperCase());
    if(!r) return cb({ok:false,error:"ルームが見つかりません。"});
    if(r.players[1]) return cb({ok:false,error:"このルームは満員です。"});

    let account=null;
    try{
      if(authToken) account=await resolveAccount(authToken);
    }catch(err){
      return cb({ok:false,error:"ログイン期限が切れています。もう一度ログインしてください。"});
    }

    if(account?.user?.id && r.players[0]?.userId===account.user.id){
      return cb({ok:false,error:"同じアカウントで同じルームには参加できません。"});
    }

    const token=makeReconnectToken();
    const playerName=account?.profile?.display_name||cleanDisplayName(name,"プレイヤー2");
    r.players[1]={
      id:s.id,
      name:playerName,
      token,
      connected:true,
      userId:account?.user?.id||null,
      rating:account?.profile?.rating??null,
      highestRating:account?.profile?.highest_rating??null
    };
    s.join(r.id);
    s.data={room:r.id,slot:1};
    cb({
      ok:true,
      room:r.id,
      slot:1,
      reconnectToken:token,
      account:account?{rating:account.profile.rating}:null
    });

    if(r.phase==="waiting"){
      setupRound(r);
      logRoundStart(r);
      log(r,"2人そろいました。先手・後手が決定しました！");
    }
    send(r);
  });

  s.on("select",({cell})=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="select" || r.gameOver || r.pausedForDisconnect) return;
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
    if(!r || r.phase!=="bid" || r.gameOver || r.pausedForDisconnect) return;
    const i=s.data.slot;
    const n=Number(amount);
    if(Number.isInteger(n) && n>=0 && n<=r.coins[i]){
      r.bidDrafts[i]=n;
    }
  });

  s.on("bid",({amount})=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="bid" || r.gameOver || r.pausedForDisconnect) return;

    const i=s.data.slot;
    const n=Number(amount);
    if(r.bids[i]!==null) return;

    if(!Number.isInteger(n) || n<0 || n>r.coins[i]){
      return s.emit("errorMsg","入札額が不正です。");
    }

    r.bids[i]=n;
    r.bidDrafts[i]=n;
    s.emit("bidAccepted",{amount:n});

    if(r.bids[0]!==null && r.bids[1]!==null){
      resolveBid(r,[...r.bids]);
    }else{
      // 自分だけ確定している間は「入札を変更する」を表示できるよう更新。
      send(r);
    }
  });

  s.on("changeBid",()=>{
    const r=rooms.get(s.data.room);
    const i=s.data.slot;

    if(!r || r.phase!=="bid" || r.gameOver || r.pausedForDisconnect){
      return s.emit("bidChangeDenied","すでに入札結果の処理が始まっているため変更できません。");
    }
    if(i!==0 && i!==1) return;
    if(r.bids[i]===null){
      return s.emit("bidChangeDenied","現在、確定済みの入札はありません。");
    }

    // 相手が確定した瞬間以降は変更不可。競合した場合もサーバー側判定を優先。
    if(r.bids[1-i]!==null){
      return s.emit("bidChangeDenied","相手も入札を確定したため、変更できません。");
    }

    const previous=r.bids[i];
    r.bids[i]=null;
    r.bidDrafts[i]=previous;
    s.emit("bidUnlocked",{amount:previous});
    send(r);
  });


  s.on("rejoin",({room,token},cb)=>{
    const r=rooms.get((room||"").toUpperCase());
    if(!r) return cb?.({ok:false,error:"ルームが見つかりません。"});
    if(!token) return cb?.({ok:false,error:"復帰情報がありません。"});

    const i=r.players.findIndex(p=>p && p.token===token);
    if(i<0) return cb?.({ok:false,error:"この端末の復帰情報が一致しません。"});

    const p=r.players[i];
    p.id=s.id;
    p.connected=true;
    r.disconnectDeadlines[i]=0;

    s.join(r.id);
    s.data={room:r.id,slot:i};

    cb?.({
      ok:true,
      room:r.id,
      slot:i,
      reconnectToken:p.token,
      rejoined:true
    });

    resumeAfterDisconnect(r);
    send(r);
  });

  s.on("surrenderRound",()=>{
    const r=rooms.get(s.data.room);
    const i=s.data.slot;
    if(!r || r.gameOver || r.pausedForDisconnect || !activeRoundPhase(r)) return;
    if(i!==0 && i!==1) return;

    r.roundEndReason="surrender";
    log(r,`${r.players[i]?.name||"プレイヤー"} が第${r.roundNumber}戦を降参しました。`);
    endRound(r,1-i);
  });

  s.on("nextRound",()=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="roundEnd" || r.matchWinner!==null || r.pausedForDisconnect) return;

    r.readyNext[s.data.slot]=true;
    send(r);

    if(r.readyNext[0] && r.readyNext[1]){
      startCountdown(r);
    }
  });

  s.on("matchChoice",({choice})=>{
    const r=rooms.get(s.data.room);
    if(!r || r.phase!=="matchEnd" || r.pausedForDisconnect) return;
    if(choice!=="rematch" && choice!=="room") return;

    r.choice[s.data.slot]=choice;

    if(r.choice[0]===choice && r.choice[1]===choice){
      if(choice==="rematch") startMatch(r);
      else returnToRoom(r);
    }else{
      send(r);
    }
  });

  s.on("leaveRoom",()=>{
    const r=rooms.get(s.data.room);
    if(!r) return;
    io.to(r.id).emit("roomClosed");
    rooms.delete(r.id);
    s.leave(r.id);
    s.data={};
  });

  s.on("disconnect",()=>{
    const r=rooms.get(s.data.room);
    const i=s.data.slot;
    if(!r || (i!==0 && i!==1)) return;

    const p=r.players[i];
    // 古いsocketの遅延disconnectが、新しい接続を切断扱いにしないようにする。
    if(!p || p.id!==s.id) return;

    p.connected=false;

    // 対戦相手がまだいない待機中は、不戦勝処理も切断回数加算もしない。
    if(!r.players[1] || r.phase==="waiting"){
      send(r);
      return;
    }

    // すでにマッチが終わっている場合も勝敗は変更しない。
    if(r.phase==="matchEnd"){
      send(r);
      return;
    }

    r.disconnectCounts[i]=(r.disconnectCounts?.[i]||0)+1;

    // 同一マッチ中の2回目の切断は、20秒猶予なしで即マッチ敗北。
    if(r.disconnectCounts[i]>=2){
      r.disconnectDeadlines[i]=0;
      io.to(r.id).emit("secondDisconnectLoss",{slot:i});
      finishDisconnectForfeit(r,i,"secondDisconnect");
      return;
    }

    // 1回目だけ20秒の復帰猶予。
    r.disconnectDeadlines[i]=Date.now()+20000;
    pauseForDisconnect(r);
    io.to(r.id).emit("playerDisconnected",{slot:i,seconds:20,disconnectCount:r.disconnectCounts[i]});
    log(r,`${p.name} が切断しました。1回目の切断のため、20秒間だけ復帰を待ちます。`);
    send(r);
  });
});

setInterval(()=>{
  for(const r of rooms.values()){
    // 切断猶予20秒。期限切れで、残っている側をマッチ勝者にする。
    for(let i=0;i<2;i++){
      if(r.disconnectDeadlines?.[i]){
        const left=Math.max(0,Math.ceil((r.disconnectDeadlines[i]-Date.now())/1000));
        io.to(r.id).emit("disconnectTick",{slot:i,seconds:left});
        if(Date.now()>=r.disconnectDeadlines[i]){
          r.disconnectDeadlines[i]=0;
          finishDisconnectForfeit(r,i,"timeout");
        }
      }
    }

    if(!rooms.has(r.id)) continue;
    if(r.pausedForDisconnect) continue;

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
