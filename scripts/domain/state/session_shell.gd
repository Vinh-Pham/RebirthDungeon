class_name SessionShell
extends RefCounted
## Application-owned in-memory state. No addon objects or disk persistence.
const Hero = preload("res://scripts/domain/state/hero_state.gd")
const Battle = preload("res://scripts/domain/state/battle_state.gd")
const Streams = preload("res://scripts/domain/rules/rng_streams.gd")
enum Mode { MENU, LOADING, TOWN, DUNGEON, BATTLE, RESULTS }

var session_id: int = 1
var revision: int = 0
var mode: Mode = Mode.MENU
var hero: Hero
var battle: Battle
var exploration: RefCounted
## Authored role-playing mission currently suspended or running. Empty outside
## mission battles; committed outcomes live in hero.growth, never here.
var mission_id: String = ""
var town_position_x: float = 96.0
var town_position_y: float = 160.0
## Explicit aging clock in whole weeks since the epoch. Injected by the
## application at safe town/result boundaries; rules never read wall time.
var clock_week: int = 0
var rng := Streams.new(0)
var content_versions: Dictionary = {}
var accepted_operations: Dictionary[String, int] = {}

func observation() -> Dictionary:
	return {"session_id": session_id, "revision": revision, "mode": mode,
		"hero": hero.observation() if hero != null else {},
		"battle": battle.observation() if battle != null else {},
		"content_versions": content_versions.duplicate(true)}
	# RNG state and operation history are intentionally not presentation data.

func copy() -> RefCounted:
	var result: RefCounted = get_script().new()
	result.session_id = session_id
	result.revision = revision
	result.mode = mode
	result.hero = hero.copy() if hero != null else null
	result.battle = battle.copy() if battle != null else null
	result.exploration = exploration.copy() if exploration != null else null
	result.mission_id = mission_id
	result.town_position_x = town_position_x
	result.town_position_y = town_position_y
	result.clock_week = clock_week
	result.rng.restore(rng.capture())
	result.content_versions = content_versions.duplicate(true)
	result.accepted_operations = accepted_operations.duplicate()
	return result

func matches(id: int, expected_revision: int) -> bool:
	return id == session_id and expected_revision == revision

func invalidate() -> void:
	session_id += 1
	revision = 0
	mode = Mode.MENU
	hero = null
	battle = null
	exploration = null
	mission_id = ""
	town_position_x = 96.0
	town_position_y = 160.0
	clock_week = 0
	content_versions.clear()
	accepted_operations.clear()
	rng = Streams.new(0)
