class_name RoomDefinition
extends "res://scripts/data/definitions/content_definition.gd"
## Stable room identity and encounter membership; geometry lives in authored scenes.
## Connectors name the corridor arch kinds each side joins with. Empty west means
## an entry room; empty east means a terminal room. Phase 11 generation only
## joins rooms whose kinds match, and the shared template keeps every corridor
## at the same clearance, so matching connectors preserve navigation clearance.
@export var encounter_ids: PackedStringArray = []
## Authored whitelist of encounters this room can host during generation.
## An empty list hosts any dungeon encounter; the listed members stay exclusive.
@export var west_connector: String = ""
@export var east_connector: String = ""
