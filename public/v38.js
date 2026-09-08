/* BID GRID v3.14.1 - individual character idle motions + auction action layer */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=3141';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-v382-actions]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v382.css?v=3141';
    link.dataset.v382Actions='1';
    document.head.appendChild(link);
  }

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];

  const IDLE_PERIODS={gunslinger:3.8,zombie:4.8,merchant:3.6,swordswoman:4.2,robot:3.2,dog:2.4,mage:4.6,doctor:3.4};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" style="--idle-delay:-${((performance.now()/1000)%(IDLE_PERIODS[safe]||4)).toFixed(3)}s" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false">`;
  }
  function fullBodyMarkup(id,className=''){
    const safe=safeCharacter(id);
    return window.bidCharacterMotionMarkup ? window.bidCharacterMotionMarkup(safe,className) : spriteMarkup(safe,`${className} characterIdle`);
  }

  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    return fullBodyMarkup(id,`battleCharacterSprite nativeStableSprite motion-${motion}`);
  };
  try{battleCharacterMarkup=window.battleCharacterMarkup}catch(e){}

  // Keep the small circular HUD portrait static and crisp.
  window.battleCharacterFaceMarkup=function(characterId){
    return spriteMarkup(safeCharacter(characterId||'merchant'),'battleFaceSprite nativeStableSprite');
  };
  try{battleCharacterFaceMarkup=window.battleCharacterFaceMarkup}catch(e){}

  window.characterVisual=function(id,compact=false){
    if(id==='random'){
      return `<div class="charPortrait character-random">${spriteMarkup('random')}</div><div class="charName">ランダム</div>${compact?'':`<div class="charSub">RANDOM</div>`}`;
    }
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    return `<div class="charPortrait character-${safe}">${fullBodyMarkup(safe,'nativeStableSprite')}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    const safe=safeCharacter(id||'merchant');
    return fullBodyMarkup(safe,'openingHeroSprite nativeStableSprite');
  };
  try{openingSelectedArt=window.openingSelectedArt}catch(e){}

  function repaintCharacterUI(){
    try{if(typeof renderCharacterGrid==='function')renderCharacterGrid()}catch(e){console.warn('[character-art] grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterGrid==='function')renderOpeningCharacterGrid()}catch(e){console.warn('[character-art] opening grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterBanner==='function')renderOpeningCharacterBanner()}catch(e){console.warn('[character-art] banner repaint failed',e)}
  }
  function syncBattle(){
    try{
      if(typeof renderBattleArenaCharacters==='function' && typeof state!=='undefined' && state?.players){
        renderBattleArenaCharacters(state.players);
      }
    }catch(e){console.warn('[character-art] battle repaint failed',e)}
  }

  repaintCharacterUI();
  window.addEventListener('load',()=>{repaintCharacterUI();syncBattle();});
  setTimeout(()=>{repaintCharacterUI();syncBattle();},0);
})();
