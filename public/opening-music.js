/* BID GRID opening/game BGM controller. */
(() => {
  const BGM_VOLUME = 0.15;
  const OPENING_CROSSFADE_SEC = 0.18;
  const OPENING_END_TRIM_SEC = 0.12;
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
    opening: '/audio/shady-opening.mp3?v=4',
    game: '/audio/lucky-girl-game.mp3?v=3'
  };

  let openingBuffer = null;
  let openingLoading = false;
  let openingSource = null;
  let openingOffset = 0;
  let openingStartedAt = 0;
  let destroyed = false;

  const buildOpeningLoopBuffer = buffer => {
    if (!audioContext?.createBuffer || !buffer?.getChannelData || !buffer?.sampleRate || !buffer?.length) return buffer;
    const sampleRate = buffer.sampleRate;
    const crossfadeFrames = Math.min(
      Math.max(1, Math.round(OPENING_CROSSFADE_SEC * sampleRate)),
      Math.floor(buffer.length / 8)
    );
    const endTrimFrames = Math.min(
      Math.max(0, Math.round(OPENING_END_TRIM_SEC * sampleRate)),
      Math.floor(buffer.length / 8)
    );
    const startFrame = crossfadeFrames;
    const endFrame = buffer.length - endTrimFrames;
    const outputLength = endFrame - startFrame;
    if (outputLength <= crossfadeFrames * 2) return buffer;

    const output = audioContext.createBuffer(buffer.numberOfChannels, outputLength, sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const source = buffer.getChannelData(channel);
      const target = output.getChannelData(channel);
      target.set(source.subarray(startFrame, endFrame));

      // Only the final 180 ms is blended. The previous 800 ms blend was long
      // enough for two musical phrases to overlap audibly. A raised-cosine
      // curve removes the click while keeping the phrase boundary crisp.
      const blendStart = outputLength - crossfadeFrames;
      for (let i = 0; i < crossfadeFrames; i++) {
        const t = (i + 1) / crossfadeFrames;
        const mix = 0.5 - 0.5 * Math.cos(Math.PI * t);
        target[blendStart + i] = source[endFrame - crossfadeFrames + i] * (1 - mix) + source[i] * mix;
      }
    }
    return output;
  };

  const isPlaying = () => !!openingSource || !audio.paused;
  const pauseOpening = (reset = false) => {
    if (openingSource) {
      openingOffset = (openingOffset + audioContext.currentTime - openingStartedAt) % openingBuffer.duration;
      openingSource.stop();
      openingSource.disconnect();
      openingSource = null;
    }
    if (reset) openingOffset = 0;
  };
  const pauseAll = () => { audio.pause(); pauseOpening(); };
  const prepareOpening = () => {
    if (!audioContext || openingBuffer || openingLoading) return;
    openingLoading = true;
    fetch(tracks.opening).then(response => {
      if (!response.ok) throw new Error('Opening audio unavailable');
      return response.arrayBuffer();
    }).then(bytes => audioContext.decodeAudioData(bytes)).then(buffer => {
      if (destroyed) return;
      openingBuffer = buildOpeningLoopBuffer(buffer);
      openingLoading = false;
      sync();
    }).catch(() => {
      openingLoading = false;
      // Keep the media-element fallback available.
    });
  };
  const playOpening = () => {
    if (openingSource) return;
    // Preserve the playhead when upgrading from the autoplay fallback. The
    // loop buffer begins just after the short crossfade region.
    if (!audio.paused) {
      openingOffset = Math.max(0, audio.currentTime - OPENING_CROSSFADE_SEC) % openingBuffer.duration;
    }
    audio.pause();
    const source = audioContext.createBufferSource();
    source.buffer = openingBuffer;
    source.loop = true;
    source.connect(gainNode);
    openingStartedAt = audioContext.currentTime;
    source.start(0, openingOffset);
    openingSource = source;
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
      prepareOpening();
      if (audioContext.state === 'suspended') audioContext.resume().then(() => { if (!destroyed) sync(); }).catch(() => {});
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
    button.textContent = !enabled ? '♪ BGM：OFF' : !isPlaying() ? '♪ BGMを再生' : '♪ BGM：ON';
    button.setAttribute('aria-pressed', String(enabled && isPlaying()));
    button.setAttribute('aria-label', enabled && isPlaying() ? 'BGMを停止' : 'BGMを再生');
  });

  const setTrack = nextTrack => {
    if (nextTrack === currentTrack) return;
    audio.pause();
    pauseOpening(true);
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
      pauseOpening(true);
      try { audio.currentTime = 0; } catch (_) {}
    }
  };

  const sync = ({resetOpening = false} = {}) => {
    if (destroyed) return;
    const nextTrack = selectedTrack();
    const wasTrack = currentTrack;
    setTrack(nextTrack);
    if (resetOpening || (nextTrack === 'opening' && wasTrack !== 'opening')) playFromOpeningStart();

    if (!enabled || !nextTrack || document.hidden) {
      pauseAll();
      label();
      return;
    }

    if (!gainConnected) audio.volume = BGM_VOLUME;
    if (gainNode) gainNode.gain.value = BGM_VOLUME;

    if (nextTrack === 'opening' && openingBuffer && gainConnected && audioContext.state === 'running') {
      playOpening();
      label();
      return;
    }
    audio.play().then(() => {
      if (destroyed || openingSource || !enabled || selectedTrack() !== nextTrack || document.hidden) audio.pause();
      label();
    }).catch(() => {
      label();
    });
  };

  buttons.forEach(button => add(button, 'click', () => {
    unlockVolume();
    enabled = !enabled || !isPlaying();
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
  add(window, 'pagehide', pauseAll);
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
      destroyed = true;
      pauseOpening(true);
      cleanup.splice(0).forEach(fn => { try { fn(); } catch (_) {} });
      audio.pause();
      if (audioContext) audioContext.close().catch(() => {});
      buttons.forEach(button => button.remove());
      if (window.__BIDGRID_BGM__ === this) delete window.__BIDGRID_BGM__;
    }
  };

  label();
  sync({resetOpening: true});
  requestAnimationFrame(() => sync({resetOpening: true}));
  setTimeout(() => sync({resetOpening: true}), 0);
})();
