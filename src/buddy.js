const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const IMAGE_EXT = /\.(gif|png|webp|jpe?g|svg)$/i;

/**
 * Clippy, but worse. The first match wins, so order matters: put the
 * specific patterns above the catch-alls.
 */
const ADVICE = [
  { re: /\b(for|while|foreach)\b/i, text: "It looks like you're writing a loop. Would you like me to translate it to Mandarin?" },
  { re: /\b(class|struct|interface)\b/i, text: 'It looks like you\'re declaring a class. Have you considered 班級 instead?' },
  { re: /\b(test|assert|expect|mock)\b/i, text: "It looks like you're writing a test. Bold. Would you like me to delete it?" },
  { re: /\b(fix|bug|debug|broken)\b/i, text: 'It looks like something is broken. Have you tried turning it off and on again?' },
  { re: /\b(deploy|release|ship|production)\b/i, text: "It looks like you're deploying on a Friday. I support this decision." },
  { re: /\b(async|await|promise|thread)\b/i, text: "It looks like you're doing something concurrent. Are you sure?" },
  { re: /\b(todo|fixme|hack|xxx)\b/i, text: 'I see the TODO. We both know how this ends.' },
  { re: /\b(sorry|please|why|help)\b/i, text: 'I sensed distress. I have no useful information, but I am here.' },
  { re: /\b(copilot|claude|gpt|ai)\b/i, text: 'You have another assistant? I was here first.' }
];

const GENERIC_ADVICE = [
  'It looks like you\'re writing code. Would you like help making it worse?',
  'Did you know? You can press Cmd+Z roughly four hundred times.',
  'I have reviewed your code. I have no notes. I did not read it.',
  'Your variable names are fine. I would have picked different ones.',
  'Just checking in. No reason.',
  'I noticed you have not committed in a while. No pressure. Just noticing.',
  'That looks like it will work. That is the most I am willing to say.',
  'Have you considered doing this in a spreadsheet instead?'
];

const BUTTONS = ['Thanks', 'Go away'];

let frameTypes = [];
let hideTimer = null;
let scheduleTimer = null;
let reanchorTimer = null;
let frameIndex = 0;
let activeEditor = null;
let activeRange = null;
let mediaRoot = '';

function cfg() {
  return vscode.workspace.getConfiguration('cursed');
}

/**
 * "auto" ties the buddy to the cursed level, like everything else: never at
 * 0, occasional at 1, three times as often at MAXIMUM.
 */
function state() {
  const c = cfg();
  const mode = c.get('buddy.mode', 'auto');
  const level = c.get('chaos.level', 0);

  let enabled;
  if (mode === 'off') enabled = false;
  else if (mode === 'on') enabled = true;
  else enabled = level >= 1;

  const base = Math.max(5000, c.get('buddy.intervalMs', 90000));
  return {
    enabled,
    interval: mode === 'auto' && level >= 2 ? base / 3 : base,
    duration: Math.max(1000, c.get('buddy.durationMs', 7000)),
    size: Math.max(24, c.get('buddy.size', 160)),
    float: c.get('buddy.float', true),
    popups: c.get('buddy.popups', true),
    images: c.get('buddy.images', []),
    imageDir: c.get('buddy.imageDir', ''),
    triggers: c.get('buddy.triggers', [])
  };
}

function scanDir(dir) {
  try {
    const resolved = dir.startsWith('~') ? path.join(require('os').homedir(), dir.slice(1)) : dir;
    return fs
      .readdirSync(resolved)
      .filter((f) => IMAGE_EXT.test(f))
      .sort()
      .map((f) => path.join(resolved, f));
  } catch (err) {
    console.error(`cursed: could not read buddy.imageDir "${dir}"`, err);
    return [];
  }
}

/**
 * Precedence: your explicit list, then your scanned folder, then the bundled
 * GeoCities GIFs. They animate themselves, so this is a set to pick one from.
 */
function framePaths(s) {
  if (Array.isArray(s.images) && s.images.length > 0) return s.images;
  if (s.imageDir) {
    const found = scanDir(s.imageDir);
    if (found.length > 0) return found;
  }
  return scanDir(path.join(mediaRoot, 'buddies'));
}

function toUri(p) {
  return /^[a-z][a-z0-9+.-]*:/i.test(p) ? vscode.Uri.parse(p) : vscode.Uri.file(p);
}

function disposeFrames() {
  frameTypes.forEach((t) => t.dispose());
  frameTypes = [];
}

function buildFrames() {
  disposeFrames();
  const s = state();

  // Floating lifts the sprite out of the line box so it overlaps your code
  // instead of stretching the line. If a custom image renders clipped, turn
  // cursed.buddy.float off and it sits inline at the end of the line.
  const css = s.float
    ? `none; position: absolute; z-index: 99; pointer-events: none; margin-top: ${-Math.round(s.size * 0.45)}px;`
    : 'none; pointer-events: none;';

  frameTypes = framePaths(s).map((p) =>
    vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      after: {
        contentIconPath: toUri(p),
        width: `${s.size}px`,
        height: `${s.size}px`,
        margin: '0 0 0 2em',
        textDecoration: css
      }
    })
  );
}

function clearAll() {
  vscode.window.visibleTextEditors.forEach((editor) =>
    frameTypes.forEach((t) => editor.setDecorations(t, []))
  );
}

function paintFrame() {
  if (!activeEditor || !activeRange) return;
  frameTypes.forEach((t, i) =>
    activeEditor.setDecorations(t, i === frameIndex % frameTypes.length ? [activeRange] : [])
  );
}

/** Prefer a short visible line, so the sprite is not parked off to the right. */
function pickAnchor(editor) {
  const doc = editor.document;
  const candidates = [];
  for (const visible of editor.visibleRanges) {
    for (let line = visible.start.line; line <= visible.end.line; line++) {
      if (line >= doc.lineCount) break;
      candidates.push({ line, len: doc.lineAt(line).text.length });
    }
  }
  if (candidates.length === 0) return null;

  const short = candidates.filter((c) => c.len <= 40);
  const pool = short.length > 0 ? short : candidates;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  const end = doc.lineAt(choice.line).text.length;
  return new vscode.Range(choice.line, end, choice.line, end);
}

function adviceFor(context) {
  if (context) {
    const match = ADVICE.find((a) => a.re.test(context));
    if (match) return match.text;
  }
  return GENERIC_ADVICE[Math.floor(Math.random() * GENERIC_ADVICE.length)];
}

function banish() {
  if (hideTimer) clearTimeout(hideTimer);
  if (reanchorTimer) clearTimeout(reanchorTimer);
  hideTimer = null;
  reanchorTimer = null;
  clearAll();
  activeEditor = null;
  activeRange = null;
}

function clearIn(editor) {
  if (!editor) return;
  frameTypes.forEach((t) => editor.setDecorations(t, []));
}

/** Is the line the buddy is standing on still on screen? */
function anchorStillVisible(editor) {
  if (!activeRange) return false;
  const line = activeRange.start.line;
  return editor.visibleRanges.some((r) => line >= r.start.line && line <= r.end.line);
}

/**
 * Hop to a new spot instead of vanishing. The buddy is anchored to a line, so
 * scrolling used to banish it outright, which meant it was almost never on
 * screen for its full duration. Now it follows you, and the hide timer is
 * deliberately left running so it still leaves on schedule.
 */
function reanchor(editor) {
  const target = editor || activeEditor;
  if (!target || !activeRange) return;

  const next = pickAnchor(target);
  if (!next) {
    banish();
    return;
  }
  if (target !== activeEditor) {
    clearIn(activeEditor);
    activeEditor = target;
  }
  activeRange = next;
  paintFrame();
}

function scheduleReanchor(editor) {
  if (reanchorTimer) clearTimeout(reanchorTimer);
  reanchorTimer = setTimeout(() => {
    reanchorTimer = null;
    reanchor(editor);
  }, 90);
}

function summon(context) {
  const s = state();
  const editor = vscode.window.activeTextEditor;
  if (!editor) return false;

  if (frameTypes.length === 0) buildFrames();
  if (frameTypes.length === 0) return false;

  const anchor = pickAnchor(editor);
  if (!anchor) return false;

  banish();
  activeEditor = editor;
  activeRange = anchor;
  // GIFs animate themselves, so pick one and leave it alone.
  frameIndex = Math.floor(Math.random() * frameTypes.length);
  paintFrame();

  hideTimer = setTimeout(banish, s.duration);

  if (s.popups) {
    vscode.window.showInformationMessage(adviceFor(context), ...BUTTONS).then((choice) => {
      if (choice === 'Go away') {
        banish();
        cfg().update('buddy.mode', 'off', vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Fine. CURSED: Summon The Buddy brings me back.');
      }
    });
  }
  return true;
}

function scheduleNext() {
  if (scheduleTimer) clearTimeout(scheduleTimer);
  scheduleTimer = null;

  const s = state();
  if (!s.enabled) return;

  // Jitter so it never feels like a metronome.
  const delay = s.interval * (0.6 + Math.random() * 0.8);
  scheduleTimer = setTimeout(() => {
    if (state().enabled) summon(null);
    scheduleNext();
  }, delay);
}

function onType(event) {
  const s = state();
  if (!s.enabled || !Array.isArray(s.triggers) || s.triggers.length === 0) return;
  if (event.contentChanges.length !== 1) return;

  const change = event.contentChanges[0];
  if (!/^[\s(){}[\];:,.]$/.test(change.text)) return;

  const doc = event.document;
  const at = change.range.start;
  let range = doc.getWordRangeAtPosition(at, /[A-Za-z_][A-Za-z0-9_]*/);
  if (!range && at.character > 0) {
    range = doc.getWordRangeAtPosition(at.translate(0, -1), /[A-Za-z_][A-Za-z0-9_]*/);
  }
  if (!range) return;

  const word = doc.getText(range).toLowerCase();
  if (!s.triggers.some((t) => String(t).toLowerCase() === word)) return;
  if (activeEditor) return; // already on screen, do not stack

  summon(word);
}

/**
 * Point the buddy at your own GIFs. Nothing is downloaded or bundled: these
 * are files already on your disk, referenced by path.
 */
async function pickBuddyImages() {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: true,
    canSelectFiles: true,
    canSelectFolders: false,
    openLabel: 'Use as buddy',
    title: 'Pick your buddy',
    filters: { Images: ['gif', 'png', 'webp', 'jpg', 'jpeg', 'svg'] }
  });
  if (!picked || picked.length === 0) return;

  const paths = picked.map((u) => u.fsPath);
  await cfg().update('buddy.images', paths, vscode.ConfigurationTarget.Global);
  banish();
  buildFrames();

  const choice = await vscode.window.showInformationMessage(
    `CURSED: ${paths.length} buddy image${paths.length === 1 ? '' : 's'} loaded.`,
    'Summon now'
  );
  if (choice === 'Summon now') summon(null);
}

function activate(context) {
  mediaRoot = path.join(context.extensionPath, 'media');
  buildFrames();
  scheduleNext();

  context.subscriptions.push(
    { dispose: banish },
    { dispose: disposeFrames },
    { dispose: () => scheduleTimer && clearTimeout(scheduleTimer) },
    vscode.commands.registerCommand('cursed.summon', () => {
      if (!summon(null)) vscode.window.showInformationMessage('Nowhere to stand. Open a file first.');
    }),
    vscode.commands.registerCommand('cursed.banish', banish),
    vscode.commands.registerCommand('cursed.pickBuddy', pickBuddyImages),
    vscode.workspace.onDidChangeTextDocument(onType),
    // Follow the user rather than disappearing. Switch files and it comes
    // with you; scroll its line off screen and it hops somewhere visible.
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!activeEditor) return;
      if (!editor) {
        banish();
        return;
      }
      scheduleReanchor(editor);
    }),
    vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
      if (!activeEditor || e.textEditor !== activeEditor) return;
      // Stay put while its line is still in view, so small scrolls do not
      // make it twitch around the screen.
      if (anchorStillVisible(activeEditor)) return;
      scheduleReanchor(activeEditor);
    }),
    // If the editor it was standing in gets closed, there is nowhere to be.
    vscode.window.onDidChangeVisibleTextEditors((editors) => {
      if (activeEditor && !editors.includes(activeEditor)) {
        const fallback = vscode.window.activeTextEditor;
        if (fallback) scheduleReanchor(fallback);
        else banish();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('cursed')) return;
      banish();
      buildFrames();
      scheduleNext();
    })
  );
}

module.exports = { activate, summon, banish };
