# Changelog

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
