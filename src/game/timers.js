/**
 * Tiny scheduler driven by the stage clock (seconds), so game sequences
 * (chew → gulp, flush → stand up, return-after-absence lines) pause with the
 * frame loop instead of running on setTimeout while the tab is hidden.
 * @module game/timers
 */

/** @returns {{ after(sec:number, fn:Function, tag?:string): void, cancel(tag:string): void, update(time:number): void, clear(): void }} */
export function createTimers() {
  const list = [];
  let now = 0;
  return {
    /** Run `fn` after `sec` seconds; `tag` lets a group be cancelled together. */
    after(sec, fn, tag = '') { list.push({ at: now + sec, fn, tag }); },
    cancel(tag) { for (let i = list.length - 1; i >= 0; i--) if (list[i].tag === tag) list.splice(i, 1); },
    update(time) {
      now = time;
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        if (t.at <= time) { list.splice(i, 1); i--; try { t.fn(); } catch (e) { console.error(e); } }
      }
    },
    clear() { list.length = 0; },
  };
}
