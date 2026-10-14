const vscode = require('vscode');
const { config, level, enabled } = require('./util');

const PRIZES = [
  {
    text: 'CONGRATULATIONS! You are the 1,000,000th line of code!',
    buttons: ['Claim prize', 'Claim prize']
  },
  {
    text: 'You have been selected for a FREE semicolon. No purchase necessary.',
    buttons: ['Accept', 'Decline (accepts)']
  },
  {
    text: 'Single developers in your area want to review your pull request.',
    buttons: ['See who', 'Not now']
  },
  {
    text: 'Your code has been running SLOW. One weird trick fixes it.',
    buttons: ['Show me the trick', 'Keep being slow']
  },
  {
    text: 'A wizard has appeared. He has no information for you.',
    buttons: ['Acknowledge the wizard']
  },
  {
    text: 'Download MORE RAM? (Recommended)',
    buttons: ['Download', 'Download later']
  },
  {
    text: 'This editor has been claimed in the name of Spain.',
    buttons: ['Understood']
  },
  {
    text: 'Your free trial of indentation expires in 3 days.',
    buttons: ['Upgrade to Indent Pro', 'Use tabs instead']
  }
];

const SCARE = [
  'WARNING: 4 viruses detected in your variable names.',
  'SECURITY ALERT: Someone in another timezone has read your code.',
  'CRITICAL: Your semicolons are not covered under warranty.',
  'Your PC may be at risk. Your Mac is fine. Your PC specifically.'
];

const NAGS = [
  { text: 'A reload is required to apply changes.', buttons: ['Reload', 'Later'] },
  { text: 'An update is available for an extension you do not have.', buttons: ['Update', 'Remind me'] },
  { text: 'Settings sync is out of sync with itself.', buttons: ['Resolve', 'Ignore'] },
  { text: 'Workspace trust: do you trust the authors of this file? You wrote it.', buttons: ['Yes', 'No'] }
];

const FOLLOWUPS = [
  'Thank you. Nothing has happened.',
  'Your selection has been recorded and discarded.',
  'Processing... done. No changes were made.',
  'Excellent choice. It made no difference.',
  'Confirmed. This dialog will return.'
];

let timer = null;

function settings() {
  const c = config();
  const lvl = level();
  const base = Math.max(10000, c.get('ads.intervalMs', 150000));
  return {
    on: enabled('ads.mode'),
    // MAXIMUM is four times as insistent and unlocks the blocking dialogs.
    interval: lvl >= 2 ? base / 4 : base,
    modal: lvl >= 2 && c.get('ads.modal', true),
    scare: c.get('ads.scare', true)
  };
}

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function showAd(force) {
  const s = settings();
  if (!s.on && !force) return;

  const roll = Math.random();
  let picked;
  let show;

  if (s.scare && roll < 0.2) {
    picked = { text: choose(SCARE), buttons: ['Scan now', 'Ignore'] };
    show = vscode.window.showErrorMessage;
  } else if (roll < 0.5) {
    picked = choose(NAGS);
    show = vscode.window.showWarningMessage;
  } else {
    picked = choose(PRIZES);
    show = vscode.window.showInformationMessage;
  }

  // A modal genuinely blocks the window, so it stays rare and MAXIMUM only.
  const modal = s.modal && Math.random() < 0.25;
  const options = modal ? { modal: true, detail: 'This dialog cannot help you.' } : {};

  const answer = await show.call(vscode.window, picked.text, options, ...picked.buttons);
  if (answer) vscode.window.setStatusBarMessage(choose(FOLLOWUPS), 4000);
}

/** A progress bar that goes backwards and never arrives. */
async function fakeProgress() {
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Optimizing', cancellable: true },
    async (progress, token) => {
      const steps = [
        'Reticulating splines',
        'Counting semicolons',
        'Consulting the wizard',
        'Reversing progress',
        'Almost there',
        'Less there than before',
        'Starting over'
      ];
      for (let i = 0; i < steps.length; i++) {
        if (token.isCancellationRequested) return;
        progress.report({ message: steps[i], increment: i === 3 ? -40 : 12 });
        await new Promise((r) => setTimeout(r, 900));
      }
      progress.report({ message: 'Giving up', increment: -100 });
      await new Promise((r) => setTimeout(r, 1200));
    }
  );
}

function scheduleNext() {
  if (timer) clearTimeout(timer);
  timer = null;

  const s = settings();
  if (!s.on) return;

  const delay = s.interval * (0.6 + Math.random() * 0.8);
  timer = setTimeout(async () => {
    if (settings().on) {
      if (Math.random() < 0.2) await fakeProgress();
      else await showAd(false);
    }
    scheduleNext();
  }, delay);
}

function activate(context) {
  scheduleNext();

  context.subscriptions.push(
    { dispose: () => timer && clearTimeout(timer) },
    vscode.commands.registerCommand('cursed.ad', () => showAd(true)),
    vscode.commands.registerCommand('cursed.progress', fakeProgress),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('cursed')) scheduleNext();
    })
  );
}

module.exports = { activate };
