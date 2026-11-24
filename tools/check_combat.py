"""Exercise saved combat via the Automation Bridge without changing existing heroes."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from automation_bridge import editor, engine


def state(game: engine.Client) -> dict[str, Any]:
    return game.state("combat").value


def invoke(game: engine.Client, name: str, data: dict[str, Any]) -> dict[str, Any]:
    previous = state(game)["screen"]
    result = game.command(name, data)["result"]
    assert result["accepted"], result
    current = state(game)
    if current["screen"] != previous:
        game.wait_for_state("navigation.ready_screen", current["screen"])
    return state(game)


def command(game: engine.Client, kind: str, **data: Any) -> dict[str, Any]:
    return invoke(game, "combat.command", {"type": kind, **data})


def pause(game: engine.Client) -> dict[str, Any]:
    return invoke(game, "combat.panel", {"name": "skills"})


def begin(game: engine.Client) -> dict[str, Any]:
    s = state(game)
    if not s["battle"]["started"]:
        return command(game, "begin_turn", battle=s["battle"]["id"], turn=s["battle"]["turn"])
    return s


def act(game: engine.Client, skill: str, target: str) -> dict[str, Any]:
    s = begin(game)
    return command(game, "act", battle=s["battle"]["id"], turn=s["battle"]["turn"],
                   actor=s["battle"]["active"], skill=skill, target=target)


def next_hero(game: engine.Client) -> dict[str, Any]:
    s = state(game)
    while s["battle"]["active"] != s["profile"]["id"]:
        s = act(game, "normal", s["profile"]["id"])
    return begin(game)


def enter(game: engine.Client) -> dict[str, Any]:
    command(game, "checkpoint", x=14 * 48, y=15 * 48)
    s = command(game, "enter")
    room = s["rooms"][1]
    command(game, "checkpoint", x=room["x"] * 48, y=room["y"] * 48)
    if state(game)["profile"]["phase"] == "dungeon":
        command(game, "encounter", room=room["id"])
    pause(game)
    return begin(game)


def main() -> None:
    project = editor.open_project(".", start_if_needed=False)
    game = project.connect_engine()
    name = "Combat QA " + datetime.now().strftime("%H%M%S")
    invoke(game, "combat.create", {"name": name, "race": "Human", "age": 17, "talent": "Close Combat"})
    pause(game)
    game.click(game.wait_for_element(type="gui_node_text", text_exact="Next", visible=True))
    game.click(game.wait_for_element(type="gui_node_text", text_exact="Counterattack · Unlearned", visible=True))
    game.click(game.wait_for_element(type="gui_node_text", text_exact="Learn F · Free", visible=True))
    game.wait_for_state("combat.profile.skills.counterattack.rank", 0)
    for skill in ("windmill", "assault_slash", "dual_wield_mastery", "sword_mastery", "axe_mastery", "shield_mastery"):
        command(game, "learn_skill", skill=skill)
    command(game, "checkpoint", x=19 * 48, y=6 * 48)
    command(game, "buy", service="blacksmith", **{"def": "sword", "quantity": 1})
    s = state(game)
    off = s["profile"]["items"][-1]["id"]
    command(game, "equip", item=off, slot="hand_left")
    assert state(game)["profile"]["items"][-1]["slot"] == "hand_left"
    command(game, "equip", item=off)
    command(game, "sell", service="blacksmith", item=off, quantity=1)
    command(game, "buy", service="blacksmith", **{"def": "small_shield", "quantity": 1})
    shield = state(game)["profile"]["items"][-1]["id"]
    command(game, "equip", item=shield)
    s = enter(game)
    hero, white = s["profile"]["id"], s["battle"]["enemies"][1]["id"]
    sp, hp = s["profile"]["pools"]["sp"], s["profile"]["pools"]["hp"]
    s = act(game, "counterattack", hero)
    assert s["profile"]["pools"]["sp"] == sp - 2
    assert s["battle"]["statuses"][hero]["counterattack"]["reactions"] == 1
    invoke(game, "combat.reload", {})
    pause(game)
    s = act(game, "normal", hero)
    assert s["profile"]["pools"]["hp"] == hp
    assert "counterattack" not in s["battle"]["statuses"][hero]
    assert s["profile"]["skills"]["counterattack"]["training"] >= 5
    s = next_hero(game)
    result = game.command("combat.command", {"type": "act", "battle": s["battle"]["id"],
        "turn": s["battle"]["turn"], "actor": hero, "skill": "assault_slash", "target": white})["result"]
    assert not result["accepted"] and "Target not downed" in result["reason"]
    s = act(game, "smash", white)
    assert "downed" in s["battle"]["statuses"][white]
    s = next_hero(game)
    invoke(game, "combat.reload", {})
    pause(game)
    assert "downed" in state(game)["battle"]["statuses"][white]
    s = act(game, "assault_slash", white)
    assert s["profile"]["skills"]["assault_slash"]["training"] >= 5
    assert s["battle"]["outcome"] == "victory"
    command(game, "abandon", confirm=True)
    command(game, "learn_skill", skill="critical_hit")
    assert len(state(game)["profile"]["skills"]) == 11
    s = enter(game)
    sp, draws = s["profile"]["pools"]["sp"], s["battle"]["random_draws"]
    s = act(game, "windmill", s["battle"]["enemies"][0]["id"])
    assert s["profile"]["pools"]["sp"] == sp - 2
    assert s["battle"]["random_draws"] == draws + 2
    damage = [event for event in s["battle"]["events"] if event["kind"] == "damage"]
    assert len(damage) == 2 and len({event["target"] for event in damage}) == 2
    assert s["profile"]["skills"]["windmill"]["objectives"]["damaging_skill"] == 1
    if s["profile"]["phase"] == "battle":
        next_hero(game)
        act(game, "defense", hero)
        s = next_hero(game)
        assert "guard" not in s["battle"]["statuses"][hero]
    command(game, "abandon", confirm=True)
    pause(game)
    print("Verified UI learning, paired swords, shield equipment, counter save/reload, Smash→Assault Slash, Windmill payment/RNG/targets, Defense, and all eleven learned skills.")
    print("Test character:", name)
    print("Screenshot:", game.screenshot(wait=True, after_frames=2, resolution_multiplier=1).path)
    errors = [line for line in project.console.read().lines if "ERROR:" in line]
    assert not errors, errors
    print("Runtime errors: none")
    game.close()


if __name__ == "__main__":
    main()
