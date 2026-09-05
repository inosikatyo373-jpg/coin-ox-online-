from pathlib import Path
import re

index_path=Path('public/index.html')
server_path=Path('server/server.js')
s=index_path.read_text()
t=server_path.read_text()

# ---------- version ----------
s=s.replace('<title>BID GRID ONLINE v3.2.3</title>','<title>BID GRID ONLINE v3.3</title>')
s=s.replace('ONLINE v3.2.3 / 2本先取・最大3戦','ONLINE v3.3 / 2本先取・最大3戦')

# ---------- character select CSS ----------
css=r'''
/* ===== BID GRID v3.3 : CHARACTER SELECT ===== */
.characterSelectHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.characterSelectHead h2{margin:0!important}
.characterLead{margin:4px 0 14px;text-align:center;color:#b8aa8d;font-size:12px}
.characterGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.characterCard{
  position:relative;min-height:138px;padding:10px 8px!important;border-radius:14px!important;
  border:1px solid #66502c!important;background:linear-gradient(180deg,#151f2f,#0b111b)!important;
  box-shadow:inset 0 0 0 1px #21160c,0 7px 18px #0004!important;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;
}
.characterCard:hover,.characterCard:focus-visible{transform:translateY(-3px);border-color:#d0a64f!important;box-shadow:0 0 0 2px #d0a64f25,0 12px 25px #0007!important}
.characterCard.selected{border:2px solid #f1ce6b!important;box-shadow:0 0 0 3px #f1ce6b25,0 0 25px #d6a63c35,inset 0 0 18px #f1ce6b10!important;transform:translateY(-2px)}
.characterCard.randomCard{background:radial-gradient(circle at 50% 36%,#39245b,#161326 54%,#0a0d15 100%)!important;border-color:#7855a8!important}
.charPortrait{
  width:70px;height:70px;border-radius:16px;border:1px solid #71562c;background:#080d15;
  display:grid;place-items:center;position:relative;overflow:hidden;box-shadow:inset 0 0 0 2px #171009,0 6px 12px #0006;
}
.charPortrait::before{content:"";position:absolute;inset:7px;border-radius:10px;background:linear-gradient(135deg,#ffffff08,#00000040);border:1px solid #ffffff0c}
.charGlyph{position:relative;z-index:2;font-family:"Noto Sans JP",sans-serif;font-size:34px;font-weight:1000;line-height:1;text-shadow:0 2px 0 #000,0 0 12px currentColor;image-rendering:pixelated}
.charName{font-size:12px;font-weight:1000;color:#f1e3c0;line-height:1.2;text-align:center}
.charSub{font-size:8px;font-weight:900;color:#8e826c;letter-spacing:.06em;text-align:center;min-height:10px}
.character-zombie{color:#8dc79a;background:radial-gradient(circle,#233a31,#0a1412 72%)}
.character-merchant{color:#f1c85d;background:radial-gradient(circle,#403117,#100c06 72%)}
.character-gunslinger{color:#d58d5a;background:radial-gradient(circle,#3b261d,#120c0a 72%)}
.character-swordswoman{color:#9ec7ff;background:radial-gradient(circle,#24344e,#0c111c 72%)}
.character-robot{color:#83e2ed;background:radial-gradient(circle,#1d3a42,#091217 72%)}
.character-dog{color:#e8b77e;background:radial-gradient(circle,#3a2b1f,#110d09 72%)}
.character-mage{color:#c49cff;background:radial-gradient(circle,#33234b,#100b19 72%)}
.character-doctor{color:#b8ef72;background:radial-gradient(circle,#2d3d22,#0d1409 72%)}
.character-random{color:#e9c9ff;background:radial-gradient(circle,#3d2756,#100a18 72%)}
.characterSelectionFooter{margin-top:14px;padding:11px;border:1px solid #57472e;border-radius:12px;background:#0b111a;text-align:center}
#selectedCharacterText{color:#efd079;font-size:13px;font-weight:1000;margin-bottom:8px}
#confirmCharacter{width:100%;min-height:52px;font-size:15px}
.characterAvatar{width:74px;height:88px;justify-self:center;border-radius:18px;border:1px solid #765925;display:grid;place-items:center;box-shadow:inset 0 0 0 2px #21170b,0 8px 18px #0005;overflow:hidden}
.characterAvatar .charGlyph{font-size:38px}
@media(max-width:600px){
  .characterGrid{gap:6px}.characterCard{min-height:112px;padding:7px 4px!important}.charPortrait{width:54px;height:54px;border-radius:12px}.charGlyph{font-size:27px}.charName{font-size:10px}.charSub{font-size:7px}
  .characterAvatar{width:46px;height:58px;border-radius:12px}.characterAvatar .charGlyph{font-size:25px}
}
'''
if 'BID GRID v3.3 : CHARACTER SELECT' not in s:
    s=s.replace('\n</style></head>',css+'\n</style></head>')

# ---------- character screen HTML ----------
needle='''  <div id="friendMenu" class="hidden">'''
char_html='''  <div id="characterMenu" class="hidden">
    <div class="characterSelectHead"><div><div class="lobbyKicker">CHARACTER SELECT</div><h2>キャラクター選択</h2></div><button id="backCharacter" class="backMenuBtn">← 戻る</button></div>
    <p class="characterLead">マッチング前に使用するキャラクターを選んでください。性能差はありません。</p>
    <div id="characterGrid" class="characterGrid"></div>
    <div class="characterSelectionFooter"><div id="selectedCharacterText">キャラクターを選択してください</div><button id="confirmCharacter" class="primary" disabled>このキャラクターで進む</button></div>
  </div>
'''+needle
if 'id="characterMenu"' not in s:
    if needle not in s: raise SystemExit('friend menu marker not found')
    s=s.replace(needle,char_html,1)

# ---------- JS definitions ----------
js_marker='''let lastRatingResult=null;'''
js_insert=r'''let lastRatingResult=null;
let pendingMatchMode=null;
let selectedCharacter=null;
let pendingInviteRoom=null;
const CHARACTER_STORAGE_KEY="bidGridCharacter";
const CHARACTER_DEFS=[
  {id:"zombie",name:"ゾンビ",sub:"GRAVE BIDDER",glyph:"Z"},
  {id:"merchant",name:"商人",sub:"GOLD MERCHANT",glyph:"$"},
  {id:"gunslinger",name:"ガンマン",sub:"GUNSLINGER",glyph:"G"},
  {id:"swordswoman",name:"女の剣士",sub:"SWORD LADY",glyph:"剣"},
  {id:"robot",name:"ロボット",sub:"BID-09",glyph:"R"},
  {id:"dog",name:"犬",sub:"COIN DOG",glyph:"犬"},
  {id:"mage",name:"魔法使いの子供",sub:"LITTLE MAGE",glyph:"M"},
  {id:"doctor",name:"ヤバイ博士",sub:"MAD DOCTOR",glyph:"薬"}
];
const CHARACTER_ORDER=["zombie","merchant","gunslinger","swordswoman","random","robot","dog","mage","doctor"];
function getCharacterDef(id){return CHARACTER_DEFS.find(c=>c.id===id)||CHARACTER_DEFS[1]}
function saveCharacter(id){try{localStorage.setItem(CHARACTER_STORAGE_KEY,id)}catch(e){}}
function loadCharacter(){try{const id=localStorage.getItem(CHARACTER_STORAGE_KEY);return CHARACTER_DEFS.some(c=>c.id===id)?id:null}catch(e){return null}}
function characterVisual(id,compact=false){
  const c=id==="random"?{id:"random",name:"ランダム",sub:"RANDOM",glyph:"?"}:getCharacterDef(id);
  return `<div class="charPortrait character-${c.id}"><span class="charGlyph">${c.glyph}</span></div><div class="charName">${c.name}</div>${compact?"":`<div class="charSub">${c.sub}</div>`}`;
}
function renderCharacterGrid(){
  const g=$("characterGrid"); if(!g)return;
  g.innerHTML=CHARACTER_ORDER.map(id=>`<button class="characterCard ${id==="random"?"randomCard":""} ${selectedCharacter===id?"selected":""}" data-character="${id}">${characterVisual(id)}</button>`).join("");
  g.querySelectorAll("[data-character]").forEach(btn=>btn.onclick=()=>chooseCharacter(btn.dataset.character));
  const chosen=selectedCharacter&&selectedCharacter!=="random"?getCharacterDef(selectedCharacter):null;
  $("selectedCharacterText").textContent=chosen?`選択中：${chosen.name}`:"キャラクターを選択してください";
  $("confirmCharacter").disabled=!chosen;
}
async function chooseCharacter(id){
  if(id!=="random"){
    selectedCharacter=id; saveCharacter(id); renderCharacterGrid(); return;
  }
  const pool=CHARACTER_DEFS.map(c=>c.id); let n=0;
  $("confirmCharacter").disabled=true;
  const timer=setInterval(()=>{
    selectedCharacter=pool[n%pool.length]; renderCharacterGrid(); n++;
    if(n>=12){clearInterval(timer);selectedCharacter=pool[Math.floor(Math.random()*pool.length)];saveCharacter(selectedCharacter);renderCharacterGrid();}
  },65);
}
function beginCharacterSelect(mode){
  pendingMatchMode=mode;
  $("openingMenu").classList.add("hidden");$("friendMenu").classList.add("hidden");$("characterMenu").classList.remove("hidden");
  selectedCharacter=loadCharacter(); renderCharacterGrid();
}
function leaveCharacterSelect(){
  pendingMatchMode=null;$("characterMenu").classList.add("hidden");$("openingMenu").classList.remove("hidden");
}
'''
if 'const CHARACTER_DEFS=' not in s:
    if js_marker not in s: raise SystemExit('JS state marker not found')
    s=s.replace(js_marker,js_insert,1)

# ---------- opening navigation / ranked ----------
old=r'''function showOpeningMenu(){ $("friendMenu").classList.add("hidden"); $("openingMenu").classList.remove("hidden"); $("joinArea").classList.add("hidden"); $("lobbyMsg").textContent=""; }
function showFriendMenu(){ if(rankedSearching){s.emit("cancelRanked");rankedSearching=false;} $("openingMenu").classList.add("hidden"); $("friendMenu").classList.remove("hidden"); }
$("friendMatchBtn").onclick=showFriendMenu; $("backOpening").onclick=showOpeningMenu;
$("rankedMatchBtn").onclick=async()=>{
  if(rankedSearching){s.emit("cancelRanked");rankedSearching=false;$("rankedMatchBtn").textContent="ランクマッチ";$("rankedStatus").textContent="検索をキャンセルしました。";return;}
  if(!accountProfile){$("accountMessage").textContent="ランクマッチにはログインが必要です。";openAccountModal();return;}
  const authToken=await ensureAccountToken(); if(!authToken){openAccountModal();return;}
  $("rankedStatus").textContent=`対戦相手を検索中… RATE ${accountProfile.rating}（まず±100から検索）`; $("rankedMatchBtn").textContent="検索をキャンセル"; rankedSearching=true;
  s.emit("joinRanked",{authToken},r=>{if(!r?.ok){rankedSearching=false;$("rankedMatchBtn").textContent="ランクマッチ";$("rankedStatus").textContent=r?.error||"検索を開始できませんでした。";}});
};'''
new=r'''function showOpeningMenu(){ $("friendMenu").classList.add("hidden"); $("characterMenu").classList.add("hidden"); $("openingMenu").classList.remove("hidden"); $("joinArea").classList.add("hidden"); $("lobbyMsg").textContent=""; }
function showFriendMenu(){ if(rankedSearching){s.emit("cancelRanked");rankedSearching=false;} $("openingMenu").classList.add("hidden"); $("characterMenu").classList.add("hidden"); $("friendMenu").classList.remove("hidden"); if(pendingInviteRoom){$("room").value=pendingInviteRoom;$("joinArea").classList.remove("hidden");$("toggleJoin").textContent="参加欄を閉じる";} }
$("friendMatchBtn").onclick=()=>beginCharacterSelect("friend"); $("backOpening").onclick=showOpeningMenu; $("backCharacter").onclick=leaveCharacterSelect;
async function startRankedMatch(){
  if(rankedSearching){s.emit("cancelRanked");rankedSearching=false;$("rankedMatchBtn").textContent="ランクマッチ";$("rankedStatus").textContent="検索をキャンセルしました。";return;}
  if(!accountProfile){$("accountMessage").textContent="ランクマッチにはログインが必要です。";openAccountModal();return;}
  const authToken=await ensureAccountToken(); if(!authToken){openAccountModal();return;}
  $("characterMenu").classList.add("hidden");$("openingMenu").classList.remove("hidden");
  $("rankedStatus").textContent=`対戦相手を検索中… RATE ${accountProfile.rating} / ${getCharacterDef(selectedCharacter).name}`; $("rankedMatchBtn").textContent="検索をキャンセル"; rankedSearching=true;
  s.emit("joinRanked",{authToken,character:selectedCharacter},r=>{if(!r?.ok){rankedSearching=false;$("rankedMatchBtn").textContent="ランクマッチ";$("rankedStatus").textContent=r?.error||"検索を開始できませんでした。";}});
}
$("rankedMatchBtn").onclick=()=>{if(rankedSearching)return startRankedMatch();beginCharacterSelect("ranked")};
$("confirmCharacter").onclick=()=>{if(!selectedCharacter)return;if(pendingMatchMode==="ranked")startRankedMatch();else if(pendingMatchMode==="friend")showFriendMenu();};'''
if old not in s: raise SystemExit('opening/ranked block not found')
s=s.replace(old,new,1)

# ---------- create/join send character ----------
s=s.replace('s.emit("create",{name:$("name").value,authToken},handle);','s.emit("create",{name:$("name").value,authToken,character:selectedCharacter},handle);')
s=s.replace('s.emit("join",{room:code,name:$("name").value,authToken},handle);','s.emit("join",{room:code,name:$("name").value,authToken,character:selectedCharacter},handle);')

# ---------- player card avatar ----------
old_avatar=r'''    <div class="playerAvatar ${i?"avatarX":"avatarO"}" aria-hidden="true"><span class="avatarHat"></span><span class="avatarMark">${mark}</span></div>'''
new_avatar=r'''    <div class="characterAvatar character-${p?.character||"merchant"}" aria-label="${getCharacterDef(p?.character||"merchant").name}"><span class="charGlyph">${getCharacterDef(p?.character||"merchant").glyph}</span></div>'''
if old_avatar not in s: raise SystemExit('player avatar block not found')
s=s.replace(old_avatar,new_avatar,1)

# ---------- invite query flow ----------
old_q=r'''let q=new URLSearchParams(location.search).get("room");
if(q){
  showFriendMenu();
  $("room").value=q.toUpperCase(); $("joinArea").classList.remove("hidden"); $("toggleJoin").textContent="参加欄を閉じる";
}'''
new_q=r'''let q=new URLSearchParams(location.search).get("room");
if(q){
  pendingInviteRoom=q.toUpperCase();
  beginCharacterSelect("friend");
}'''
if old_q not in s: raise SystemExit('invite query block not found')
s=s.replace(old_q,new_q,1)

# ---------- server character support ----------
if 'const CHARACTER_IDS=' not in t:
    t=t.replace('const rankedQueue=[];','const rankedQueue=[];\nconst CHARACTER_IDS=new Set(["zombie","merchant","gunslinger","swordswoman","robot","dog","mage","doctor"]);\nfunction cleanCharacter(v){return CHARACTER_IDS.has(String(v||""))?String(v):"merchant";}')

t=t.replace('''      highestRating:Number.isInteger(creator.highestRating)?creator.highestRating:null\n    },null],''','''      highestRating:Number.isInteger(creator.highestRating)?creator.highestRating:null,\n      character:cleanCharacter(creator.character)\n    },null],''')

t=t.replace('''      account:!!p.userId\n    }:null),''','''      account:!!p.userId,\n      character:cleanCharacter(p.character)\n    }:null),''')

t=t.replace('''  const r=newRoom(id,{id:sa.id,name:a.name,token:ta,userId:a.userId,rating:a.rating,highestRating:a.highestRating,matchType:"ranked"});''','''  const r=newRoom(id,{id:sa.id,name:a.name,token:ta,userId:a.userId,rating:a.rating,highestRating:a.highestRating,character:a.character,matchType:"ranked"});''')
t=t.replace('''  r.players[1]={id:sb.id,name:b.name,token:tb,connected:true,userId:b.userId,rating:b.rating,highestRating:b.highestRating};''','''  r.players[1]={id:sb.id,name:b.name,token:tb,connected:true,userId:b.userId,rating:b.rating,highestRating:b.highestRating,character:cleanCharacter(b.character)};''')

t=t.replace('''  s.on("joinRanked",async({authToken},cb)=>{''','''  s.on("joinRanked",async({authToken,character},cb)=>{''')
t=t.replace('''    rankedQueue.push({socketId:s.id,userId:account.user.id,name:account.profile.display_name,rating:account.profile.rating,highestRating:account.profile.highest_rating,joinedAt:Date.now()});''','''    rankedQueue.push({socketId:s.id,userId:account.user.id,name:account.profile.display_name,rating:account.profile.rating,highestRating:account.profile.highest_rating,character:cleanCharacter(character),joinedAt:Date.now()});''')

t=t.replace('''  s.on("create",async({name,authToken},cb)=>{''','''  s.on("create",async({name,authToken,character},cb)=>{''')
t=t.replace('''      highestRating:account?.profile?.highest_rating??null\n    });''','''      highestRating:account?.profile?.highest_rating??null,\n      character:cleanCharacter(character)\n    });''',1)

t=t.replace('''  s.on("join",async({room,name,authToken},cb)=>{''','''  s.on("join",async({room,name,authToken,character},cb)=>{''')
t=t.replace('''      highestRating:account?.profile?.highest_rating??null\n    };''','''      highestRating:account?.profile?.highest_rating??null,\n      character:cleanCharacter(character)\n    };''',1)

# sanity checks
assert 'ONLINE v3.3' in s
assert 'id="characterMenu"' in s
assert 'CHARACTER_DEFS' in s
assert 'joinRanked",{authToken,character:selectedCharacter}' in s
assert 'character:selectedCharacter' in s
assert 'character:cleanCharacter(p.character)' in t
assert 'cleanCharacter(character)' in t

index_path.write_text(s)
server_path.write_text(t)

# validate inline JS
tags=[]
for attrs,body in re.findall(r'<script([^>]*)>(.*?)</script>',s,re.S):
    if 'src=' not in attrs: tags.append(body)
Path('/tmp/bid-grid-v33-inline.js').write_text('\n'.join(tags))
