/* BID GRID v3.14.9 - persistent idle sprites and readable auction action timing */
(function(){
  const ACTION_VERSION='3146';
  const STYLE_VERSION='3149';
  window.BID_CHARACTER_BRIDGE_VERSION=ACTION_VERSION;
  function injectStyle(key,href){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(`data-${key}`,'1');
    document.head.appendChild(link);
  }
  injectStyle('v381-fullbody','/v381.css?v='+STYLE_VERSION);
  injectStyle('v382-actions','/v382.css?v='+STYLE_VERSION);
  injectStyle('character-motions-'+STYLE_VERSION,'/character-motions.css?v='+STYLE_VERSION);

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  let actionSequence=0;
  let delayedHitTimer=0;
  let overlayHoldTimer=0;
  let overlayHoldUntil=0;
  let overlayObserver=null;

  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false" decoding="async">`;
  }
  function ensureActionMotionScript(){
    if(window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && window.BID_IDLE_MOTION_VERSION===ACTION_VERSION && typeof window.bidActionMotionMarkup==='function' && typeof window.bidCharacterMotionMarkup==='function')return;
    if(document.querySelector(`script[data-character-motions-${STYLE_VERSION}]`))return;
    const script=document.createElement('script');
    script.src=`/character-motions.js?v=${STYLE_VERSION}`;
    script.setAttribute(`data-character-motions-${STYLE_VERSION}`,'1');
    script.onload=()=>{repaintCharacterUI();syncBattle();try{if(typeof renderAuctionCharacters==='function')renderAuctionCharacters()}catch(e){}};
    document.body.appendChild(script);
  }
  function fallbackIdleMarkup(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    const staticClass=motion==='static'||className.includes('motion-static')?' motion-static':'';
    return `<span class="bid-idle-motion ${className}${staticClass}" data-character="${safe}" role="img" aria-label="${c.name}"><img class="nativeCharacterImage nativeSourceImage bid-idle-img" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="" draggable="false" decoding="async"></span>`;
  }
  function fullBodyMarkup(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    if(window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && window.BID_IDLE_MOTION_VERSION===ACTION_VERSION && window.bidCharacterMotionMarkup){
      return window.bidCharacterMotionMarkup(safe,className,motion,0);
    }
    ensureActionMotionScript();
    return fallbackIdleMarkup(safe,className,motion);
  }
  function actionBodyMarkup(id,motion,side,className=''){
    const safe=safeCharacter(id);
    if((motion==='attack'||motion==='hit') && window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && window.bidActionMotionMarkup){
      return window.bidActionMotionMarkup(safe,className,motion,side);
    }
    ensureActionMotionScript();
    return fullBodyMarkup(safe,className,motion==='idle'?'idle':'static');
  }

  window.battleCharacterMarkup=function(characterId,motion='idle'){
    const id=safeCharacter(characterId||'merchant');
    const resolvedMotion=(motion==='attack'||motion==='hit')?motion:'idle';
    return fullBodyMarkup(id,`battleCharacterSprite nativeStableSprite motion-${resolvedMotion}`,resolvedMotion);
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
    return `<div class="charPortrait character-${safe}">${fullBodyMarkup(safe,'nativeStableSprite','idle')}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    const safe=safeCharacter(id||'merchant');
    return fullBodyMarkup(safe,'openingHeroSprite nativeStableSprite','idle');
  };
  try{openingSelectedArt=window.openingSelectedArt}catch(e){}

  function clearActionSequence(){
    actionSequence++;
    clearTimeout(delayedHitTimer);
    clearTimeout(overlayHoldTimer);
    overlayHoldUntil=0;
  }

  function holdAuctionOverlayUntil(deadline){
    overlayHoldUntil=Math.max(overlayHoldUntil,deadline);
    const overlay=document.getElementById('auctionOverlay');
    if(!overlay)return;
    if(!overlayObserver){
      overlayObserver=new MutationObserver(()=>{
        if(!overlay.classList.contains('hidden'))return;
        const remaining=overlayHoldUntil-performance.now();
        if(remaining<=0)return;
        overlay.classList.remove('hidden');
        clearTimeout(overlayHoldTimer);
        overlayHoldTimer=setTimeout(()=>{
          if(performance.now()+8>=overlayHoldUntil)overlay.classList.add('hidden');
        },Math.max(0,remaining));
      });
      overlayObserver.observe(overlay,{attributes:true,attributeFilter:['class']});
    }
  }

  window.renderAuctionCharacters=function(){
    ensureActionMotionScript();
    clearActionSequence();
    for(let i=0;i<2;i++){
      const target=document.getElementById('auctionCharacter'+i);if(!target)continue;
      const id=state?.players?.[i]?.character||'merchant';
      target.dataset.character=id;
      target.className='auctionCharacter motion-idle';
      target.innerHTML=fullBodyMarkup(id,'battleCharacterSprite nativeStableSprite motion-idle','idle');
      try{window.preloadBidIdleMotion?.(id)}catch(e){}
    }
  };
  try{renderAuctionCharacters=window.renderAuctionCharacters}catch(e){}

  function renderAuctionMotionNow(side,motion){
    ensureActionMotionScript();
    const target=document.getElementById('auctionCharacter'+side);if(!target)return;
    const id=state?.players?.[side]?.character||target.dataset.character||'merchant';
    const useSprite=(motion==='attack'||motion==='hit') && window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && typeof window.bidActionMotionMarkup==='function';
    target.dataset.character=id;
    target.className=`auctionCharacter motion-${motion}${useSprite?' motion-sprite':''}`;
    target.innerHTML=useSprite
      ? actionBodyMarkup(id,motion,side,'battleCharacterSprite nativeStableSprite')
      : fullBodyMarkup(id,'battleCharacterSprite nativeStableSprite motion-idle',motion==='idle'?'idle':'static');
  }

  window.setAuctionCharacterMotion=function(side,motion){
    if(motion==='attack'){
      clearTimeout(delayedHitTimer);
      const seq=++actionSequence;
      const started=performance.now();
      window.__bidAttackSequence={seq,started};
      renderAuctionMotionNow(side,'attack');
      // Keep the reveal visible long enough to read the attack and ensuing hit.
      holdAuctionOverlayUntil(started+1150);
      return;
    }
    if(motion==='hit' && window.__bidAttackSequence){
      const {seq,started}=window.__bidAttackSequence;
      const delay=Math.max(0,800-(performance.now()-started));
      clearTimeout(delayedHitTimer);
      delayedHitTimer=setTimeout(()=>{
        if(seq!==actionSequence)return;
        renderAuctionMotionNow(side,'hit');
      },delay);
      return;
    }
    renderAuctionMotionNow(side,motion);
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
