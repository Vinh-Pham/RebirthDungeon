#!/usr/bin/env python3
"""Check Monarch properties as resolved by the running Defold editor."""
from pathlib import Path
from urllib.request import Request, urlopen
import json
import sys

ROOT = Path(__file__).resolve().parents[1]

# Bob accepts compact embedded property syntax that the editor may discard.
# Inspect the editor's resource graph, not just the collection source text.
CHECK = '''
for _, path in ipairs({"/main/main.collection", "/tests/visual.collection"}) do
    local expected = {
        title = true, characters = true, create = true, rebirth = true,
        town = true, dungeon = true, battle = true, rewards = true, treasure = true,
        town_service_popup = true, town_dialogue_popup = true,
        hud_panel_popup = true, hud_confirm_popup = true
    }
    for _, node in ipairs(editor.get(path, "children")) do
        local id = editor.get(node, "id")
        for _, component in ipairs(editor.get(node, "components")) do
            if editor.can_get(component, "__screen_id") then
                assert(expected[id], "Unexpected or duplicate screen: " .. id)
                assert(editor.get(component, "__screen_id") == id,
                    path .. ": incorrect Monarch screen_id for " .. id)
                expected[id] = nil
            end
        end
    end
    assert(next(expected) == nil, path .. ": missing screen controllers")
    print("PASS " .. path .. ": all thirteen Monarch screen/popup IDs")
end
'''


def main() -> None:
    port = (ROOT / ".internal/editor.port").read_text().strip()
    token = (ROOT / ".internal/editor.token").read_text().strip()
    reload = f'editor.execute({json.dumps(sys.executable)}, "-c", "pass", {{reload_resources = true}})\n'
    request = Request(
        f"http://127.0.0.1:{port}/eval",
        data=(reload + CHECK).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "text/plain"},
    )
    with urlopen(request, timeout=30) as response:
        print(response.read().decode(), end="")


if __name__ == "__main__":
    main()
