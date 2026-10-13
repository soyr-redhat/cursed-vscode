# CURSED: Deluxe Ransom Note Edition

A VS Code theme and extension built to be as hostile to human vision as the
platform permits. Neon-on-neon color crimes, random characters rendered in
Zapfino at 230% size, dingbat substitutions, and an autocorrect that is
extremely confident and has never successfully written code.

Everything is reversible and everything has an off switch.

## The three levels

There is a pill in the bottom-right of the status bar. Clicking it cycles:

| Clicks | Level | What happens |
|---|---|---|
| 0 | `cursed` (off) | A normal editor, like a coward. |
| 1 | **CURSED** | ~7% of visible characters get a tier-1 crime: Zapfino, Apple Chancery, Papyrus, Comic Sans, Luminari, red/cyan 3D anaglyph, 9px-spaced small caps, or a dashed-yellow WANTED box. Still arguably legible. |
| 2 | **MAXIMUM CURSED** | ~50% of characters, in runs of up to four at a time, so whole chunks of words go cursive together. Unlocks every tier-2 style: 210% Impact with a cyan outline, Zapf Dingbats (your letter becomes an unrelated symbol), 45% subscript, rotated 17°, rotated 180°, gaussian blur, 18% opacity ghost text, and three that staple 💀 / ✨ / 👀 onto your identifiers. It strobes every two seconds. The cursed autocorrect is force-promoted above your real IntelliSense. |

Click a third time and it all stops.

## What it actually does

**1. The color theme.** Magenta editor background, lime foreground, cyan
sidebar, yellow activity bar, red status bar, and a terminal whose ANSI palette
has been thoroughly shuffled so red text is green. Every token type gets a
clashing color plus some combination of bold, italic, underline, and
strikethrough. Constants are struck through for no reason.

The theme is independent of the chaos level. Turning the chaos off does not
revert your colors, and vice versa.

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

## Settings

| Setting | Default | Notes |
|---|---|---|
| `cursed.chaos.level` | `1` | `0` off, `1` mild, `2` MAXIMUM. |
| `cursed.chaos.mildIntensity` | `0.07` | Fraction of characters cursed at level 1. |
| `cursed.chaos.maxIntensity` | `0.5` | Fraction at level 2. `1.0` is a war crime. |
| `cursed.chaos.maxDecorations` | `400` | Per-render cap. Level 2 triples it. |
| `cursed.chaos.strobe` | `true` | Reshuffle on a timer at MAXIMUM. |
| `cursed.chaos.strobeMs` | `2000` | Below 1000 induces nausea. |
| `cursed.autocorrect.enabled` | `true` | Cursed completions. |
| `cursed.autocorrect.aggressive` | `false` | Sort cursed suggestions above real ones. Forced on at MAXIMUM. |
| `cursed.autocorrect.mutate` | `false` | Actually rewrite words as you type. See below. |
| `cursed.autocorrect.mutateChance` | `0.25` | Odds a finished word gets mangled. |

## On mutate mode

`cursed.autocorrect.mutate` rewrites a word the instant you finish typing it,
phone-autocorrect style. It is off by default and it is **hard-gated to unsaved
scratch buffers** (`document.isUntitled`). A file on disk can never be mangled
behind your back, no matter what you set. To demo it: `Cmd+N`, turn the setting
on, and type a paragraph about servers and strings.

## Install

Clone it, then symlink it into your extensions directory. The folder name
**must** follow `publisher.name-version` or VS Code will not see it:

```sh
git clone https://github.com/soyr-redhat/cursed-vscode.git
ln -s "$PWD/cursed-vscode" ~/.vscode/extensions/sbowerma.cursed-0.1.0
```

Then reload the window (`Cmd+Shift+P`, "Developer: Reload Window"). Pick the
theme from `Cmd+K Cmd+T`, or just run `CURSED: Embrace The Chaos`.

To build a shareable `.vsix`:

```sh
npx --yes @vscode/vsce package
```

## Known and intentional problems

Oversized glyphs break VS Code's monospace cursor math, so clicking lands
slightly off from where you aimed, and the drift gets much worse at MAXIMUM.
This is not a bug that can be fixed; it is a consequence of making letters
different sizes in a grid-based editor. It is also extremely funny for about
twenty minutes, which is why the off switch is a single click on the status
bar instead of buried in the command palette.

## License

MIT. You were warned.
