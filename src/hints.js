const vscode = require('vscode');
const { config, level, enabled, rand, pick } = require('./util');

/**
 * Inlay hints are the small grey annotations VS Code renders inline, the
 * ones that normally tell you a real inferred type. These are wrong. Quietly,
 * confidently wrong, in the same typeface as the truth.
 */
const TYPES = [
  'any', 'unknown', 'never', 'Maybe<Regret>', 'string | undefined | whatever',
  'number?', 'boolean(ish)', 'Promise<never>', 'Error', 'object (probably)',
  'void*', 'Array<Array<any>>', 'Record<string, Sorrow>', '任何', 'T extends ?',
  'Partial<Truth>', 'readonly any[]', 'Nullable<Nullable<T>>', 'IDK',
  'float64 | vibes', 'Buffer', 'Date (local time)', 'enum { yes, no, sometimes }'
];

const PARAMS = [
  'arg', 'thing', 'value?', 'input', 'unused', 'legacy', 'deprecated',
  'doNotPass', 'ignored', 'honestly', 'whatever', 'opts?'
];

// Hint after a declaration keyword, so the fake type lands where a real one
// would. Matching the keyword keeps this roughly language-agnostic.
const DECL = /\b(?:const|let|var|val|def|fn|func|function|class|struct|type|interface|enum|public|private|protected)\s+([A-Za-z_][A-Za-z0-9_]*)/g;
const CALL_ARG = /\b[A-Za-z_][A-Za-z0-9_]*\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/g;

function settings() {
  const c = config();
  const lvl = level();
  return {
    on: enabled('hints.mode'),
    density: lvl >= 2 ? c.get('hints.maxIntensity', 0.8) : c.get('hints.mildIntensity', 0.3),
    max: c.get('hints.max', 120)
  };
}

function provideInlayHints(document, range) {
  const s = settings();
  if (!s.on || s.density <= 0) return [];

  const hints = [];
  const key = document.uri.toString();

  for (let line = range.start.line; line <= range.end.line && hints.length < s.max; line++) {
    if (line >= document.lineCount) break;
    const text = document.lineAt(line).text;
    if (!text.trim() || text.length > 300) continue;

    DECL.lastIndex = 0;
    let m;
    while ((m = DECL.exec(text)) !== null && hints.length < s.max) {
      const col = m.index + m[0].length;
      const seed = `${key}|${text}|${col}|t`;
      if (rand(seed) >= s.density) continue;

      const hint = new vscode.InlayHint(
        new vscode.Position(line, col),
        `: ${pick(TYPES, seed)}`,
        vscode.InlayHintKind.Type
      );
      hint.paddingLeft = false;
      hint.tooltip = new vscode.MarkdownString('Inferred with total confidence.');
      hints.push(hint);
    }

    CALL_ARG.lastIndex = 0;
    while ((m = CALL_ARG.exec(text)) !== null && hints.length < s.max) {
      const col = m.index + m[0].length - m[1].length;
      const seed = `${key}|${text}|${col}|p`;
      if (rand(seed) >= s.density * 0.5) continue;

      const hint = new vscode.InlayHint(
        new vscode.Position(line, col),
        `${pick(PARAMS, seed)}:`,
        vscode.InlayHintKind.Parameter
      );
      hint.paddingRight = true;
      hints.push(hint);
    }
  }

  return hints;
}

function activate(context) {
  const emitter = new vscode.EventEmitter();

  context.subscriptions.push(
    emitter,
    vscode.languages.registerInlayHintsProvider('*', {
      onDidChangeInlayHints: emitter.event,
      provideInlayHints
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cursed')) emitter.fire();
    })
  );
}

module.exports = { activate };
