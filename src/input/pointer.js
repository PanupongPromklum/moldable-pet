/**
 * Mouse + touch + pen → gesture layer. Presses start on the WebGL canvas (HUD
 * controls take their own events); moves and releases are read on window so a
 * drag that started on a HUD food keeps working anywhere on screen.
 * @module input/pointer
 */

/**
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   gestures: ReturnType<import('./gestures.js').createGestures>,
 *   getTime: () => number,
 *   onFirstGesture?: () => void,
 *   win?: Window,
 * }} deps
 * @returns {{ dispose(): void }}
 */
export function attachPointer({ canvas, gestures, getTime, onFirstGesture, win = window }) {
  const active = new Set();
  let unlocked = false;
  const kindOf = (e) => (e.pointerType === 'touch' ? 'touch' : e.pointerType === 'pen' ? 'pen' : 'mouse');
  const key = (e) => 'p' + e.pointerId;

  function first() { if (!unlocked) { unlocked = true; onFirstGesture?.(); } }

  function onDown(e) {
    if (e.button > 0) return;
    first();
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    gestures.leave(key(e));
    active.add(e.pointerId);
    gestures.down(key(e), e.clientX, e.clientY, getTime(), kindOf(e));
  }
  function onMove(e) {
    if (active.has(e.pointerId)) gestures.move(key(e), e.clientX, e.clientY, getTime());
    else if (e.pointerType === 'mouse' && e.target === canvas) gestures.hover(key(e), e.clientX, e.clientY, getTime());
  }
  function onUp(e) {
    if (!active.delete(e.pointerId)) return;
    gestures.up(key(e), e.clientX, e.clientY, getTime());
  }
  function onCancel(e) {
    if (!active.delete(e.pointerId)) return;
    gestures.cancel(key(e));
  }
  function onLeave(e) { if (e.pointerType === 'mouse') gestures.leave(key(e)); }
  function onWheel(e) {
    first();
    if (gestures.wheel(e.clientX, e.clientY, e.deltaY, getTime())) e.preventDefault();
  }
  function onContext(e) { e.preventDefault(); }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContext);
  win.addEventListener('pointermove', onMove, { passive: true });
  win.addEventListener('pointerup', onUp);
  win.addEventListener('pointercancel', onCancel);

  return {
    /**
     * Track a pointer that went down on a HUD element (food tray), so its moves
     * and release reach the gesture layer.
     * @param {PointerEvent} e
     */
    adopt(e) { first(); active.add(e.pointerId); return key(e); },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
      win.removeEventListener('pointermove', onMove);
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onCancel);
    },
  };
}
