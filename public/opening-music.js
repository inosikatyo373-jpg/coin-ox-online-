/* Sources are attenuated by 3 dB; playback gain adds a further 12 dB reduction. */
(() => {
  const lobby = document.getElementById('lobby');
  const game = document.getElementById('game');
  if (!lobby || !game) return;
  // One audio element prevents the opening and game tracks from overlapping.
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.25;
  let audioContext = null;
  let gainConnected = false;
  const unlockVolume = () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    try {
      if (!audioContext) audioContext = new Context();
      if (!gainConnected) {
        const source = audioContext.createMediaElementSource(audio);
        const gain = audioContext.createGain();
        gain.gain.value = 0.25;
        source.connect(gain);
        gain.connect(audioContext.destination);
        audio.volume = 1;
        gainConnected = true;
      }
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch (_) { /* Keep the media-element volume fallback. */ }
  };
  const tracks = {
    opening: '/audio/shady-opening.mp3?v=1',
    game: '/audio/lucky-girl-game.mp3?v=1'
  };
  let currentTrack = null;
  let enabled = true;
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
  const sync = () => {
    const nextTrack = selectedTrack();
    if (nextTrack !== currentTrack) {
      audio.pause();
      currentTrack = nextTrack;
      if (nextTrack) audio.src = tracks[nextTrack];
    }
    if (!enabled || !nextTrack || document.hidden) {
      audio.pause();
      label();
      return;
    }
    if (!audio.paused) return;
    audio.play().then(() => {
      if (!enabled || !selectedTrack() || document.hidden) audio.pause();
      label();
    }).catch(label);
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    unlockVolume();
    enabled = !enabled || audio.paused;
    sync();
  }));
  // Browsers may require a tap/click before allowing audible playback.
  const unlock = event => {
    unlockVolume();
    if (!buttons.some(button => button.contains(event.target))) sync();
  };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('click', unlock);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => audio.pause());
  window.addEventListener('pageshow', sync);
  audio.addEventListener('playing', label);
  audio.addEventListener('pause', label);
  const observer = new MutationObserver(sync);
  [lobby, game].forEach(host => observer.observe(host, {attributes:true, attributeFilter:['class']}));
  label();
  sync();
})();
