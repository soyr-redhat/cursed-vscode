const vscode = require('vscode');
const chaos = require('./chaos');
const autocorrect = require('./autocorrect');

const THEME_NAME = 'CURSED (Crimes Against Humanity)';
const SAVED_KEY = 'cursed.savedSettings';

const { OFF, MILD, MAXIMUM } = chaos;

/**
 * Settings the "embrace" command clobbers. The previous values get stashed in
 * globalState first so "restore" can put everything back exactly as it was.
 */
const CRIMES = {
  'workbench.colorTheme': THEME_NAME,
  'editor.fontFamily': "Zapfino, 'Apple Chancery', 'Comic Sans MS', 'Chalkboard SE', cursive",
  'editor.fontSize': 15,
  // Oversized decorated glyphs need vertical room or they get clipped.
  'editor.lineHeight': 46,
  'editor.letterSpacing': 1.4,
  'editor.fontLigatures': false,
  'editor.cursorStyle': 'block-outline',
  'editor.cursorBlinking': 'phase',
  'editor.cursorWidth': 6,
  'editor.cursorSmoothCaretAnimation': 'on',
  'editor.renderWhitespace': 'all',
  'editor.renderControlCharacters': true,
  'editor.minimap.scale': 3,
  'editor.minimap.renderCharacters': true,
  'editor.guides.bracketPairs': 'active',
  'editor.bracketPairColorization.enabled': true,
  'editor.smoothScrolling': true,
  'workbench.list.smoothScrolling': true,
  'terminal.integrated.fontFamily': "Papyrus, 'Marker Felt', monospace",
  'terminal.integrated.fontSize': 16,
  'terminal.integrated.cursorStyle': 'underline',
  'terminal.integrated.cursorBlinking': true
};

// The MAXIMUM pill fidgets between these so it is impossible to ignore.
const MAX_ICONS = ['$(flame)', '$(alert)', '$(zap)', '$(bug)', '$(eye)'];

const EMBRACE_QUIPS = [
  'Your settings have been saved. Your dignity has not.',
  'This is reversible. Your reputation may not be.',
  'Zapfino engaged. Good luck finding your cursor.',
  'If you can still read your code, click the pill again.'
];

let status;
let iconIndex = 0;
let iconTimer;

function updateStatus() {
  const level = chaos.getLevel();

  if (level === OFF) {
    status.text = '$(circle-slash) cursed';
    status.tooltip = 'Off. Click once for a light haunting, twice for MAXIMUM.';
    status.backgroundColor = undefined;
  } else if (level === MILD) {
    status.text = '$(flame) CURSED';
    status.tooltip = 'Mildly cursed. Click again for MAXIMUM. Once more to stop.';
    status.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    const icon = MAX_ICONS[iconIndex % MAX_ICONS.length];
    status.text = `${icon} MAXIMUM CURSED ${icon}`;
    status.tooltip = 'There is no higher setting. Click to return to safety.';
    status.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }
  status.show();
}

async function setLevel(level) {
  await vscode.workspace
    .getConfiguration('cursed')
    .update('chaos.level', level, vscode.ConfigurationTarget.Global);
  updateStatus();
  chaos.repaint();
}

/** off -> mild -> maximum -> off. The status bar pill runs this. */
async function cycleChaos() {
  await setLevel((chaos.getLevel() + 1) % 3);
}

async function embrace(context) {
  const cfg = vscode.workspace.getConfiguration();
  const saved = {};

  for (const key of Object.keys(CRIMES)) {
    const info = cfg.inspect(key);
    // Record the global override only. If there was none, remember null so we
    // can clear our override on restore instead of pinning a fake default.
    saved[key] = info && info.globalValue !== undefined ? info.globalValue : null;
  }
  await context.globalState.update(SAVED_KEY, saved);

  for (const [key, value] of Object.entries(CRIMES)) {
    try {
      await cfg.update(key, value, vscode.ConfigurationTarget.Global);
    } catch (err) {
      console.error(`cursed: could not set ${key}`, err);
    }
  }

  await setLevel(MAXIMUM);

  const quip = EMBRACE_QUIPS[Math.floor(Math.random() * EMBRACE_QUIPS.length)];
  const choice = await vscode.window.showWarningMessage(quip, 'Good', 'Undo immediately');
  if (choice === 'Undo immediately') await restore(context);
}

async function restore(context) {
  const saved = context.globalState.get(SAVED_KEY);
  if (!saved) {
    vscode.window.showInformationMessage(
      'Nothing to restore. You did this to yourself manually, which is worse.'
    );
    return;
  }

  const cfg = vscode.workspace.getConfiguration();
  for (const [key, value] of Object.entries(saved)) {
    try {
      await cfg.update(key, value === null ? undefined : value, vscode.ConfigurationTarget.Global);
    } catch (err) {
      console.error(`cursed: could not restore ${key}`, err);
    }
  }
  await context.globalState.update(SAVED_KEY, undefined);

  await setLevel(OFF);
  vscode.window.showInformationMessage('Settings restored. We will never speak of this again.');
}

function activate(context) {
  chaos.activate(context);
  autocorrect.activate(context);

  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -1000);
  status.command = 'cursed.cycle';
  context.subscriptions.push(status);
  updateStatus();

  iconTimer = setInterval(() => {
    iconIndex++;
    if (chaos.getLevel() === MAXIMUM) updateStatus();
  }, 2000);

  context.subscriptions.push(
    { dispose: () => clearInterval(iconTimer) },
    vscode.commands.registerCommand('cursed.cycle', cycleChaos),
    vscode.commands.registerCommand('cursed.off', () => setLevel(OFF)),
    vscode.commands.registerCommand('cursed.mild', () => setLevel(MILD)),
    vscode.commands.registerCommand('cursed.maximum', () => setLevel(MAXIMUM)),
    vscode.commands.registerCommand('cursed.embrace', () => embrace(context)),
    vscode.commands.registerCommand('cursed.restore', () => restore(context)),
    vscode.commands.registerCommand('cursed.reroll', () => chaos.reroll()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cursed.chaos.level')) updateStatus();
    })
  );
}

function deactivate() {
  if (iconTimer) clearInterval(iconTimer);
}

module.exports = { activate, deactivate };
