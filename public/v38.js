/* BID GRID v3.15.8 - 1.2s attack, then hit, then board claim. */
(function(){
  const VERSION='3158';
  const ATTACK_MS=1200;
  const HIT_MS=380;
  const POST_HIT_GAP=120;
  window.BID_CHARACTER_BRIDGE_VERSION=VERSION;

  let actionSequence=0;
  let delayedHitTimer=0;
  let delayedIdleTimers=[0,0];
  let overlayHoldTimer=0;
  let overlayHoldUntil=0;
  let overlayObserver=null;

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

  function clearActionTimers(){
    clearTimeout(delayedHitTimer);
    delayedIdleTimers.forEach(clearTimeout);
    delayedIdleTimers=[0,0];
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
    ensureMotionScript();
    clearActionTimers();
    window.__bidAttackTimeline=null;
    window.__bidActionEndAt=0;
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

  function renderAuctionMotionNow(side,motion){
    ensureMotionScript();
    const target=document.getElementById('auctionCharacter'+side);if(!target)return;
    const id=state?.players?.[side]?.character||target.dataset.character||'merchant';
    const useSprite=(motion==='attack'||motion==='hit') && currentMotionReady() && typeof window.bidActionMotionMarkup==='function';
    target.dataset.character=id;
    target.className=`auctionCharacter motion-${motion}${useSprite?' motion-sprite':''}`;
    target.innerHTML=useSprite
      ? actionBody(id,motion,side,'battleCharacterSprite nativeStableSprite')
      : idleBody(id,'battleCharacterSprite nativeStableSprite motion-idle',motion==='idle'?'idle':'static');
  }

  window.setAuctionCharacterMotion=function(side,motion){
    ensureMotionScript();

    if(motion==='attack'){
      clearActionTimers();
      const seq=++actionSequence;
      const attackStart=performance.now();
      const attackEnd=attackStart+ATTACK_MS;
      const hitEnd=attackEnd+HIT_MS;
      const boardStart=hitEnd+POST_HIT_GAP;
      window.__bidAttackTimeline={seq,attackStart,attackEnd,hitEnd,boardStart};
      window.__bidActionEndAt=boardStart;
      renderAuctionMotionNow(side,'attack');
      holdAuctionOverlayUntil(hitEnd);
      return;
    }

    const timeline=window.__bidAttackTimeline;
    if(timeline && timeline.seq===actionSequence){
      if(motion==='hit'){
        const delay=Math.max(0,timeline.attackEnd-performance.now());
        clearTimeout(delayedHitTimer);
        delayedHitTimer=setTimeout(()=>{
          if(timeline.seq!==actionSequence)return;
          renderAuctionMotionNow(side,'hit');
        },delay);
        return;
      }

      if(motion==='idle' && performance.now()<timeline.boardStart){
        clearTimeout(delayedIdleTimers[side]);
        delayedIdleTimers[side]=setTimeout(()=>{
          if(timeline.seq!==actionSequence)return;
          renderAuctionMotionNow(side,'idle');
        },Math.max(0,timeline.boardStart-performance.now()));
        return;
      }
    }

    renderAuctionMotionNow(side,motion);
  };
  try{setAuctionCharacterMotion=window.setAuctionCharacterMotion}catch(e){}

  function installBoardClaimGate(){
    const original=window.playBoardClaim;
    if(typeof original!=='function'||original.__bidActionGate)return;
    const wrapped=async function(...args){
      const deadline=Number(window.__bidActionEndAt||0);
      const remaining=deadline-performance.now();
      if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
      window.__bidActionEndAt=0;
      return original.apply(this,args);
    };
    wrapped.__bidActionGate=true;
    window.playBoardClaim=wrapped;
    try{playBoardClaim=wrapped}catch(e){}
  }
  installBoardClaimGate();

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
  window.addEventListener('load',()=>{installBoardClaimGate();repaintCharacterUI();syncBattle();});
  setTimeout(()=>{installBoardClaimGate();repaintCharacterUI();syncBattle();},0);
})();
