const vscode = require('vscode');
const chaos = require('./chaos');
const autocorrect = require('./autocorrect');
const buddy = require('./buddy');
const diagnostics = require('./diagnostics');
const hints = require('./hints');
const ads = require('./ads');

const THEME_NAME = 'CURSED (Crimes Against Humanity)';
const SAVED_KEY = 'cursed.savedSettings';

const { OFF, MILD, MAXIMUM } = chaos;

/**
 * Settings applied from level 1 up. Colors and a bit of extra line height so
 * the oversized decorated glyphs have somewhere to go.
 */
const THEME_CRIMES = {
  'workbench.colorTheme': THEME_NAME,
  'editor.lineHeight': 32,
  'editor.fontLigatures': false,
  'editor.renderWhitespace': 'all',
  'editor.bracketPairColorization.enabled': true,
  'editor.guides.bracketPairs': 'active',
  // The lying inlay hints do not render at all without this.
  'editor.inlayHints.enabled': 'on'
};

/**
 * Applied only at MAXIMUM, on top of the above. This is the tier that makes
 * the editor genuinely unusable, so it stays out of mild mode. The duplicate
 * `editor.lineHeight` key is intentional: at MAXIMUM it wins and gets bigger.
 */
const FONT_CRIMES = {
  'editor.fontFamily': "Zapfino, 'Apple Chancery', 'Comic Sans MS', 'Chalkboard SE', cursive",
  'editor.fontSize': 15,
  'editor.lineHeight': 46,
  'editor.letterSpacing': 1.4,
  'editor.cursorStyle': 'block-outline',
  'editor.cursorBlinking': 'phase',
  'editor.cursorWidth': 6,
  'editor.cursorSmoothCaretAnimation': 'on',
  'editor.renderControlCharacters': true,
  'editor.minimap.scale': 3,
  'editor.minimap.renderCharacters': true,
  'editor.smoothScrolling': true,
  'workbench.list.smoothScrolling': true,
  'terminal.integrated.fontFamily': "Papyrus, 'Marker Felt', monospace",
  'terminal.integrated.fontSize': 16,
  'terminal.integrated.cursorStyle': 'underline',
  'terminal.integrated.cursorBlinking': true
};

const ALL_KEYS = [...new Set([...Object.keys(THEME_CRIMES), ...Object.keys(FONT_CRIMES)])];

function desiredFor(level) {
  if (level >= MAXIMUM) return Object.assign({}, THEME_CRIMES, FONT_CRIMES);
  if (level >= MILD) return Object.assign({}, THEME_CRIMES);
  return {};
}

const EMBRACE_QUIPS = [
  'Your settings have been saved. Your dignity has not.',
  'This is reversible. Your reputation may not be.',
  'Zapfino engaged. Good luck finding your cursor.',
  'If you can still read your code, click the pill again.'
];

let status;

/**
 * Icon only, no label. The tooltip carries the explanation, since there is no
 * room for it. Only MAXIMUM gets a colored background: at that point being
 * subtle would be dishonest.
 */
function updateStatus() {
  const level = chaos.getLevel();

  if (level === OFF) {
    status.text = '$(circle-slash)';
    status.tooltip = 'CURSED: off. Click once for mild, twice for MAXIMUM.';
    status.backgroundColor = undefined;
  } else if (level === MILD) {
    status.text = '$(check)';
    status.tooltip = 'CURSED: mild. Theme on, fonts untouched. Click for MAXIMUM.';
    status.backgroundColor = undefined;
  } else {
    status.text = '$(flame)';
    status.tooltip = 'CURSED: MAXIMUM. Click to return to safety.';
    status.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }
  status.show();
}

/**
 * Snapshot every setting we are about to touch, once, before the first change.
 * A recorded `null` means "there was no user override here", so restoring it
 * clears our override rather than pinning a value the user never chose.
 */
async function snapshot(context, cfg) {
  const existing = context.globalState.get(SAVED_KEY);
  if (existing) {
    // A new version can start managing a setting the old snapshot never
    // recorded. Backfill those, or restore would clear a value the user
    // chose themselves rather than putting it back.
    const missing = ALL_KEYS.filter((k) => !(k in existing));
    if (missing.length === 0) return existing;

    for (const key of missing) {
      const info = cfg.inspect(key);
      existing[key] = info && info.globalValue !== undefined ? info.globalValue : null;
    }
    await context.globalState.update(SAVED_KEY, existing);
    return existing;
  }

  const saved = {};
  for (const key of ALL_KEYS) {
    const info = cfg.inspect(key);
    let value = info && info.globalValue !== undefined ? info.globalValue : null;
    // If they already had the cursed theme selected by hand, do not memorize
    // it as the thing to "restore" to. That would make off do nothing. Fall
    // back to cursed.restoreTheme if they set one, otherwise clear the
    // override and let VS Code return to its default.
    if (key === 'workbench.colorTheme' && value === THEME_NAME) {
      const fallback = vscode.workspace.getConfiguration('cursed').get('restoreTheme', '');
      value = fallback && fallback !== THEME_NAME ? fallback : null;
    }
    saved[key] = value;
  }
  await context.globalState.update(SAVED_KEY, saved);
  return saved;
}

/**
 * The single source of truth for what a level means. Sets the chaos level and
 * reconciles every managed setting: anything the new level wants gets set,
 * anything it does not want gets put back the way we found it. That makes
 * 2 -> 1 drop the Zapfino but keep the colors, and anything -> 0 undo it all.
 */
async function applyLevel(context, level) {
  await vscode.workspace
    .getConfiguration('cursed')
    .update('chaos.level', level, vscode.ConfigurationTarget.Global);
  updateStatus();
  chaos.repaint();

  const cfg = vscode.workspace.getConfiguration();

  if (level === OFF) {
    const saved = context.globalState.get(SAVED_KEY);
    if (!saved) return;
    for (const key of ALL_KEYS) {
      try {
        const value = saved[key] === null || saved[key] === undefined ? undefined : saved[key];
        await cfg.update(key, value, vscode.ConfigurationTarget.Global);
      } catch (err) {
        console.error(`cursed: could not restore ${key}`, err);
      }
    }
    await context.globalState.update(SAVED_KEY, undefined);
    return;
  }

  const saved = await snapshot(context, cfg);
  const desired = desiredFor(level);

  for (const key of ALL_KEYS) {
    const wanted = Object.prototype.hasOwnProperty.call(desired, key);
    const value = wanted
      ? desired[key]
      : saved[key] === null || saved[key] === undefined
        ? undefined
        : saved[key];
    try {
      await cfg.update(key, value, vscode.ConfigurationTarget.Global);
    } catch (err) {
      console.error(`cursed: could not set ${key}`, err);
    }
  }
}

/** off -> mild -> MAXIMUM -> off. The status bar pill runs this. */
async function cycleChaos(context) {
  await applyLevel(context, (chaos.getLevel() + 1) % 3);
}

const MUTATE_SCOPES = ['auto', 'off', 'scratch', 'everywhere'];
const MUTATE_BLURB = {
  auto: 'Autocorrect rewriting now follows the cursed level: off at 0, scratch buffers at 1, every file at MAXIMUM.',
  off: 'Autocorrect will only ever suggest, never rewrite.',
  scratch: 'Autocorrect now rewrites words as you type, in unsaved buffers only.',
  everywhere: 'Autocorrect now rewrites words as you type, in EVERY file. Cmd+Z undoes each one.'
};

/** auto -> off -> scratch -> everywhere -> auto. */
async function cycleMutation() {
  const current = vscode.workspace.getConfiguration('cursed').get('autocorrect.mutateScope', 'auto');
  const i = MUTATE_SCOPES.indexOf(current);
  const next = MUTATE_SCOPES[(i < 0 ? 0 : i + 1) % MUTATE_SCOPES.length];
  await vscode.workspace
    .getConfiguration('cursed')
    .update('autocorrect.mutateScope', next, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`CURSED: ${MUTATE_BLURB[next]}`);
}

async function embrace(context) {
  await applyLevel(context, MAXIMUM);
  const quip = EMBRACE_QUIPS[Math.floor(Math.random() * EMBRACE_QUIPS.length)];
  const choice = await vscode.window.showWarningMessage(quip, 'Good', 'Undo immediately');
  if (choice === 'Undo immediately') await restore(context);
}

async function restore(context) {
  const hadSnapshot = Boolean(context.globalState.get(SAVED_KEY));
  await applyLevel(context, OFF);
  vscode.window.showInformationMessage(
    hadSnapshot
      ? 'Settings restored. We will never speak of this again.'
      : 'Chaos off. There was nothing of yours to restore.'
  );
}

function activate(context) {
  chaos.activate(context);
  autocorrect.activate(context);
  buddy.activate(context);
  diagnostics.activate(context);
  hints.activate(context);
  ads.activate(context);

  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -1000);
  status.command = 'cursed.cycle';
  context.subscriptions.push(status);
  updateStatus();

  context.subscriptions.push(
    vscode.commands.registerCommand('cursed.cycle', () => cycleChaos(context)),
    vscode.commands.registerCommand('cursed.off', () => applyLevel(context, OFF)),
    vscode.commands.registerCommand('cursed.mild', () => applyLevel(context, MILD)),
    vscode.commands.registerCommand('cursed.maximum', () => applyLevel(context, MAXIMUM)),
    vscode.commands.registerCommand('cursed.embrace', () => embrace(context)),
    vscode.commands.registerCommand('cursed.restore', () => restore(context)),
    vscode.commands.registerCommand('cursed.reroll', () => chaos.reroll()),
    vscode.commands.registerCommand('cursed.mutate', cycleMutation),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cursed.chaos.level')) updateStatus();
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
