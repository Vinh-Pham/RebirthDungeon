class_name EncounterDefinition
extends "res://scripts/data/definitions/content_definition.gd"
@export var actor_ids: PackedStringArray = []
@export var pending_gold: int = 0

@export_enum("hero", "enemy") var first_actor: String = "hero"
