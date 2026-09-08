/* BID GRID v3.12.4 - Jack sprite-sheet idle loop */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=3124';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const JACK_IDLE_SHEET='/characters/gunslinger/jack_idle_sheet_6f.png?v=3124';
  const JACK_IDLE_FRAME_COUNT=6;
  const JACK_IDLE_INTERVAL=200;

  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false">`;
  }
  function jackSpriteMarkup(className=''){
    const c=getCharacterDef('gunslinger');
    return `<span class="jackSpriteSheet ${className}" data-character="gunslinger" data-jack-frame="0" role="img" aria-label="${c.name}"></span>`;
  }
  function fullBodyMarkup(id,className=''){
    const safe=safeCharacter(id);
    return safe==='gunslinger'?jackSpriteMarkup(className):spriteMarkup(safe,className);
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

  let jackIdleFrame=0;
  let jackIdleTimer=null;
  let jackSheetReady=false;

  function preloadJackSheet(){
    return new Promise(resolve=>{
      const img=new Image();
      img.decoding='async';
      img.onload=()=>{
        const finish=()=>{jackSheetReady=true;resolve();};
        if(typeof img.decode==='function') img.decode().catch(()=>{}).finally(finish);
        else finish();
      };
      img.onerror=()=>resolve();
      img.src=JACK_IDLE_SHEET;
    });
  }
  function syncJackSprites(){
    document.querySelectorAll('.jackSpriteSheet').forEach(sprite=>{
      sprite.setAttribute('data-jack-frame',String(jackIdleFrame));
    });
  }
  function advanceJackIdle(){
    jackIdleFrame=(jackIdleFrame+1)%JACK_IDLE_FRAME_COUNT;
    syncJackSprites();
  }
  function startJackIdleLoop(){
    if(jackIdleTimer) return;
    preloadJackSheet().then(()=>{
      if(jackIdleTimer) return;
      jackIdleFrame=0;
      syncJackSprites();
      // Even if preload failed, retry through CSS background without swapping URLs.
      jackIdleTimer=setInterval(advanceJackIdle,JACK_IDLE_INTERVAL);
    });
  }

  function repaintCharacterUI(){
    try{if(typeof renderCharacterGrid==='function')renderCharacterGrid()}catch(e){console.warn('[character-art] grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterGrid==='function')renderOpeningCharacterGrid()}catch(e){console.warn('[character-art] opening grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterBanner==='function')renderOpeningCharacterBanner()}catch(e){console.warn('[character-art] banner repaint failed',e)}
    syncJackSprites();
  }
  function syncBattle(){
    try{
      if(typeof renderBattleArenaCharacters==='function' && typeof state!=='undefined' && state?.players){
        renderBattleArenaCharacters(state.players);
      }
    }catch(e){console.warn('[character-art] battle repaint failed',e)}
    syncJackSprites();
  }

  repaintCharacterUI();
  startJackIdleLoop();
  window.addEventListener('load',()=>{repaintCharacterUI();syncBattle();});
  setTimeout(()=>{repaintCharacterUI();syncBattle();},0);
})();
