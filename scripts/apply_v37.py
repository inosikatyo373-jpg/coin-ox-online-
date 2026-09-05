from pathlib import Path
import re
from PIL import Image

INDEX = Path('public/index.html')
s = INDEX.read_text(encoding='utf-8')

# --- Version / cache busting -------------------------------------------------
s = s.replace('BID GRID ONLINE v3.6.1', 'BID GRID ONLINE v3.7')
s = s.replace('ONLINE v3.5 / 2本先取・最大3戦', 'ONLINE v3.7 / 2本先取・最大3戦')
s = s.replace("background-image:url('/characters/characters.png')", "background-image:url('/characters/characters_hd.png?v=370')")
s = s.replace('?v=361', '?v=370')
s = s.replace('const BATTLE_IDLE_SPEED=120;', 'const BATTLE_IDLE_SPEED=170;')
s = s.replace('青く光るマスから、競売するマスを選択してください', '競売するマスを選択してください')

# --- Build crisp pixel assets ------------------------------------------------
atlas = Path('public/characters/characters.png')
if not atlas.exists():
    raise SystemExit('characters.png is missing')
im = Image.open(atlas).convert('RGBA')
im.resize((im.width * 4, im.height * 4), Image.Resampling.NEAREST).save(
    'public/characters/characters_hd.png', optimize=True
)

for i in range(1, 5):
    fp = Path(f'public/characters/gunslinger/gunslinger_idle_{i}.png')
    if not fp.exists():
        raise SystemExit(f'missing {fp}')
    frame = Image.open(fp).convert('RGBA')
    if frame.width < 512 or frame.height < 512:
        sx = max(1, 512 // frame.width)
        sy = max(1, 512 // frame.height)
        scale = max(sx, sy)
        frame = frame.resize((frame.width * scale, frame.height * scale), Image.Resampling.NEAREST)
    frame.save(fp, optimize=True)

# --- Gunslinger motion fix ---------------------------------------------------
# Remove the static atlas fallback underneath the animated frame. It caused a
# double-image/ghosting effect when the four idle frames moved a few pixels.
old_body = '''  if(id==="gunslinger"){
    const src=motion==="idle"?getGunslingerIdleSrc():BATTLE_MOTION_ASSETS.gunslinger.idle[0];
    return `<span class="characterSprite sprite-gunslinger battleBodyFallback" role="img" aria-label="${c.name}"></span><img class="battleCharacterSprite" data-character="gunslinger" data-motion="${motion}" src="${src}" alt="${c.name}" draggable="false" onerror="this.remove()">`;
  }'''
new_body = '''  if(id==="gunslinger"){
    const src=motion==="idle"?getGunslingerIdleSrc():BATTLE_MOTION_ASSETS.gunslinger.idle[0];
    return `<img class="battleCharacterSprite" data-character="gunslinger" data-motion="${motion}" src="${src}" alt="${c.name}" draggable="false">`;
  }'''
if old_body in s:
    s = s.replace(old_body, new_body, 1)
elif new_body not in s:
    raise SystemExit('gunslinger battleCharacterMarkup marker not found')

# The small circular player-card art should be a stable close-up, not the full
# animated sprite. This also keeps every character visually consistent.
face_pattern = re.compile(r'function battleCharacterFaceMarkup\(characterId,motion="static"\)\{.*?\n\}', re.S)
face_replacement = '''function battleCharacterFaceMarkup(characterId,motion="static"){
  const id=characterId||"merchant";const c=getCharacterDef(id);
  return `<span class="characterSprite sprite-${id} battleFaceSprite" role="img" aria-label="${c.name}"></span>`;
}'''
s, face_count = face_pattern.subn(face_replacement, s, count=1)
if face_count != 1:
    raise SystemExit('battleCharacterFaceMarkup marker not found')

# --- Side character stage ----------------------------------------------------
js_marker = '/* ===== BID GRID v3.7 : BATTLE ARENA SIDE CHARACTERS ===== */'
if js_marker not in s:
    side_js = r'''

/* ===== BID GRID v3.7 : BATTLE ARENA SIDE CHARACTERS ===== */
function ensureBattleArenaStage(){
  const board=$("board");if(!board)return null;
  let stage=board.closest(".battleArenaStage");
  if(stage)return stage;
  stage=document.createElement("div");
  stage.className="battleArenaStage";
  const parent=board.parentElement;
  parent.insertBefore(stage,board);
  const self=document.createElement("aside");
  self.className="battleSidePanel battleSideSelf";
  const opp=document.createElement("aside");
  opp.className="battleSidePanel battleSideOpponent";
  stage.append(self,board,opp);
  return stage;
}
function renderBattleArenaCharacters(ps){
  const stage=ensureBattleArenaStage();if(!stage||!state)return;
  const selfIndex=Number(slot)===1?1:0;
  const oppIndex=selfIndex===0?1:0;
  const motion=["select","bid","auctionPause"].includes(state.phase)?"idle":"static";
  const paint=(selector,idx,label)=>{
    const host=stage.querySelector(selector);if(!host)return;
    const player=ps?.[idx];
    if(!player){
      host.innerHTML=`<div class="battleSideLabel">${label}</div><div class="battleSideWaiting">?</div><div class="battleSideCoins"><span>--</span><small> COINS</small></div>`;
      return;
    }
    const id=player.character||"merchant";
    const coins=state.coins?.[idx]??"--";
    host.innerHTML=`<div class="battleSideLabel">${label}</div><div class="battleSideArt character-${id}" data-character="${id}">${battleCharacterMarkup(id,motion)}</div><div class="battleSideCoins"><span>${coins}</span><small> COINS</small></div>`;
  };
  paint(".battleSideSelf",selfIndex,"YOU");
  paint(".battleSideOpponent",oppIndex,"RIVAL");
  updateGunslingerIdleSprites();
}
'''
    init_marker = '\ninitAccount();'
    if init_marker not in s:
        raise SystemExit('initAccount insertion marker not found')
    s = s.replace(init_marker, side_js + init_marker, 1)

# Render the side character panels every state update.
render_hook = '''}).join("");
$("roundLabel").textContent='''
render_hook_replacement = '''}).join("");
renderBattleArenaCharacters(ps);
$("roundLabel").textContent='''
if render_hook in s:
    s = s.replace(render_hook, render_hook_replacement, 1)
elif 'renderBattleArenaCharacters(ps);\n$("roundLabel").textContent=' not in s:
    raise SystemExit('render battle arena hook not found')

# --- Visual polish -----------------------------------------------------------
css_marker = '/* ===== BID GRID v3.7 : CRISP CHARACTERS + AUCTION FOCUS ===== */'
if css_marker not in s:
    css = r'''

/* ===== BID GRID v3.7 : CRISP CHARACTERS + AUCTION FOCUS ===== */
.characterSprite,.battleCharacterSprite{
  image-rendering:pixelated!important;
  image-rendering:crisp-edges;
}

/* Opening: the selected character is a clear visual anchor. */
.openingCharacterBanner{
  min-height:214px!important;
  grid-template-columns:190px minmax(0,1fr) auto!important;
  padding:16px 20px!important;
}
.openingHeroPortrait{width:178px!important;height:178px!important;border-radius:20px!important;}
.openingHeroPortrait .openingHeroSprite{
  width:168%!important;height:168%!important;transform:none!important;
  filter:drop-shadow(0 9px 8px #000b)!important;
}
.openingCharacterName{font-size:42px!important;}

/* Character select: make art large enough to judge the character at a glance. */
#characterMenu{max-width:930px!important;}
#characterMenu .characterGrid{gap:14px!important;}
#characterMenu .characterCard{min-height:226px!important;padding:12px 8px!important;}
#characterMenu .charPortrait{
  width:168px!important;height:168px!important;border:0!important;background:transparent!important;
  box-shadow:none!important;overflow:visible!important;
}
#characterMenu .charPortrait::before{display:none!important;}
#characterMenu .charPortrait .characterSprite{filter:drop-shadow(0 8px 7px #0009)!important;}
#characterMenu .charName{font-size:15px!important;}

/* Player header circles: crop strongly to face/hat, do not shrink the full body. */
.playerPanel .player{grid-template-columns:minmax(0,1fr) 100px auto!important;}
.characterAvatar{
  width:96px!important;height:96px!important;border-radius:50%!important;overflow:hidden!important;
  border:2px solid #a57b36!important;
  background:radial-gradient(circle at 50% 42%,#26354c,#091019 74%)!important;
}
.characterAvatar .battleFaceSprite{
  position:absolute!important;width:218%!important;height:218%!important;
  left:-59%!important;top:-43%!important;margin:0!important;filter:none!important;transform:none!important;
}
.characterAvatar.character-dog .battleFaceSprite{top:-34%!important;}
.characterAvatar.character-robot .battleFaceSprite{top:-39%!important;}
.characterAvatar.character-doctor .battleFaceSprite{top:-47%!important;}
.characterAvatar.character-mage .battleFaceSprite{top:-46%!important;}

/* Main battle arena: YOU is left, RIVAL is right, coins sit directly below. */
.battleArenaStage{
  width:min(100%,960px);margin:0 auto;display:grid;
  grid-template-columns:minmax(130px,190px) minmax(320px,520px) minmax(130px,190px);
  grid-template-areas:"self board rival";gap:16px;align-items:end;
}
.battleArenaStage>.board{grid-area:board;width:100%!important;margin:0!important;}
.battleSideSelf{grid-area:self}.battleSideOpponent{grid-area:rival}
.battleSidePanel{
  min-height:310px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
  padding:12px 8px 14px;border:1px solid #5d4724;border-radius:20px;
  background:radial-gradient(circle at 50% 38%,#172638 0,#0c131d 58%,#080d14 100%);
  box-shadow:inset 0 0 0 2px #181108,0 12px 30px #0008;overflow:hidden;
}
.battleSideLabel{
  font-family:"Cormorant Garamond","Times New Roman",serif;font-size:13px;font-weight:700;
  letter-spacing:.18em;color:#bca15f;margin-bottom:4px;
}
.battleSideArt{width:100%;height:220px;display:grid;place-items:end center;position:relative;overflow:visible;}
.battleSideArt .characterSprite{width:100%;height:100%;filter:drop-shadow(0 10px 8px #000b)!important;}
.battleSideArt .battleCharacterSprite{
  width:100%;height:100%;object-fit:contain;object-position:center bottom;
  filter:drop-shadow(0 10px 8px #000b)!important;
}
.battleSideWaiting{
  width:100%;height:220px;display:grid;place-items:center;
  font-family:"Cormorant Garamond",serif;font-size:72px;color:#594829;opacity:.65;
}
.battleSideCoins{margin-top:2px;white-space:nowrap;color:#e8d9aa;text-align:center;}
.battleSideCoins span{
  font-family:"Cormorant Garamond","Times New Roman",serif;font-size:43px;font-weight:700;line-height:1;
  color:#f5d77e;text-shadow:0 2px 0 #3c270d,0 0 15px #d5aa4930;
}
.battleSideCoins small{font-size:10px;font-weight:1000;letter-spacing:.12em;color:#9f9277;}

/* Choosing a cell: restrained, premium, tactile — no blue dot helper. */
.boardStatusBanner.selecting{
  color:#e5d2a0!important;border-color:#74582d!important;
  background:linear-gradient(180deg,#161a1e,#0b1017)!important;
  box-shadow:inset 0 0 16px #d8a53b0b!important;
}
.cell.selectable{
  background:radial-gradient(circle at 30% 25%,#24344a,#152338 58%,#0b1421)!important;
  border:1px solid #8b6b35!important;
  box-shadow:inset 0 0 0 1px #2c1d0d,0 7px 16px #0005!important;
  transform:scale(.985)!important;filter:brightness(.92);
}
.cell.selectable::before{
  content:""!important;position:absolute!important;inset:7px!important;width:auto!important;height:auto!important;
  left:7px!important;top:7px!important;transform:none!important;border:1px solid #a17a3b45!important;
  border-radius:12px!important;background:linear-gradient(135deg,#e8c6660d,transparent 42%)!important;
  box-shadow:none!important;padding:0!important;
}
.cell.selectable:hover,.cell.selectable:focus-visible{
  transform:translateY(-3px) scale(1.015)!important;filter:brightness(1.12);border-color:#dfb85e!important;
  box-shadow:inset 0 0 0 1px #e6c56a55,0 0 18px #d5a84632,0 10px 22px #0007!important;
}

/* Auction target: dim the rest and chase two luminous arcs around the target. */
.board:has(.cell.auction) .cell:not(.auction){
  filter:brightness(.48) saturate(.72)!important;opacity:.78;transform:scale(.965)!important;
  transition:filter .24s ease,opacity .24s ease,transform .24s ease;
}
.cell.auction{
  overflow:visible!important;z-index:8!important;transform:scale(1.045)!important;
  background:radial-gradient(circle at 50% 38%,#3e351e,#201a11 62%,#0c0f13)!important;
  border:1px solid #e2bd62!important;
  box-shadow:inset 0 0 0 2px #6d5226,0 0 18px #f1c55d75,0 0 42px #5fd7ff26!important;
  animation:auctionFocusBreath 1.7s ease-in-out infinite!important;
}
.cell.auction::before{
  content:""!important;position:absolute!important;inset:-8px!important;z-index:8!important;padding:2px!important;
  border:0!important;border-radius:24px!important;
  background:conic-gradient(from 0deg,transparent 0 8%,#77e8ff 10% 16%,#fff4c2 17% 20%,transparent 22% 49%,#f6c85e 51% 57%,#fff1ae 58% 61%,transparent 63% 100%)!important;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
  -webkit-mask-composite:xor!important;mask-composite:exclude!important;
  box-shadow:none!important;animation:auctionChaseRing 1.35s linear infinite!important;pointer-events:none!important;
}
.cell.auction::after{
  content:"NOW BIDDING"!important;left:12%!important;right:12%!important;bottom:8px!important;padding:3px 5px!important;
  background:linear-gradient(180deg,#edc75f,#91611d)!important;color:#171006!important;
  border:1px solid #ffe69a!important;border-radius:999px!important;font-size:10px!important;
  letter-spacing:.10em!important;box-shadow:0 4px 12px #0007,0 0 12px #e8c35b38!important;
}
@keyframes auctionChaseRing{to{transform:rotate(360deg)}}
@keyframes auctionFocusBreath{
  0%,100%{filter:brightness(1);box-shadow:inset 0 0 0 2px #6d5226,0 0 16px #f1c55d62,0 0 34px #5fd7ff1d}
  50%{filter:brightness(1.1);box-shadow:inset 0 0 0 2px #8f7135,0 0 26px #f5d27396,0 0 54px #69ddff32}
}

/* Keep the four gunslinger frames aligned and stable. */
.battleCharacterSprite[data-character="gunslinger"]{
  object-fit:contain!important;object-position:center bottom!important;transform:none;
}

@media(max-width:760px){
  .openingCharacterBanner{min-height:150px!important;grid-template-columns:116px minmax(0,1fr)!important;padding:10px 12px!important;}
  .openingHeroPortrait{width:108px!important;height:108px!important;}
  .openingCharacterName{font-size:29px!important;}
  .openingCharacterHint{grid-column:1/-1!important;}
  #characterMenu .characterGrid{gap:6px!important;}
  #characterMenu .characterCard{min-height:150px!important;padding:6px 3px!important;}
  #characterMenu .charPortrait{width:96px!important;height:96px!important;}
  .playerPanel .player{grid-template-columns:minmax(0,1fr) 64px auto!important;}
  .characterAvatar{width:62px!important;height:62px!important;}
  .battleArenaStage{grid-template-columns:1fr 1fr;grid-template-areas:"self rival" "board board";gap:8px;align-items:end;}
  .battleSidePanel{
    min-height:112px;display:grid;grid-template-columns:72px 1fr;grid-template-rows:auto auto;
    padding:6px 8px;border-radius:14px;
  }
  .battleSideLabel{grid-column:2;grid-row:1;align-self:end;margin:0;font-size:9px;text-align:left;width:100%;}
  .battleSideArt,.battleSideWaiting{grid-column:1;grid-row:1/3;width:70px;height:92px;}
  .battleSideCoins{grid-column:2;grid-row:2;text-align:left;align-self:start;}
  .battleSideCoins span{font-size:30px;}
  .battleArenaStage>.board{margin-top:3px!important;}
}
@media(prefers-reduced-motion:reduce){.cell.auction::before,.cell.auction{animation:none!important;}}
'''
    style_close = '</style>'
    if style_close not in s:
        raise SystemExit('</style> not found')
    s = s.replace(style_close, css + '\n' + style_close, 1)

INDEX.write_text(s, encoding='utf-8')

# Basic validation before Actions does the JS syntax check.
assert 'BID GRID ONLINE v3.7' in s
assert 'characters_hd.png?v=370' in s
assert 'renderBattleArenaCharacters(ps);' in s
assert 'auctionChaseRing' in s
