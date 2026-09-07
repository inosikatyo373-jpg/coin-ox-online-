/* BID GRID v3.11.15 - original PNG character artwork */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=31115';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" src="/characters/original/${safe}.png?v=31115" alt="${c.name}" draggable="false">`;
  }

  // Render the supplied original PNGs without resampling or atlas cropping.
  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    return spriteMarkup(id,`battleCharacterSprite nativeStableSprite motion-${motion}`);
  };
  try{battleCharacterMarkup=window.battleCharacterMarkup}catch(e){}

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
    return `<div class="charPortrait character-${safe}">${spriteMarkup(safe,'nativeStableSprite')}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    return spriteMarkup(safeCharacter(id||'merchant'),'openingHeroSprite nativeStableSprite');
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
