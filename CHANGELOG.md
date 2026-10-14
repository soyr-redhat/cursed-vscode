# Changelog

## 0.12.0

Slimming pass. No behaviour changes beyond the removals.

- Drop the Marketplace publishing scaffolding: `scripts/publish-check.js`,
  the `check` and `publish` npm scripts, `galleryBanner`, and the whole
  publishing section of the README. It is installed from source, and the
  README now says so plainly.
- Drop the generated fallback buddy sprite: `scripts/make-buddy.js`,
  `scripts/png.js`, and `media/buddy-0..3.png`. It existed as a stand-in
  before real GIFs shipped and has been unreachable since 0.8.0, because 39
  GIFs are bundled.
- That removes the flipbook branch from `buddy.js` too: no frame timer, no
  animated flag, no per-frame repaint. Real GIFs animate themselves.
- Collapse the three install options in the README down to the two that
  differ in a way that matters.

README is 263 lines, down from 463. Four scripts remain: `icon`, `buddies`,
`package`, `reinstall`.

## 0.11.0

- Change the publisher from `sbowerma` to `soyr-redhat`, matching the GitHub
  account that owns the repo.

  This changes the extension id from `sbowerma.cursed` to
  `soyr-redhat.cursed`, which VS Code treats as an entirely different
  extension. If you installed an earlier version, uninstall the old id first
  or you will have both running at once, with two buddies, two ad timers,
  and two sets of fake diagnostics:

  ```sh
  code --uninstall-extension sbowerma.cursed
  ```

  Nothing was published under the old id, so nothing is orphaned on the
  Marketplace.

## 0.10.0

Three new ways to be in your way, all tied to the cursed level.

- **Fake diagnostics.** Fabricated errors and warnings, squiggled in the
  editor and listed in the Problems panel with a source of `cursed` and
  invented error codes. "Variable named too confidently." "Unreachable code.
  It is reachable, I just do not like it." Some are keyed to what you
  actually named things, so `utils` gets told it will contain 4,000 lines by
  March. Seeded on the line's text, so a complaint sticks to a word instead
  of flickering on every keystroke.
- **Lying inlay hints.** The small grey inline annotations that normally
  show a real inferred type. These show `Maybe<Regret>`,
  `string | undefined | whatever`, and `float64 | vibes`, in the same
  typeface as the truth. `editor.inlayHints.enabled` is now managed by the
  level, since the hints do not render without it.
- **Pop-up ads.** Prize notifications, fake antivirus warnings, nags about
  nothing, and a progress bar that goes backwards and never finishes. At
  MAXIMUM a quarter of them are genuine blocking modal dialogs. Buttons do
  nothing, and say so.
- Add `scripts/../src/util.js` for the shared level gating and seeded
  randomness the new modules needed.
- Backfill the settings snapshot when a new version starts managing a
  setting the old snapshot never recorded, so restoring cannot clear a value
  you chose yourself.

## 0.9.0

- The buddy follows you instead of disappearing. Scrolling its line off
  screen used to banish it outright, which meant it was rarely visible for
  its full seven seconds. It now hops to another visible line, and switching
  files brings it along. It holds still while its own line is in view, so
  small scrolls do not make it twitch, and the departure timer keeps running
  so it still leaves on schedule.
- Handle the editor it was standing in being closed.
- Add `npm run check`, a preflight for publishing: manifest fields, the
  five-keyword cap, icon dimensions read from the PNG header, required
  files, relative image links in the README, a clean package under the
  50 MB limit, whether the publisher is registered, and whether a valid PAT
  is stored. Prints the remaining browser steps when something is missing.

## 0.8.1

- Add `scripts/install-local.sh` (`npm run reinstall`): packages the vsix,
  installs it, and verifies VS Code reports the new version.
- It also repairs the failure mode that symlink-based installs cause. VS Code
  caches its extension list in `extensions.json` with absolute paths, so a
  hand-made `publisher.name-VERSION` symlink goes stale on every version bump
  and the next launch fails with "Unable to read file .../package.json". The
  script prunes cache entries for this extension whose folder is gone and
  deletes dangling symlinks, touching only this extension's own id and only
  dead paths.
- Document why not to symlink the repo into `~/.vscode/extensions`.
- Add `npm run sprite` and `npm run buddies`.

## 0.8.0

- Bundle 39 vintage GeoCities GIFs in `media/buddies/`, so the buddy is a
  dancing baby or a spinning skull out of the box instead of a generated
  sprite. No configuration needed.
- Buddy source precedence is now: `buddy.images`, then `buddy.imageDir`,
  then the bundled GIFs, then the generated sprite as a fallback.
- Add `media/buddies/ATTRIBUTION.md`. The GIFs are unknown-author 1990s
  clipart recovered via GifCities and are not covered by the repo's MIT
  license, which applies to the code.

## 0.7.1

- Add `scripts/fetch-buddies.sh`, which pulls vintage GeoCities GIFs from the
  Internet Archive's GifCities across sixteen search terms and prunes them
  with `scripts/filter-buddies.js` down to animated images between 60 and 400
  pixels. GeoCities is overwhelmingly tiny bullet points and divider bars, so
  roughly half of what comes down gets rejected.
- No art is committed. The GIFs are archived web content of unclear
  provenance, so the repo ships the script, not the results.

## 0.7.0

- Add the buddy: a small purple ape that periodically appears over your code,
  blinks, and offers advice it is not qualified to give. Implemented as a
  text decoration with `contentIconPath`, so it draws in the editor itself
  rather than in a panel or a tab.
- The sprite is a four-frame flipbook generated by `scripts/make-buddy.js`,
  drawn from scratch with no image dependencies. No third-party art is
  bundled.
- Point it at your own GIFs with `CURSED: Pick Buddy Images...`, or scan a
  whole folder with `cursed.buddy.imageDir`. Animated GIFs animate on their
  own, so the flipbook is skipped for custom images.
- Clippy-style notifications, matched to context where possible.
- Typing a trigger word summons it instantly. Configurable, default list
  covers the usual cries for help.
- Appearances follow the cursed level by default: never at 0, occasional at
  1, three times as often at MAXIMUM.
- Factor the PNG encoder into `scripts/png.js`, now with alpha and 3x
  supersampling.

## 0.6.0

- The status bar control is now icon only: `circle-slash` at off, `check` at
  mild, `flame` at MAXIMUM. The text labels were taking up a lot of room for
  a joke extension you leave installed.
- Only MAXIMUM keeps a colored background. Off and mild are now visually
  quiet.
- Drop the icon that cycled every two seconds at MAXIMUM. With the label
  gone the icon is the only state indicator, so it needs to hold still. The
  tooltip describes the current level instead.

## 0.5.0

- Rewriting now follows the cursed level by default. `mutateScope` gains an
  `auto` mode, which is the new default: off at level 0, unsaved buffers at
  level 1, and every file at MAXIMUM. Clicking the pill twice now makes your
  code rewrite itself, which is what MAXIMUM should have meant all along.
- Raise `mutateChance` from `0.25` to `0.6`. At one in four, most words
  passed through untouched and it read as broken rather than random.
- Fall back to the previous column when resolving the word at a boundary, so
  a rewrite is not skipped if the cursor position lands just past the word.

## 0.4.0

- Fix a bug where words that collide with `Object.prototype` keys
  (`constructor`, `toString`, `valueOf`) reached the prototype chain through
  a bare dictionary lookup and produced a completion item with an undefined
  label, which could make VS Code discard the entire batch of suggestions.
- `cursed.autocorrect.aggressive` now defaults to `true`. Sorting the cursed
  suggestions below real IntelliSense buried them at the bottom of a
  hundred-item list where nobody ever scrolled, so the joke never landed.
- Replace the `cursed.autocorrect.mutate` boolean with
  `cursed.autocorrect.mutateScope`: `off`, `scratch`, or `everywhere`. The
  default is now `scratch` rather than off, so rewriting works out of the box
  in an untitled buffer without putting real files at risk.
- Add `CURSED: Cycle Autocorrect Rewriting` to switch scopes from the palette.
- Document the difference between suggesting and rewriting, which was the
  actual source of confusion.

## 0.3.0

- Add a Marketplace icon, generated reproducibly by `scripts/make-icon.js`
  with no image dependencies.
- Add this changelog and a gallery banner, the remaining Marketplace
  prerequisites.
- Add `npm run package` and `npm run publish` scripts.

## 0.2.0

- The chaos level now drives the color theme and fonts, not just the text
  decorations. Switching the status bar pill off restores your original
  theme, font, cursor, and line height instead of stranding you in magenta.
- Level 1 applies the color theme only. Level 2 adds Zapfino as the editor
  font, a block-outline cursor, and Papyrus in the terminal.
- Each level change reconciles all 22 managed settings against a snapshot
  taken before the first change, so `2 -> 1` drops the fonts but keeps the
  colors.
- Default level is now `0`, so a fresh install does nothing until clicked.
- Add `cursed.restoreTheme` for the case where CURSED was already selected
  by hand when the snapshot was taken.
- Every decorative font chain now falls back through Windows equivalents
  before hitting a generic family, so the extension degrades gracefully off
  macOS.
- Add `.vscodeignore`.

## 0.1.0

- The status bar pill cycles three levels (off, mild, MAXIMUM) instead of
  toggling a boolean.
- MAXIMUM decorates runs of up to four consecutive characters rather than
  single letters, and force-promotes the cursed autocorrect above real
  IntelliSense.
- Styles are tiered: eight are available at mild, all eighteen at MAXIMUM.

## 0.0.1

- Initial release: the color theme, the decoration chaos layer, and the
  cursed autocorrect completion provider.
