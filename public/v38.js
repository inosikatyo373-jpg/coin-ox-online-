/* BID GRID v3.11.1 - native individual HD character artwork */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=3111';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const assetVersion='3111';
  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const characterSrc=id=>`/characters/full/${id}.webp?v=${assetVersion}`;

  playable.forEach(id=>{
    const img=new Image();
    img.decoding='async';
    img.src=characterSrc(id);
  });

  function safeCharacter(id){ return playable.includes(id)?id:'merchant'; }

  function fullImageMarkup(id,className,extra=''){
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    return `<img class="${className}" data-character="${safe}" src="${characterSrc(safe)}" alt="${c.name}" draggable="false" decoding="async" ${extra}>`;
  }

  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    return fullImageMarkup(id,`battleCharacterSprite nativeCharacterImage nativeBattleBody motion-${motion}`,`data-motion="${motion}"`);
  };
  try{battleCharacterMarkup=window.battleCharacterMarkup}catch(e){}

  window.battleCharacterFaceMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    return fullImageMarkup(id,'battleFaceImage nativeCharacterImage nativeCharacterFace');
  };
  try{battleCharacterFaceMarkup=window.battleCharacterFaceMarkup}catch(e){}

  window.characterVisual=function(id,compact=false){
    if(id==='random'){
      return `<div class="charPortrait character-random nativeRandomPortrait"><span class="nativeRandomGlyph" aria-hidden="true">?</span></div><div class="charName">ランダム</div>${compact?'':`<div class="charSub">RANDOM</div>`}`;
    }
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    const art=fullImageMarkup(safe,'characterSelectImage nativeCharacterImage');
    return `<div class="charPortrait character-${safe}">${art}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    const safe=safeCharacter(id||'merchant');
    return fullImageMarkup(safe,'openingHeroImage nativeCharacterImage');
  };
  try{openingSelectedArt=window.openingSelectedArt}catch(e){}

  function repaintCharacterUI(){
    try{if(typeof renderCharacterGrid==='function')renderCharacterGrid()}catch(e){console.warn('[character-art] character grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterGrid==='function')renderOpeningCharacterGrid()}catch(e){console.warn('[character-art] opening grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterBanner==='function')renderOpeningCharacterBanner()}catch(e){console.warn('[character-art] opening banner repaint failed',e)}
  }

  function syncBattlePresentation(){
    const game=document.getElementById('game');
    const active=!!game && !game.classList.contains('hidden');
    document.body.classList.toggle('battle-active',active);
    if(!active)return;

    const playerPanel=game.querySelector('.playerPanel');
    const hud=document.getElementById('stickyHud');
    if(playerPanel && hud && hud.previousElementSibling!==playerPanel){
      playerPanel.insertAdjacentElement('afterend',hud);
    }

    try{
      if(typeof renderBattleArenaCharacters==='function' && typeof state!=='undefined' && state?.players){
        renderBattleArenaCharacters(state.players);
      }
    }catch(e){console.warn('[character-art] battle repaint failed',e)}
  }

  repaintCharacterUI();
  const observer=new MutationObserver(syncBattlePresentation);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style']});
  window.addEventListener('load',()=>{repaintCharacterUI();syncBattlePresentation();});
  setTimeout(()=>{repaintCharacterUI();syncBattlePresentation();},0);
})();
