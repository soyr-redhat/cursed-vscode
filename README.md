# CURSED: Deluxe Ransom Note Edition

A VS Code theme and extension built to be as hostile to human vision as the
platform permits. Neon-on-neon color crimes, random characters rendered in
Zapfino at 230% size, dingbat substitutions, and an autocorrect that is
extremely confident and has never successfully written code.

Everything is reversible and everything has an off switch.

## The three levels

There is a single icon in the bottom-right of the status bar. No label, just
the glyph. Clicking it cycles:

| Clicks | Icon | What happens |
|---|---|---|
| 0 | 🚫 `circle-slash` | A normal editor, like a coward. Your original theme, fonts, and cursor are put back exactly as they were. |
| 1 | ✅ `check` | Switches to the CURSED color theme. ~7% of visible characters get a tier-1 crime: Zapfino, Apple Chancery, Papyrus, Comic Sans, Luminari, red/cyan 3D anaglyph, 9px-spaced small caps, or a dashed-yellow WANTED box. Your editor font is left alone, so this is still arguably workable. |
| 2 | 🔥 `flame` (red background) | Everything above, plus **Zapfino as your actual editor font**, a 6px block-outline cursor, 46px line height, and Papyrus in the terminal. ~50% of characters get cursed, in runs of up to four at a time, so whole chunks of words go cursive together. Unlocks every tier-2 style: 210% Impact with a cyan outline, Zapf Dingbats (your letter becomes an unrelated symbol), 45% subscript, rotated 17°, rotated 180°, gaussian blur, 18% opacity ghost text, and three that staple 💀 / ✨ / 👀 onto your identifiers. It strobes every two seconds. The cursed autocorrect is force-promoted above your real IntelliSense. |

Click a third time and it all stops. The icon is the only state indicator,
so hover it for a tooltip describing what the current level is doing.

The level is the single source of truth. Before the first change, the extension
snapshots every setting it is about to touch, then reconciles on each level
change: whatever the new level wants gets set, and whatever it does not want
gets put back the way it was found. So `2 → 1` drops the Zapfino but keeps the
colors, and anything `→ 0` undoes the lot.

## What it actually does

**1. The color theme.** Magenta editor background, lime foreground, cyan
sidebar, yellow activity bar, red status bar, and a terminal whose ANSI palette
has been thoroughly shuffled so red text is green. Every token type gets a
clashing color plus some combination of bold, italic, underline, and
strikethrough. Constants are struck through for no reason.

The theme is applied and reverted by the chaos level, so the status bar pill
is the only control you need.

**2. The chaos layer.** A color theme cannot set a font family or a font size,
so this part is an extension. It smuggles CSS through a text decoration's
`textDecoration` field, which VS Code renders verbatim into a style rule.
Every font it references ships with stock macOS.

The seed is the line's own text, so a decorated letter stays decorated while
you scroll and only rerolls when you edit that line. There is a hard cap on
decorations per render so your laptop survives.

**3. Cursed autocorrect.** A completion provider that suggests, with total
confidence, the wrong thing. The dictionary is built on machine translations
that are technically correct and semantically unhinged:

| you typed | it suggests | which means |
|---|---|---|
| `string` | 繩子 | a piece of rope |
| `server` | 服務員 | a waiter in a restaurant |
| `port` | 港口 | a harbor for ships |
| `kernel` | 核仁 | the edible kernel of a nut |
| `class` | 班級 | a classroom of children |
| `bug` | 蟲子 | an actual insect |
| `commit` | 承諾 | a solemn promise |
| `model` | 模特兒 | a fashion model |
| `daemon` | 惡魔 | a literal demon |
| `mock` | 嘲笑 | to openly ridicule |

Plus transforms applied to any word: fullwidth (`ｈｅｌｌｏ`), small caps
(`ʜᴇʟʟᴏ`), upside down (`ollǝɥ`), Cyrillic homoglyphs (`һеllо`, visually
identical and lexically a war crime), zalgo, sPoNgE cAsE, leetspeak, and
plausible typos. It also always offers `TODO_fix_before_demo`,
`temp_final_v2_FINAL`, and `it_works_dont_touch`.

## Commands

| Command | What it does |
|---|---|
| `CURSED: Cycle The Chaos` | off → mild → MAXIMUM → off. Same as clicking the pill. |
| `CURSED: Make It Stop` | Panic button. Straight to level 0. |
| `CURSED: Mildly Cursed` / `CURSED: MAXIMUM CURSED` | Jump directly to a level. |
| `CURSED: Embrace The Chaos` | Switches to the theme, sets Zapfino as your editor font, block-outline cursor, 46px line height, Papyrus terminal, and goes straight to MAXIMUM. Saves your old settings first. |
| `CURSED: Undo My Mistakes` | Restores every setting `embrace` touched, exactly as it was. |
| `CURSED: Reroll The Dice` | Reshuffles which characters are cursed. |
| `CURSED: Cycle Autocorrect Rewriting` | off → scratch → everywhere → off. Controls whether autocorrect rewrites your text or only suggests. |
| `CURSED: Summon The Buddy` | Make the buddy appear right now. |
| `CURSED: Banish The Buddy` | Make it go away. |
| `CURSED: Pick Buddy Images...` | File picker for your own GIFs. |
| `CURSED: Show Me An Advertisement` | Pop an ad right now. |
| `CURSED: Optimize Something` | A progress bar that goes backwards. |

## Settings

| Setting | Default | Notes |
|---|---|---|
| `cursed.chaos.level` | `0` | `0` off, `1` mild, `2` MAXIMUM. Drives the theme and fonts too. |
| `cursed.restoreTheme` | `""` | Theme to return to on off, if CURSED was already active when the snapshot was taken. Empty means the VS Code default. |
| `cursed.chaos.mildIntensity` | `0.07` | Fraction of characters cursed at level 1. |
| `cursed.chaos.maxIntensity` | `0.5` | Fraction at level 2. `1.0` is a war crime. |
| `cursed.chaos.maxDecorations` | `400` | Per-render cap. Level 2 triples it. |
| `cursed.chaos.strobe` | `true` | Reshuffle on a timer at MAXIMUM. |
| `cursed.chaos.strobeMs` | `2000` | Below 1000 induces nausea. |
| `cursed.autocorrect.enabled` | `true` | Cursed completions. |
| `cursed.autocorrect.aggressive` | `true` | Sort cursed suggestions above real ones. Turn it off and they land at the bottom of a hundred-item list where you will never see them. |
| `cursed.autocorrect.mutateScope` | `"auto"` | `auto` (follows the level), `off`, `scratch`, or `everywhere`. See below. |
| `cursed.autocorrect.mutateChance` | `0.6` | Odds a finished word gets mangled. |

## Suggest versus rewrite

There are two separate things, and confusing them is easy:

**Suggesting** is always on. Type `class` and 班級 appears in the completion
list, sorted to the top. You still have to press Enter to accept it. If you
see nothing, the autocorrect items are being outranked: check that
`cursed.autocorrect.aggressive` is `true`.

**Rewriting** swaps the word out from under you the instant you finish typing
it, with no completion list involved. That is `cursed.autocorrect.mutateScope`:

| Scope | Behavior |
|---|---|
| `auto` | **Default.** Follows the cursed level: nothing at 0, unsaved buffers at 1, **every file at MAXIMUM**. Click the pill twice and your code starts rewriting itself. |
| `off` | Never rewrites. Suggestions only. |
| `scratch` | Rewrites in unsaved buffers only, so a file on disk cannot be mangled behind your back. |
| `everywhere` | Rewrites in every file regardless of level. |

Cycle through them with `CURSED: Cycle Autocorrect Rewriting` in the command
palette. Rewriting fires on word boundaries (space or newline) at the odds set
by `cursed.autocorrect.mutateChance`, default `0.6`, so roughly three words in
five get hit.

Every rewrite is its own undo stop, so `Cmd+Z` walks them back one at a time.
If you have autosave on and the level at MAXIMUM, the mangled text does reach
disk, which is worth knowing before you demo this on a repo you care about.

## Install

This is not on any marketplace, so you install it from source. Pick one.

### Build a .vsix (recommended)

Needs Node and npm. Nothing is installed globally; `npx` fetches the packager
on the fly.

```sh
git clone https://github.com/soyr-redhat/cursed-vscode.git
cd cursed-vscode
npx --yes @vscode/vsce package
code --install-extension cursed-0.11.0.vsix
```

Then reload the window (`Cmd+Shift+P` or `Ctrl+Shift+P`, "Developer: Reload
Window"). The `.vsix` is a single self-contained file, so you can hand it to
someone over Slack and they only need the last line.

If `code` is not on your PATH, open the Command Palette, run
"Shell Command: Install 'code' command in PATH", or install the `.vsix` from
the Extensions sidebar via the `...` menu, "Install from VSIX".

### Drop it in the extensions folder

No Node required. The folder name **must** follow `publisher.name-version`
exactly, or VS Code silently ignores it.

```sh
# macOS and Linux
git clone https://github.com/soyr-redhat/cursed-vscode.git \
  ~/.vscode/extensions/soyr-redhat.cursed-0.11.0
```

```powershell
# Windows
git clone https://github.com/soyr-redhat/cursed-vscode.git `
  "$env:USERPROFILE\.vscode\extensions\soyr-redhat.cursed-0.11.0"
```

Reload the window. To update later, `git pull` in that folder and reload.

### Working on it

```sh
git clone https://github.com/soyr-redhat/cursed-vscode.git
cd cursed-vscode
npm run reinstall
```

`npm run reinstall` packages the vsix and installs it, then verifies VS Code
actually sees the new version. Run it after every edit, then reload the
window.

**Do not symlink the repo into `~/.vscode/extensions` yourself.** It looks
like the convenient option and it quietly breaks. VS Code caches its
extension list in `extensions.json` using absolute paths, so a symlink named
`publisher.name-VERSION` goes stale the instant you bump the version in
`package.json`, and the next launch fails with:

```
Unable to read file '.../soyr-redhat.cursed-0.7.1/package.json'
(Error: Unable to resolve nonexistent file ...)
```

`npm run reinstall` cleans up after that if it has already happened to you:
it prunes cache entries for this extension whose folder no longer exists, and
deletes dangling symlinks left behind by the old approach. It only ever
touches entries matching this extension's own id, and only dead paths.

### Verify it took

```sh
code --list-extensions --show-versions | grep cursed
# soyr-redhat.cursed@0.10.0
```

A fresh install is deliberately inert. Nothing changes until you click the
`cursed` pill in the bottom-right of the status bar.

### Uninstall

```sh
code --uninstall-extension soyr-redhat.cursed
```

If you installed anything before 0.11.0, it was published under the old
`sbowerma.cursed` id. VS Code treats that as a separate extension, so remove
it too or you will have two of everything:

```sh
code --uninstall-extension sbowerma.cursed
```

Set the level back to 0 **before** uninstalling, so it gets the chance to put
your theme and fonts back. If you uninstall at level 1 or 2, the settings it
wrote stay in your `settings.json` and you will have to delete them by hand.

## Other platforms

Every decorative font is referenced through a fallback chain, so nothing
breaks, but the comedy is uneven:

- **macOS** is the target. Every font resolves: Zapfino, Apple Chancery,
  Papyrus, Luminari, Zapf Dingbats, Marker Felt, Party LET, the lot.
- **Windows** gets most of it. Comic Sans, Impact, Papyrus, Wingdings,
  Segoe Script, Ink Free and Lucida Handwriting all resolve. No Zapfino,
  which is a genuine loss.
- **Linux** depends entirely on what you have installed. With only the stock
  DejaVu set, the generic `cursive` and `fantasy` families fall back to
  something plain and the font crimes mostly collapse into color crimes.
  Installing `ttf-mscorefonts-installer` recovers Comic Sans and Impact.

## Known and intentional problems

Oversized glyphs break VS Code's monospace cursor math, so clicking lands
slightly off from where you aimed, and the drift gets much worse at MAXIMUM.
This is not a bug that can be fixed; it is a consequence of making letters
different sizes in a grid-based editor. It is also extremely funny for about
twenty minutes, which is why the off switch is a single click on the status
bar instead of buried in the command palette.

## License

MIT for the code in `src/`, `scripts/`, and `themes/`. You were warned.

The GIFs in `media/buddies/` are third-party clipart of unknown authorship
and are not covered by that license. See
[`media/buddies/ATTRIBUTION.md`](media/buddies/ATTRIBUTION.md).
