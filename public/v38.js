/* BID GRID v3.14.2 - real auction attack / hit sprite frames */
(function(){
  function injectStyle(key,href){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(`data-${key}`,'1');
    document.head.appendChild(link);
  }
  injectStyle('v381-fullbody','/v381.css?v=3142');
  injectStyle('v382-actions','/v382.css?v=3142');
  injectStyle('character-motions-3142','/character-motions.css?v=3142');

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const IDLE_PERIODS={gunslinger:3.8,zombie:4.8,merchant:3.6,swordswoman:4.2,robot:3.2,dog:2.4,mage:4.6,doctor:3.4};

  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage characterIdle ${className}" data-character="${safe}" style="--idle-delay:-${((performance.now()/1000)%(IDLE_PERIODS[safe]||4)).toFixed(3)}s" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false">`;
  }
  function ensureActionMotionScript(){
    if(typeof window.bidActionMotionMarkup==='function')return;
    if(document.querySelector('script[data-character-motions-3142]'))return;
    const script=document.createElement('script');
    script.src='/character-motions.js?v=3142';
    script.setAttribute('data-character-motions-3142','1');
    script.onload=()=>{repaintCharacterUI();syncBattle();try{if(typeof renderAuctionCharacters==='function')renderAuctionCharacters()}catch(e){}};
    document.body.appendChild(script);
  }
  function fullBodyMarkup(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    if(window.bidCharacterMotionMarkup)return window.bidCharacterMotionMarkup(safe,className,motion,0);
    return spriteMarkup(safe,className);
  }
  function actionBodyMarkup(id,motion,side,className=''){
    const safe=safeCharacter(id);
    if((motion==='attack'||motion==='hit') && window.bidActionMotionMarkup){
      return window.bidActionMotionMarkup(safe,className,motion,side);
    }
    return fullBodyMarkup(safe,className,motion==='idle'?'idle':'static');
  }

  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    return fullBodyMarkup(id,`battleCharacterSprite nativeStableSprite motion-${motion}`,motion);
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
    return `<div class="charPortrait character-${safe}">${fullBodyMarkup(safe,'nativeStableSprite','idle')}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    const safe=safeCharacter(id||'merchant');
    return fullBodyMarkup(safe,'openingHeroSprite nativeStableSprite','idle');
  };
  try{openingSelectedArt=window.openingSelectedArt}catch(e){}

  window.renderAuctionCharacters=function(){
    ensureActionMotionScript();
    for(let i=0;i<2;i++){
      const target=document.getElementById('auctionCharacter'+i);if(!target)continue;
      const id=state?.players?.[i]?.character||'merchant';
      target.dataset.character=id;
      target.className='auctionCharacter motion-idle';
      target.innerHTML=fullBodyMarkup(id,'battleCharacterSprite nativeStableSprite motion-idle','idle');
      try{window.preloadBidActionMotion?.(id)}catch(e){}
    }
  };
  try{renderAuctionCharacters=window.renderAuctionCharacters}catch(e){}

  window.setAuctionCharacterMotion=function(side,motion){
    ensureActionMotionScript();
    const target=document.getElementById('auctionCharacter'+side);if(!target)return;
    const id=state?.players?.[side]?.character||target.dataset.character||'merchant';
    const useSprite=(motion==='attack'||motion==='hit') && typeof window.bidActionMotionMarkup==='function';
    target.dataset.character=id;
    target.className=`auctionCharacter motion-${motion}${useSprite?' motion-sprite':''}`;
    target.innerHTML=useSprite
      ? actionBodyMarkup(id,motion,side,'battleCharacterSprite nativeStableSprite')
      : fullBodyMarkup(id,'battleCharacterSprite nativeStableSprite motion-idle',motion==='idle'?'idle':'static');
  };
  try{setAuctionCharacterMotion=window.setAuctionCharacterMotion}catch(e){}

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

  ensureActionMotionScript();
  repaintCharacterUI();
  window.addEventListener('load',()=>{repaintCharacterUI();syncBattle();});
  setTimeout(()=>{repaintCharacterUI();syncBattle();},0);
})();
