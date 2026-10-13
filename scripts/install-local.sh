#!/usr/bin/env bash
#
# Builds the vsix and installs it into VS Code.
#
#   ./scripts/install-local.sh        or  npm run reinstall
#
# Use this rather than symlinking the repo into ~/.vscode/extensions. VS Code
# caches its extension list in extensions.json with absolute paths, so a
# hand-made symlink named publisher.name-VERSION goes stale the moment you
# bump the version, and the next launch fails with:
#
#   Unable to read file '.../sbowerma.cursed-<old>/package.json'
#
# Installing the vsix lets VS Code own the folder and its own cache entry.
# The tradeoff is that the install is a copy, so rerun this after every edit.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ID="$(node -p "const p=require('./package.json'); p.publisher+'.'+p.name")"
VERSION="$(node -p "require('./package.json').version")"
VSIX="$ROOT/${ID#*.}-$VERSION.vsix"
EXT_DIR="${VSCODE_EXTENSIONS:-$HOME/.vscode/extensions}"

if ! command -v code >/dev/null 2>&1; then
  echo "error: the 'code' command is not on your PATH." >&2
  echo "In VS Code: Cmd+Shift+P, 'Shell Command: Install code command in PATH'." >&2
  exit 1
fi

echo "==> Packaging $ID@$VERSION"
rm -f "$ROOT"/*.vsix
npx --yes @vscode/vsce package --out "$VSIX" >/dev/null
echo "    $(basename "$VSIX") ($(du -h "$VSIX" | cut -f1))"

# Drop cache entries for this extension that point at a folder which no
# longer exists. Only ever touches our own id, and only dead paths.
MANIFEST="$EXT_DIR/extensions.json"
if [ -f "$MANIFEST" ]; then
  cp "$MANIFEST" "$MANIFEST.bak"
  node -e '
    const fs = require("fs");
    const [manifest, id] = process.argv.slice(1);
    let list;
    try { list = JSON.parse(fs.readFileSync(manifest, "utf8")); }
    catch { console.log("    cache unreadable, leaving it alone"); process.exit(0); }
    if (!Array.isArray(list)) process.exit(0);
    const kept = list.filter((e) => {
      const p = e?.location?.path;
      const mine = e?.identifier?.id?.toLowerCase() === id.toLowerCase();
      if (!mine || !p) return true;
      return fs.existsSync(p);
    });
    if (kept.length !== list.length) {
      fs.writeFileSync(manifest, JSON.stringify(kept));
      console.log(`    pruned ${list.length - kept.length} stale cache entr${list.length - kept.length === 1 ? "y" : "ies"}`);
    }
  ' "$MANIFEST" "$ID"
fi

# Any leftover symlink from the old approach shadows the real install.
find "$EXT_DIR" -maxdepth 1 -type l -name "$ID-*" -print -delete 2>/dev/null \
  | sed 's|^|    removed stale symlink: |' || true

echo "==> Installing"
code --install-extension "$VSIX" --force 2>&1 | grep -v DeprecationWarning | grep -v trace-deprecation || true

echo "==> Verifying"
if code --list-extensions --show-versions 2>/dev/null | grep -q "^$ID@$VERSION$"; then
  echo "    ok: $ID@$VERSION"
  echo
  echo "Reload the window: Cmd+Shift+P, 'Developer: Reload Window'."
else
  echo "    warning: VS Code does not report $ID@$VERSION yet." >&2
  code --list-extensions --show-versions 2>/dev/null | grep -i "${ID#*.}" >&2 || true
  exit 1
fi
