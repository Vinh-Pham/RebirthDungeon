class_name SkillDefinition
extends "res://scripts/data/definitions/content_definition.gd"
const Rank = preload("res://scripts/data/definitions/skill_rank.gd")
@export var effect: String = "physical_damage"
@export var target: String = "hostile"
@export var weapon: String = ""
@export var uses_dice: bool = true
@export var status_id: String = ""
@export var prototype_cap: String = "F"
@export var ranks: Array[Rank] = []
