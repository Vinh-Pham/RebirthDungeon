class_name CatalogManifest
extends Resource
const Combination = preload("res://scripts/data/definitions/combination_definition.gd")
const ACTORS = preload("res://scripts/data/definitions/actor_definition.gd")
const SKILLS = preload("res://scripts/data/definitions/skill_definition.gd")
const STATS = preload("res://scripts/data/definitions/stat_definition.gd")
const STATUSES = preload("res://scripts/data/definitions/status_definition.gd")
const ITEMS = preload("res://scripts/data/definitions/item_definition.gd")
const ENCOUNTERS = preload("res://scripts/data/definitions/encounter_definition.gd")
const ROOMS = preload("res://scripts/data/definitions/room_definition.gd")
@export var schema_version: int = 1
@export var content_version: int = 1
@export var rules_version: int = 1
@export var generator_version: int = 1
@export var rng_version: int = 1
@export var engine_build: String = "4.7.2.stable.official.ed1daf0bf"
@export var rank_order: PackedStringArray = PackedStringArray(["F", "E", "D", "C", "B", "A", "9", "8", "7", "6", "5", "4", "3", "2", "1"])
@export var combinations: Array[Combination] = []
@export var xp_thresholds: PackedInt64Array = PackedInt64Array([0, 100])
@export var actors: Array[ACTORS] = []
@export var skills: Array[SKILLS] = []
@export var stats: Array[STATS] = []
@export var statuses: Array[STATUSES] = []
@export var items: Array[ITEMS] = []
@export var encounters: Array[ENCOUNTERS] = []
@export var rooms: Array[ROOMS] = []
