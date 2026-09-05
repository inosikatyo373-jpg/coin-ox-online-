/* BID GRID v3.8 - battle presentation sync */
(function(){
  const gunslingerFrames=[
    '/characters/gunslinger/gunslinger_idle_1.png?v=380',
    '/characters/gunslinger/gunslinger_idle_2.png?v=380',
    '/characters/gunslinger/gunslinger_idle_3.png?v=380',
    '/characters/gunslinger/gunslinger_idle_4.png?v=380'
  ];
  const seq=[0,1,2,3,2,1];
  let frame=0;

  gunslingerFrames.forEach(src=>{const im=new Image();im.src=src;});
  window.v38GunslingerIdleSrc=function(){return gunslingerFrames[seq[frame%seq.length]];};

  window.battleCharacterMarkup=function(characterId,motion='static'){
    const id=characterId||'merchant';
    const c=getCharacterDef(id);
    if(id==='gunslinger'){
      const src=motion==='idle'?window.v38GunslingerIdleSrc():gunslingerFrames[0];
      return `<span class="characterSprite sprite-gunslinger v38GunslingerFallback" role="img" aria-label="${c.name}"></span><img class="battleCharacterSprite v38GunslingerImage" data-character="gunslinger" data-motion="${motion}" src="${src}" alt="${c.name}" draggable="false" onerror="this.remove()">`;
    }
    return `<span class="characterSprite sprite-${id}" role="img" aria-label="${c.name}"></span>`;
  };

  window.battleCharacterFaceMarkup=function(characterId,motion='static'){
    const id=characterId||'merchant';
    const c=getCharacterDef(id);
    return `<span class="characterSprite sprite-${id} battleFaceSprite" role="img" aria-label="${c.name}"></span>`;
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

    if(typeof renderBattleArenaCharacters==='function' && window.state?.players){
      try{renderBattleArenaCharacters(window.state.players);}catch(e){}
    }
    refreshGunslinger();
  }

  const observer=new MutationObserver(syncBattlePresentation);
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style']});
  window.addEventListener('load',syncBattlePresentation);
  setTimeout(syncBattlePresentation,0);
})();
