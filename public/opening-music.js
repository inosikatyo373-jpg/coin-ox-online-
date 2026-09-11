/* BID GRID opening/game BGM controller. */
(() => {
  const BGM_VOLUME = 0.15;
  const lobby = document.getElementById('lobby');
  const game = document.getElementById('game');
  if (!lobby || !game) return;

  try { window.__BIDGRID_BGM__?.destroy?.(); } catch (_) {}

  // Keep opening audio on the same Render origin. The external BOOTH download
  // URL does not behave like a directly playable media URL in every browser.
  const tracks = {
    opening: '/audio/shady-opening-loop.mp3?v=2',
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

/*
 * Disconnect-result safety layer.
 * The base game already resolves a disconnect forfeit on the server. This
 * layer keeps that final outcome visible even if Socket.IO subsequently drops
 * the local transport, and gives the player a navigation path that works
 * without a live socket.
 */
(() => {
  if (window.__BIDGRID_DISCONNECT_RESULT_GUARD__) return;
  window.__BIDGRID_DISCONNECT_RESULT_GUARD__ = true;

  if (typeof s === 'undefined' || !s || typeof s.on !== 'function') return;

  const el = id => document.getElementById(id);
  let localLossTimer = 0;
  let lockedOutcome = null;

  const mySlot = () => {
    try { return Number(slot); } catch (_) { return -1; }
  };

  const clearLocalLossTimer = () => {
    if (localLossTimer) clearTimeout(localLossTimer);
    localLossTimer = 0;
  };

  const ratingHtml = () => {
    try {
      return typeof ratingResultHtml === 'function' ? ratingResultHtml() : '';
    } catch (_) {
      return '';
    }
  };

  const hideTransientOverlays = () => {
    ['disconnectOverlay', 'countdownOverlay', 'auctionOverlay'].forEach(id => {
      el(id)?.classList.add('hidden');
    });
  };

  const returnToOpening = () => {
    try {
      if (typeof backToTitle === 'function') {
        backToTitle();
        return;
      }
    } catch (_) {}
    location.href = location.origin;
  };

  const showDisconnectOutcome = (won, reason = 'disconnect') => {
    const outcome = won ? 'WIN' : 'LOSE';
    lockedOutcome = outcome;
    clearLocalLossTimer();
    hideTransientOverlays();

    const resultBig = el('resultBig');
    const resultText = el('resultText');
    const matchActions = el('matchActions');
    const modal = el('modal');
    if (!resultBig || !resultText || !matchActions || !modal) return;

    resultBig.textContent = outcome;
    const second = reason === 'secondDisconnect';
    resultText.innerHTML = won
      ? `${second ? '相手が同一マッチ中に2回目の通信切断をしたため、あなたの勝利です。' : '相手の通信切断により、あなたの勝利です。'}${ratingHtml()}`
      : `${second ? '同一マッチ中に2回目の通信切断が発生したため、あなたの敗北です。' : '通信切断により、あなたの敗北です。'}${ratingHtml()}`;

    matchActions.innerHTML = '<div class="choiceRow"><button id="disconnectReturnOpening" class="primary">オープニングに戻る</button></div>';
    const button = el('disconnectReturnOpening');
    if (button) button.onclick = returnToOpening;
    modal.classList.remove('hidden');
  };

  const renderFromState = nextState => {
    if (!nextState || nextState.phase !== 'matchEnd') return;
    if (nextState.matchEndReason !== 'disconnect' && nextState.matchEndReason !== 'secondDisconnect') return;
    const winner = Number(nextState.matchWinner);
    if (winner !== 0 && winner !== 1) return;
    showDisconnectOutcome(winner === mySlot(), nextState.matchEndReason);
  };

  s.on('disconnectForfeit', payload => {
    const winner = Number(payload?.winner);
    if (winner !== 0 && winner !== 1) return;
    showDisconnectOutcome(winner === mySlot(), payload?.reason === 'secondDisconnect' ? 'secondDisconnect' : 'disconnect');
  });

  s.on('secondDisconnectLoss', payload => {
    const loser = Number(payload?.slot);
    if (loser !== 0 && loser !== 1) return;
    showDisconnectOutcome(loser !== mySlot(), 'secondDisconnect');
  });

  s.on('state', nextState => {
    renderFromState(nextState);
  });

  s.on('connect', () => {
    clearLocalLossTimer();
  });

  s.on('playerReconnected', () => {
    clearLocalLossTimer();
  });

  s.on('disconnect', () => {
    if (lockedOutcome) return;

    let currentState = null;
    try { currentState = state; } catch (_) {}
    const me = mySlot();

    if (!currentState?.players?.[0] || !currentState?.players?.[1] || currentState.phase === 'waiting') return;
    if (currentState.phase === 'matchEnd' && currentState.matchEndReason !== 'disconnect' && currentState.matchEndReason !== 'secondDisconnect') return;

    const priorDisconnects = Number(currentState?.disconnectCounts?.[me] || 0);
    const isSecondDisconnect = priorDisconnects >= 1;
    clearLocalLossTimer();

    localLossTimer = setTimeout(() => {
      localLossTimer = 0;
      if (s.connected || lockedOutcome) return;
      showDisconnectOutcome(false, isSecondDisconnect ? 'secondDisconnect' : 'disconnect');
    }, isSecondDisconnect ? 100 : 20500);
  });
})();
