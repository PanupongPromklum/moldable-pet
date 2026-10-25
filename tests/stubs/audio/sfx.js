// TEST STUB of Echo's src/audio/sfx.js — records calls, makes no sound.
export const sfx = {
  log: [],
  unlock() { this.log.push('unlock'); },
  play(name) { this.log.push(name); if (this.log.length > 200) this.log.shift(); },
  setEnabled() {},
};
if (typeof window !== 'undefined') window.__sfxStub = sfx;
