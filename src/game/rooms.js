/**
 * Room manager — creates / disposes rooms through Prop's `createRoom`, plays a
 * soft sideways slide between them, and listens to ←/→ keys. Swipes and HUD
 * arrows call `go()` from outside.
 * @module game/rooms
 */

const SLIDE = { distance: 16, seconds: 0.55 };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * @param {{
 *   scene: import('three').Scene,
 *   createRoom: (id: string) => object,
 *   roomIds: string[],
 *   onEnter: (room: object, id: string, prevId: string|null) => void,
 *   onLeave?: (room: object, id: string) => void,
 *   reduceMotion?: boolean,
 *   keyTarget?: EventTarget,
 * }} deps
 */
export function createRoomManager({ scene, createRoom, roomIds, onEnter, onLeave, reduceMotion = false, keyTarget = window }) {
  let id = null, room = null;
  let leaving = null; // { room, dir }
  let t = 1, ar = false;

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
    const r = createRoom(next);
    setAr(r, ar);
    scene.add(r.group);
    if (room) {
      onLeave?.(room, id);
      if (reduceMotion) { scene.remove(room.group); room.dispose(); }
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
    go,
    get id() { return id; },
    get room() { return room; },
    /** True while sliding between rooms. */
    get moving() { return !!leaving; },
    /** Camera on: hide the room backdrop so the mirrored video shows through. */
    setArMode(on) { ar = on; if (room) setAr(room, on); if (leaving) setAr(leaving.room, on); },
    update(dt, time) {
      if (leaving) {
        t = Math.min(1, t + dt / SLIDE.seconds);
        const k = easeInOut(t);
        room.group.position.x = leaving.dir * SLIDE.distance * (1 - k);
        leaving.room.group.position.x = -leaving.dir * SLIDE.distance * k;
        leaving.room.update?.(dt, time);
        if (t >= 1) { scene.remove(leaving.room.group); leaving.room.dispose(); leaving = null; room.group.position.x = 0; }
      }
      room?.update(dt, time);
    },
    dispose() {
      keyTarget.removeEventListener('keydown', onKey);
      if (leaving) { scene.remove(leaving.room.group); leaving.room.dispose(); leaving = null; }
      if (room) { scene.remove(room.group); room.dispose(); room = null; }
    },
  };
}
