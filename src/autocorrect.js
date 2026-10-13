const vscode = require('vscode');

/**
 * A dictionary of machine translations that are all technically correct and
 * all completely wrong. The joke is the sense, not the characters: "string"
 * becomes rope, "server" becomes a waiter, "port" becomes a harbor.
 */
const DICTIONARY = {
  string: ['繩子', 'a piece of rope'],
  class: ['班級', 'a classroom of children'],
  import: ['進口', 'to import goods through customs'],
  export: ['出口', 'the exit, or a trade surplus'],
  for: ['為了', 'in order to; for the sake of'],
  let: ['讓', 'to permit someone to do a thing'],
  break: ['打破', 'to physically shatter'],
  catch: ['抓住', 'to grab with your hands'],
  throw: ['扔', 'to hurl an object across a room'],
  key: ['鑰匙', 'a metal key for a door'],
  value: ['價值', 'monetary worth'],
  map: ['地圖', 'a map of a country'],
  table: ['桌子', 'furniture you eat at'],
  commit: ['承諾', 'a solemn promise'],
  branch: ['樹枝', 'a branch of a tree'],
  root: ['樹根', 'the root of a plant'],
  bug: ['蟲子', 'an actual insect'],
  patch: ['補丁', 'a patch sewn onto trousers'],
  thread: ['線', 'sewing thread'],
  cache: ['藏匿處', 'a hiding place for contraband'],
  server: ['服務員', 'a waiter in a restaurant'],
  host: ['主人', 'the master of a household'],
  port: ['港口', 'a harbor for ships'],
  shell: ['貝殼', 'a seashell'],
  kernel: ['核仁', 'the edible kernel of a nut'],
  daemon: ['惡魔', 'a literal demon'],
  field: ['田地', 'a field of crops'],
  token: ['代幣', 'an arcade token'],
  model: ['模特兒', 'a fashion model'],
  train: ['火車', 'a steam locomotive'],
  bias: ['偏見', 'personal prejudice'],
  char: ['燒焦', 'burnt to a crisp'],
  fork: ['叉子', 'cutlery'],
  log: ['原木', 'a felled tree trunk'],
  crash: ['撞車', 'a car accident'],
  boot: ['靴子', 'footwear'],
  salt: ['鹽', 'table salt'],
  sprint: ['衝刺', 'running very fast'],
  test: ['考試', 'a school examination'],
  mock: ['嘲笑', 'to openly ridicule'],
  spy: ['間諜', 'an international agent'],
  lint: ['棉絮', 'fluff from a dryer'],
  stack: ['堆', 'a pile of stuff'],
  heap: ['堆', 'the exact same pile of stuff'],
  queue: ['排隊', 'standing in line politely'],
  mouse: ['老鼠', 'a rodent'],
  window: ['窗戶', 'a hole in a wall'],
  mount: ['騎上', 'to climb onto a horse'],
  sleep: ['睡覺', 'to go to bed'],
  kill: ['殺死', 'to murder'],
  return: ['回去吧', 'you should probably go home'],
  function: ['功能', 'a feature of an appliance'],
  async: ['異步', 'out of step'],
  await: ['等待', 'to wait, perhaps forever'],
  void: ['虛空', 'the howling emptiness'],
  null: ['空', 'nothing at all'],
  object: ['物件', 'a physical item'],
  array: ['陣列', 'a military formation'],
  type: ['打字', 'to type on a keyboard'],
  build: ['建造', 'to construct a building'],
  deploy: ['部署', 'to position troops'],
  cookie: ['餅乾', 'a biscuit'],
  tree: ['樹', 'a tree. this one is correct.'],
  commitment: ['承諾', 'see: commit'],
  prompt: ['提示', 'a gentle nudge'],
  weight: ['砝碼', 'a counterweight for a scale'],
  loss: ['損失', 'bereavement']
};

const FULLWIDTH_SPACE = '　';

const SMALLCAPS = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ',
  g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ',
  m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'Q', r: 'ʀ',
  s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
  y: 'ʏ', z: 'ᴢ'
};

const UPSIDE_DOWN = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ',
  h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u',
  o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ',
  w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', _: '‾'
};

// Cyrillic and Greek lookalikes. Visually identical, lexically a war crime.
const HOMOGLYPHS = {
  a: 'а', c: 'с', e: 'е', i: 'і', j: 'ј', o: 'о',
  p: 'р', s: 'ѕ', x: 'х', y: 'у', d: 'ԁ', h: 'һ',
  n: 'η', v: 'ν', T: 'Т', A: 'А', B: 'В', E: 'Е'
};

const ZALGO = ['́', '̀', '̄', '̐', '͒', '͗', '̧', '̖', '̩', '͈'];

const EMOJI = ['\u{1F480}', '✨', '\u{1F440}', '\u{1F9CC}', '\u{1F9A6}', '\u{1F62D}', '\u{1F525}', '\u{1FAE0}'];

function toFullwidth(word) {
  return [...word]
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code === 32) return FULLWIDTH_SPACE;
      if (code > 32 && code < 127) return String.fromCodePoint(code + 0xFEE0);
      return ch;
    })
    .join('');
}

function toSmallCaps(word) {
  return [...word.toLowerCase()].map((ch) => SMALLCAPS[ch] || ch).join('');
}

function toUpsideDown(word) {
  return [...word.toLowerCase()].map((ch) => UPSIDE_DOWN[ch] || ch).reverse().join('');
}

function toHomoglyph(word) {
  return [...word].map((ch) => HOMOGLYPHS[ch] || ch).join('');
}

function toZalgo(word) {
  return [...word]
    .map((ch, i) => {
      let out = ch;
      const marks = 1 + ((i * 7) % 3);
      for (let k = 0; k < marks; k++) out += ZALGO[(i * 3 + k) % ZALGO.length];
      return out;
    })
    .join('');
}

function toSponge(word) {
  return [...word].map((ch, i) => (i % 2 ? ch.toUpperCase() : ch.toLowerCase())).join('');
}

function toLeet(word) {
  const m = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', l: '1', g: '9' };
  return [...word].map((ch) => m[ch.toLowerCase()] || ch).join('');
}

function toTypo(word) {
  if (word.length < 3) return word + word[word.length - 1];
  const i = Math.floor(word.length / 2);
  return word.slice(0, i - 1) + word[i] + word[i - 1] + word.slice(i + 1);
}

function withEmoji(word, seed) {
  return word + EMOJI[Math.abs(seed) % EMOJI.length];
}

const TRANSFORMS = [
  { label: 'fullwidth', detail: 'but roomier', fn: toFullwidth },
  { label: 'small caps', detail: 'quietly', fn: toSmallCaps },
  { label: 'upside down', detail: 'australian mode', fn: toUpsideDown },
  { label: 'homoglyph', detail: 'looks identical, compiles never', fn: toHomoglyph },
  { label: 'zalgo', detail: 'he comes', fn: toZalgo },
  { label: 'sponge', detail: 'mOcKiNg', fn: toSponge },
  { label: 'leet', detail: 'h4ck3rm4n', fn: toLeet },
  { label: 'typo', detail: 'did you mean', fn: toTypo },
  { label: 'emoji', detail: 'for clarity', fn: (w) => withEmoji(w, w.length * 31) }
];

const CONFIDENCE = [
  '97% confident',
  '99.4% confident',
  'certain',
  'pretty sure',
  'trust me',
  'this is standard',
  'everyone writes it this way',
  'the compiler prefers this'
];

const JUNK = [
  { label: 'TODO_fix_before_demo', doc: 'you will not fix this before the demo.' },
  { label: 'temp_final_v2_FINAL', doc: 'the naming scheme of a professional.' },
  { label: 'it_works_dont_touch', doc: 'load bearing. do not investigate.' },
  { label: '\u{1F480}', doc: 'a valid identifier in exactly zero languages.' },
  { label: 'asdfasdf', doc: 'placeholder. ships to production friday.' },
  { label: 'undefined', doc: 'not the keyword. a variable literally named this.' }
];

function wordAt(document, position) {
  const range = document.getWordRangeAtPosition(position, /[A-Za-z_][A-Za-z0-9_]*/);
  if (!range) return null;
  return { word: document.getText(range), range };
}

function suggestionsFor(word) {
  const out = [];
  const lower = word.toLowerCase();

  // Own-property check only. A bare lookup lets words like "constructor" and
  // "valueOf" reach Object.prototype and return a function, which produced a
  // completion item with an undefined label and poisoned the whole batch.
  const entry = Object.prototype.hasOwnProperty.call(DICTIONARY, lower)
    ? DICTIONARY[lower]
    : null;
  if (entry) {
    out.push({
      text: entry[0],
      label: entry[0],
      detail: `autocorrect: "${word}"`,
      doc: `Literally: ${entry[1]}.\n\nThis is what you meant.`
    });
  }

  TRANSFORMS.forEach((t, i) => {
    const text = t.fn(word);
    if (!text || text === word) return;
    out.push({
      text,
      label: text,
      detail: `autocorrect: ${t.detail}`,
      doc: `${CONFIDENCE[(word.length + i) % CONFIDENCE.length]}.`
    });
  });

  return out;
}

function makeProvider() {
  return {
    provideCompletionItems(document, position) {
      const cfg = vscode.workspace.getConfiguration('cursed');
      if (!cfg.get('autocorrect.enabled', true)) return undefined;

      // Sorting these below real IntelliSense buried them at the bottom of a
      // hundred-item list, where nobody ever saw them. The point of the
      // extension is to be in your way, so they now sort first by default.
      const aggressive =
        cfg.get('autocorrect.aggressive', true) || cfg.get('chaos.level', 0) >= 2;
      const prefix = aggressive ? '!!!' : 'zzzz';
      const hit = wordAt(document, position);
      const items = [];

      if (hit && hit.word.length >= 2) {
        suggestionsFor(hit.word).forEach((s, i) => {
          if (!s.text || !s.label) return;
          const item = new vscode.CompletionItem(s.label, vscode.CompletionItemKind.Text);
          item.insertText = s.text;
          item.filterText = hit.word;
          item.range = hit.range;
          item.detail = s.detail;
          item.documentation = new vscode.MarkdownString(s.doc);
          item.sortText = `${prefix}${String(i).padStart(3, '0')}`;
          items.push(item);
        });
      }

      JUNK.forEach((j, i) => {
        const item = new vscode.CompletionItem(j.label, vscode.CompletionItemKind.Variable);
        item.detail = 'autocorrect: unrelated';
        item.documentation = new vscode.MarkdownString(j.doc);
        item.sortText = `${prefix}9${String(i).padStart(3, '0')}`;
        items.push(item);
      });

      return items;
    }
  };
}

// Mutate mode. Rewrites a word the moment you finish typing it, the way a
// phone does.
//
//   off        never
//   scratch    unsaved buffers only. The default: a file on disk cannot be
//              mangled behind your back.
//   everywhere any file. Undoable with one Cmd+Z, but it does edit real code.
let applyingOurOwnEdit = false;

function mutationScope() {
  const scope = vscode.workspace.getConfiguration('cursed').get('autocorrect.mutateScope', 'scratch');
  return ['off', 'scratch', 'everywhere'].includes(scope) ? scope : 'scratch';
}

function eligibleForMutation(document) {
  const scope = mutationScope();
  if (scope === 'off') return false;
  if (scope === 'everywhere') return true;
  return document.isUntitled;
}

function handleTyping(event) {
  if (applyingOurOwnEdit) return;
  if (!eligibleForMutation(event.document)) return;
  if (event.contentChanges.length !== 1) return;

  const change = event.contentChanges[0];
  if (change.text !== ' ' && change.text !== '\n') return;

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== event.document) return;

  const doc = event.document;
  // change.range.start sits just past the last letter typed, which
  // getWordRangeAtPosition still counts as inside the word.
  const hit = wordAt(doc, change.range.start);
  if (!hit || hit.word.length < 3) return;

  const cfg = vscode.workspace.getConfiguration('cursed');
  if (Math.random() >= cfg.get('autocorrect.mutateChance', 0.25)) return;

  const options = suggestionsFor(hit.word).filter((s) => s.text);
  if (options.length === 0) return;
  const chosen = options[Math.floor(Math.random() * options.length)];

  applyingOurOwnEdit = true;
  editor
    .edit((b) => b.replace(hit.range, chosen.text), {
      undoStopBefore: true,
      undoStopAfter: true
    })
    .then(
      () => {
        applyingOurOwnEdit = false;
      },
      () => {
        applyingOurOwnEdit = false;
      }
    );
}

function activate(context) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('*', makeProvider()),
    vscode.workspace.onDidChangeTextDocument(handleTyping)
  );
}

module.exports = { activate, suggestionsFor, mutationScope, DICTIONARY };
