/* BIDGRID v3.15.6: separated idle sprites and improved Jack action chroma key. */
(() => {
  'use strict';

  const VERSION = '3156';
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
    if (!document.querySelector(`link[data-character-motions-${VERSION}]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `/character-motions.css?v=${VERSION}`;
      link.setAttribute(`data-character-motions-${VERSION}`, '1');
      document.head.appendChild(link);
    }
    if (!document.querySelector(`style[data-action-motion-${VERSION}]`)) {
      const style = document.createElement('style');
      style.setAttribute(`data-action-motion-${VERSION}`, '1');
      style.textContent = `
        bid-action-motion-v3156.actionMotion{display:block!important;position:relative!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;aspect-ratio:1/1!important;flex:0 0 auto!important;opacity:1!important;visibility:visible!important;overflow:visible!important;transform:none!important;translate:none!important;rotate:none!important;scale:1!important;animation:none!important;filter:drop-shadow(0 8px 7px #000a)!important}
        .auctionCharacter>bid-action-motion-v3156.actionMotion{width:92px!important;height:92px!important;max-width:none!important;max-height:none!important;margin:-5px auto -5px!important}
        @media(max-width:600px){.auctionCharacter>bid-action-motion-v3156.actionMotion{width:68px!important;height:68px!important;margin:-4px auto!important}}
      `;
      document.head.appendChild(style);
    }
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

  function keyOutBackground(id, canvas, softActionKey = false) {
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = pixels.data;
    const blue = specs[id]?.key === 'blue';

    for (let i = 0; i < p.length; i += 4) {
      const r = p[i];
      const g = p[i + 1];
      const b = p[i + 2];
      const a = p[i + 3];
      if (!a) continue;

      if (blue) {
        const dominance = b - Math.max(r, g);
        if (b > 100 && dominance > 75 && Math.max(r, g) < 115) p[i + 3] = 0;
        continue;
      }

      const other = Math.max(r, b);
      const dominance = g - other;

      /* Normal idle sheets retain the established hard chroma key. */
      if (!softActionKey) {
        if (g > 100 && dominance > 75 && other < 115) p[i + 3] = 0;
        continue;
      }

      /* Jack action sheet: remove solid green, then soften/de-spill edge green. */
      if (g > 108 && dominance > 78 && r < 142 && b < 142) {
        p[i + 3] = 0;
        continue;
      }

      if (g > 78 && dominance > 18) {
        const strength = Math.max(0, Math.min(1, (dominance - 18) / 62));
        const alphaLoss = 0.82 * strength;
        p[i + 3] = Math.round(a * (1 - alphaLoss));

        /* Neutralize green spill without altering the red/blue edge structure. */
        const neutral = Math.max(r, b);
        const deSpill = 0.72 * strength;
        p[i + 1] = Math.round(g * (1 - deSpill) + neutral * deSpill);
      }
    }
    ctx.putImageData(pixels, 0, 0);
  }

  function loadCanvas(id, src, softActionKey = false) {
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
          keyOutBackground(id, canvas, softActionKey);
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
    entry.promise = loadCanvas(safe, motionSheet(safe), false).then(canvas => (entry.canvas = canvas));
    return entry;
  }

  function loadActionSheet(id) {
    const safe = safeId(id);
    if (actionSheets.has(safe)) return actionSheets.get(safe);
    const entry = {canvas: null, promise: null};
    actionSheets.set(safe, entry);
    const source = safe === 'gunslinger' ? ensureJackActionData() : Promise.resolve(motionSheet(safe));
    entry.promise = source
      .then(src => loadCanvas(safe, src, safe === 'gunslinger'))
      .then(canvas => (entry.canvas = canvas));
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

  function cleanIdleFrame(ctx, id, frameIndex) {
    if (id === 'gunslinger' && frameIndex === 5) ctx.clearRect(0, 250, 30, 160);
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
      cleanIdleFrame(this.ctx, this.characterId, frame);
      this.lastFrame = frame;
      this.setAttribute('ready', '');
    }
  }

  class BidActionMotion3156 extends HTMLElement {
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
  const actionTag = 'bid-action-motion-v3156';
  if (!customElements.get(idleTag)) customElements.define(idleTag, BidIdleMotion3154);
  if (!customElements.get(actionTag)) customElements.define(actionTag, BidActionMotion3156);

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
