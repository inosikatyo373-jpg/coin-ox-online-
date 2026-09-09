/* BID GRID v3.16.0 - coin reveal on podium, large arena character attack/hit, then board claim. */
(function(){
  const BRIDGE_VERSION='3160';
  const MOTION_VERSION='3159';
  const RESULT_HOLD_MS=500;
  const ATTACK_MS=1200;
  const HIT_MS=380;
  const POST_HIT_GAP=160;
  window.BID_CHARACTER_BRIDGE_VERSION=BRIDGE_VERSION;

  let actionSequence=0;
  let attackTimer=0;
  let delayedHitTimer=0;
  let attackerIdleTimer=0;
  let victimIdleTimer=0;

  function injectStyle(key,href){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(`data-${key}`,'1');
    document.head.appendChild(link);
  }

  injectStyle('v381-fullbody','/v381.css?v='+BRIDGE_VERSION);
  injectStyle('v382-actions','/v382.css?v='+BRIDGE_VERSION);
  injectStyle('character-motions-'+MOTION_VERSION,'/character-motions.css?v='+MOTION_VERSION);

  function addArenaActionStyle(){
    if(document.querySelector(`style[data-arena-action-${BRIDGE_VERSION}]`))return;
    const style=document.createElement('style');
    style.setAttribute(`data-arena-action-${BRIDGE_VERSION}`,'1');
    style.textContent=`
      .battleSideArt.arena-motion-attack,
      .battleSideArt.arena-motion-hit{
        z-index:20!important;
        overflow:visible!important;
        will-change:transform,filter!important;
        transform-origin:50% 88%!important;
      }
      .battleSideSelf .battleSideArt.arena-motion-attack{
        animation:bidArenaAttackFromLeft ${ATTACK_MS}ms cubic-bezier(.16,.86,.18,1.05) both!important;
      }
      .battleSideOpponent .battleSideArt.arena-motion-attack{
        animation:bidArenaAttackFromRight ${ATTACK_MS}ms cubic-bezier(.16,.86,.18,1.05) both!important;
      }
      .battleSideSelf .battleSideArt.arena-motion-hit{
        animation:bidArenaHitLeft ${HIT_MS}ms cubic-bezier(.15,.8,.22,1.12) both!important;
      }
      .battleSideOpponent .battleSideArt.arena-motion-hit{
        animation:bidArenaHitRight ${HIT_MS}ms cubic-bezier(.15,.8,.22,1.12) both!important;
      }
      @keyframes bidArenaAttackFromLeft{
        0%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
        18%{translate:-5% 0;rotate:-2deg;scale:1.02;filter:brightness(1.04)}
        48%{translate:30% -3%;rotate:4deg;scale:1.14;filter:brightness(1.24) drop-shadow(0 12px 12px #000c)}
        72%{translate:13% 0;rotate:1deg;scale:1.06;filter:brightness(1.08)}
        100%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
      }
      @keyframes bidArenaAttackFromRight{
        0%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
        18%{translate:5% 0;rotate:2deg;scale:1.02;filter:brightness(1.04)}
        48%{translate:-30% -3%;rotate:-4deg;scale:1.14;filter:brightness(1.24) drop-shadow(0 12px 12px #000c)}
        72%{translate:-13% 0;rotate:-1deg;scale:1.06;filter:brightness(1.08)}
        100%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
      }
      @keyframes bidArenaHitLeft{
        0%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
        18%{translate:-14% -1%;rotate:-7deg;scale:.96;filter:brightness(1.8) saturate(.7)}
        42%{translate:8% 1%;rotate:3deg;scale:1.02;filter:brightness(.9)}
        68%{translate:-4% 0;rotate:-2deg;scale:.99;filter:brightness(1.2)}
        100%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
      }
      @keyframes bidArenaHitRight{
        0%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
        18%{translate:14% -1%;rotate:7deg;scale:.96;filter:brightness(1.8) saturate(.7)}
        42%{translate:-8% 1%;rotate:-3deg;scale:1.02;filter:brightness(.9)}
        68%{translate:4% 0;rotate:2deg;scale:.99;filter:brightness(1.2)}
        100%{translate:0 0;rotate:0deg;scale:1;filter:brightness(1)}
      }
      .battleSideArt.arena-motion-hit::after{
        content:"";position:absolute;inset:8%;z-index:30;pointer-events:none;border-radius:50%;
        background:radial-gradient(circle,#fff8d6 0 8%,#ffd75a99 10% 22%,transparent 48%);
        animation:bidArenaHitBurst ${HIT_MS}ms ease-out both!important;
      }
      @keyframes bidArenaHitBurst{
        0%,8%,100%{opacity:0;scale:.55}
        22%{opacity:1;scale:1.15}
        55%{opacity:.28;scale:1.5}
      }
      @media(max-width:760px){
        .battleSideSelf .battleSideArt.arena-motion-attack{animation-name:bidArenaAttackFromLeftMobile!important}
        .battleSideOpponent .battleSideArt.arena-motion-attack{animation-name:bidArenaAttackFromRightMobile!important}
        @keyframes bidArenaAttackFromLeftMobile{
          0%{translate:0 0;scale:1}22%{translate:-3% 0;scale:1.02}50%{translate:22% -2%;scale:1.12}75%{translate:9% 0;scale:1.05}100%{translate:0 0;scale:1}
        }
        @keyframes bidArenaAttackFromRightMobile{
          0%{translate:0 0;scale:1}22%{translate:3% 0;scale:1.02}50%{translate:-22% -2%;scale:1.12}75%{translate:-9% 0;scale:1.05}100%{translate:0 0;scale:1}
        }
      }
      @media(prefers-reduced-motion:reduce){
        .battleSideArt.arena-motion-attack,.battleSideArt.arena-motion-hit,.battleSideArt.arena-motion-hit::after{animation:none!important}
      }
    `;
    document.head.appendChild(style);
  }
  addArenaActionStyle();

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];

  function safeCharacter(id){
    return playable.includes(id)?id:'merchant';
  }

  function ensureMotionScript(){
    if(
      window.BID_ACTION_MOTION_VERSION===MOTION_VERSION &&
      window.BID_IDLE_MOTION_VERSION===MOTION_VERSION &&
      window.bidCharacterMotionMarkup &&
      window.bidActionMotionMarkup
    ) return;

    if(document.querySelector(`script[data-character-motions-${MOTION_VERSION}]`))return;

    const script=document.createElement('script');
    script.src=`/character-motions.js?v=${MOTION_VERSION}`;
    script.setAttribute(`data-character-motions-${MOTION_VERSION}`,'1');
    script.onload=()=>{
      repaintCharacterUI();
      syncBattle();
      try{
        if(typeof renderAuctionCharacters==='function')renderAuctionCharacters();
      }catch(e){}
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
    return (
      window.BID_ACTION_MOTION_VERSION===MOTION_VERSION &&
      window.BID_IDLE_MOTION_VERSION===MOTION_VERSION
    );
  }

  function idleBody(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    if(currentMotionReady() && window.bidCharacterMotionMarkup){
      return window.bidCharacterMotionMarkup(safe,className,motion,0);
    }
    ensureMotionScript();
    return fallbackIdleMarkup(safe,className,motion);
  }

  function actionBody(id,motion,side,className=''){
    const safe=safeCharacter(id);
    if(
      (motion==='attack'||motion==='hit') &&
      currentMotionReady() &&
      window.bidActionMotionMarkup
    ){
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
    clearTimeout(attackTimer);
    clearTimeout(delayedHitTimer);
    clearTimeout(attackerIdleTimer);
    clearTimeout(victimIdleTimer);
    attackTimer=delayedHitTimer=attackerIdleTimer=victimIdleTimer=0;
  }

  /* The reveal podium still shows both small characters, but they stay idle. */
  window.renderAuctionCharacters=function(){
    ensureMotionScript();

    for(let i=0;i<2;i++){
      const target=document.getElementById('auctionCharacter'+i);
      if(!target)continue;

      const id=state?.players?.[i]?.character||'merchant';
      target.dataset.character=id;
      target.className='auctionCharacter motion-idle';
      target.innerHTML=idleBody(
        id,
        'battleCharacterSprite nativeStableSprite motion-idle',
        'idle'
      );

      try{
        window.preloadBidIdleMotion?.(id);
        window.preloadBidActionMotion?.(id);
      }catch(e){}
    }
  };
  try{renderAuctionCharacters=window.renderAuctionCharacters}catch(e){}

  function arenaTarget(playerSide){
    if(typeof state==='undefined'||!state)return null;
    const selfIndex=Number(slot)===1?1:0;
    const isSelf=Number(playerSide)===selfIndex;
    const panel=document.querySelector(isSelf?'.battleSideSelf':'.battleSideOpponent');
    if(!panel)return null;
    let art=panel.querySelector('.battleSideArt');
    if(!art && typeof renderBattleArenaCharacters==='function'){
      try{renderBattleArenaCharacters(state.players);art=panel.querySelector('.battleSideArt')}catch(e){}
    }
    return {art,panel,visualSide:isSelf?0:1};
  }

  function renderArenaMotionNow(playerSide,motion){
    ensureMotionScript();
    const target=arenaTarget(playerSide);
    if(!target?.art)return;

    const id=state?.players?.[playerSide]?.character||target.art.dataset.character||'merchant';
    const useSprite=(motion==='attack'||motion==='hit') && currentMotionReady() && typeof window.bidActionMotionMarkup==='function';

    target.art.dataset.character=id;
    target.art.className=`battleSideArt character-${id} arena-motion-${motion}${useSprite?' motion-sprite':''}`;
    target.art.innerHTML=useSprite
      ? actionBody(id,motion,target.visualSide,'battleCharacterSprite nativeStableSprite battleArenaActionSprite')
      : idleBody(id,'battleCharacterSprite nativeStableSprite motion-idle',motion==='idle'?'idle':'static');

    try{
      window.preloadBidIdleMotion?.(id);
      window.preloadBidActionMotion?.(id);
    }catch(e){}
  }

  /*
    Compatibility bridge: the base game still calls setAuctionCharacterMotion().
    From v3.16 onward that call drives the LARGE left/right arena characters.
    Podium characters never attack or take damage.
  */
  window.setAuctionCharacterMotion=function(side,motion){
    ensureMotionScript();

    if(motion==='attack'){
      clearActionTimers();

      const seq=++actionSequence;
      const now=performance.now();
      const attackStart=now+RESULT_HOLD_MS;
      const attackEnd=attackStart+ATTACK_MS;
      const hitEnd=attackEnd+HIT_MS;
      const boardStart=hitEnd+POST_HIT_GAP;

      window.__bidAttackTimeline={
        seq,attacker:side,attackStart,attackEnd,hitEnd,boardStart
      };
      window.__bidActionEndAt=boardStart;

      attackTimer=setTimeout(()=>{
        if(seq!==actionSequence)return;
        const overlay=document.getElementById('auctionOverlay');
        if(overlay)overlay.classList.add('hidden');
        renderArenaMotionNow(side,'attack');
      },Math.max(0,attackStart-performance.now()));
      return;
    }

    const timeline=window.__bidAttackTimeline;

    if(timeline && timeline.seq===actionSequence){
      if(motion==='hit'){
        const victim=side;
        delayedHitTimer=setTimeout(()=>{
          if(timeline.seq!==actionSequence)return;
          renderArenaMotionNow(timeline.attacker,'idle');
          renderArenaMotionNow(victim,'hit');

          victimIdleTimer=setTimeout(()=>{
            if(timeline.seq!==actionSequence)return;
            renderArenaMotionNow(victim,'idle');
          },HIT_MS);
        },Math.max(0,timeline.attackEnd-performance.now()));
        return;
      }

      if(motion==='idle'){
        const wait=Math.max(0,timeline.boardStart-performance.now());
        attackerIdleTimer=setTimeout(()=>{
          if(timeline.seq!==actionSequence)return;
          renderArenaMotionNow(side,'idle');
        },wait);
        return;
      }
    }

    renderArenaMotionNow(side,motion);
  };
  try{setAuctionCharacterMotion=window.setAuctionCharacterMotion}catch(e){}

  /* O/X chip fall starts only after big-character attack + hit have finished. */
  function installBoardClaimGate(){
    const original=window.playBoardClaim;
    if(typeof original!=='function'||original.__bidArenaActionGate)return;

    const wrapped=async function(...args){
      const deadline=Number(window.__bidActionEndAt||0);
      const remaining=deadline-performance.now();

      if(remaining>0){
        await new Promise(resolve=>setTimeout(resolve,remaining));
      }

      window.__bidActionEndAt=0;
      return original.apply(this,args);
    };

    wrapped.__bidArenaActionGate=true;
    window.playBoardClaim=wrapped;
    try{playBoardClaim=wrapped}catch(e){}
  }
  installBoardClaimGate();

  function repaintCharacterUI(){
    try{
      if(typeof renderCharacterGrid==='function')renderCharacterGrid();
    }catch(e){console.warn('[character-art] grid repaint failed',e)}

    try{
      if(typeof renderOpeningCharacterGrid==='function')renderOpeningCharacterGrid();
    }catch(e){console.warn('[character-art] opening grid repaint failed',e)}

    try{
      if(typeof renderOpeningCharacterBanner==='function')renderOpeningCharacterBanner();
    }catch(e){console.warn('[character-art] banner repaint failed',e)}
  }

  function syncBattle(){
    try{
      if(
        typeof renderBattleArenaCharacters==='function' &&
        typeof state!=='undefined' &&
        state?.players
      ){
        renderBattleArenaCharacters(state.players);
      }
    }catch(e){console.warn('[character-art] battle repaint failed',e)}
  }

  ensureMotionScript();
  repaintCharacterUI();

  window.addEventListener('load',()=>{
    installBoardClaimGate();
    repaintCharacterUI();
    syncBattle();
  });

  setTimeout(()=>{
    installBoardClaimGate();
    repaintCharacterUI();
    syncBattle();
  },0);
})();