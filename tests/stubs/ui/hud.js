// TEST STUB of Glaze's src/ui/hud.js — plain controls with the contract API, no design.
const CSS = `
.sh{position:absolute;inset:0;font:500 14px/1.3 Prompt,Poppins,sans-serif;color:#1E1E1E}
.sh *{box-sizing:border-box}.sh button{pointer-events:auto;font:inherit;border:0;border-radius:14px;background:#fff;padding:8px 12px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.sh .top{position:absolute;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px);display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.sh .need{background:#fff;border-radius:12px;padding:6px 10px;min-width:72px;text-align:center}.sh .need i{display:block;height:6px;border-radius:6px;background:#E6E6E6;margin-top:4px;overflow:hidden}.sh .need b{display:block;height:100%;background:#5A68B5}
.sh .need.low b{background:#FFD1D1}.sh .row{position:absolute;left:0;right:0;display:flex;gap:8px;justify-content:center;align-items:center}
.sh .bot{bottom:calc(env(safe-area-inset-bottom,0px) + 16px)}.sh .tray{bottom:calc(env(safe-area-inset-bottom,0px) + 72px)}.sh .tray button{padding:10px 8px;min-width:44px}
.sh .bubble{position:absolute;transform:translate(-50%,calc(-100% - 10px));background:#fff;border-radius:16px;padding:8px 14px;white-space:nowrap;opacity:0;transition:opacity .2s}.sh .bubble.on{opacity:1}
.sh .toast,.sh .coach{position:absolute;left:50%;transform:translateX(-50%);background:#1E1E1E;color:#fff;border-radius:12px;padding:8px 12px;opacity:0;transition:opacity .2s}.sh .toast{top:100px}.sh .coach{bottom:130px;background:#5A68B5}.sh .on{opacity:1}
.sh .sel{position:absolute;inset:0;background:rgba(245,245,245,.92);display:none;place-content:center;gap:10px;pointer-events:auto;padding:16px}.sh .sel.on{display:grid}.sh .sel button{min-width:220px}.sh .sel button[disabled]{opacity:.45}
.sh .intro{position:absolute;inset:0;display:none;place-content:center;gap:8px;pointer-events:auto;background:rgba(245,245,245,.9)}.sh .intro.on{display:grid}.sh .intro .is-on{outline:2px solid #5A68B5}
:root[data-theme="dark"] .sh{color:#F5F5F5}
.sh .flush{display:none;background:#5A68B5;color:#fff}.sh .flush.on{display:inline-block}.sh .status{position:absolute;left:12px;right:12px;top:70px;text-align:center;font-size:12px;color:#757575}`;

export function createHUD(root, cb) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  root.innerHTML = `<div class="sh">
    <div class="top" data-needs></div><div class="status" data-status></div>
    <div class="row tray" data-tray hidden></div>
    <div class="row bot"><button data-a="prev" aria-label="ห้องก่อนหน้า">◀</button><span data-title>-</span><button data-a="next" aria-label="ห้องถัดไป">▶</button>
      <button class="flush" data-a="flush">ชักโครก</button><button data-a="mic">ไมค์</button><button data-a="cam">กล้อง</button><button data-a="lamp">ปิดไฟ</button><button data-a="gear">ตั้งค่า</button><span data-coins>0</span></div>
    <div class="bubble" data-bubble></div><div class="toast" data-toast></div><div class="coach" data-coach></div>
    <div class="sel" data-sel></div><div class="intro" data-intro></div></div>`;
  const q = (s) => root.querySelector(s);
  const titles = { living: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', bathroom: 'ห้องน้ำ' };
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'prev') cb.onRoom(-1); else if (a === 'next') cb.onRoom(1); else if (a === 'flush') cb.onAction('flush');
    else if (a === 'mic') cb.onMic(); else if (a === 'cam') cb.onCamera(); else if (a === 'gear') cb.onSettings?.();
    else if (a === 'lamp') cb.onThemeToggle?.();
    else if (a === 'go') cb.onMinigameReady?.();
    else if (a === 'introx') { api.hideMinigameIntro(); cb.onMinigameExit?.(); }
    const ctl = e.target.closest('[data-control]')?.dataset.control;
    if (ctl) { for (const b of root.querySelectorAll('[data-control]')) b.classList.toggle('is-on', b.dataset.control === ctl); cb.onMinigameControl?.(ctl); }
    const k = e.target.closest('[data-char]')?.dataset.char; if (k) cb.onSelect(k);
  });
  root.addEventListener('pointerdown', (e) => { const f = e.target.closest('[data-food]'); if (f) { e.preventDefault(); cb.onFoodPointerDown(f.dataset.food, e); } });
  let bt = 0, tt = 0;
  const api = {
    last: {},
    setNeeds(n) { api.last.needs = { ...n }; q('[data-needs]').innerHTML = Object.entries(n).map(([k, v]) => `<div class="need ${v <= 0.3 ? 'low' : ''}" data-need="${k}">${k} ${Math.round(v * 100)}<i><b style="width:${Math.round(v * 100)}%"></b></i></div>`).join(''); },
    setCoins(c) { q('[data-coins]').textContent = '🪙' + c; },
    setRoom(id) { api.last.room = id; q('[data-title]').textContent = titles[id] || id; q('[data-tray]').hidden = id !== 'kitchen'; q('[data-tray]').style.display = id === 'kitchen' ? 'flex' : 'none'; },
    setCharacter(c) { api.last.character = c; },
    say(text, ms = 2300) { api.last.say = text; const b = q('[data-bubble]'); b.textContent = text; b.classList.add('on'); clearTimeout(bt); bt = setTimeout(() => b.classList.remove('on'), ms); },
    placeBubble(x, y) { const b = q('[data-bubble]'); b.style.left = Math.max(90, Math.min(innerWidth - 90, x)) + 'px'; b.style.top = Math.max(110, y) + 'px'; },
    toast(t, ms = 2000) { const e = q('[data-toast]'); e.textContent = t; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), ms); },
    coach(t) { api.last.coach = t; const e = q('[data-coach]'); e.textContent = t || ''; e.classList.toggle('on', !!t); },
    setMic(s) { api.last.mic = s; q('[data-a="mic"]').textContent = 'ไมค์:' + s; },
    setCamera(s, m) { api.last.camera = s; q('[data-a="cam"]').textContent = 'กล้อง:' + s; q('[data-status]').textContent = m || ''; },
    setFoods(f) { q('[data-tray]').innerHTML = f.map((x) => `<button data-food="${x.id}">${x.name}</button>`).join(''); },
    setFlushVisible(b) { api.last.flush = b; q('.flush').classList.toggle('on', b); },
    showSelect(chars, cur) { const s = q('[data-sel]'); s.innerHTML = chars.map((c) => `<button data-char="${c.key}" ${c.locked ? 'disabled' : ''}>${c.name} · ${c.role} ${c.key === cur ? '✓' : ''}</button>`).join(''); s.classList.add('on'); },
    hideSelect() { q('[data-sel]').classList.remove('on'); },
    foodElementAt(x, y) { return document.elementFromPoint(x, y)?.closest?.('[data-food]')?.dataset.food || null; },
    isHudPoint(x, y) { return !!document.elementFromPoint(x, y)?.closest?.('button,[data-food]'); },
    // Sprint 3: lamp + Snack Rain intro card / control chip
    setTheme(t) { api.last.theme = t; q('[data-a="lamp"]').textContent = t === 'dark' ? 'เปิดไฟ' : 'ปิดไฟ'; },
    showMinigameIntro({ controls = [], selected } = {}) {
      api.last.intro = { controls, selected };
      const e = q('[data-intro]');
      e.innerHTML = controls.map((c) => `<button data-control="${c.id}" class="${c.id === selected ? 'is-on' : ''}">${c.label}</button>`).join('') + '<button data-a="go">เริ่มเลย</button><button data-a="introx">กลับห้อง</button>';
      e.classList.add('on');
    },
    hideMinigameIntro() { api.last.intro = null; q('[data-intro]').classList.remove('on'); },
    startMinigame(o = {}) { api.hideMinigameIntro(); api.last.minigame = { ...o }; },
    updateMinigame(o = {}) { api.last.minigame = { ...(api.last.minigame || {}), ...o }; },
    showMinigameResult(r) { api.last.result = r; },
    endMinigame() { api.hideMinigameIntro(); api.last.minigame = null; },
  };
  return api;
}
