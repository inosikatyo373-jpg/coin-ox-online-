/* BIDGRID v3.15.4: separated idle sprites and fast auction attack / hit frames. */
(() => {
  'use strict';

  const VERSION = '3154';
  const FRAME = 512;
  const ATTACK_DELAYS = [0, 70, 140];
  const HIT_DELAYS = [0, 95, 190];
  const specs = {
    gunslinger: {ms: 220}, swordswoman: {ms: 300}, mage: {ms: 220},
    merchant: {ms: 200}, doctor: {ms: 230, key: 'blue'}, robot: {ms: 300},
    zombie: {ms: 280}, dog: {steps: [[0,600],[1,130],[2,180],[3,140],[1,130],[2,180],[3,140],[4,600],[5,600]]}
  };
  const ids = Object.keys(specs);
  const idSet = new Set(ids);
  const idleSheets = new Map();
  const actionSheets = new Map();
  const activeIdle = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let jackActionDataPromise = null;

  const original = id => `/characters/original/${id}.png?v=31117`;
  const motionSheet = id => `/characters/motions/v314/${id}.png?v=${VERSION}`;

  window.BID_ACTION_MOTION_VERSION = VERSION;
  window.BID_IDLE_MOTION_VERSION = VERSION;

  function addStyle() {
    if (document.querySelector(`link[data-character-motions-${VERSION}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/character-motions.css?v=${VERSION}`;
    link.setAttribute(`data-character-motions-${VERSION}`, '1');
    document.head.appendChild(link);
  }
  addStyle();

  function safeId(id) { return idSet.has(id) ? id : 'merchant'; }

  function ensureJackActionData() {
    if (window.BID_JACK_ACTION_SHEET) return Promise.resolve(window.BID_JACK_ACTION_SHEET);
    if (jackActionDataPromise) return jackActionDataPromise;
    jackActionDataPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `/jack-action-data.js?v=${VERSION}`;
      script.setAttribute(`data-jack-action-data-${VERSION}`, '1');
      script.onload = () => window.BID_JACK_ACTION_SHEET ? resolve(window.BID_JACK_ACTION_SHEET) : reject(Error('Jack action data not initialized'));
      script.onerror = () => reject(Error('Cannot load Jack action data'));
      document.head.appendChild(script);
    });
    return jackActionDataPromise;
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

  function loadCanvas(id, src) {
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
        } catch (error) { reject(error); }
      };
      img.onerror = () => reject(Error(`Cannot load sprite sheet: ${id}`));
      img.src = src;
    });
  }

  function loadIdleSheet(id) {
    const safe = safeId(id);
    if (idleSheets.has(safe)) return idleSheets.get(safe);
    const entry = {canvas: null, promise: null};
    idleSheets.set(safe, entry);
    entry.promise = loadCanvas(safe, motionSheet(safe)).then(canvas => (entry.canvas = canvas));
    return entry;
  }

  function loadActionSheet(id) {
    const safe = safeId(id);
    if (actionSheets.has(safe)) return actionSheets.get(safe);
    const entry = {canvas: null, promise: null};
    actionSheets.set(safe, entry);
    const source = safe === 'gunslinger' ? ensureJackActionData() : Promise.resolve(motionSheet(safe));
    entry.promise = source.then(src => loadCanvas(safe, src)).then(canvas => (entry.canvas = canvas));
    return entry;
  }

  function frameAt(id, now) {
    const spec = specs[id];
    if (reduced.matches) return 0;
    if (!spec.steps) return Math.floor(now / spec.ms) % 6;
    const total = spec.steps.reduce((sum, step) => sum + step[1], 0);
    let t = now % total;
    for (const [frame, duration] of spec.steps) {
      if (t < duration) return frame;
      t -= duration;
    }
    return 0;
  }

  function drawSheetFrame(ctx, sheet, frameIndex) {
    const w = sheet.width / 3;
    const h = sheet.height / 2;
    ctx.clearRect(0, 0, FRAME, FRAME);
    ctx.drawImage(sheet, (frameIndex % 3) * w, Math.floor(frameIndex / 3) * h, w, h, 0, 0, FRAME, FRAME);
  }

  class BidIdleMotion3154 extends HTMLElement {
    connectedCallback() {
      if (!this.built) {
        this.built = true;
        const shadow = this.attachShadow({mode: 'open'});
        shadow.innerHTML = `<style>:host{display:block;position:relative;width:100%;height:100%;overflow:visible}img,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;display:block;image-rendering:auto}canvas{visibility:hidden}:host([ready]) canvas{visibility:visible}:host([ready]) img{display:none}</style><img alt="" draggable="false" decoding="async"><canvas aria-hidden="true"></canvas>`;
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
      else entry.promise.then(() => this.isConnected && this.draw(performance.now())).catch(e => console.warn('[idle-motion]', e.message));
    }
    disconnectedCallback() { activeIdle.delete(this); }
    draw(now) {
      const sheet = idleSheets.get(this.characterId)?.canvas;
      if (!sheet) return;
      const frame = this.classList.contains('motion-static') ? 0 : frameAt(this.characterId, now);
      if (frame === this.lastFrame) return;
      drawSheetFrame(this.ctx, sheet, frame);
      this.lastFrame = frame;
      this.setAttribute('ready', '');
    }
  }

  class BidActionMotion3154 extends HTMLElement {
    connectedCallback() {
      if (!this.built) {
        this.built = true;
        const shadow = this.attachShadow({mode: 'open'});
        shadow.innerHTML = `<style>:host{display:block;position:relative;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 8px 7px #000a)}img,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;display:block;image-rendering:auto}canvas{visibility:hidden}:host([ready]) canvas{visibility:visible}:host([ready]) img{display:none}:host([side="1"]) img,:host([side="1"]) canvas{transform:scaleX(-1)}</style><img alt="" draggable="false" decoding="async"><canvas aria-hidden="true"></canvas>`;
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
      const start = sheet => this.isConnected && token === this.playToken && this.play(sheet, token);
      if (entry.canvas) start(entry.canvas);
      else entry.promise.then(start).catch(e => console.warn('[action-motion]', e.message));
    }
    disconnectedCallback() { this.playToken = (this.playToken || 0) + 1; }
    play(sheet, token) {
      const frames = this.motion === 'hit' ? [3,4,5] : this.motion === 'attack' ? [0,1,2] : [0];
      const delays = this.motion === 'hit' ? HIT_DELAYS : ATTACK_DELAYS;
      frames.forEach((frame, i) => setTimeout(() => {
        if (this.isConnected && token === this.playToken) {
          drawSheetFrame(this.ctx, sheet, frame);
          this.setAttribute('ready', '');
        }
      }, reduced.matches ? 0 : (delays[i] || 0)));
    }
  }

  const idleTag = 'bid-idle-motion-v3154';
  const actionTag = 'bid-action-motion-v3154';
  if (!customElements.get(idleTag)) customElements.define(idleTag, BidIdleMotion3154);
  if (!customElements.get(actionTag)) customElements.define(actionTag, BidActionMotion3154);

  setInterval(() => {
    if (document.hidden) return;
    const now = performance.now();
    activeIdle.forEach(el => el.isConnected && el.draw(now));
  }, 60);

  window.bidCharacterMotionMarkup = (id, classes = '', motion = 'idle', side = 0) => {
    const safe = safeId(id);
    const c = getCharacterDef(safe);
    const staticClass = motion === 'static' || classes.includes('motion-static') ? ' motion-static' : '';
    return `<${idleTag} character="${safe}" class="partMotion ${classes}${staticClass}" role="img" aria-label="${c.name}"></${idleTag}>`;
  };

  window.bidActionMotionMarkup = (id, classes = '', motion = 'attack', side = 0) => {
    const safe = safeId(id);
    const c = getCharacterDef(safe);
    const m = motion === 'hit' ? 'hit' : 'attack';
    return `<${actionTag} character="${safe}" motion="${m}" side="${side ? 1 : 0}" class="actionMotion ${classes}" role="img" aria-label="${c.name}"></${actionTag}>`;
  };

  window.preloadBidIdleMotion = id => { try { loadIdleSheet(safeId(id)); } catch (e) {} };
  window.preloadBidActionMotion = id => { try { loadActionSheet(safeId(id)); } catch (e) {} };
})();
