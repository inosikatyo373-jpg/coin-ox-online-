/* BIDGRID: cached six-frame, part-animated character art. */
(() => {
  'use strict';
  const specs = {
    gunslinger: {ms: 220}, swordswoman: {ms: 300}, mage: {ms: 220},
    merchant: {ms: 200}, doctor: {ms: 230, key: 'blue'},
    robot: {ms: 300}, zombie: {ms: 280},
    dog: {steps: [[0,600],[1,130],[2,180],[3,140],[1,130],[2,180],[3,140],[4,600],[5,600]]}
  };
  const sheets = new Map();
  const active = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const original = id => `/characters/original/${id}.png?v=31117`;

  // Key once at decode time, never between frames. Keep the original fallback
  // visible until an entire sheet is available; failures leave that image intact.
  function loadSheet(id) {
    if (sheets.has(id)) return sheets.get(id);
    const entry = {canvas: null, promise: null};
    sheets.set(id, entry);
    entry.promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          if (img.naturalWidth % 3 || img.naturalHeight % 2) throw Error('Invalid sprite grid');
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d', {willReadFrequently: true});
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const p = pixels.data;
          const blue = specs[id].key === 'blue';
          for (let i = 0; i < p.length; i += 4) {
            const key = p[i + (blue ? 2 : 1)];
            const other = Math.max(p[i], p[i + (blue ? 1 : 2)]);
            // The artwork has dark outlines. This includes antialiased matte
            // edges while retaining gold, cyan magic and green Doctor liquid.
            if (key > 100 && key - other > 75 && other < 115) p[i + 3] = 0;
          }
          ctx.putImageData(pixels, 0, 0);
          entry.canvas = canvas;
          resolve(canvas);
        } catch (error) { reject(error); }
      };
      img.onerror = () => reject(Error(`Cannot load ${id} motion`));
      img.src = `/characters/motions/v314/${id}.png`;
    });
    return entry;
  }
  function frameAt(id, now) {
    const spec = specs[id];
    if (!spec.steps) return Math.floor(now / spec.ms) % 6;
    let t = now % spec.steps.reduce((sum, step) => sum + step[1], 0);
    for (const [frame, duration] of spec.steps) {
      if (t < duration) return frame;
      t -= duration;
    }
    return 0;
  }
  class CharacterMotion extends HTMLElement {
    connectedCallback() {
      if (!this.canvas) {
        this.idleId = this.getAttribute('character');
        if (!Object.hasOwn(specs, this.idleId)) return;
        const shadow = this.attachShadow({mode: 'open'});
        shadow.innerHTML = `<style>:host{display:block}img,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}canvas{visibility:hidden} :host([ready]) canvas{visibility:visible}:host([ready]) img{display:none}</style><img alt="" draggable="false"><canvas aria-hidden="true"></canvas>`;
        shadow.querySelector('img').src = original(this.idleId);
        this.canvas = shadow.querySelector('canvas');
        this.canvas.width = this.canvas.height = 512;
        this.ctx = this.canvas.getContext('2d');
        this.lastFrame = -1;
      }
      active.add(this);
      const entry = loadSheet(this.idleId);
      if (entry.canvas) this.draw(performance.now());
      else entry.promise.then(() => { if (this.isConnected) this.draw(performance.now()); }).catch(error => console.warn('[character-motion]', error.message));
    }
    disconnectedCallback() { active.delete(this); }
    draw(now) {
      const sheet = sheets.get(this.idleId)?.canvas;
      if (!sheet) return;
      const frame = reduced.matches || this.classList.contains('motion-static') ? 0 : frameAt(this.idleId, now);
      if (frame === this.lastFrame) return;
      const w = sheet.width / 3, h = sheet.height / 2;
      // clear + draw run in the same task, with no intermediate blank paint.
      this.ctx.clearRect(0, 0, 512, 512);
      this.ctx.drawImage(sheet, (frame % 3) * w, Math.floor(frame / 3) * h, w, h, 0, 0, 512, 512);
      this.lastFrame = frame;
      this.setAttribute('ready', '');
    }
  }
  customElements.define('bid-character-motion', CharacterMotion);
  setInterval(() => {
    if (document.hidden) return;
    const now = performance.now();
    active.forEach(sprite => { if (sprite.getClientRects().length) sprite.draw(now); });
  }, 60);

  window.bidCharacterMotionMarkup = (id, classes = '') => {
    const safe = Object.hasOwn(specs, id) ? id : 'merchant';
    const name = getCharacterDef(safe).name;
    return `<bid-character-motion character="${safe}" class="partMotion ${classes}" role="img" aria-label="${name}"></bid-character-motion>`;
  };
})();
