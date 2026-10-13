const vscode = require('vscode');

const OFF = 0;
const MILD = 1;
const MAXIMUM = 2;

/**
 * VS Code renders a decoration's `textDecoration` value straight into a CSS
 * rule as `text-decoration: <value>;`. Closing it with `none;` lets us smuggle
 * in font-size, font-family, transform, filter and friends, none of which a
 * color theme is allowed to touch. This is the whole trick.
 */
function css(extra) {
  return `none; ${extra}`;
}

/**
 * `tier` gates a style by cursed level. Tier 1 styles are the ones you could
 * plausibly still work through. Tier 2 only unlocks at MAXIMUM and includes
 * everything that rotates, blurs, or staples an emoji to your variable names.
 * Every font listed here is confirmed present on stock macOS.
 */
const STYLE_SPECS = [
  {
    id: 'zapfino',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 1.9em; font-family: Zapfino, cursive; letter-spacing: 2px;"),
      color: '#00FFFF'
    }
  },
  {
    id: 'chancery',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 2.3em; font-family: 'Apple Chancery', 'Snell Roundhand', cursive;"),
      color: '#FFFF00'
    }
  },
  {
    id: 'papyrus',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 1.7em; font-family: Papyrus, fantasy;"),
      color: '#00FF00'
    }
  },
  {
    id: 'comic',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 1.5em; font-family: 'Comic Sans MS', 'Chalkboard SE', cursive; font-weight: 900;"),
      color: '#FF0000'
    }
  },
  {
    id: 'goosebumps',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 1.8em; font-family: Luminari, Herculanum, fantasy;"),
      color: '#FF7F00'
    }
  },
  {
    id: 'anaglyph',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 1.5em; text-shadow: 3px 3px 0 #FF0000, -3px -3px 0 #00FFFF; font-weight: 900;"),
      color: '#FFFFFF'
    }
  },
  {
    id: 'spaced',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 1.3em; font-variant: small-caps;"),
      letterSpacing: '9px',
      color: '#FF1493'
    }
  },
  {
    id: 'wanted',
    tier: 1,
    opts: {
      textDecoration: css("font-size: 1.6em; font-family: 'American Typewriter', serif;"),
      backgroundColor: '#FFFF00',
      border: '2px dashed #FF0000',
      color: '#000000'
    }
  },

  {
    id: 'impact',
    tier: 2,
    opts: {
      textDecoration: css("font-size: 2.1em; font-family: Impact, 'Haettenschweiler', sans-serif; -webkit-text-stroke: 1px #00FFFF;"),
      color: '#000000'
    }
  },
  {
    id: 'dingbats',
    tier: 2,
    opts: {
      // Renders the letter as an unrelated symbol while the real text is untouched.
      textDecoration: css("font-size: 1.4em; font-family: 'Zapf Dingbats', 'Wingdings', fantasy;"),
      color: '#FFFFFF'
    }
  },
  {
    id: 'ant',
    tier: 2,
    opts: {
      textDecoration: css("font-size: 0.45em; vertical-align: sub;"),
      color: '#000000'
    }
  },
  {
    id: 'tilted',
    tier: 2,
    opts: {
      textDecoration: css("display: inline-block; transform: rotate(17deg) scale(1.6); font-family: 'Marker Felt', cursive;"),
      color: '#9400D3'
    }
  },
  {
    id: 'upsidedown',
    tier: 2,
    opts: {
      textDecoration: css("display: inline-block; transform: rotate(180deg); font-size: 1.3em;"),
      color: '#00FFFF'
    }
  },
  {
    id: 'blurry',
    tier: 2,
    opts: {
      textDecoration: css("filter: blur(1.4px); font-size: 1.6em; font-weight: 900;"),
      color: '#FFFF00'
    }
  },
  {
    id: 'ghost',
    tier: 2,
    opts: {
      textDecoration: css("opacity: 0.18; font-size: 2.4em; font-family: Zapfino, cursive;"),
      color: '#FFFFFF'
    }
  },
  {
    id: 'sparkle',
    tier: 2,
    opts: {
      textDecoration: css("font-size: 1.4em; font-family: 'Party LET', 'Savoye LET', cursive;"),
      color: '#00FF00',
      after: { contentText: '✨' }
    }
  },
  {
    id: 'skull',
    tier: 2,
    opts: {
      textDecoration: css("font-size: 1.5em; font-weight: 900;"),
      color: '#FF0000',
      after: { contentText: '\u{1F480}' }
    }
  },
  {
    id: 'sus',
    tier: 2,
    opts: {
      textDecoration: css("font-size: 1.2em; font-family: Papyrus, fantasy;"),
      color: '#0000FF',
      before: { contentText: '\u{1F440}' }
    }
  }
];

let styles = [];
let timer = null;
let strobeTimer = null;
let strobeSalt = 0;

/** FNV-1a. Cheap, stable, good enough to decide a letter's fate. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seedStr) {
  let t = (hash(seedStr) + 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function getLevel() {
  const raw = vscode.workspace.getConfiguration('cursed').get('chaos.level', OFF);
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return OFF;
  return Math.min(MAXIMUM, Math.max(OFF, n));
}

function config() {
  const c = vscode.workspace.getConfiguration('cursed');
  const level = getLevel();
  const maxDecorations = c.get('chaos.maxDecorations', 400);
  return {
    level,
    // MAXIMUM decorates whole runs of characters, so it needs more headroom.
    intensity: level === MAXIMUM ? c.get('chaos.maxIntensity', 0.5) : c.get('chaos.mildIntensity', 0.07),
    max: level === MAXIMUM ? maxDecorations * 3 : maxDecorations,
    maxRun: level === MAXIMUM ? 4 : 1,
    strobe: level === MAXIMUM && c.get('chaos.strobe', true),
    strobeMs: c.get('chaos.strobeMs', 2000)
  };
}

function createStyles() {
  disposeStyles();
  styles = STYLE_SPECS.map((spec) => ({
    id: spec.id,
    tier: spec.tier,
    type: vscode.window.createTextEditorDecorationType(
      Object.assign({ rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed }, spec.opts)
    )
  }));
}

function disposeStyles() {
  styles.forEach((s) => s.type.dispose());
  styles = [];
}

function clear(editor) {
  styles.forEach((s) => editor.setDecorations(s.type, []));
}

function paint(editor) {
  if (!editor) return;
  const cfg = config();
  if (cfg.level === OFF || cfg.intensity <= 0) {
    clear(editor);
    return;
  }

  const pool = styles.filter((s) => s.tier <= cfg.level);
  if (pool.length === 0) {
    clear(editor);
    return;
  }

  const buckets = new Map();
  pool.forEach((s) => buckets.set(s.id, []));

  const doc = editor.document;
  const docKey = `${doc.uri.toString()}#${cfg.level}#${strobeSalt}`;
  let painted = 0;

  outer: for (const visible of editor.visibleRanges) {
    for (let line = visible.start.line; line <= visible.end.line; line++) {
      if (line >= doc.lineCount) break;
      const text = doc.lineAt(line).text;
      // Seeding on the line's own text means a decorated letter stays
      // decorated as lines move around, and only rerolls when you edit it.
      const lineSeed = docKey + '|' + text + '|';
      for (let col = 0; col < text.length; col++) {
        const ch = text[col];
        if (ch === ' ' || ch === '\t') continue;
        if (rand(lineSeed + col) >= cfg.intensity) continue;

        // At MAXIMUM a hit swallows a short run, so whole chunks of a word go
        // cursive at once. Advancing col past the run keeps ranges disjoint.
        let run = 1;
        if (cfg.maxRun > 1) {
          run = 1 + Math.floor(rand(lineSeed + col + ':run') * cfg.maxRun);
          run = Math.min(run, text.length - col);
        }

        const pick = pool[Math.floor(rand(lineSeed + col + ':style') * pool.length)];
        buckets.get(pick.id).push(new vscode.Range(line, col, line, col + run));
        col += run - 1;

        painted++;
        if (painted >= cfg.max) break outer;
      }
    }
  }

  // Always set every type, including the empty ones, or stale paint lingers
  // when the level drops and a tier-2 style falls out of the pool.
  styles.forEach((s) => editor.setDecorations(s.type, buckets.get(s.id) || []));
}

function paintAll() {
  vscode.window.visibleTextEditors.forEach(paint);
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(paintAll, 120);
}

function restartStrobe() {
  if (strobeTimer) clearInterval(strobeTimer);
  strobeTimer = null;
  const cfg = config();
  if (cfg.strobe && cfg.strobeMs >= 250) {
    strobeTimer = setInterval(() => {
      strobeSalt++;
      paintAll();
    }, cfg.strobeMs);
  }
}

function reroll() {
  strobeSalt++;
  paintAll();
}

function activate(context) {
  createStyles();
  restartStrobe();
  schedule();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(schedule),
    vscode.window.onDidChangeVisibleTextEditors(schedule),
    vscode.window.onDidChangeTextEditorVisibleRanges(schedule),
    vscode.workspace.onDidChangeTextDocument(schedule),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('cursed')) return;
      restartStrobe();
      if (getLevel() === OFF) vscode.window.visibleTextEditors.forEach(clear);
      schedule();
    }),
    { dispose: disposeStyles },
    {
      dispose: () => {
        if (timer) clearTimeout(timer);
        if (strobeTimer) clearInterval(strobeTimer);
      }
    }
  );
}

module.exports = { activate, reroll, repaint: paintAll, getLevel, OFF, MILD, MAXIMUM };
