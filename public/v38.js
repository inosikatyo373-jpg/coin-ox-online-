/* BID GRID v3.10.2 - robust HD battle-character rendering */
(function(){
  if(!document.querySelector('link[data-v381-fullbody]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/v381.css?v=3102';
    link.dataset.v381Fullbody='1';
    document.head.appendChild(link);
  }

  const assetVersion='3102';
  const hdCharacterSrc=id=>`/characters/hd/${id}.png?v=${assetVersion}`;
  const gunslingerFrames=[1,2,3,4].map(i=>`/characters/hd/gunslinger_idle_${i}.png?v=${assetVersion}`);
  const seq=[0,1,2,3,2,1];
  let frame=0;

  [...gunslingerFrames,
    ...['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'].map(hdCharacterSrc)
  ].forEach(src=>{const im=new Image();im.src=src;});

  window.v38GunslingerIdleSrc=function(){return gunslingerFrames[seq[frame%seq.length]];};

  function imageMarkup(id,src,motion='static',extraClass=''){
    const c=getCharacterDef(id);
    return `<img class="battleCharacterSprite v310HdCharacterImage ${extraClass}" data-character="${id}" data-motion="${motion}" src="${src}" alt="${c.name}" draggable="false" decoding="async" fetchpriority="high">`;
  }

  // Battle artwork no longer depends on CSS background-position cropping.
  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=characterId||'merchant';
    if(id==='gunslinger'){
      const src=motion==='idle'?window.v38GunslingerIdleSrc():gunslingerFrames[0];
      return imageMarkup(id,src,motion,'v38GunslingerImage');
    }
    return imageMarkup(id,hdCharacterSrc(id),motion,'v310BattleBody');
  };

  window.battleCharacterFaceMarkup=function(characterId,motion='static'){
    const id=characterId||'merchant';
    const src=id==='gunslinger' ? gunslingerFrames[0] : hdCharacterSrc(id);
    const c=getCharacterDef(id);
    return `<img class="battleFaceImage v310HdFace" data-character="${id}" src="${src}" alt="${c.name}" draggable="false" decoding="async">`;
  };

  function refreshGunslinger(){
    document.querySelectorAll('.v38GunslingerImage[data-motion="idle"]').forEach(img=>{
      const src=window.v38GunslingerIdleSrc();
      if(img.getAttribute('src')!==src)img.src=src;
    });
  }

  if(!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
    setInterval(()=>{frame=(frame+1)%seq.length;refreshGunslinger();},170);
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

    // `state` is declared with top-level let in index.html, so it is not window.state.
    // Access the shared global lexical binding directly and repaint after this override loads.
    try{
      if(typeof renderBattleArenaCharacters==='function' && typeof state!=='undefined' && state?.players){
        renderBattleArenaCharacters(state.players);
      }
    }catch(e){console.warn('[battle-art] repaint failed',e)}
    refreshGunslinger();
  }

  const observer=new MutationObserver(syncBattlePresentation);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style']});
  window.addEventListener('load',syncBattlePresentation);
  setTimeout(syncBattlePresentation,0);
})();
