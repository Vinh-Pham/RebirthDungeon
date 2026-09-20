#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Optional authoring tool; compiled story JSON is checked in for normal builds.
npm install --prefix .tools/story --no-audit --no-fund inkjs@2.3.2
.tools/story/node_modules/.bin/inkjs-compiler -o assets/dialogue/town.json assets/dialogue/town.ink

for story in assets/dialogue/services/*.ink; do
    .tools/story/node_modules/.bin/inkjs-compiler -o "${story%.ink}.json" "$story"
done
