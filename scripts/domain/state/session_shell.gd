class_name SessionShell
extends RefCounted
## In-memory identity/mode contract only. No hero, RNG, rewards or disk saves.

enum Mode { MENU, LOADING, TOWN, DUNGEON, BATTLE, RESULTS }

var session_id: int = 1
var revision: int = 0
var mode: Mode = Mode.MENU

func observation() -> Dictionary:
	return {"session_id": session_id, "revision": revision, "mode": mode}

func matches(id: int, expected_revision: int) -> bool:
	return id == session_id and expected_revision == revision

func invalidate() -> void:
	session_id += 1
	revision = 0
	mode = Mode.MENU
