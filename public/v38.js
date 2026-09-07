/* BID GRID v3.11.12 - robust character artwork with HD atlas fallback */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=31112';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const assetVersion='31112';
  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const characterSrc=id=>`/characters/full/${id}.webp?v=${assetVersion}`;

  function safeCharacter(id){
    return playable.includes(id)?id:'merchant';
  }

  function fallbackSprite(id){
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    const span=document.createElement('span');
    span.className=`characterSprite sprite-${safe} nativeFallbackSprite`;
    span.dataset.character=safe;
    span.setAttribute('role','img');
    span.setAttribute('aria-label',c.name);
    return span;
  }

  // Broken/missing individual images must never make a character disappear.
  // The fallback uses the existing HD 3x3 character sheet already shipped by the app.
  document.addEventListener('error',event=>{
    const img=event.target;
    if(!(img instanceof HTMLImageElement) || !img.classList.contains('nativeCharacterImage'))return;
    if(img.dataset.fallbackDone==='1')return;
    img.dataset.fallbackDone='1';
    const id=safeCharacter(img.dataset.character);
    const span=fallbackSprite(id);
    // Preserve the sizing hook used by the surrounding UI.
    if(img.classList.contains('battleCharacterSprite'))span.classList.add('battleCharacterSprite');
    if(img.classList.contains('battleFaceImage'))span.classList.add('battleFaceImage');
    if(img.classList.contains('characterSelectImage'))span.classList.add('characterSelectImage');
    if(img.classList.contains('openingHeroImage'))span.classList.add('openingHeroImage');
    img.replaceWith(span);
  },true);

  playable.forEach(id=>{
    const img=new Image();
    img.decoding='async';
    img.src=characterSrc(id);
  });

  function imageMarkup(id,className,extra=''){
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    return `<img class="${className}" data-character="${safe}" src="${characterSrc(safe)}" alt="${c.name}" draggable="false" decoding="async" ${extra}>`;
  }

  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    // Do not expose data-motion="idle": the legacy gunslinger loop targets it.
    return imageMarkup(id,`battleCharacterSprite nativeCharacterImage nativeBattleBody motion-${motion}`,`data-native-motion="${motion}"`);
  };
  try{battleCharacterMarkup=window.battleCharacterMarkup}catch(e){}

  window.battleCharacterFaceMarkup=function(characterId){
    const id=safeCharacter(characterId||'merchant');
    return imageMarkup(id,'battleFaceImage nativeCharacterImage nativeCharacterFace');
  };
  try{battleCharacterFaceMarkup=window.battleCharacterFaceMarkup}catch(e){}

  window.characterVisual=function(id,compact=false){
    if(id==='random'){
      return `<div class="charPortrait character-random nativeRandomPortrait"><span class="nativeRandomGlyph" aria-hidden="true">?</span></div><div class="charName">ランダム</div>${compact?'':`<div class="charSub">RANDOM</div>`}`;
    }
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    return `<div class="charPortrait character-${safe}">${imageMarkup(safe,'characterSelectImage nativeCharacterImage')}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    return imageMarkup(safeCharacter(id||'merchant'),'openingHeroImage nativeCharacterImage');
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
