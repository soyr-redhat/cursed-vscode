const vscode = require('vscode');

function config() {
  return vscode.workspace.getConfiguration('cursed');
}

function level() {
  const n = Math.round(Number(config().get('chaos.level', 0)));
  return Number.isFinite(n) ? Math.min(2, Math.max(0, n)) : 0;
}

/**
 * Every feature follows the cursed level unless explicitly overridden, so
 * the status bar icon stays the one control that matters.
 *   auto -> on at level 1 and up
 *   on   -> always
 *   off  -> never
 */
function enabled(key) {
  const mode = config().get(key, 'auto');
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return level() >= 1;
}

/** FNV-1a, so a given word keeps its fate instead of flickering per render. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed) {
  let t = (hash(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick(list, seed) {
  return list[Math.floor(rand(seed) * list.length) % list.length];
}

module.exports = { config, level, enabled, hash, rand, pick };
