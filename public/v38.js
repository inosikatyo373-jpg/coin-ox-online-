/* BID GRID v3.12.2 - Jack four-frame idle loop */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=3122';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const playable=['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const JACK_IDLE_FRAMES=[
    '/characters/gunslinger/gunslinger_idle_1.png?v=3122',
    '/characters/gunslinger/gunslinger_idle_2.png?v=3122',
    '/characters/gunslinger/gunslinger_idle_3.png?v=3122',
    '/characters/gunslinger/gunslinger_idle_4.png?v=3122'
  ];
  const JACK_IDLE_SEQUENCE=[0,1,2,3,2,1];
  const JACK_IDLE_INTERVAL=200;
  const JACK_IDLE_SELECTOR=[
    '#characterMenu .charPortrait img[data-character="gunslinger"]',
    '#openingMenu .charPortrait img[data-character="gunslinger"]',
    '.openingHeroPortrait img[data-character="gunslinger"]',
    '.battleSideArt img[data-character="gunslinger"]',
    '.auctionCharacter img[data-character="gunslinger"]'
  ].join(',');

  function safeCharacter(id){return playable.includes(id)?id:'merchant'}
  function spriteMarkup(id,className='',srcOverride=''){
    const safe=id==='random'?'random':safeCharacter(id);
    const c=safe==='random'?{name:'ランダム'}:getCharacterDef(safe);
    const src=srcOverride||`/characters/original/${safe}.png?v=31117`;
    return `<img class="nativeCharacterImage nativeSourceImage ${className}" data-character="${safe}" src="${src}" alt="${c.name}" draggable="false">`;
  }
  function jackInitialSrc(id){return id==='gunslinger'?JACK_IDLE_FRAMES[0]:''}

  // Jack uses real frame swaps. No CSS whole-body sway is used.
  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=safeCharacter(characterId||'merchant');
    return spriteMarkup(id,`battleCharacterSprite nativeStableSprite motion-${motion}`,jackInitialSrc(id));
  };
  try{battleCharacterMarkup=window.battleCharacterMarkup}catch(e){}

  // HUD face stays static so the small circular portrait does not flicker.
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
    return `<div class="charPortrait character-${safe}">${spriteMarkup(safe,'nativeStableSprite',jackInitialSrc(safe))}</div><div class="charName">${c.name}</div>${compact?'':`<div class="charSub">${c.sub}</div>`}`;
  };
  try{characterVisual=window.characterVisual}catch(e){}

  window.openingSelectedArt=function(id){
    const safe=safeCharacter(id||'merchant');
    return spriteMarkup(safe,'openingHeroSprite nativeStableSprite',jackInitialSrc(safe));
  };
  try{openingSelectedArt=window.openingSelectedArt}catch(e){}

  let jackIdleStep=0;
  let jackIdleTimer=null;
  function preloadJackFrames(){
    JACK_IDLE_FRAMES.forEach(src=>{const img=new Image();img.decoding='async';img.src=src;});
  }
  function paintJackIdleFrame(){
    const frameIndex=JACK_IDLE_SEQUENCE[jackIdleStep];
    const src=JACK_IDLE_FRAMES[frameIndex];
    document.querySelectorAll(JACK_IDLE_SELECTOR).forEach(img=>{
      if(img.getAttribute('src')!==src) img.setAttribute('src',src);
    });
    jackIdleStep=(jackIdleStep+1)%JACK_IDLE_SEQUENCE.length;
  }
  function startJackIdleLoop(){
    if(jackIdleTimer) return;
    preloadJackFrames();
    paintJackIdleFrame();
    jackIdleTimer=setInterval(paintJackIdleFrame,JACK_IDLE_INTERVAL);
  }

  function repaintCharacterUI(){
    try{if(typeof renderCharacterGrid==='function')renderCharacterGrid()}catch(e){console.warn('[character-art] grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterGrid==='function')renderOpeningCharacterGrid()}catch(e){console.warn('[character-art] opening grid repaint failed',e)}
    try{if(typeof renderOpeningCharacterBanner==='function')renderOpeningCharacterBanner()}catch(e){console.warn('[character-art] banner repaint failed',e)}
    paintJackIdleFrame();
  }
  function syncBattle(){
    try{
      if(typeof renderBattleArenaCharacters==='function' && typeof state!=='undefined' && state?.players){
        renderBattleArenaCharacters(state.players);
      }
    }catch(e){console.warn('[character-art] battle repaint failed',e)}
    paintJackIdleFrame();
  }

  repaintCharacterUI();
  startJackIdleLoop();
  window.addEventListener('load',()=>{repaintCharacterUI();syncBattle();});
  setTimeout(()=>{repaintCharacterUI();syncBattle();},0);
})();
