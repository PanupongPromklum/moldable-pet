/**
 * Room manager — creates rooms through Prop's `createRoom`, plays a soft sideways
 * slide between them, and listens to ←/→ keys. Swipes and HUD arrows call `go()`
 * from outside.
 *
 * Rooms are built once and kept (owner 2026-11-24: building a room took ~0.15 s on a
 * desktop and froze a weak phone for about a second at every room change). A room that
 * is left is only taken out of the scene; the next visit puts it back, with the saved
 * furniture re-applied (`setFurniture` skips unchanged slots) and the current theme.
 * `warmAll()` builds the other rooms behind the loading screen, so even the first visit
 * to a room is instant.
 * @module game/rooms
 */

const SLIDE = { distance: 16, seconds: 0.55 };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * @param {{
 *   scene: import('three').Scene,
 *   createRoom: (id: string, opts?: { theme?: 'light'|'dark', furniture?: Record<string, string> }) => object,
 *   getFurniture?: (id: string) => Record<string, string>|null,   // saved furniture of a room (Sprint 4)
 *   roomIds: string[],
 *   onEnter: (room: object, id: string, prevId: string|null) => void,
 *   onLeave?: (room: object, id: string) => void,
 *   reduceMotion?: boolean,
 *   keyTarget?: EventTarget,
 * }} deps
 */
export function createRoomManager({ scene, createRoom, roomIds, onEnter, onLeave, getFurniture = null, reduceMotion = false, keyTarget = window }) {
  let id = null, room = null;
  let leaving = null; // { room, dir }
  let t = 1, ar = false, theme = 'light', gone = false;
  /** @type {Map<string, object>} every room built so far, in the scene or not */
  const built = new Map();

  /** Prop's `room.setTheme` (S2-05), optional so a room without it still works. */
  function applyTheme(r) { try { r.setTheme?.(theme); } catch (e) { console.error('[rooms] setTheme', e); } }

  function setAr(r, on) {
    if (typeof r.setArMode === 'function') r.setArMode(on);
    else r.group.visible = !on;
  }

  function resolve(dirOrId) {
    if (typeof dirOrId === 'string') return roomIds.includes(dirOrId) ? dirOrId : null;
    const i = roomIds.indexOf(id);
    const n = roomIds.length;
    return roomIds[(i + (dirOrId > 0 ? 1 : -1) + n) % n];
  }

  /** The room for `id`: the one already built (saved furniture re-applied) or a new one (Prop: starts in the current theme + saved furniture). */
  function acquire(rid) {
    let furniture;
    try { furniture = getFurniture?.(rid) || undefined; } catch (e) { console.error('[rooms] furniture', e); }
    let r = built.get(rid);
    if (r) { try { if (furniture) r.setFurniture?.(furniture); } catch (e) { console.error('[rooms] furniture', e); } return r; }
    r = createRoom(rid, { theme, furniture });
    built.set(rid, r);
    return r;
  }

  /**
   * Build every room that does not exist yet, one per turn of the event loop (the loading screen keeps
   * painting between rooms), so no later room change has to build one. `compile(room)` may pre-compile
   * its shaders (stage renderer). Call it before the first frame.
   * @param {{ compile?: (room: object) => void }} [o]
   * @returns {Promise<void>}
   */
  async function warmAll({ compile = null } = {}) {
    for (const rid of roomIds) {
      if (gone || built.has(rid)) continue;
      await new Promise((res) => setTimeout(res, 30));
      try {
        const r = acquire(rid); applyTheme(r);
        try { compile?.(r); } catch (e) { console.warn('[rooms] compile', e); }
      } catch (e) { console.error('[rooms] warm', e); }
    }
  }

  /**
   * Change room.
   * @param {-1|1|string} dirOrId
   * @returns {boolean} started
   */
  function go(dirOrId) {
    const next = resolve(dirOrId);
    if (!next || next === id || leaving) return false;
    const prevId = id;
    const dir = typeof dirOrId === 'number' ? Math.sign(dirOrId) : (roomIds.indexOf(next) > roomIds.indexOf(id) ? 1 : -1);
    const r = acquire(next);
    applyTheme(r);
    setAr(r, ar);
    r.group.position.x = 0;
    scene.add(r.group);
    if (room) {
      onLeave?.(room, id);
      if (reduceMotion) scene.remove(room.group);
      else { leaving = { room, dir }; t = 0; r.group.position.x = dir * SLIDE.distance; }
    }
    room = r; id = next;
    onEnter(room, id, prevId);
    return true;
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
  }
  keyTarget.addEventListener('keydown', onKey);

  return {
    go, warmAll,
    get id() { return id; },
    get room() { return room; },
    /** True while sliding between rooms. */
    get moving() { return !!leaving; },
    /** 'light' | 'dark' — applied to the current, leaving and every future room. */
    setTheme(next) { theme = next === 'dark' ? 'dark' : 'light'; if (room) applyTheme(room); if (leaving) applyTheme(leaving.room); },
    get theme() { return theme; },
    /** Camera on: hide the room backdrop so the mirrored video shows through. */
    setArMode(on) { ar = on; if (room) setAr(room, on); if (leaving) setAr(leaving.room, on); },
    update(dt, time) {
      if (leaving) {
        t = Math.min(1, t + dt / SLIDE.seconds);
        const k = easeInOut(t);
        room.group.position.x = leaving.dir * SLIDE.distance * (1 - k);
        leaving.room.group.position.x = -leaving.dir * SLIDE.distance * k;
        leaving.room.update?.(dt, time);
        if (t >= 1) { scene.remove(leaving.room.group); leaving = null; room.group.position.x = 0; }
      }
      room?.update(dt, time);
    },
    dispose() {
      gone = true;
      keyTarget.removeEventListener('keydown', onKey);
      if (leaving) { scene.remove(leaving.room.group); leaving = null; }
      if (room) { scene.remove(room.group); room = null; }
      for (const r of built.values()) { try { r.dispose(); } catch (e) { console.error('[rooms] dispose', e); } }
      built.clear();
    },
  };
}
