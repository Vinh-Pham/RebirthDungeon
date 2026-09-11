class_name ActorDefinition
extends "res://scripts/data/definitions/content_definition.gd"
@export var max_hp: int = 1
@export var max_mp: int = 0
@export var max_sp: int = 0
@export var base_stats: Dictionary[String, int] = {}
@export var skill_ids: PackedStringArray = []
@export var weapon: String = ""
