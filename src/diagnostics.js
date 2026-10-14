const vscode = require('vscode');
const { config, level, enabled, rand, pick } = require('./util');

/**
 * Entirely fabricated complaints. They appear in the Problems panel with a
 * source of "cursed", squiggled in your editor, looking exactly like real
 * tooling. That is the joke: you will go and look.
 */
const COMPLAINTS = [
  'Variable named too confidently.',
  'This identifier is 6 characters long. Industry standard is 7.',
  'Unreachable code. It is reachable, I just do not like it.',
  'Consider extracting this into a microservice.',
  'This line was written after 9pm.',
  'Possible null. Possible not null. Unclear.',
  'This name was also used in a project that failed.',
  'Expected a semicolon. Not here. Somewhere.',
  'Cyclomatic complexity is fine, which is suspicious.',
  'This works, but for the wrong reasons.',
  'Did you mean something else? I think you meant something else.',
  'Shadowed by a variable that does not exist yet.',
  'Deprecated since a version that was never released.',
  'This should be async. Everything should be async.',
  'No test covers this. No test covers anything.',
  'Type is inferred as correct. Override recommended.',
  'Prefer const. It is already const. Prefer it harder.',
  'This block is indented. Consider not.',
  'Performance: this runs in O(n). Unacceptable.',
  'Accessibility: this variable is hard to read aloud.',
  'Security: an attacker could read this file and learn things.',
  'Licensing: this word may be trademarked.',
  'This looks copy-pasted, and I mean that kindly.',
  'Memory leak (spiritual).',
  'Consider renaming to something your manager would understand.',
  'This passes review but not inspection.'
];

const KEYED = [
  { re: /^(get|set)[A-Z_]/, text: 'Getter detected. Have you considered just making it public and moving on?' },
  { re: /^(tmp|temp|foo|bar|baz|test|x|y|data|thing|stuff)$/i, text: 'Placeholder name reaching production in 3, 2...' },
  { re: /^(util|utils|helper|helpers|common|misc|shared)$/i, text: 'This module will contain 4,000 lines by March.' },
  { re: /^(manager|handler|service|factory|provider)$/i, text: 'Noun stacking detected. Add one more and it becomes sentient.' },
  { re: /^(new|old|final|final2|v2|legacy)$/i, text: 'Temporal naming. This will be wrong within the week.' },
  { re: /(password|secret|token|key|credential)/i, text: 'Hardcoded secret. (It is not. But imagine.)' },
  { re: /^(todo|fixme|hack|xxx)$/i, text: 'Acknowledged. Taking no action.' },
  { re: /^[a-z]$/, text: 'Single-letter name. Bold. Unmaintainable. Respected.' }
];

const SEVERITIES = [
  vscode.DiagnosticSeverity.Error,
  vscode.DiagnosticSeverity.Warning,
  vscode.DiagnosticSeverity.Warning,
  vscode.DiagnosticSeverity.Information,
  vscode.DiagnosticSeverity.Hint
];

const WORD = /[A-Za-z_][A-Za-z0-9_]{2,}/g;
const MAX_LINES = 3000;

let collection = null;
let timer = null;

function settings() {
  const c = config();
  const lvl = level();
  return {
    on: enabled('diagnostics.mode'),
    density: lvl >= 2 ? c.get('diagnostics.maxIntensity', 0.09) : c.get('diagnostics.mildIntensity', 0.02),
    max: lvl >= 2 ? c.get('diagnostics.max', 40) : Math.ceil(c.get('diagnostics.max', 40) / 4)
  };
}

function messageFor(word, seed) {
  const keyed = KEYED.find((k) => k.re.test(word));
  if (keyed && rand(seed + ':keyed') < 0.75) return keyed.text;
  return pick(COMPLAINTS, seed + ':msg');
}

function refresh(document) {
  if (!collection || !document) return;
  if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') return;

  const s = settings();
  if (!s.on || s.density <= 0) {
    collection.delete(document.uri);
    return;
  }

  const out = [];
  const lines = Math.min(document.lineCount, MAX_LINES);
  const key = document.uri.toString();

  for (let line = 0; line < lines && out.length < s.max; line++) {
    const text = document.lineAt(line).text;
    if (text.length === 0 || text.length > 400) continue;

    WORD.lastIndex = 0;
    let m;
    while ((m = WORD.exec(text)) !== null && out.length < s.max) {
      // Seeded on the line's own text, so a complaint sticks to a word
      // instead of flickering every keystroke.
      const seed = `${key}|${text}|${m.index}`;
      if (rand(seed) >= s.density) continue;

      const range = new vscode.Range(line, m.index, line, m.index + m[0].length);
      const d = new vscode.Diagnostic(
        range,
        messageFor(m[0], seed),
        pick(SEVERITIES, seed + ':sev')
      );
      d.source = 'cursed';
      d.code = {
        value: `CURSED${String(Math.floor(rand(seed + ':code') * 9000) + 1000)}`,
        target: vscode.Uri.parse('https://github.com/soyr-redhat/cursed-vscode')
      };
      out.push(d);
    }
  }

  collection.set(document.uri, out);
}

function refreshAll() {
  if (!collection) return;
  collection.clear();
  vscode.window.visibleTextEditors.forEach((e) => refresh(e.document));
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(refreshAll, 400);
}

function activate(context) {
  collection = vscode.languages.createDiagnosticCollection('cursed');

  context.subscriptions.push(
    collection,
    { dispose: () => timer && clearTimeout(timer) },
    vscode.window.onDidChangeActiveTextEditor(schedule),
    vscode.window.onDidChangeVisibleTextEditors(schedule),
    vscode.workspace.onDidChangeTextDocument(schedule),
    vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cursed')) schedule();
    })
  );

  schedule();
}

module.exports = { activate };
