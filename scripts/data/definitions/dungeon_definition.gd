class_name DungeonDefinition
extends "res://scripts/data/definitions/content_definition.gd"
## Phase 11 authored generator tables for one dungeon. Every field is read-only
## authored data; the generator consumes it with the independent generation RNG
## stream and never mutates the resource. Loot draws use the separate loot stream.
## Entry and exit rooms are fixed so expedition access stays completable.

## Weighted room pool for the slots between entry and exit.
## Entries: {"room_id": String, "weight": int, "allow_repeat": bool}.
@export var mid_pool: Array[Dictionary] = []
## Weighted optional encounters placed in remaining room capacity.
## Entries: {"encounter_id": String, "weight": int, "min_depth": int}; depth
## counts room slots after the entry room (the first mid room is depth 1).
@export var optional_pool: Array[Dictionary] = []
## Encounters always placed and required for exit, in authored order.
@export var required_encounters: PackedStringArray = []
## Granted in order, one per distinct required encounter won this run.
## Entries: {"item_id": String, "quantity": int}.
@export var required_drops: Array[Dictionary] = []
## Chance-based bonus drops drawn once per distinct encounter won this run, in
## authored order. Entries: {"encounter_id", "item_id", "chance_bp",
## "min_quantity", "max_quantity"}.
@export var bonus_drops: Array[Dictionary] = []
@export var entry_room_id: String = ""
@export var exit_room_id: String = ""
## Bounded room count: the mid-slot count draws inside this inclusive range.
@export_range(1, 6) var mids_min: int = 2
@export_range(1, 6) var mids_max: int = 3
## Bounded assembly attempts before the known-valid fallback layout is used.
@export_range(1, 1000) var attempts: int = 24