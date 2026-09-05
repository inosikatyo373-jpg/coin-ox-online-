from pathlib import Path
import re

p = Path('public/index.html')
s = p.read_text()

s = s.replace('<title>BID GRID ONLINE v3.2</title>', '<title>BID GRID ONLINE v3.2.2</title>')
s = s.replace('<title>BID GRID ONLINE v3.2.1</title>', '<title>BID GRID ONLINE v3.2.2</title>')
s = s.replace('ONLINE v3.2.1 / 2本先取・最大3戦', 'ONLINE v3.2.2 / 2本先取・最大3戦')
s = s.replace('ONLINE v3.2 / 2本先取・最大3戦', 'ONLINE v3.2.2 / 2本先取・最大3戦')

css = r'''
/* ===== BID GRID v3.2.2 : OPENING + PLAYER CARD POLISH ===== */
#openingMenu .accountCard{
  padding:14px 14px!important;
  gap:16px!important;
  align-items:center!important;
  margin-bottom:12px!important;
}
#openingMenu .accountIdentity{gap:12px!important;min-width:0;flex:1}
#openingMenu .accountBadge{min-width:68px;padding:7px 9px;font-size:10px}
#openingMenu .accountCopy{min-width:0;flex:1}
#openingMenu .accountName{
  font-size:19px!important;
  line-height:1.15;
  letter-spacing:.02em;
  color:#f5e8c7!important;
}
#openingMenu .accountStats{
  margin-top:4px!important;
  font-size:9px!important;
  line-height:1.25!important;
  letter-spacing:.04em;
  color:#847a67!important;
  opacity:.9;
}
#openingMenu .accountActions{gap:8px!important;flex-wrap:nowrap}
#openingMenu .accountMiniBtn{
  min-height:42px!important;
  padding:9px 13px!important;
  border-radius:11px!important;
  font-size:12px!important;
  white-space:nowrap;
}
#openingMenu #accountOpen{min-width:140px}
#openingMenu .openingStats{margin-top:12px!important}

.playerPanel .players{grid-template-columns:1fr 1fr;gap:12px!important}
.playerPanel .player{
  min-width:0;
  min-height:122px;
  padding:12px 14px!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 78px auto;
  align-items:center;
  gap:12px;
  position:relative;
  overflow:hidden;
}
.playerPanel .player.you::after{
  content:"YOU";
  position:absolute;
  right:9px;
  top:7px;
  font-size:8px;
  font-weight:1000;
  letter-spacing:.12em;
  color:#e5c567;
  opacity:.65;
}
.playerIdentity{min-width:0;align-self:center}
.playerNameRow{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap}
.playerSymbol{font-size:20px;font-weight:1000;line-height:1}
.playerName{
  min-width:0;
  max-width:100%;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:16px;
  font-weight:1000;
  letter-spacing:.02em;
}
.playerNameRow .role{margin-top:0!important;padding:3px 7px!important;font-size:10px!important;line-height:1.3}
.playerPanel .playerRate{
  margin-top:8px!important;
  color:#d2b862!important;
  font-size:11px!important;
  font-weight:1000!important;
  letter-spacing:.04em;
}
.playerAvatar{
  width:74px;
  height:88px;
  justify-self:center;
  position:relative;
  border-radius:24px 24px 18px 18px;
  background:radial-gradient(circle at 50% 28%,#253248 0 24%,#121b2a 58%,#080d14 100%);
  border:1px solid #765925;
  box-shadow:inset 0 0 0 2px #21170b,0 8px 18px #0005;
  overflow:hidden;
}
.playerAvatar::before{
  content:"";
  position:absolute;
  z-index:1;
  left:50%;
  top:25%;
  width:34%;
  aspect-ratio:1;
  border-radius:50%;
  transform:translateX(-50%);
  background:linear-gradient(145deg,#d6b788,#987247);
  box-shadow:inset -4px -5px 8px #5b3d22aa,0 2px 5px #0007;
}
.playerAvatar::after{
  content:"";
  position:absolute;
  z-index:1;
  left:50%;
  bottom:7%;
  width:70%;
  height:39%;
  transform:translateX(-50%);
  border-radius:50% 50% 18% 18% / 62% 62% 20% 20%;
  background:linear-gradient(180deg,#28364a,#111a29 72%);
  border:1px solid #88703d88;
  box-shadow:inset 0 7px 10px #ffffff08;
}
.avatarHat{
  position:absolute;
  z-index:3;
  left:50%;
  top:14%;
  width:42%;
  height:15%;
  transform:translateX(-50%);
  border-radius:3px 3px 2px 2px;
  background:linear-gradient(180deg,#cba44e,#76501c);
  box-shadow:0 2px 0 #231609;
}
.avatarHat::after{
  content:"";
  position:absolute;
  left:50%;
  bottom:-4px;
  width:135%;
  height:4px;
  transform:translateX(-50%);
  border-radius:999px;
  background:#d2ad55;
  box-shadow:0 1px 0 #231609;
}
.avatarMark{
  position:absolute;
  z-index:4;
  right:5px;
  bottom:5px;
  width:25px;
  height:25px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:#080d14e8;
  border:1px solid currentColor;
  font-size:16px;
  font-weight:1000;
  box-shadow:0 3px 8px #0007;
}
.avatarO{color:#8fc2ff}.avatarX{color:#ff9b9b}
.playerCoinsWrap{
  min-width:90px;
  justify-self:end;
  text-align:right;
  white-space:nowrap;
  padding-right:2px;
}
.playerCoinsValue{
  font-family:"Cormorant Garamond","Times New Roman",serif;
  font-size:48px;
  line-height:.9;
  font-weight:700;
  color:#f2d98d;
  font-variant-numeric:tabular-nums;
  text-shadow:0 2px 0 #3c270d,0 0 14px #d5aa4930;
}
.playerCoinsUnit{
  margin-left:2px;
  font-size:17px;
  font-weight:1000;
  color:#d3c39e;
}

@media(max-width:600px){
  #openingMenu .accountCard{flex-direction:row!important;align-items:center!important;flex-wrap:wrap!important;padding:12px!important}
  #openingMenu .accountIdentity{width:100%;flex:1 1 100%}
  #openingMenu .accountName{font-size:18px!important}
  #openingMenu .accountActions{width:100%!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important}
  #openingMenu .accountActions #accountOpen:not(.hidden){grid-column:1/-1}
  #openingMenu .accountMiniBtn{width:100%;min-height:44px!important;font-size:12px!important}

  .playerPanel .players{gap:6px!important}
  .playerPanel .player{
    min-height:96px;
    padding:8px 7px!important;
    grid-template-columns:minmax(0,1fr) 48px auto;
    gap:5px;
    border-radius:12px!important;
  }
  .playerPanel .player.you::after{display:none}
  .playerSymbol{font-size:15px}
  .playerNameRow{gap:3px}
  .playerName{font-size:12px;max-width:100%}
  .playerNameRow .role{padding:2px 5px!important;font-size:8px!important}
  .playerPanel .playerRate{font-size:9px!important;margin-top:5px!important}
  .playerAvatar{width:46px;height:58px;border-radius:15px 15px 11px 11px}
  .avatarMark{right:2px;bottom:2px;width:18px;height:18px;font-size:11px}
  .playerCoinsWrap{min-width:54px}
  .playerCoinsValue{font-size:31px}
  .playerCoinsUnit{font-size:12px;margin-left:1px}
}
'''
if 'BID GRID v3.2.2 : OPENING + PLAYER CARD POLISH' not in s:
    s = s.replace('\n</style></head>', css + '\n</style></head>')

s = s.replace('$("accountStats").innerHTML=`最高RATE ${accountProfile.highest_rating}　DRAW ${accountProfile.draws}`;',
              '$("accountStats").textContent=`最高RATE ${accountProfile.highest_rating}`;')

old = '''$("players").innerHTML=ps.map((p,i)=>{
  const role=state.first===i?"先手":state.first!==null?"後手":"";
  const rate=p?.account&&Number.isInteger(p?.rating)?`<div class="playerRate">RATE ${p.rating}</div>`:"";
  return `<div class="player ${i===slot?"you":""}"><span class="${i?"p2":"p1"}">${i?"×":"〇"} ${p?p.name:"待機中"}</span>${role?`<div class="role ${role==="先手"?"first":"second"}">${role}</div>`:""}${rate}<div class="coins">${state.coins[i]}枚</div><div class="score">戦績：${state.matchWins[i]}勝</div></div>`;
}).join("");'''
new = '''$("players").innerHTML=ps.map((p,i)=>{
  const role=state.first===i?"先手":state.first!==null?"後手":"";
  const mark=i?"×":"〇";
  const name=p?p.name:"待機中";
  const rate=p?.account&&Number.isInteger(p?.rating)?`RATE ${p.rating}`:"RATE ----";
  return `<div class="player ${i===slot?"you":""}">
    <div class="playerIdentity">
      <div class="playerNameRow"><span class="playerSymbol ${i?"p2":"p1"}">${mark}</span><span class="playerName ${i?"p2":"p1"}">${name}</span>${role?`<span class="role ${role==="先手"?"first":"second"}">${role}</span>`:""}</div>
      <div class="playerRate">${rate}</div>
    </div>
    <div class="playerAvatar ${i?"avatarX":"avatarO"}" aria-hidden="true"><span class="avatarHat"></span><span class="avatarMark">${mark}</span></div>
    <div class="playerCoinsWrap"><span class="playerCoinsValue">${state.coins[i]}</span><span class="playerCoinsUnit">枚</span></div>
  </div>`;
}).join("");'''
if old not in s:
    raise SystemExit('player render block not found')
s = s.replace(old, new)

p.write_text(s)

# Extract inline browser scripts for node --check in the workflow.
scripts = []
for attrs, body in re.findall(r'<script([^>]*)>(.*?)</script>', s, re.S):
    if 'src=' not in attrs:
        scripts.append(body)
Path('/tmp/bid-grid-inline.js').write_text('\n'.join(scripts))

assert 'ONLINE v3.2.2' in s
assert 'BID GRID v3.2.2 : OPENING + PLAYER CARD POLISH' in s
assert 'playerAvatar' in s
assert '戦績：${state.matchWins[i]}勝' not in s
