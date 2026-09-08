/* BID GRID v3.12.3 - Jack no-flicker four-frame idle loop */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=3123';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const JACK_IDLE_FRAMES=[
    '/characters/gunslinger/gunslinger_idle_1.png?v=3123',
    '/characters/gunslinger/gunslinger_idle_2.png?v=3123',
    '/characters/gunslinger/gunslinger_idle_3.png?v=3123',
    '/characters/gunslinger/gunslinger_idle_4.png?v=3123'
  ];
  const JACK_IDLE_SEQUENCE=[0,1,2,3,2,1];
  const JACK_IDLE_INTERVAL=200;

  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" src="/characters/original/${safe}.png?v=31117" alt="${c.name}" draggable="false">`;
  }
  function jackFrameStack(className=''){
    const c=getCharacterDef('gunslinger');
    const frames=JACK_IDLE_FRAMES.map((src,index)=>`<img class="nativeCharacterImage nativeSourceImage jackIdleFrame ${className}" data-character="gunslinger" data-jack-frame-index="${index}" src="${src}" alt="${index===0?c.name:''}" ${index===0?'':'aria-hidden="true"'} draggable="false">`).join('');
    return `<span class="jackFrameStack" data-character="gunslinger" data-jack-frame="0" aria-label="${c.name}">${frames}</span>`;
  }
  function fullBodyMarkup(id,className=''){
    const safe=safeCharacter(id);
    return safe==='gunslinger'?jackFrameStack(className):spriteMarkup(safe,className);
  }

  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    return fullBodyMarkup(id,`battleCharacterSprite nativeStableSprite motion-${motion}`);
  };
  try{battleCharacterMarkup=window.battleCharacterMarkup}catch(e){}

  // Keep the tiny round HUD portrait static; only full-body Jack animates.
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
  let jackIdleFrame=0;
  let jackIdleTimer=null;

  function preloadJackFrames(){
    return Promise.all(JACK_IDLE_FRAMES.map(src=>new Promise(resolve=>{
      const img=new Image();
      img.decoding='async';
      img.onload=()=>{
        if(typeof img.decode==='function') img.decode().catch(()=>{}).finally(resolve);
        else resolve();
      };
      img.onerror=resolve;
      img.src=src;
    })));
  }
  function syncJackStacks(){
    document.querySelectorAll('.jackFrameStack').forEach(stack=>{
      stack.setAttribute('data-jack-frame',String(jackIdleFrame));
    });
  }
  function advanceJackIdle(){
    jackIdleFrame=JACK_IDLE_SEQUENCE[jackIdleStep];
    jackIdleStep=(jackIdleStep+1)%JACK_IDLE_SEQUENCE.length;
    syncJackStacks();
  }
  function startJackIdleLoop(){
    if(jackIdleTimer) return;
    preloadJackFrames().then(()=>{
      if(jackIdleTimer) return;
      jackIdleStep=0;
      advanceJackIdle();
      jackIdleTimer=setInterval(advanceJackIdle,JACK_IDLE_INTERVAL);
    });
  }

  function repaintCharacterUI(){
    try{if(typeof renderCharacterGrid==='function')renderCharacterGrid()}catch(e){console.warn('[character-art] grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterGrid==='function')renderOpeningCharacterGrid()}catch(e){console.warn('[character-art] opening grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterBanner==='function')renderOpeningCharacterBanner()}catch(e){console.warn('[character-art] banner repaint failed',e)}
    syncJackStacks();
  }
  function syncBattle(){
    try{
      if(typeof renderBattleArenaCharacters==='function' && typeof state!=='undefined' && state?.players){
        renderBattleArenaCharacters(state.players);
      }
    }catch(e){console.warn('[character-art] battle repaint failed',e)}
    syncJackStacks();
  }

  repaintCharacterUI();
  startJackIdleLoop();
  window.addEventListener('load',()=>{repaintCharacterUI();syncBattle();});
  setTimeout(()=>{repaintCharacterUI();syncBattle();},0);
})();
