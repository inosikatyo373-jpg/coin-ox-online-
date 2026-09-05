from pathlib import Path

p = Path('public/index.html')
s = p.read_text(encoding='utf-8')

def must_replace(old, new, count=1):
    global s
    if old not in s:
        raise SystemExit('Required patch marker not found: ' + old[:120])
    s = s.replace(old, new, count)

s = s.replace('BID GRID ONLINE v3.5', 'BID GRID ONLINE v3.6')
for i in range(1, 5):
    s = s.replace(f'/characters/gunslinger/idle-{i}.png', f'/characters/gunslinger/gunslinger_idle_{i}.png')

old_face_call = '${battleCharacterMarkup(p?.character||"merchant",state.phase==="select"||state.phase==="bid"?"idle":"static")}'
new_face_call = '${battleCharacterFaceMarkup(p?.character||"merchant",state.phase==="select"||state.phase==="bid"?"idle":"static")}'
must_replace(old_face_call, new_face_call)

old_confirm = '$("confirmCharacter").onclick=()=>{if(!selectedCharacter)return;if(pendingMatchMode==="ranked")startRankedMatch();else if(pendingMatchMode==="friend")showFriendMenu();};'
new_confirm = '$("confirmCharacter").onclick=()=>{if(!selectedCharacter)return;if(pendingMatchMode==="ranked")startRankedMatch();else if(pendingMatchMode==="friend")showFriendMenu();else{pendingMatchMode=null;showOpeningMenu();renderOpeningCharacterBanner();}};'
must_replace(old_confirm, new_confirm)

css_marker = '/* ===== BID GRID v3.6 : CHARACTER UI POLISH ===== */'
if css_marker not in s:
    css = r'''

/* ===== BID GRID v3.6 : CHARACTER UI POLISH ===== */
.openingCharacterSelect{margin:15px 0 14px!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important}
.openingCharacterBanner{width:100%;min-height:164px;padding:12px 16px!important;display:grid;grid-template-columns:142px minmax(0,1fr) auto;align-items:center;gap:18px;text-align:left;border:1px solid #9b7333!important;border-radius:18px!important;background:linear-gradient(135deg,#121c2b 0%,#0b111b 55%,#19120a 100%)!important;box-shadow:inset 0 0 0 2px #21170b,0 12px 30px #0007,0 0 24px #d4a84310!important;color:#f3e7c8!important;position:relative;overflow:hidden}
.openingCharacterBanner::after{content:"";position:absolute;inset:7px;border:1px solid #5f4827;border-radius:13px;pointer-events:none}
.openingCharacterBanner:hover,.openingCharacterBanner:focus-visible{transform:translateY(-2px);border-color:#e0b655!important;box-shadow:inset 0 0 0 2px #21170b,0 16px 36px #0008,0 0 28px #d4a8432e!important}
.openingHeroPortrait{width:132px;height:132px;border-radius:16px;position:relative;overflow:hidden;display:grid;place-items:center;background:radial-gradient(circle at 50% 34%,#24334a 0%,#101824 58%,#080d14 100%);border:1px solid #8f6b2e;box-shadow:inset 0 0 0 2px #21170b,0 8px 20px #0008}
.openingHeroPortrait .characterSprite{width:122%;height:122%;transform:scale(1.1);filter:drop-shadow(0 6px 7px #000a)}
.openingHeroPortrait .openingHeroGunslinger{width:142%;height:142%;object-fit:contain;image-rendering:pixelated;transform:translateY(7%);filter:drop-shadow(0 6px 7px #000b)}
.openingCharacterCopy{position:relative;z-index:1;min-width:0;display:flex;flex-direction:column}
.openingCharacterKicker{font-family:"Cormorant Garamond","Times New Roman",serif;font-size:13px;letter-spacing:.14em;color:#ad9361;font-weight:700}
.openingCharacterName{font-family:"Cormorant Garamond","Times New Roman",serif;font-size:34px;line-height:1.05;color:#f4d77f;font-weight:700;margin:3px 0 6px}
.openingCharacterSub{font-size:11px;letter-spacing:.12em;color:#a89b82;font-weight:900}
.openingCharacterHint{position:relative;z-index:1;align-self:center;padding:10px 13px;border:1px solid #88652c;border-radius:999px;color:#f0d181;font-size:11px;font-weight:1000;white-space:nowrap;background:#171108}
#characterMenu{max-width:860px;margin:0 auto}
#characterMenu .characterGrid{gap:12px}
#characterMenu .characterCard{min-height:198px;padding:10px 7px!important;border-radius:15px!important}
#characterMenu .charPortrait{width:142px;height:142px;border-radius:14px}
#characterMenu .charName{font-size:14px;margin-top:5px}
#characterMenu .charSub{font-size:9px}
#characterMenu .characterCard.selected{transform:translateY(-2px);box-shadow:0 0 0 2px #e3bb63,0 13px 24px #0007!important}
.characterAvatar{width:82px!important;height:82px!important;border-radius:50%!important;position:relative!important;overflow:hidden!important;border:2px solid #98743a!important;background:radial-gradient(circle at 50% 38%,#24334a,#0a1019 72%)!important;box-shadow:inset 0 0 0 2px #171007,0 6px 16px #0008!important}
.characterAvatar .battleFaceImage{position:absolute!important;width:190%!important;height:190%!important;max-width:none!important;left:50%!important;top:-5%!important;transform:translateX(-50%)!important;object-fit:contain!important;image-rendering:pixelated!important;margin:0!important;filter:none!important}
.characterAvatar .battleFaceSprite{position:absolute!important;width:190%!important;height:190%!important;left:-45%!important;top:-5%!important;margin:0!important;filter:none!important;image-rendering:pixelated!important}
.characterAvatar.character-dog .battleFaceSprite{top:-1%!important}
.characterAvatar.character-doctor .battleFaceSprite{top:-9%!important}
.characterAvatar.character-mage .battleFaceSprite{top:-8%!important}
.boardStatusBanner.selecting{border-color:#9f7937!important;color:#ead7aa!important;background:linear-gradient(180deg,#191711,#0d1118)!important;box-shadow:0 0 0 1px #c39a4a22,inset 0 0 16px #d8a53b0d!important}
.cell.selectable{border:2px solid #b18a46!important;background:linear-gradient(180deg,#f1e6c9,#ddc99c)!important;box-shadow:inset 0 0 0 2px #fff8dc70,0 4px 12px #0003!important;transform:none!important}
.cell.selectable:hover,.cell.selectable:focus-visible{transform:translateY(-2px)!important;border-color:#e4be67!important;box-shadow:inset 0 0 0 2px #fff7d090,0 0 0 2px #b88b3955,0 8px 20px #0004!important}
.cell.selectable::before{content:""!important;width:9px;height:9px;padding:0!important;left:50%!important;top:9px!important;right:auto!important;bottom:auto!important;transform:translateX(-50%) rotate(45deg)!important;border:1px solid #8b6428!important;border-radius:1px!important;background:#d7aa4c!important;box-shadow:0 1px 3px #0004!important}
.playerActionStatus{color:#c9ab68!important}
.playerActionStatus.active::before{content:"⌛ "!important;color:#d9b763!important;font-size:9px!important}
@media(max-width:600px){.openingCharacterBanner{min-height:126px;padding:9px 10px!important;grid-template-columns:98px minmax(0,1fr);gap:10px}.openingHeroPortrait{width:94px;height:94px;border-radius:13px}.openingCharacterName{font-size:25px}.openingCharacterKicker{font-size:9px}.openingCharacterSub{font-size:8px}.openingCharacterHint{grid-column:1/-1;justify-self:stretch;text-align:center;padding:7px 10px}#characterMenu .characterGrid{gap:6px}#characterMenu .characterCard{min-height:142px;padding:6px 3px!important}#characterMenu .charPortrait{width:88px;height:88px}#characterMenu .charName{font-size:10px}#characterMenu .charSub{font-size:7px}.characterAvatar{width:56px!important;height:56px!important}}
'''
    s = s.replace('</style>', css + '\n</style>', 1)

js_marker = '/* ===== BID GRID v3.6 : OPENING BANNER + FACE PORTRAITS ===== */'
if js_marker not in s:
    js = r'''

/* ===== BID GRID v3.6 : OPENING BANNER + FACE PORTRAITS ===== */
function openingSelectedArt(id){
  const c=getCharacterDef(id||"merchant");
  if(c.id==="gunslinger")return `<img class="openingHeroGunslinger" src="/characters/gunslinger/gunslinger_idle_1.png" alt="${c.name}" draggable="false">`;
  return `<span class="characterSprite sprite-${c.id}" role="img" aria-label="${c.name}"></span>`;
}
function renderOpeningCharacterBanner(){
  const host=$("openingCharacterSelect");if(!host)return;
  const id=selectedCharacter||loadCharacter()||"merchant";const c=getCharacterDef(id);const banner=$("openingCharacterBanner");if(!banner)return;
  const art=$("openingHeroPortrait");if(art)art.innerHTML=openingSelectedArt(id);
  const name=$("openingCharacterName");if(name)name.textContent=c.name;
  const sub=$("openingCharacterSub");if(sub)sub.textContent=c.sub;
  banner.setAttribute("aria-label",`使用キャラクター ${c.name}。クリックして変更`);
}
function mountOpeningCharacterSelect(){
  const opening=$("openingMenu");if(!opening||$("openingCharacterSelect"))return;
  selectedCharacter=loadCharacter()||"merchant";saveCharacter(selectedCharacter);
  const sec=document.createElement("div");sec.id="openingCharacterSelect";sec.className="openingCharacterSelect";
  sec.innerHTML=`<button id="openingCharacterBanner" class="openingCharacterBanner" type="button"><span id="openingHeroPortrait" class="openingHeroPortrait"></span><span class="openingCharacterCopy"><span class="openingCharacterKicker">SELECTED CHARACTER</span><span id="openingCharacterName" class="openingCharacterName"></span><span id="openingCharacterSub" class="openingCharacterSub"></span></span><span class="openingCharacterHint">キャラクター変更　›</span></button>`;
  const anchor=opening.querySelector(".openingMenuActions");if(anchor)opening.insertBefore(sec,anchor);else opening.appendChild(sec);
  $("openingCharacterBanner").onclick=()=>beginCharacterSelect("opening");renderOpeningCharacterBanner();
}
function showOpeningMenu(){$("friendMenu").classList.add("hidden");$("characterMenu").classList.add("hidden");$("openingMenu").classList.remove("hidden");$("joinArea").classList.add("hidden");$("lobbyMsg").textContent="";renderOpeningCharacterBanner()}
function leaveCharacterSelect(){pendingMatchMode=null;$("characterMenu").classList.add("hidden");$("openingMenu").classList.remove("hidden");renderOpeningCharacterBanner()}
function battleCharacterFaceMarkup(characterId,motion="static"){
  const id=characterId||"merchant";const c=getCharacterDef(id);
  if(id==="gunslinger"){
    const src=motion==="idle"?getGunslingerIdleSrc():BATTLE_MOTION_ASSETS.gunslinger.idle[0];
    return `<img class="battleCharacterSprite battleFaceImage" data-character="gunslinger" data-motion="${motion}" src="${src}" alt="${c.name}" draggable="false">`;
  }
  return `<span class="characterSprite sprite-${id} battleFaceSprite" role="img" aria-label="${c.name}"></span>`;
}
'''
    must_replace('initAccount();\nmountOpeningCharacterSelect();', js + '\ninitAccount();\nmountOpeningCharacterSelect();')

p.write_text(s, encoding='utf-8')
