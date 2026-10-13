#!/usr/bin/env bash
#
# Downloads a pile of vintage GeoCities GIFs from the Internet Archive's
# GifCities, filters out the junk, and prints the setting to paste.
#
# Nothing downloaded here is committed to this repo. These are archived
# web GIFs of unclear provenance: fine to point your editor at on your own
# machine, not fine to redistribute. That is why this is a script and not a
# media folder.
#
#   ./scripts/fetch-buddies.sh [output-dir]
#
set -euo pipefail

OUT="${1:-$HOME/Pictures/cursed-buddies}"
PER_TERM=6
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TERMS=(
  dancing+banana pirate skull alien hamster dancing+baby
  cowboy wizard ufo monkey telephone cheese
  dinosaur ninja robot dragon
)

mkdir -p "$OUT"
echo "Fetching into $OUT"

for t in "${TERMS[@]}"; do
  n=0
  while read -r url; do
    [ -z "$url" ] && continue
    if curl -sf --max-time 20 "$url" -o "$OUT/${t//+/-}-$(basename "$url")"; then
      n=$((n + 1))
    fi
    sleep 0.25
  done < <(
    curl -sf --max-time 25 "https://gifcities.org/search?q=${t}" \
      | grep -oE 'https://blob\.gifcities\.org/gifcities/[A-Z0-9]+\.gif' \
      | sort -u | head -"$PER_TERM"
  )
  printf '  %-16s %d\n' "$t" "$n"
  sleep 0.8
done

echo
node "$HERE/filter-buddies.js" "$OUT" --delete

cat <<EOF

Done. Add this to your settings.json:

    "cursed.buddy.imageDir": "$OUT"

Or run: CURSED: Pick Buddy Images...
EOF
