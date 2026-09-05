from pathlib import Path
import re

p=Path('public/index.html')
s=p.read_text()

# version
s=s.replace('BID GRID ONLINE v3.4','BID GRID ONLINE v3.5')
s=s.replace('ONLINE v3.4 / 2本先取・最大3戦','ONLINE v3.5 / 2本先取・最大3戦')

css=r'''
/* ===== BID GRID v3.5 : BATTLE CHARACTER MOTION ===== */
.characterAvatar{position:relative}
.characterAvatar .characterSprite{width:100%;height:100%}
.characterAvatar.hasBattleSprite::before,.characterAvatar.hasBattleSprite::after{display:none!important}
.characterAvatar.hasBattleSprite{overflow:visible;background:radial-gradient(circle at 50% 45%,#1a2433 0,#0c121c 72%)}
.battleCharacterSprite{display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;pointer-events:none;user-select:none;filter:drop-shadow(0 5px 6px #0009)}
.characterAvatar .battleCharacterSprite{width:118%;height:118%;margin-left:-9%;margin-top:-9%}
.auctionCharacter{width:92px;height:88px;margin:0 auto 2px;display:grid;place-items:center;position:relative;transform-origin:50% 85%;z-index:3}
.auctionCharacter .battleCharacterSprite{width:96px;height:96px;object-fit:contain}
.auctionCharacter .characterSprite{display:block;width:82px;height:82px}
.auctionCharacter.motion-attack{animation:battleMotionAttack .52s cubic-bezier(.16,.8,.24,1) both}
.auctionCharacter.motion-hit{animation:battleMotionHit .52s cubic-bezier(.2,.75,.3,1) both}
.auctionCharacter.motion-win{animation:battleMotionWin .72s cubic-bezier(.16,.8,.24,1) both}
.auctionCharacter[data-character="gunslinger"].motion-attack::after{content:"";position:absolute;left:-2px;top:22px;width:22px;height:22px;clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);background:#ffe98a;filter:drop-shadow(0 0 8px #f59e0b);animation:muzzleFlash .34s ease-out both;pointer-events:none}
@keyframes battleMotionAttack{0%{transform:translateX(0) scale(1)}42%{transform:translateX(-8px) scale(1.07) rotate(-2deg)}100%{transform:translateX(-2px) scale(1.02)}}
@keyframes battleMotionHit{0%{transform:translateX(0) rotate(0);filter:none}24%{transform:translateX(8px) rotate(3deg);filter:brightness(1.35)}50%{transform:translateX(-5px) rotate(-2deg);filter:brightness(.8)}100%{transform:translateX(0) rotate(0);filter:none}}
@keyframes battleMotionWin{0%{transform:translateY(0) scale(1)}48%{transform:translateY(-8px) scale(1.08)}100%{transform:translateY(-3px) scale(1.04)}}
@keyframes muzzleFlash{0%{opacity:0;transform:scale(.25) rotate(0)}30%{opacity:1;transform:scale(1.35) rotate(20deg)}100%{opacity:0;transform:scale(.4) rotate(55deg)}}
@media(max-width:600px){.auctionCharacter{width:62px;height:58px}.auctionCharacter .battleCharacterSprite{width:66px;height:66px}.auctionCharacter .characterSprite{width:56px;height:56px}.characterAvatar .battleCharacterSprite{width:124%;height:124%;margin-left:-12%;margin-top:-12%}.auctionCharacter[data-character="gunslinger"].motion-attack::after{left:-4px;top:14px;width:16px;height:16px}}
@media(prefers-reduced-motion:reduce){.auctionCharacter.motion-attack,.auctionCharacter.motion-hit,.auctionCharacter.motion-win,.auctionCharacter[data-character="gunslinger"].motion-attack::after{animation:none!important}}
'''
if 'BID GRID v3.5 : BATTLE CHARACTER MOTION' not in s:
    s=s.replace('\n</style></head>',css+'\n</style></head>',1)

# Add two character slots to BID REVEAL.
old0='''      <div class="coinSide">\n        <div class="coinSideLabel oSide">〇</div>\n        <div id="coinStack0" class="coinStack"></div>'''
new0='''      <div class="coinSide">\n        <div id="auctionCharacter0" class="auctionCharacter motion-idle"></div>\n        <div class="coinSideLabel oSide">〇</div>\n        <div id="coinStack0" class="coinStack"></div>'''
if old0 not in s:
    raise SystemExit('coin side 0 block not found')
s=s.replace(old0,new0,1)
old1='''      <div class="coinSide">\n        <div class="coinSideLabel xSide">×</div>\n        <div id="coinStack1" class="coinStack"></div>'''
new1='''      <div class="coinSide">\n        <div id="auctionCharacter1" class="auctionCharacter motion-idle"></div>\n        <div class="coinSideLabel xSide">×</div>\n        <div id="coinStack1" class="coinStack"></div>'''
if old1 not in s:
    raise SystemExit('coin side 1 block not found')
s=s.replace(old1,new1,1)

# Motion framework. Gunslinger has 4 real idle frames; other characters retain the current sprite sheet.
marker='const CHARACTER_ORDER=["zombie","merchant","gunslinger","swordswoman","random","robot","dog","mage","doctor"];'
js=r'''
const BATTLE_MOTION_ASSETS={
  gunslinger:{
    idle:[
      "/characters/gunslinger/idle-1.png",
      "/characters/gunslinger/idle-2.png",
      "/characters/gunslinger/idle-3.png",
      "/characters/gunslinger/idle-4.png"
    ]
  }
};
const BATTLE_IDLE_SEQUENCE=[0,1,2,3,2,1];
const BATTLE_IDLE_SPEED=120;
const BATTLE_REDUCED=!!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
let battleIdleSequenceIndex=0;
function getGunslingerIdleSrc(){
  const frames=BATTLE_MOTION_ASSETS.gunslinger.idle;
  const seqIndex=BATTLE_REDUCED?0:BATTLE_IDLE_SEQUENCE[battleIdleSequenceIndex];
  return frames[seqIndex]||frames[0];
}
BATTLE_MOTION_ASSETS.gunslinger.idle.forEach(src=>{const img=new Image();img.src=src});
function battleCharacterMarkup(characterId,motion="static"){
  const id=characterId||"merchant";
  const c=getCharacterDef(id);
  if(id==="gunslinger"){
    const src=motion==="idle"?getGunslingerIdleSrc():BATTLE_MOTION_ASSETS.gunslinger.idle[0];
    return `<img class="battleCharacterSprite" data-character="gunslinger" data-motion="${motion}" src="${src}" alt="${c.name}" draggable="false">`;
  }
  return `<span class="characterSprite sprite-${id}" role="img" aria-label="${c.name}"></span>`;
}
function updateGunslingerIdleSprites(){
  const src=getGunslingerIdleSrc();
  document.querySelectorAll('.battleCharacterSprite[data-character="gunslinger"][data-motion="idle"]').forEach(img=>{
    if(img.getAttribute("src")!==src)img.src=src;
  });
}
if(!BATTLE_REDUCED)setInterval(()=>{
  battleIdleSequenceIndex=(battleIdleSequenceIndex+1)%BATTLE_IDLE_SEQUENCE.length;
  updateGunslingerIdleSprites();
},BATTLE_IDLE_SPEED);
function renderAuctionCharacters(){
  for(let i=0;i<2;i++){
    const target=$("auctionCharacter"+i);if(!target)continue;
    const id=state?.players?.[i]?.character||"merchant";
    target.dataset.character=id;
    target.className="auctionCharacter motion-idle";
    target.innerHTML=battleCharacterMarkup(id,"idle");
  }
  updateGunslingerIdleSprites();
}
function setAuctionCharacterMotion(side,motion){
  const target=$("auctionCharacter"+side);if(!target)return;
  const id=state?.players?.[side]?.character||target.dataset.character||"merchant";
  target.dataset.character=id;
  target.className=`auctionCharacter motion-${motion}`;
  target.innerHTML=battleCharacterMarkup(id,motion==="idle"?"idle":"static");
  if(motion==="idle")updateGunslingerIdleSprites();
}
'''
if 'const BATTLE_MOTION_ASSETS=' not in s:
    if marker not in s: raise SystemExit('CHARACTER_ORDER marker not found')
    s=s.replace(marker,marker+js,1)

# Replace the player-card placeholder glyph with the actual character art / animated gunslinger.
old_avatar='''    <div class="characterAvatar character-${p?.character||"merchant"}" aria-label="${getCharacterDef(p?.character||"merchant").name}"><span class="charGlyph">${getCharacterDef(p?.character||"merchant").glyph}</span></div>'''
new_avatar='''    <div class="characterAvatar character-${p?.character||"merchant"} ${p?.character==="gunslinger"?"hasBattleSprite":""}" aria-label="${getCharacterDef(p?.character||"merchant").name}">${battleCharacterMarkup(p?.character||"merchant",state.phase==="select"||state.phase==="bid"?"idle":"static")}</div>'''
if old_avatar not in s:
    raise SystemExit('player character avatar block not found')
s=s.replace(old_avatar,new_avatar,1)

# Start both characters idling when BID REVEAL opens.
old_start='''async function playAuctionReveal(r){\n  const token=++auctionAnimToken;\n  resetAuctionReveal();$("auctionOverlay").classList.remove("hidden");\n  const a=r.bids[0], b=r.bids[1], maxBid=Math.max(a,b);'''
new_start='''async function playAuctionReveal(r){\n  const token=++auctionAnimToken;\n  resetAuctionReveal();$("auctionOverlay").classList.remove("hidden");\n  renderAuctionCharacters();\n  const a=r.bids[0], b=r.bids[1], maxBid=Math.max(a,b);'''
if old_start not in s:
    raise SystemExit('playAuctionReveal start block not found')
s=s.replace(old_start,new_start,1)

# On a successful auction: winner attacks, then loser reacts, then the existing board-claim animation fires.
old_win='''  if(r.winner===0 || r.winner===1){\n    // 勝者表示を一度見せてから、盤面へ獲得チップを落とす。\n    await sleep(620);\n    if(token!==auctionAnimToken)return;'''
new_win='''  if(r.winner===0 || r.winner===1){\n    // v3.5: winner attack -> loser hit -> board claim.\n    setAuctionCharacterMotion(r.winner,"attack");\n    await sleep(170);\n    if(token!==auctionAnimToken)return;\n    setAuctionCharacterMotion(1-r.winner,"hit");\n    await sleep(350);\n    if(token!==auctionAnimToken)return;'''
if old_win not in s:
    raise SystemExit('winner transition block not found')
s=s.replace(old_win,new_win,1)

p.write_text(s)

# Validate inline scripts in workflow with node --check.
s=p.read_text()
assert 'BID GRID ONLINE v3.5' in s
assert 'BATTLE_MOTION_ASSETS' in s
assert 'auctionCharacter0' in s and 'auctionCharacter1' in s
assert 'setAuctionCharacterMotion(r.winner,"attack")' in s
scripts=[]
for attrs,body in re.findall(r'<script([^>]*)>(.*?)</script>',s,re.S):
    if 'src=' not in attrs:
        scripts.append(body)
Path('/tmp/bid-grid-v35-inline.js').write_text('\n'.join(scripts))
