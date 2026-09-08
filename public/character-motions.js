/* BIDGRID v3.14.4: separated visible idle wrapper + auction attack / hit sprites. */
(() => {
  'use strict';
  const ACTION_VERSION = '3144';
  const ids = ['zombie','merchant','gunslinger','swordswoman','robot','dog','mage','doctor'];
  const idSet = new Set(ids);
  const keyMode = {doctor: 'blue'};
  const original = id => `/characters/original/${id}.png?v=31117`;
  const motionSheet = id => `/characters/motions/v314/${id}.png?v=${ACTION_VERSION}`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sheets = new Map();
  const FRAME = 512;

  window.BID_ACTION_MOTION_VERSION = ACTION_VERSION;

  function safeId(id) { return idSet.has(id) ? id : 'merchant'; }
  function idleDelay(id) {
    const periods = {gunslinger:3.8,zombie:4.8,merchant:3.6,swordswoman:4.2,robot:3.2,dog:2.4,mage:4.6,doctor:3.4};
    return -((performance.now() / 1000) % (periods[id] || 4)).toFixed(3);
  }
  function idleMarkup(id, classes = '', motion = 'idle') {
    const safe = safeId(id);
    const c = getCharacterDef(safe);
    const staticClass = motion === 'static' || classes.includes('motion-static') ? ' motion-static' : '';
    return `<span class="bid-idle-motion characterIdle ${classes}${staticClass}" data-character="${safe}" style="--idle-delay:${idleDelay(safe)}s" role="img" aria-label="${c.name}"><img class="nativeCharacterImage nativeSourceImage bid-idle-img" data-character="${safe}" src="${original(safe)}" alt="" draggable="false" decoding="async"></span>`;
  }

  function keyOutBackground(id, canvas) {
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const p = pixels.data;
    const blue = keyMode[id] === 'blue';
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2];
      let bg;
      if (blue) {
        bg = b > 110 && b - r > 54 && b - g > 54;
      } else {
        bg = g > 120 && g - r > 44 && g - b > 44 && r < 135 && b < 145;
      }
      if (bg) p[i + 3] = 0;
    }
    ctx.putImageData(pixels, 0, 0);
  }

  function loadSheet(id) {
    const safe = safeId(id);
    if (sheets.has(safe)) return sheets.get(safe);
    const entry = {canvas: null, promise: null};
    sheets.set(safe, entry);
    entry.promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        try {
          if (img.naturalWidth % 3 || img.naturalHeight % 2) throw Error('Invalid action sprite grid');
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d', {willReadFrequently: true});
          ctx.drawImage(img, 0, 0);
          keyOutBackground(safe, canvas);
          entry.canvas = canvas;
          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(Error(`Cannot load action motion sheet: ${safe}`));
      img.src = motionSheet(safe);
    });
    return entry;
  }

  function frameListFor(motion) {
    if (motion === 'hit') return [3, 4, 5];
    if (motion === 'attack') return [0, 1, 2];
    return [0];
  }

  class BidActionMotion3144 extends HTMLElement {
    connectedCallback() {
      if (!this.readyBuilt) {
        this.readyBuilt = true;
        const shadow = this.attachShadow({mode: 'open'});
        shadow.innerHTML = `<style>
          :host{display:block;position:relative;contain:layout style paint;overflow:visible;transform-origin:50% 88%}
          img,canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center bottom;display:block;image-rendering:auto;transform-origin:center bottom}
          canvas{visibility:hidden}
          :host([ready]) canvas{visibility:visible}
          :host([ready]) img{display:none}
          :host([side="1"]) img,:host([side="1"]) canvas{transform:scaleX(-1)}
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
      const entry = loadSheet(this.characterId);
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
      const w = sheet.width / 3;
      const h = sheet.height / 2;
      const sx = (frameIndex % 3) * w;
      const sy = Math.floor(frameIndex / 3) * h;
      this.ctx.clearRect(0, 0, FRAME, FRAME);
      this.ctx.drawImage(sheet, sx, sy, w, h, 0, 0, FRAME, FRAME);
      this.setAttribute('ready', '');
    }
    play(sheet, motion, token) {
      const frames = frameListFor(motion);
      const delays = motion === 'hit' ? [0, 120, 250] : [0, 120, 245];
      if (reduced.matches || frames.length === 1) {
        this.drawFrame(sheet, frames[0]);
        return;
      }
      frames.forEach((frame, i) => {
        setTimeout(() => {
          if (this.isConnected && token === this.playToken) this.drawFrame(sheet, frame);
        }, delays[i] || i * 120);
      });
    }
  }

  const tagName = 'bid-action-motion-v3144';
  if (!customElements.get(tagName)) customElements.define(tagName, BidActionMotion3144);

  window.bidActionMotionMarkup = (id, classes = '', motion = 'attack', side = 0) => {
    const safe = safeId(id);
    const c = getCharacterDef(safe);
    const m = motion === 'hit' ? 'hit' : motion === 'attack' ? 'attack' : 'static';
    return `<${tagName} character="${safe}" motion="${m}" side="${side ? 1 : 0}" class="actionMotion ${classes}" role="img" aria-label="${c.name}"></${tagName}>`;
  };

  window.bidCharacterMotionMarkup = (id, classes = '', motion = 'idle', side = 0) => {
    const m = motion || (/motion-(attack|hit)/.exec(classes)?.[1]) || 'idle';
    if (m === 'attack' || m === 'hit') return window.bidActionMotionMarkup(id, classes, m, side);
    return idleMarkup(id, classes, m);
  };

  window.preloadBidActionMotion = id => { try { loadSheet(safeId(id)); } catch (e) {} };
})();
