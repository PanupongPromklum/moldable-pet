/**
 * Thai transcript normalisation and fuzzy helpers for the keyword brain (owner: echo).
 * Spec: design/gdd/conversation.md §3.3 and §4.1. Pure, no DOM, unit-tested
 * (tests/unit/conversation.test.mjs).
 *
 * Usage:
 *   import { normalize, toneFree, levenshtein, codeLength } from './conversation/normalize.js';
 *   const n = normalize('หิวววว ไหมมม');   // → { text: 'หิวไหม', bounds: Set{0, 3, 6} }
 *   const t = toneFree(n);                  // → { text, map, bounds } with ่ ้ ๊ ๋ ็ ์ removed
 *
 * The same normalize() runs on every keyword in conversation.json, so spelling quirks cancel
 * out on both sides. `bounds` holds the indices in `text` where a raw space, punctuation,
 * zero-width character or ๆ used to be (plus 0 and text.length); the short-keyword boundary
 * rule (§3.4) reads them.
 */

/** Zero-width and joiner characters dropped from transcripts (they act as word breaks). */
const ZERO_WIDTH = /[​-‍⁠﻿]/;
/** Characters kept: letters, combining marks, digits (everything else is a break). */
const KEEP = /[\p{L}\p{M}\p{N}]/u;
/** Thai tone marks + mai taikhu + thanthakhat, removed for the tone-free pass (U+0E47–U+0E4C). */
const TONE = /[็-์]/;
/** ไม้ยมก (repeat mark). */
const MAI_YAMOK = 'ๆ';

/**
 * Normalise a transcript or keyword (§3.3 steps 1–3).
 * @param {string} input
 * @returns {{ text: string, bounds: Set<number> }}
 */
export function normalize(input) {
  const s = String(input ?? '').normalize('NFC').toLowerCase();
  const out = [];
  const bounds = new Set([0]);
  let brk = false;
  for (const ch0 of s) {
    let ch = ch0;
    const cp = ch.codePointAt(0);
    if (cp >= 0x0E50 && cp <= 0x0E59) ch = String(cp - 0x0E50); // Thai digits → 0–9
    if (ch === MAI_YAMOK || ZERO_WIDTH.test(ch) || !KEEP.test(ch)) { brk = true; continue; }
    if (brk) { bounds.add(out.length); brk = false; }
    else if (out.length && out[out.length - 1] === ch) continue; // collapse runs (not across a break)
    out.push(ch);
  }
  bounds.add(out.length);
  return { text: out.join(''), bounds };
}

/**
 * Tone-free copy of a normalised string (§3.3 step 4), with an index map back to the source.
 * @param {{ text: string, bounds?: Set<number> }} n output of normalize()
 * @returns {{ text: string, map: number[], bounds: Set<number> }} map[i] = index in n.text
 */
export function toneFree(n) {
  const chars = [], map = [], bounds = new Set();
  const src = n.text;
  for (let i = 0; i < src.length; i++) {
    if (n.bounds && n.bounds.has(i)) bounds.add(chars.length);
    if (TONE.test(src[i])) continue;
    chars.push(src[i]); map.push(i);
  }
  bounds.add(chars.length);
  map.push(src.length); // sentinel so map[end] works for spans
  return { text: chars.join(''), map, bounds };
}

/** Remove tone marks from an already-normalised plain string (for keywords). */
export function stripTones(text) {
  let o = '';
  for (const ch of text) if (!TONE.test(ch)) o += ch;
  return o;
}

/**
 * Number of code points (|k| in §4.1).
 * @param {string} s
 */
export function codeLength(s) { let n = 0; for (const _ of s) n++; return n; }

/**
 * Levenshtein edit distance (insert, delete, substitute = 1), with early exit above `max`.
 * @param {string} a
 * @param {string} b
 * @param {number} [max=Infinity] stop and return max + 1 when the distance must exceed it
 */
export function levenshtein(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
