/* BIDGRID v3.15.3: idle sprites + dedicated real 3-frame attack / hit playback. */
(() => {
  'use strict';

  const VERSION = '3153';
  const FRAME = 512;
  const ATTACK_DELAYS = [0, 300, 600];
  const HIT_DELAYS = [0, 240, 480];
  const specs = {
    gunslinger: {ms: 220},
    swordswoman: {ms: 300},
    mage: {ms: 220},
    merchant: {ms: 200},
    doctor: {ms: 230, key: 'blue'},
    robot: {ms: 300},
    zombie: {ms: 280},
    dog: {steps: [[0,600],[1,130],[2,180],[3,140],[1,130],[2,180],[3,140],[4,600],[5,600]]}
  };
  const ids = Object.keys(specs);
  const idSet = new Set(ids);
  const idleSheets = new Map();
  const actionSheets = new Map();
  const activeIdle = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let jackActionDataPromise = null;

  const original = id => `/characters/original/${id}.png?v=31117`;
  const idleSheet = id => `/characters/motions/v314/${id}.png?v=${VERSION}`;

  window.BID_ACTION_MOTION_VERSION = VERSION;
  window.BID_IDLE_MOTION_VERSION = VERSION;

  function ensureCurrentStyle() {
    if (document.querySelector(`link[data-character-motions-${VERSION}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/character-motions.css?v=${VERSION}`;
    link.setAttribute(`data-character-motions-${VERSION}`, '1');
    document.head.appendChild(link);
  }
  ensureCurrentStyle();

  function ensureJackActionData() {
    if (window.BID_JACK_ACTION_SHEET) return Promise.resolve(window.BID_JACK_ACTION_SHEET);
    if (jackActionDataPromise) return jackActionDataPromise;
    jackActionDataPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `/jack-action-data.js?v=${VERSION}`;
      script.setAttribute(`data-jack-action-data-${VERSION}`, '1');
      script.onload = () => {
        if (window.BID_JACK_ACTION_SHEET) resolve(window.BID_JACK_ACTION_SHEET);
        else reject(Error('Jack action sheet data was not initialized'));
      };
      script.onerror = () => reject(Error('Cannot load Jack action sheet data'));
      document.head.appendChild(script);
    });
    return jackActionDataPromise;
  }

  function safeId(id) {
    return idSet.has(id) ? id : 'merchant';
  }

  function keyOutBackground(id, canvas) {
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = pixels.data;
    const blue = specs[id]?.key === 'blue';
    for (let i = 0; i < p.length; i += 4) {
      const key = p[i + (blue ? 2 : 1)];
      const other = Math.max(p[i], p[i + (blue ? 1 : 2)]);
      if (key > 100 && key - other > 75 && other < 115) p[i + 3] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
  }

  function loadCanvasFromSource(id, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        try {
          if (img.naturalWidth % 3 || img.naturalHeight % 2) throw Error('Invalid 3x2 sprite grid');
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d', {willReadFrequently: true});
          ctx.drawImage(img, 0, 0);
          keyOutBackground(id, canvas);
          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(Error(`Cannot load character sheet: ${id}`));
      img.src = src;
    });
  }

  function loadIdleSheet(id) {
    const safe = safeId(id);
    if (idleSheets.has(safe)) return idleSheets.get(safe);
    const entry = {canvas: null, promise: null};
    idleSheets.set(safe, entry);
    entry.promise = loadCanvasFromSource(safe, idleSheet(safe)).then(canvas => {
      entry.canvas = canvas;
      return canvas;
    });
    return entry;
  }

  function loadActionSheet(id) {
    const safe = safeId(id);
    if (actionSheets.has(safe)) return actionSheets.get(safe);
    const entry = {canvas: null, promise: null};
    actionSheets.set(safe, entry);
    const sourcePromise = safe === 'gunslinger'
      ? ensureJackActionData()
      : Promise.resolve(idleSheet(safe));
    entry.promise = sourcePromise
      .then(src => loadCanvasFromSource(safe, src))
      .then(canvas => {
        entry.canvas = canvas;
        return canvas;
      });
    return entry;
  }

  function frameAt(id, now) {
    const spec = specs[id];
    const clock = reduced.matches ? now * 0.55 : now;
    if (!spec.steps) return Math.floor(clock / spec.ms) % 6;
    const total = spec.steps.reduce((sum, step) => sum + step[1], 0);
    let t = clock % total;
    for (const [frame, duration] of spec.steps) {
      if (t < duration) return frame;
      t -= duration;
    }
    return 0;
  }

  function drawSheetFrame(ctx, sheet, frameIndex) {
    const w = sheet.width / 3;
    const h = sheet.height / 2;
    const sx = (frameIndex % 3) * w;
    const sy = Math.floor(frameIndex / 3) * h;
    ctx.clearRect(0, 0, FRAME, FRAME);
    ctx.drawImage(sheet, sx, sy, w, h, 0, 0, FRAME, FRAME);
  }

  function cleanIdleFrame(ctx, id, frameIndex) {
    if (id === 'gunslinger' && frameIndex === 5) {
      ctx.clearRect(0, 250, 30, 160);
    }
  }

  class BidActionMotion3153 extends HTMLElement {
    connectedCallback() {
      if (!this.readyBuilt) {
        this.readyBuilt = true;
        const shadow = this.attachShadow({mode: 'open'});
        shadow.innerHTML = `<style>
          :host{display:block;position:relative;width:82px;height:82px;max-width:100%;max-height:100%;contain:layout style paint;overflow:visible;transform:none!important;animation:none!important;filter:drop-shadow(0 8px 7px #000a)}
          img,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;display:block;image-rendering:auto;transform-origin:center bottom}
          canvas{visibility:hidden}
          :host([ready]) canvas{visibility:visible}
          :host([ready]) img{display:none}
          :host([side="1"]) img,:host([side="1"]) canvas{transform:scaleX(-1)}
          @media(max-width:600px){:host{width:56px;height:56px}}
        </style><img alt="" draggable="false" decoding="async"><canvas aria-hidden="true"></canvas>`;
        this.fallback = shadow.querySelector('img');
        this.canvas = shadow.querySelector('canvas');
        this.canvas.width = FRAME;
        this.canvas.height = FRAME;
        this.ctx = this.canvas.getContext('2d');
      }

      this.characterId = safeId(this.getAttribute('character'));
      this.motion = this.getAttribute('motion') || 'attack';
      this.fallback.src = original(this.characterId);
      this.playToken = (this.playToken || 0) + 1;
      const token = this.playToken;
      const entry = loadActionSheet(this.characterId);
      const start = sheet => {
        if (!this.isConnected || token !== this.playToken) return;
        this.play(sheet, this.motion, token);
      };
      if (entry.canvas) start(entry.canvas);
      else entry.promise.then(start).catch(error => console.warn('[action-motion]', error.message));
    }

    disconnectedCallback() {
      this.playToken = (this.playToken || 0) + 1;
    }

    drawFrame(sheet, frameIndex) {
      drawSheetFrame(this.ctx, sheet, frameIndex);
      this.setAttribute('ready', '');
    }

    play(sheet, motion, token) {
      const frames = motion === 'hit' ? [3,4,5] : motion === 'attack' ? [0,1,2] : [0];
      const delays = motion === 'hit' ? HIT_DELAYS : motion === 'attack' ? ATTACK_DELAYS : [0];
      frames.forEach((frame, i) => {
        setTimeout(() => {
          if (this.isConnected && token === this.playToken) this.drawFrame(sheet, frame);
        }, delays[i] || 0);
      });
    }
  }

  class BidIdleMotion3153 extends HTMLElement {
    connectedCallback() {
      if (!this.readyBuilt) {
        this.readyBuilt = true;
        const shadow = this.attachShadow({mode: 'open'});
        shadow.innerHTML = `<style>
          :host{display:block;position:relative;contain:layout style paint;overflow:visible}
          img,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;display:block;image-rendering:auto}
          canvas{visibility:hidden}
          :host([ready]) canvas{visibility:visible}
          :host([ready]) img{display:none}
        </style><img alt="" draggable="false" decoding="async"><canvas aria-hidden="true"></canvas>`;
        this.fallback = shadow.querySelector('img');
        this.canvas = shadow.querySelector('canvas');
        this.canvas.width = FRAME;
        this.canvas.height = FRAME;
        this.ctx = this.canvas.getContext('2d');
        this.lastFrame = -1;
      }

      this.characterId = safeId(this.getAttribute('character'));
      this.fallback.src = original(this.characterId);
      activeIdle.add(this);
      const entry = loadIdleSheet(this.characterId);
      if (entry.canvas) this.draw(performance.now());
      else entry.promise
        .then(() => { if (this.isConnected) this.draw(performance.now()); })
        .catch(error => console.warn('[idle-motion]', error.message));
    }

    disconnectedCallback() {
      activeIdle.delete(this);
    }

    draw(now) {
      const sheet = idleSheets.get(this.characterId)?.canvas;
      if (!sheet) return;
      const frame = this.classList.contains('motion-static') ? 0 : frameAt(this.characterId, now);
      if (frame === this.lastFrame) return;
      drawSheetFrame(this.ctx, sheet, frame);
      cleanIdleFrame(this.ctx, this.characterId, frame);
      this.lastFrame = frame;
      this.setAttribute('ready', '');
    }
  }

  const actionTag = 'bid-action-motion-v3153';
  const idleTag = 'bid-idle-motion-v3153';
  if (!customElements.get(actionTag)) customElements.define(actionTag, BidActionMotion3153);
  if (!customElements.get(idleTag)) customElements.define(idleTag, BidIdleMotion3153);

  setInterval(() => {
    if (document.hidden) return;
    const now = performance.now();
    activeIdle.forEach(sprite => {
      if (!sprite.isConnected) return;
      if (typeof sprite.getClientRects !== 'function' || sprite.getClientRects().length) sprite.draw(now);
    });
  }, 60);

  window.bidActionMotionMarkup = (id, classes = '', motion = 'attack', side = 0) => {
    const safe = safeId(id);
    const c = getCharacterDef(safe);
    const m = motion === 'hit' ? 'hit' : motion === 'attack' ? 'attack' : 'static';
    return `<${actionTag} character="${safe}" motion="${m}" side="${side ? 1 : 0}" class="actionMotion ${classes}" role="img" aria-label="${c.name}"></${actionTag}>`;
  };

  window.bidCharacterMotionMarkup = (id, classes = '', motion = 'idle', side = 0) => {
    const safe = safeId(id);
    const c = getCharacterDef(safe);
    const m = motion || (/motion-(attack|hit)/.exec(classes)?.[1]) || 'idle';
    if (m === 'attack' || m === 'hit') return window.bidActionMotionMarkup(safe, classes, m, side);
    const staticClass = m === 'static' || classes.includes('motion-static') ? ' motion-static' : '';
    return `<${idleTag} character="${safe}" class="partMotion ${classes}${staticClass}" role="img" aria-label="${c.name}"></${idleTag}>`;
  };

  window.preloadBidActionMotion = id => { try { loadActionSheet(safeId(id)); } catch (e) {} };
  window.preloadBidIdleMotion = id => { try { loadIdleSheet(safeId(id)); } catch (e) {} };

  ensureJackActionData().catch(error => console.warn('[jack-action-data]', error.message));

  setTimeout(() => {
    if (window.BID_CHARACTER_BRIDGE_VERSION === VERSION) return;
    if (document.querySelector(`script[data-v38-motion-${VERSION}]`)) return;
    const script = document.createElement('script');
    script.src = `/v38.js?v=${VERSION}`;
    script.setAttribute(`data-v38-motion-${VERSION}`, '1');
    document.body.appendChild(script);
  }, 0);
})();
