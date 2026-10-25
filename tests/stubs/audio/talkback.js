// TEST STUB of Echo's src/audio/talkback.js — fakes one phrase per 3 s, no microphone.
export function createTalkback({ onState, onLevel }) {
  let on = false, timer = 0;
  function cycle() {
    if (!on) return;
    onState('recording');
    timer = setTimeout(() => {
      if (!on) return;
      onState('playing');
      let k = 0;
      const iv = setInterval(() => { onLevel(Math.abs(Math.sin(k++ / 2))); }, 60);
      timer = setTimeout(() => { clearInterval(iv); onLevel(0); if (on) { onState('listening'); timer = setTimeout(cycle, 1500); } }, 1200);
    }, 1000);
  }
  return {
    async start() { on = true; onState('listening'); timer = setTimeout(cycle, 800); },
    stop() { on = false; clearTimeout(timer); onState('off'); },
    isOn() { return on; },
  };
}
