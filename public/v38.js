/* BID GRID v3.15.6 - separated idle + immediate auction attack/hit sprites */
(function(){
  const VERSION='3156';
  window.BID_CHARACTER_BRIDGE_VERSION=VERSION;

  function injectStyle(key,href){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(`data-${key}`,'1');
    document.head.appendChild(link);
  }
  injectStyle('v381-fullbody','/v381.css?v='+VERSION);
  injectStyle('v382-actions','/v382.css?v='+VERSION);
  injectStyle('character-motions-'+VERSION,'/character-motions.css?v='+VERSION);

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  function safeCharacter(id){return playable.includes(id)?id:'merchant'}

  function ensureMotionScript(){
    if(window.BID_ACTION_MOTION_VERSION===VERSION && window.BID_IDLE_MOTION_VERSION===VERSION && window.bidCharacterMotionMarkup && window.bidActionMotionMarkup)return;
    if(document.querySelector(`script[data-character-motions-${VERSION}]`))return;
    const script=document.createElement('script');
    script.src=`/character-motions.js?v=${VERSION}`;
    script.setAttribute(`data-character-motions-${VERSION}`,'1');
    script.onload=()=>{
      repaintCharacterUI();
      syncBattle();
      try{if(typeof renderAuctionCharacters==='function')renderAuctionCharacters()}catch(e){}
    };
    document.body.appendChild(script);
  }

  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false" decoding="async">`;
  }
  function fallbackIdleMarkup(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    const staticClass=motion==='static'||className.includes('motion-static')?' motion-static':'';
    return `<span class="bid-idle-motion ${className}${staticClass}" data-character="${safe}" role="img" aria-label="${c.name}"><img class="nativeCharacterImage nativeSourceImage bid-idle-img" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="" draggable="false" decoding="async"></span>`;
  }
  function currentMotionReady(){
    return window.BID_ACTION_MOTION_VERSION===VERSION && window.BID_IDLE_MOTION_VERSION===VERSION;
  }
  function idleBody(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    if(currentMotionReady() && window.bidCharacterMotionMarkup)return window.bidCharacterMotionMarkup(safe,className,motion,0);
    ensureMotionScript();
    return fallbackIdleMarkup(safe,className,motion);
  }
  function actionBody(id,motion,side,className=''){
    const safe=safeCharacter(id);
    if((motion==='attack'||motion==='hit') && currentMotionReady() && window.bidActionMotionMarkup){
      return window.bidActionMotionMarkup(safe,className,motion,side);
    }
    ensureMotionScript();
    return fallbackIdleMarkup(safe,className,'static');
  }

  window.battleCharacterMarkup=function(characterId,motion='idle'){
    const id=safeCharacter(characterId||'merchant');
    const m=(motion==='static')?'static':'idle';
    return idleBody(id,`battleCharacterSprite nativeStableSprite motion-${m}`,m);
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
    return `<div class="charPortrait character-${safe}">${idleBody(safe,'nativeStableSprite','idle')}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    const safe=safeCharacter(id||'merchant');
    return idleBody(safe,'openingHeroSprite nativeStableSprite','idle');
  };
  try{openingSelectedArt=window.openingSelectedArt}catch(e){}

  window.renderAuctionCharacters=function(){
    ensureMotionScript();
    for(let i=0;i<2;i++){
      const target=document.getElementById('auctionCharacter'+i);if(!target)continue;
      const id=state?.players?.[i]?.character||'merchant';
      target.dataset.character=id;
      target.className='auctionCharacter motion-idle';
      target.innerHTML=idleBody(id,'battleCharacterSprite nativeStableSprite motion-idle','idle');
      try{window.preloadBidIdleMotion?.(id);window.preloadBidActionMotion?.(id)}catch(e){}
    }
  };
  try{renderAuctionCharacters=window.renderAuctionCharacters}catch(e){}

  window.setAuctionCharacterMotion=function(side,motion){
    ensureMotionScript();
    const target=document.getElementById('auctionCharacter'+side);if(!target)return;
    const id=state?.players?.[side]?.character||target.dataset.character||'merchant';
    const useSprite=(motion==='attack'||motion==='hit') && currentMotionReady() && typeof window.bidActionMotionMarkup==='function';
    target.dataset.character=id;
    target.className=`auctionCharacter motion-${motion}${useSprite?' motion-sprite':''}`;
    target.innerHTML=useSprite
      ? actionBody(id,motion,side,'battleCharacterSprite nativeStableSprite')
      : idleBody(id,'battleCharacterSprite nativeStableSprite motion-idle',motion==='idle'?'idle':'static');
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

  ensureMotionScript();
  repaintCharacterUI();
  window.addEventListener('load',()=>{repaintCharacterUI();syncBattle();});
  setTimeout(()=>{repaintCharacterUI();syncBattle();},0);
})();
