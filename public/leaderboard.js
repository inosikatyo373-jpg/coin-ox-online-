(() => {
  if (window.__BIDGRID_LEADERBOARD__) return;
  window.__BIDGRID_LEADERBOARD__ = true;

  const menu = document.querySelector('#openingMenu .openingMenuActions');
  if (!menu) return;

  const style = document.createElement('style');
  style.textContent = `
    #leaderboardBtn{background:linear-gradient(180deg,#695329,#40321b 58%,#241b0f)!important;border:1px solid #c7a55a!important;color:#f4dfaa!important}
    #leaderboardOverlay{z-index:120}
    #leaderboardOverlay .leaderboardCard{max-width:520px;width:100%;padding:22px 18px 18px;text-align:left;border:1px solid #8a682f;background:linear-gradient(180deg,#182231,#0c121b);box-shadow:0 24px 70px #000c}
    .leaderboardHead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .leaderboardHead h2{margin:0;font-size:24px;color:#f4d77b}
    .leaderboardClose{min-height:38px;padding:7px 12px;font-size:13px}
    .leaderboardColumns,.leaderboardRow{display:grid;grid-template-columns:46px minmax(0,1fr) 86px;gap:8px;align-items:center}
    .leaderboardColumns{padding:0 10px 7px;color:#9ca3af;font-size:11px;font-weight:900;letter-spacing:.08em}
    .leaderboardRows{max-height:min(62vh,520px);overflow:auto;border:1px solid #374151;border-radius:12px;background:#0b111a}
    .leaderboardRow{min-height:50px;padding:8px 10px;border-bottom:1px solid #283241}
    .leaderboardRow:last-child{border-bottom:0}
    .leaderboardRank{text-align:center;font-weight:1000;color:#b7ab91}
    .leaderboardName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:900;color:#f3f4f6}
    .leaderboardRating{text-align:right;font-size:18px;font-weight:1000;color:#f4d77b;font-variant-numeric:tabular-nums}
    .leaderboardRow:nth-child(1) .leaderboardRank,.leaderboardRow:nth-child(1) .leaderboardRating{color:#ffd75e}
    .leaderboardRow:nth-child(2) .leaderboardRank{color:#d8dee9}
    .leaderboardRow:nth-child(3) .leaderboardRank{color:#d99a63}
    .leaderboardState{padding:26px 12px;text-align:center;color:#b7ab91;font-weight:800}
    @media(max-width:600px){#leaderboardOverlay{padding:12px}#leaderboardOverlay .leaderboardCard{padding:18px 12px 14px}.leaderboardColumns,.leaderboardRow{grid-template-columns:38px minmax(0,1fr) 76px}.leaderboardRating{font-size:17px}}
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'leaderboardBtn';
  btn.type = 'button';
  btn.textContent = 'ランキング';
  const rulesBtn = document.getElementById('rulesBtn');
  menu.insertBefore(btn, rulesBtn || null);

  const overlay = document.createElement('div');
  overlay.id = 'leaderboardOverlay';
  overlay.className = 'modal hidden';
  overlay.innerHTML = `
    <div class="leaderboardCard">
      <div class="leaderboardHead"><h2>RANKING</h2><button id="leaderboardClose" class="leaderboardClose">閉じる</button></div>
      <div class="leaderboardColumns"><span>#</span><span>PLAYER</span><span style="text-align:right">RATE</span></div>
      <div id="leaderboardRows" class="leaderboardRows"><div class="leaderboardState">読み込み中...</div></div>
    </div>`;
  document.body.appendChild(overlay);

  const rowsEl = document.getElementById('leaderboardRows');
  const close = () => overlay.classList.add('hidden');
  document.getElementById('leaderboardClose').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close(); });

  const render = players => {
    if (!Array.isArray(players) || !players.length) {
      rowsEl.innerHTML = '<div class="leaderboardState">ランキングデータがありません。</div>';
      return;
    }
    rowsEl.replaceChildren(...players.map((player, index) => {
      const row = document.createElement('div');
      row.className = 'leaderboardRow';
      const rank = document.createElement('div');
      rank.className = 'leaderboardRank';
      rank.textContent = String(index + 1);
      const name = document.createElement('div');
      name.className = 'leaderboardName';
      name.textContent = String(player?.name || 'PLAYER');
      const rating = document.createElement('div');
      rating.className = 'leaderboardRating';
      rating.textContent = String(Number.isFinite(Number(player?.rating)) ? Number(player.rating) : 1500);
      row.append(rank, name, rating);
      return row;
    }));
  };

  btn.onclick = async () => {
    overlay.classList.remove('hidden');
    rowsEl.innerHTML = '<div class="leaderboardState">読み込み中...</div>';
    try {
      const res = await fetch('/api/leaderboard', {cache:'no-store'});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'ランキングを取得できませんでした。');
      render(data.players);
    } catch (err) {
      rowsEl.textContent = '';
      const state = document.createElement('div');
      state.className = 'leaderboardState';
      state.textContent = String(err?.message || 'ランキングを取得できませんでした。');
      rowsEl.appendChild(state);
    }
  };
})();
