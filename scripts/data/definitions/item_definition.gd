class_name ItemDefinition
extends "res://scripts/data/definitions/content_definition.gd"
@export var width: int = 1
@export var height: int = 1
@export var max_stack: int = 1
@export var weapon: String = ""

@export var category: String = "equipment"
@export var slot: String = ""
@export var two_handed: bool = false
@export var price: int = 0
@export var bag_width: int = 0
@export var bag_height: int = 0
@export var gold_capacity: int = 0
@export var modifiers: Dictionary[String,int] = {}
@export var skill_id: String = ""
@export var book_id: String = ""
@export var page_id: String = ""
@export var required_pages: PackedStringArray = []
@export var complete_book: String = ""
@export var title_id: String = ""
