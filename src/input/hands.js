/**
 * Webcam hand tracking (MediaPipe Tasks Vision 0.10.14, Hand Landmarker).
 * Loaded dynamically from jsDelivr only when the HUD camera button is pressed;
 * the model comes from storage.googleapis.com. Video is processed on this device.
 *
 * Hand modes → gesture layer: point = poke · pinch = grab/stretch (pinch-hold 0.6 s
 * on the pet = carry; pinch over a tray food = pick it up) · open palm rub over the
 * head = pet · palm press from above = squish · two palms = side squish · fast
 * swipe = startle.
 *
 * View (S2-04): `setView(hidden)`. Shown = mirrored video behind the room (AR,
 * thin skeleton). Hidden = no video, the room shows normally and soft stylized
 * clay hands (rounded palm + capsule fingers, brand tint, light outline) are
 * drawn from the landmarks instead of the skeleton.
 * @module input/hands
 */

import * as THREE from 'three';

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
const TIPS = [8, 12, 16, 20], PIPS = [6, 10, 14, 18], PALM = [0, 5, 9, 13, 17];
/** Finger chains for the soft hand (thumb … pinky), and the palm outline. */
const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const PALM_RING = [0, 1, 5, 9, 13, 17];
/** Soft-hand look: widths are shares of the wrist→middle-knuckle length. */
const SOFT = {
  finger: 0.34, thumb: 0.38, palmRound: 0.42, outline: 3,
  light: { fill: '#9BB0DE', shade: 'rgba(52, 58, 110, .30)', outline: '#FFFFFF', cursor: '#5A68B5' },
  dark: { fill: '#B7C1E4', shade: 'rgba(0, 0, 0, .35)', outline: 'rgba(255, 255, 255, .92)', cursor: '#E9E0EF' },
};
const HAND = { pinchOn: 0.3, pinchOff: 0.5, extend: 1.1, pressStart: 0.72, pressEnd: 0.9, pressScale: 1.15, aboveSlack: 0.1, twoPalmSpan: 1.1, squishMax: 0.45 };

const MSG = {
  noApi: 'เบราว์เซอร์นี้เปิดกล้องไม่ได้ ลองเปิดด้วย Safari หรือ Chrome (ไม่ใช่เบราว์เซอร์ในแอป LINE หรือ Facebook)',
  noHttps: 'ต้องเปิดผ่านลิงก์ https:// เท่านั้นถึงจะใช้กล้องได้',
  opening: 'กำลังเปิดกล้อง…',
  denied: 'ยังไม่ได้รับอนุญาตให้ใช้กล้อง กดไอคอนกล้องที่แถบที่อยู่ของเบราว์เซอร์ แล้วอนุญาต จากนั้นลองใหม่',
  notFound: 'ไม่พบกล้องในเครื่องนี้',
  busy: 'กล้องกำลังถูกใช้โดยแอปอื่น ปิดแอปนั้นแล้วลองใหม่',
  failed: 'เปิดกล้องไม่ได้ ลองใหม่อีกครั้ง',
  model: 'กำลังโหลดโมเดลจับมือ (ครั้งแรกใช้เวลาสักครู่)…',
  modelFail: 'โหลดโมเดลจับมือไม่สำเร็จ ต้องต่ออินเทอร์เน็ตตอนเปิดครั้งแรก',
  ready: 'พร้อมแล้ว ยกมือขึ้นมาในจอ แล้วจิ้ม หยิบ หรือลูบหัวได้เลย ภาพประมวลผลในเครื่องนี้เท่านั้น',
  off: 'ปิดกล้องแล้ว เล่นด้วยนิ้วหรือเมาส์ต่อได้',
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * @param {{
 *   video: HTMLVideoElement, overlay: HTMLCanvasElement|null, app: HTMLElement,
 *   picker?: HTMLSelectElement|null,
 *   stage: ReturnType<import('../engine/stage.js').createStage>,
 *   hud: object, gestures: ReturnType<import('./gestures.js').createGestures>,
 *   mood: ReturnType<import('../game/mood.js').createMood>,
 *   rooms: { setArMode(on: boolean): void },
 *   getTime: () => number,
 * }} deps
 */
export function createHands({ video, overlay, app, picker, stage, hud, gestures, mood, rooms, getTime, cameraHidden = false, onView }) {
  const ctx = overlay ? overlay.getContext('2d') : null;
  let landmarker = null, stream = null, on = false, starting = false, lastVT = -1, drew = false;
  let hidden = !!cameraHidden, passive = false, theme = 'light';
  const hands = new Map();
  const palms = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, petX: 0, feetY: 0, headY: 0, hw: 1 }));
  let palmCount = 0;
  const tmp = { x: 0, y: 0 };
  let accent = '#5A68B5';

  function readAccent() {
    const css = getComputedStyle(document.documentElement);
    accent = (css.getPropertyValue('--mp-primary') || css.getPropertyValue('--color-primary') || '').trim() || accent;
  }

  function toStage(p, out) {
    const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
    const W = stage.size.w, H = stage.size.h;
    const s = Math.max(W / vw, H / vh), dw = vw * s, dh = vh * s;
    out.x = stage.size.left + (W - dw) / 2 + (1 - p.x) * dw; // mirrored
    out.y = stage.size.top + (H - dh) / 2 + p.y * dh;
    return out;
  }

  function avg(P, ids, out) {
    let x = 0, y = 0;
    for (const i of ids) { x += P[i].x; y += P[i].y; }
    out.x = x / ids.length; out.y = y / ids.length;
    return out;
  }

  function newHand(key) {
    const P = []; for (let i = 0; i < 21; i++) P.push({ x: 0, y: 0 });
    return { key, P, mode: 'none', pinch: false, pinchDown: false, cursor: { x: 0, y: 0 }, aboveT: -9, pressing: false, seen: 0, world: new THREE.Vector3() };
  }

  function releaseHand(st) {
    if (st.pinchDown) { gestures.cancel(st.key); st.pinchDown = false; }
    gestures.pointEnd(st.key);
    gestures.leave(st.key + ':palm');
    st.pressing = false;
  }

  let squishY = 0;
  function processHand(st, L, t) {
    const P = st.P;
    for (let i = 0; i < 21; i++) toStage(L[i], P[i]);
    if (passive) {   // minigame: track only (cursor = palm centre), no gestures
      avg(P, PALM, st.cursor); st.mode = 'palm';
      return;
    }
    const size = Math.max(8, dist(P[0], P[9]));
    const pd = dist(P[4], P[8]) / size;
    st.pinch = st.pinch ? pd < HAND.pinchOff : pd < HAND.pinchOn;
    let nExt = 0, indexExt = false;
    for (let j = 0; j < 4; j++) {
      const ext = dist(P[TIPS[j]], P[0]) > dist(P[PIPS[j]], P[0]) * HAND.extend;
      if (ext) nExt++;
      if (j === 0) indexExt = ext;
    }
    const prev = st.mode;
    const mode = st.pinch ? 'pinch' : nExt >= 3 ? 'palm' : indexExt && nExt <= 2 ? 'point' : 'fist';
    st.mode = mode;
    const c = st.cursor;
    if (mode === 'pinch') { c.x = (P[4].x + P[8].x) / 2; c.y = (P[4].y + P[8].y) / 2; }
    else if (mode === 'point') { c.x = P[8].x; c.y = P[8].y; }
    else if (mode === 'palm') avg(P, PALM, c);
    else { c.x = P[9].x; c.y = P[9].y; }

    // pinch → press / drag / release (food first if over the tray)
    if (mode === 'pinch' && prev !== 'pinch') {
      const foodId = hud.foodElementAt?.(c.x, c.y);
      if (foodId) st.pinchDown = gestures.startFoodDrag(st.key, foodId, c.x, c.y, t, 'hand');
      else if (!hud.isHudPoint?.(c.x, c.y)) { gestures.down(st.key, c.x, c.y, t, 'hand'); st.pinchDown = true; }
    } else if (mode === 'pinch' && st.pinchDown) gestures.move(st.key, c.x, c.y, t);
    else if (mode !== 'pinch' && st.pinchDown) { gestures.up(st.key, c.x, c.y, t); st.pinchDown = false; }

    if (mode === 'point') gestures.point(st.key, c.x, c.y, t); else gestures.pointEnd(st.key);

    if (mode === 'palm') {
      gestures.hover(st.key + ':palm', c.x, c.y, t);
      const f = gestures.petFrame(c.x, c.y, st.world);
      if (f) {
        const h = Math.max(0.1, f.headY - f.feetY), y = f.point.y;
        const inX = Math.abs(f.point.x - f.petX) < f.halfWidth * 0.95;
        if (inX && y > f.headY - HAND.aboveSlack) st.aboveT = t;
        if (!st.pressing && inX && y > f.feetY && y < f.feetY + h * HAND.pressStart && t - st.aboveT < gestures.feel.pressAboveWindow) st.pressing = true;
        if (st.pressing && (!inX || y > f.feetY + h * HAND.pressEnd)) st.pressing = false;
        if (st.pressing) squishY = Math.max(squishY, clamp((f.headY - y) / h * HAND.pressScale, 0, HAND.squishMax));
        if (palmCount < palms.length) { const q = palms[palmCount++]; q.x = f.point.x; q.y = y; q.petX = f.petX; q.feetY = f.feetY; q.headY = f.headY; q.hw = f.halfWidth; }
      }
    } else { gestures.leave(st.key + ':palm'); st.pressing = false; }
  }
  function update() {
    const t = getTime();
    if (!on || !landmarker || video.readyState < 2 || video.currentTime === lastVT) return;
    lastVT = video.currentTime;
    let res;
    try { res = landmarker.detectForVideo(video, performance.now()); } catch { return; }
    const list = res.landmarks || [], hd = res.handedness || res.handednesses || [];
    squishY = 0; palmCount = 0;
    for (const st of hands.values()) st.seen = 0;
    for (let i = 0; i < list.length; i++) {
      let k = hd[i]?.[0]?.categoryName || 'h' + i;
      if (hands.get(k)?.seen) k += '2';
      let st = hands.get(k);
      if (!st) { st = newHand('hand:' + k); hands.set(k, st); }
      st.seen = 1;
      processHand(st, list[i], t);
    }
    for (const [k, st] of hands) if (!st.seen) { releaseHand(st); hands.delete(k); }
    let squishX = 0;
    if (palmCount >= 2) {
      const a = palms[0].x < palms[1].x ? palms[0] : palms[1], b = a === palms[0] ? palms[1] : palms[0];
      const h = a.headY - a.feetY;
      const inY = (p) => p.y > p.feetY + h * 0.1 && p.y < p.headY - h * 0.1;
      if (a.x < a.petX && b.x > a.petX && inY(a) && inY(b)) squishX = clamp(1 - (b.x - a.x) / (a.hw * 2 * HAND.twoPalmSpan), 0, HAND.squishMax);
    }
    gestures.setHandSquish(passive ? 0 : squishX, passive ? 0 : squishY);
    if (list.length) mood.onCameraHello(t);
  }

  function draw() {
    if (!ctx) return;
    if (!on) { if (drew) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, overlay.width, overlay.height); drew = false; } return; }
    const dpr = overlay.width / Math.max(1, stage.size.w);
    ctx.setTransform(dpr, 0, 0, dpr, -stage.size.left * dpr, -stage.size.top * dpr);
    ctx.clearRect(stage.size.left, stage.size.top, stage.size.w, stage.size.h);
    drew = true;
    if (hidden) { for (const st of hands.values()) drawSoftHand(st); return; }
    for (const st of hands.values()) {
      const P = st.P;
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [a, b] of BONES) { ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      for (const i of [4, 8, 12, 16, 20]) { ctx.beginPath(); ctx.arc(P[i].x, P[i].y, 3.5, 0, Math.PI * 2); ctx.fill(); }
      const c = st.cursor;
      ctx.lineWidth = 2.5; ctx.strokeStyle = accent; ctx.fillStyle = accent;
      ctx.beginPath();
      if (st.mode === 'pinch') { ctx.arc(c.x, c.y, st.pinchDown ? 12 : 9, 0, Math.PI * 2); ctx.globalAlpha = st.pinchDown ? 1 : 0.7; ctx.fill(); }
      else if (st.mode === 'point') { ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.fill(); }
      else if (st.mode === 'palm') { ctx.arc(c.x, c.y, 28, 0, Math.PI * 2); ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 0.7; ctx.stroke(); }
      else { ctx.arc(c.x, c.y, 6, 0, Math.PI * 2); ctx.globalAlpha = 0.4; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }

  /** Path a capsule chain (round caps + joins do the softness). */
  function chain(ids, P) {
    ctx.moveTo(P[ids[0]].x, P[ids[0]].y);
    for (let i = 1; i < ids.length; i++) ctx.lineTo(P[ids[i]].x, P[ids[i]].y);
  }
  function palmPath(P) {
    ctx.moveTo(P[PALM_RING[0]].x, P[PALM_RING[0]].y);
    for (let i = 1; i < PALM_RING.length; i++) ctx.lineTo(P[PALM_RING[i]].x, P[PALM_RING[i]].y);
    ctx.closePath();
  }
  /**
   * Stylized clay hand: three passes (soft shadow + outline, fill, cursor).
   * No allocations: paths are rebuilt from the landmark array each pass.
   */
  function drawSoftHand(st) {
    const P = st.P, c = SOFT[theme] || SOFT.light;
    const size = Math.max(10, dist(P[0], P[9]));
    const fw = size * SOFT.finger, tw = size * SOFT.thumb, pr = size * SOFT.palmRound, o = SOFT.outline;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // pass 1: outline (light) with a soft drop shade so it reads on light rooms too
    ctx.save();
    ctx.shadowColor = c.shade; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.strokeStyle = c.outline; ctx.fillStyle = c.outline;
    ctx.beginPath(); palmPath(P); ctx.lineWidth = pr + o * 2; ctx.stroke(); ctx.fill();
    for (let f = 0; f < FINGERS.length; f++) { ctx.beginPath(); chain(FINGERS[f], P); ctx.lineWidth = (f === 0 ? tw : fw) + o * 2; ctx.stroke(); }
    ctx.restore();
    // pass 2: brand-tint body
    ctx.strokeStyle = c.fill; ctx.fillStyle = c.fill;
    ctx.beginPath(); palmPath(P); ctx.lineWidth = pr; ctx.stroke(); ctx.fill();
    for (let f = 0; f < FINGERS.length; f++) { ctx.beginPath(); chain(FINGERS[f], P); ctx.lineWidth = f === 0 ? tw : fw; ctx.stroke(); }
    // pass 3: soft highlight on the palm + mode cursor
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc((P[5].x + P[9].x + P[0].x) / 3, (P[5].y + P[9].y + P[0].y) / 3, size * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const cur = st.cursor;
    if (!passive && (st.mode === 'pinch' || st.mode === 'point')) {
      ctx.beginPath(); ctx.arc(cur.x, cur.y, st.mode === 'pinch' && st.pinchDown ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = c.cursor; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c.outline; ctx.stroke();
    }
  }

  /** Apply the camera view (video + veil via #app classes, room backdrop). */
  function applyView() {
    app.classList.toggle('cam-hidden', hidden);
    if (on) rooms.setArMode(!hidden);
  }

  async function listCams() {
    if (!picker) return;
    try {
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const cur = stream?.getVideoTracks()[0]?.getSettings().deviceId;
      picker.textContent = '';
      cams.forEach((c, i) => {
        const o = document.createElement('option');
        o.value = c.deviceId; o.textContent = c.label || `กล้อง ${i + 1}`;
        if (c.deviceId === cur) o.selected = true;
        picker.append(o);
      });
      picker.hidden = cams.length < 2;
    } catch { picker.hidden = true; }
  }

  async function openStream() {
    const id = picker && !picker.hidden ? picker.value : '';
    const video0 = id ? { deviceId: { exact: id }, width: 960, height: 720 } : { facingMode: 'user', width: 960, height: 720 };
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: video0 });
    video.srcObject = stream;
    try { await video.play(); } catch { /* autoplay muted ok */ }
  }

  function stopStream() {
    stream?.getTracks().forEach((tr) => tr.stop());
    stream = null; video.srcObject = null;
  }

  async function start() {
    if (on || starting) return;
    if (!navigator.mediaDevices?.getUserMedia) { hud.setCamera('error', window.isSecureContext ? MSG.noApi : MSG.noHttps); return; }
    starting = true;
    hud.setCamera('loading', MSG.opening);
    try {
      await openStream();
    } catch (e) {
      starting = false;
      const n = e && e.name;
      hud.setCamera('error', n === 'NotAllowedError' || n === 'SecurityError' ? MSG.denied : n === 'NotFoundError' || n === 'OverconstrainedError' ? MSG.notFound : n === 'NotReadableError' ? MSG.busy : MSG.failed);
      return;
    }
    listCams();
    if (!landmarker) {
      hud.setCamera('loading', MSG.model);
      try {
        const { HandLandmarker, FilesetResolver } = await import(/* @vite-ignore */ `${MP}/vision_bundle.mjs`);
        const files = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
        const make = (delegate) => HandLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numHands: 2,
          minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
        });
        try { landmarker = await make('GPU'); } catch { landmarker = await make('CPU'); }
      } catch (e) {
        console.warn('hand model', e);
        starting = false; stopStream();
        hud.setCamera('error', MSG.modelFail);
        return;
      }
    }
    starting = false; on = true; lastVT = -1;
    readAccent();
    app.classList.add('ar');
    applyView();
    hud.setCamera('on', MSG.ready);
  }

  function stop(message = MSG.off) {
    if (!on && !stream) return;
    on = false;
    stopStream();
    for (const st of hands.values()) releaseHand(st);
    hands.clear();
    gestures.setHandSquish(0, 0);
    app.classList.remove('ar');
    rooms.setArMode(false);
    mood.resetCameraHello();
    if (picker) picker.hidden = true;
    hud.setCamera('off', message);
    draw();
  }

  if (picker) picker.addEventListener('change', async () => {
    if (!on) return;
    stopStream();
    try { await openStream(); } catch { stop(MSG.failed); }
  });

  return {
    start, stop,
    toggle() { return on || starting ? stop() : start(); },
    get on() { return on; },
    /** Camera image hidden (soft hands only). */
    get hidden() { return hidden; },
    /**
     * Show or hide the camera image (the choice is saved by main via `onView`).
     * @param {boolean} h true = hide video, draw soft hands
     */
    setView(h) { hidden = !!h; applyView(); onView?.(hidden); },
    /** Minigame: keep tracking but send nothing to the gesture layer. */
    setPassive(p) {
      passive = !!p;
      if (passive) { for (const st of hands.values()) releaseHand(st); gestures.setHandSquish(0, 0); }
    },
    /** 'light' | 'dark' — soft-hand colours. */
    setTheme(t) { theme = t === 'dark' ? 'dark' : 'light'; readAccent(); },
    /**
     * Test / debug only (main exposes it under ?debug): feed normalized landmark
     * sets as if MediaPipe returned them, so the overlay and the minigame hand
     * input can be checked without a webcam. `null` clears.
     * @param {Array<Array<{x:number,y:number}>>|null} list
     */
    debugFeed(list) {
      if (!list) { for (const st of hands.values()) releaseHand(st); hands.clear(); on = false; app.classList.remove('ar'); rooms.setArMode(false); draw(); return; }
      if (!on) { on = true; app.classList.add('ar'); applyView(); }
      const t = getTime();
      for (const st of hands.values()) st.seen = 0;
      list.forEach((L, i) => { const k = 'dbg' + i; let st = hands.get(k); if (!st) { st = newHand('hand:' + k); hands.set(k, st); } st.seen = 1; processHand(st, L, t); });
    },
    /** Client x of the first tracked hand's palm centre, or null. */
    primaryX() {
      if (!on) return null;
      for (const st of hands.values()) if (st.seen) return st.cursor.x;
      return null;
    },
    update, draw,
  };
}
