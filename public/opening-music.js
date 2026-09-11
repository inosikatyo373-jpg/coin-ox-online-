/* BID GRID opening/game BGM controller. */
(() => {
  const BGM_VOLUME = 0.15;
  const lobby = document.getElementById('lobby');
  const game = document.getElementById('game');
  if (!lobby || !game) return;

  try { window.__BIDGRID_BGM__?.destroy?.(); } catch (_) {}

  // Use the creator's complete 103._shady.mp3. Native media looping plays the
  // entire 84.6-second track before returning to the beginning.
  const tracks = {
    opening: 'https://booth.pm/downloadables/5761628',
    game: '/audio/lucky-girl-game.mp3?v=3'
  };

  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = BGM_VOLUME;

  let currentTrack = null;
  let enabled = true;
  let userUnlocked = false;
  let destroyed = false;

  const cleanup = [];
  const add = (target, type, listener, options) => {
    target.addEventListener(type, listener, options);
    cleanup.push(() => target.removeEventListener(type, listener, options));
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

  const isPlaying = () => !audio.paused;

  const label = () => buttons.forEach(button => {
    button.textContent = !enabled ? '♪ BGM：OFF' : !isPlaying() ? '♪ BGMを再生' : '♪ BGM：ON';
    button.setAttribute('aria-pressed', String(enabled && isPlaying()));
    button.setAttribute('aria-label', enabled && isPlaying() ? 'BGMを停止' : 'BGMを再生');
  });

  const setTrack = nextTrack => {
    if (nextTrack === currentTrack) return;
    audio.pause();
    currentTrack = nextTrack;
    if (!nextTrack) {
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    audio.src = tracks[nextTrack];
    try { audio.currentTime = 0; } catch (_) {}
    audio.load();
  };

  const pauseAll = () => audio.pause();

  const sync = ({resetOpening = false} = {}) => {
    if (destroyed) return;
    const nextTrack = selectedTrack();
    const wasTrack = currentTrack;
    setTrack(nextTrack);

    if (nextTrack === 'opening' && (resetOpening || wasTrack !== 'opening')) {
      try { audio.currentTime = 0; } catch (_) {}
    }

    if (!enabled || !nextTrack || document.hidden) {
      pauseAll();
      label();
      return;
    }

    audio.volume = BGM_VOLUME;
    audio.play().then(() => {
      if (destroyed || !enabled || selectedTrack() !== nextTrack || document.hidden) {
        audio.pause();
      }
      label();
    }).catch(() => {
      // Browsers may block autoplay until the first user interaction.
      label();
    });
  };

  buttons.forEach(button => add(button, 'click', () => {
    userUnlocked = true;
    enabled = !enabled || audio.paused;
    sync();
  }));

  // Retry inside the earliest user-activation phase so mobile browsers can
  // start playback as soon as the player first touches the game.
  const unlock = event => {
    userUnlocked = true;
    if (!buttons.some(button => button.contains(event.target))) sync();
  };
  add(document, 'pointerdown', unlock, {capture:true, passive:true});
  add(document, 'touchstart', unlock, {capture:true, passive:true});
  add(document, 'mousedown', unlock, {capture:true, passive:true});
  add(document, 'keydown', unlock, {capture:true});
  add(document, 'click', unlock, {capture:true});
  add(document, 'visibilitychange', () => sync());
  add(window, 'pagehide', pauseAll);
  add(window, 'pageshow', () => sync({resetOpening: selectedTrack() === 'opening' && !userUnlocked}));
  add(audio, 'playing', label);
  add(audio, 'pause', label);
  add(audio, 'ended', () => {
    // loop=true normally handles this. This fallback covers browsers that
    // expose a redirected download as a non-looping media response.
    if (!destroyed && enabled && selectedTrack() === currentTrack && !document.hidden) {
      try { audio.currentTime = 0; } catch (_) {}
      audio.play().catch(() => {});
    }
  });

  const observer = new MutationObserver(() => sync());
  [lobby, game].forEach(host => observer.observe(host, {attributes:true, attributeFilter:['class']}));
  cleanup.push(() => observer.disconnect());

  window.__BIDGRID_BGM__ = {
    audio,
    sync,
    destroy() {
      destroyed = true;
      cleanup.splice(0).forEach(fn => { try { fn(); } catch (_) {} });
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      buttons.forEach(button => button.remove());
      if (window.__BIDGRID_BGM__ === this) delete window.__BIDGRID_BGM__;
    }
  };

  label();
  sync({resetOpening: true});
  requestAnimationFrame(() => sync());
  setTimeout(() => sync(), 0);
})();
