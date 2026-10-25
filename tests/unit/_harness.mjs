// Minimal test harness (no framework). Each test file imports this, calls
// `test(name, fn)` and ends with `done()`, which sets the exit code.
let pass = 0, fail = 0;
export function test(name, fn) {
  try { fn(); pass++; console.log('  ok  ', name); }
  catch (e) { fail++; console.log('  FAIL', name, '\n       ', e.message); }
}
export function assert(cond, msg) { if (!cond) throw new Error(msg); }
export function eq(a, b, msg) { if (a !== b) throw new Error(`${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }
export function deepEq(a, b, msg) { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error(`${msg}: got ${x}, want ${y}`); }
export function near(a, b, eps, msg) { if (!(Math.abs(a - b) <= eps)) throw new Error(`${msg}: got ${a}, want ${b} ± ${eps}`); }
export function done() { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
