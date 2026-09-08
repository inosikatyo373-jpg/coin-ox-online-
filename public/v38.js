/* BID GRID v3.14.5 - persistent idle wrapper motion and auction action sprites */
(function(){
  const ACTION_VERSION='3144';
  const STYLE_VERSION='3145';
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
  const IDLE_PERIODS={gunslinger:4.4,zombie:5.4,merchant:4.6,swordswoman:4.8,robot:3.8,dog:3.2,mage:5.2,doctor:4.2};

  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false" decoding="async">`;
  }
  function ensureActionMotionScript(){
    if(window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && typeof window.bidActionMotionMarkup==='function' && typeof window.bidCharacterMotionMarkup==='function')return;
    if(document.querySelector(`script[data-character-motions-${ACTION_VERSION}]`))return;
    const script=document.createElement('script');
    script.src=`/character-motions.js?v=${ACTION_VERSION}`;
    script.setAttribute(`data-character-motions-${ACTION_VERSION}`,'1');
    script.onload=()=>{repaintCharacterUI();syncBattle();try{if(typeof renderAuctionCharacters==='function')renderAuctionCharacters()}catch(e){}};
    document.body.appendChild(script);
  }
  function fallbackIdleMarkup(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    const c=getCharacterDef(safe);
    const staticClass=motion==='static'||className.includes('motion-static')?' motion-static':'';
    return `<span class="bid-idle-motion characterIdle ${className}${staticClass}" data-character="${safe}" style="--idle-delay:-${((performance.now()/1000)%(IDLE_PERIODS[safe]||4.5)).toFixed(3)}s" role="img" aria-label="${c.name}"><img class="nativeCharacterImage nativeSourceImage bid-idle-img" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="" draggable="false" decoding="async"></span>`;
  }
  function fullBodyMarkup(id,className='',motion='idle'){
    const safe=safeCharacter(id);
    if(window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && window.bidCharacterMotionMarkup){
      return window.bidCharacterMotionMarkup(safe,className,motion,0);
    }
    return fallbackIdleMarkup(safe,className,motion);
  }
  function actionBodyMarkup(id,motion,side,className=''){
    const safe=safeCharacter(id);
    if((motion==='attack'||motion==='hit') && window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && window.bidActionMotionMarkup){
      return window.bidActionMotionMarkup(safe,className,motion,side);
    }
    return fullBodyMarkup(safe,className,motion==='idle'?'idle':'static');
  }

  window.battleCharacterMarkup=function(characterId,motion='idle'){
    const id=safeCharacter(characterId||'merchant');
    const resolvedMotion=(motion==='attack'||motion==='hit'||motion==='static')?motion:'idle';
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
    const useSprite=(motion==='attack'||motion==='hit') && window.BID_ACTION_MOTION_VERSION===ACTION_VERSION && typeof window.bidActionMotionMarkup==='function';
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
