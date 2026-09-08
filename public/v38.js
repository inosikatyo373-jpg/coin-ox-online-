/* BID GRID v3.13.0 - individual character idle motions */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=3130';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const JACK_IDLE_FRAMES=[
    '/characters/gunslinger/gunslinger_idle_1.png?v=3127',
    '/characters/gunslinger/gunslinger_idle_2.png?v=3127',
    '/characters/gunslinger/gunslinger_idle_3.png?v=3127',
    '/characters/gunslinger/gunslinger_idle_4.png?v=3127'
  ];
  const JACK_IDLE_SEQUENCE=[0,1,2,3,2,1];
  const JACK_IDLE_INTERVAL=220;

  const IDLE_PERIODS={zombie:4.8,merchant:3.6,swordswoman:4.2,robot:3.2,dog:2.4,mage:4.6,doctor:3.4};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" style="--idle-delay:-${((performance.now()/1000)%(IDLE_PERIODS[safe]||4)).toFixed(3)}s" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false">`;
  }
  function jackStackMarkup(className=''){
    const c=getCharacterDef('gunslinger');
    const frames=JACK_IDLE_FRAMES.map((src,i)=>`<img class="jackIdleFrame jackIdleFrame${i}" src="${src}" alt="" draggable="false" aria-hidden="true">`).join('');
    return `<span class="jackFrameStack ${className}" data-character="gunslinger" data-jack-frame="0" role="img" aria-label="${c.name}"><img class="jackFrameBase" src="/characters/original/gunslinger.png?v=31117" alt="" draggable="false" aria-hidden="true">${frames}</span>`;
  }
  function fullBodyMarkup(id,className=''){
    const safe=safeCharacter(id);
    return safe==='gunslinger'?jackStackMarkup(className):spriteMarkup(safe,`${className} characterIdle`);
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

  let jackIdleStep=0;
  let jackIdleTimer=null;

  function preloadJackFrames(){
    const loads=JACK_IDLE_FRAMES.map(src=>new Promise(resolve=>{
      const img=new Image();
      img.decoding='async';
      img.onload=()=>resolve(true);
      img.onerror=()=>resolve(false);
      img.src=src;
    }));
    Promise.all(loads).then(results=>{
      if(results.every(Boolean)){
        document.documentElement.classList.add('jackFramesReady');
      }else{
        document.documentElement.classList.remove('jackFramesReady');
      }
    });
  }
  function syncJackSprites(){
    const frame=reducedMotion.matches?0:(JACK_IDLE_SEQUENCE[jackIdleStep]||0);
    document.querySelectorAll('.jackFrameStack').forEach(sprite=>{
      sprite.setAttribute('data-jack-frame',String(sprite.classList.contains('motion-static')?0:frame));
    });
  }
  function advanceJackIdle(){
    if(document.hidden||reducedMotion.matches) return;
    jackIdleStep=(jackIdleStep+1)%JACK_IDLE_SEQUENCE.length;
    syncJackSprites();
  }
  function startJackIdleLoop(){
    if(jackIdleTimer) return;
    preloadJackFrames();
    jackIdleStep=0;
    syncJackSprites();
    jackIdleTimer=setInterval(advanceJackIdle,JACK_IDLE_INTERVAL);
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
