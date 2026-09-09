/* BID GRID opening/game BGM controller. */
(() => {
  const BGM_VOLUME = 0.15;
  const lobby = document.getElementById('lobby');
  const game = document.getElementById('game');
  if (!lobby || !game) return;

  try { window.__BIDGRID_BGM__?.destroy?.(); } catch (_) {}

  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = BGM_VOLUME;

  let audioContext = null;
  let gainConnected = false;
  let gainNode = null;
  let currentTrack = null;
  let enabled = true;
  let userUnlocked = false;

  const tracks = {
    opening: '/audio/shady-opening.mp3?v=3',
    game: '/audio/lucky-girl-game.mp3?v=3'
  };

  const cleanup = [];
  const add = (target, type, listener, options) => {
    target.addEventListener(type, listener, options);
    cleanup.push(() => target.removeEventListener(type, listener, options));
  };

  const unlockVolume = () => {
    userUnlocked = true;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      if (!audioContext) audioContext = new Context();
      if (!gainConnected) {
        const source = audioContext.createMediaElementSource(audio);
        gainNode = audioContext.createGain();
        gainNode.gain.value = BGM_VOLUME;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        audio.volume = 1;
        gainConnected = true;
      } else if (gainNode) {
        gainNode.gain.value = BGM_VOLUME;
      }
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch (_) {
      audio.volume = BGM_VOLUME;
    }
  };

  const buttons = [lobby, game].map((host, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = index ? 'gameBgmToggle' : 'openingBgmToggle';
    button.style.cssText = 'display:block;margin:10px 0 0 auto;padding:7px 12px;font-size:13px;min-height:36px;';
    if (index) host.prepend(button); else host.appendChild(button);
    return button;
  });

  const selectedTrack = () => !game.classList.contains('hidden') ? 'game'
    : !lobby.classList.contains('hidden') ? 'opening' : null;

  const label = () => buttons.forEach(button => {
    button.textContent = !enabled ? '♪ BGM：OFF' : audio.paused ? '♪ BGMを再生' : '♪ BGM：ON';
    button.setAttribute('aria-pressed', String(enabled && !audio.paused));
    button.setAttribute('aria-label', enabled && !audio.paused ? 'BGMを停止' : 'BGMを再生');
  });

  const setTrack = nextTrack => {
    if (nextTrack === currentTrack) return;
    audio.pause();
    currentTrack = nextTrack;
    if (!nextTrack) {
      audio.removeAttribute('src');
      return;
    }
    audio.src = tracks[nextTrack];
    audio.currentTime = 0;
    audio.load();
  };

  const playFromOpeningStart = () => {
    if (currentTrack === 'opening') {
      try { audio.currentTime = 0; } catch (_) {}
    }
  };

  const sync = ({resetOpening = false} = {}) => {
    const nextTrack = selectedTrack();
    const wasTrack = currentTrack;
    setTrack(nextTrack);
    if (resetOpening || (nextTrack === 'opening' && wasTrack !== 'opening')) playFromOpeningStart();

    if (!enabled || !nextTrack || document.hidden) {
      audio.pause();
      label();
      return;
    }

    if (!gainConnected) audio.volume = BGM_VOLUME;
    if (gainNode) gainNode.gain.value = BGM_VOLUME;

    audio.play().then(() => {
      if (!enabled || !selectedTrack() || document.hidden) audio.pause();
      label();
    }).catch(() => {
      label();
    });
  };

  buttons.forEach(button => add(button, 'click', () => {
    unlockVolume();
    enabled = !enabled || audio.paused;
    sync();
  }));

  // Start audio inside the earliest user-activation phase. Capture mode is
  // important: it runs before menu buttons can switch screens/tracks.
  const unlock = event => {
    unlockVolume();
    if (!buttons.some(button => button.contains(event.target))) sync();
  };
  add(document, 'pointerdown', unlock, {capture:true, passive:true});
  add(document, 'touchstart', unlock, {capture:true, passive:true});
  add(document, 'mousedown', unlock, {capture:true, passive:true});
  add(document, 'keydown', unlock, {capture:true});
  add(document, 'click', unlock, {capture:true});
  add(document, 'visibilitychange', () => sync());
  add(window, 'pagehide', () => audio.pause());
  add(window, 'pageshow', () => sync({resetOpening: selectedTrack() === 'opening' && !userUnlocked}));
  add(audio, 'playing', label);
  add(audio, 'pause', label);

  const observer = new MutationObserver(() => sync());
  [lobby, game].forEach(host => observer.observe(host, {attributes:true, attributeFilter:['class']}));
  cleanup.push(() => observer.disconnect());

  window.__BIDGRID_BGM__ = {
    audio,
    sync,
    destroy() {
      cleanup.splice(0).forEach(fn => { try { fn(); } catch (_) {} });
      audio.pause();
      buttons.forEach(button => button.remove());
      if (window.__BIDGRID_BGM__ === this) delete window.__BIDGRID_BGM__;
    }
  };

  label();
  sync({resetOpening: true});
  requestAnimationFrame(() => sync({resetOpening: true}));
  setTimeout(() => sync({resetOpening: true}), 0);
})();
