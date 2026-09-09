/* Opening BGM: source attenuated by 3 dB, including on iPhone. */
(() => {
  const lobby = document.getElementById('lobby');
  if (!lobby) return;
  const audio = new Audio('/audio/shady-opening.mp3?v=1');
  audio.loop = true;
  audio.preload = 'none';
  let enabled = true;
  try { enabled = localStorage.getItem('bidgrid-opening-bgm') !== 'off'; } catch (_) {}
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'openingBgmToggle';
  button.style.cssText = 'display:block;margin:10px 0 0 auto;padding:7px 12px;font-size:13px;min-height:36px;';
  lobby.appendChild(button);
  const available = () => !lobby.classList.contains('hidden') && !document.hidden;
  const label = () => {
    button.textContent = !enabled ? '♪ BGM：OFF' : audio.paused ? '♪ BGMを再生' : '♪ BGM：ON';
    button.setAttribute('aria-pressed', String(enabled && !audio.paused));
    button.setAttribute('aria-label', enabled && !audio.paused ? 'オープニングBGMを停止' : 'オープニングBGMを再生');
  };
  const sync = () => {
    if (!enabled || !available()) {
      audio.pause();
      if (lobby.classList.contains('hidden')) audio.currentTime = 0;
      label();
      return;
    }
    if (!audio.paused) return;
    audio.play().then(() => {
      if (!enabled || !available()) audio.pause();
      label();
    }).catch(label);
  };
  button.addEventListener('click', () => {
    enabled = !enabled || audio.paused;
    try { localStorage.setItem('bidgrid-opening-bgm', enabled ? 'on' : 'off'); } catch (_) {}
    sync();
  });
  // Browsers may require a tap/click before allowing audible playback.
  const unlock = event => { if (!button.contains(event.target)) sync(); };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('click', unlock);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => audio.pause());
  window.addEventListener('pageshow', sync);
  audio.addEventListener('playing', label);
  audio.addEventListener('pause', label);
  new MutationObserver(sync).observe(lobby, {attributes:true, attributeFilter:['class']});
  label();
  sync();
})();
