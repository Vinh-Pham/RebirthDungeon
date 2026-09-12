extends Area2D
@export var stable_id: String = ""
@export_enum("npc", "encounter", "entrance", "exit", "discovery") var kind: String = "encounter"
@export var destination_id: String = ""
@export var label: String = ""
@export var radius: float = 26.0
var texture: Texture2D

func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = radius
	shape.shape = circle
	add_child(shape)
	if kind in ["npc", "encounter"]:
		var path := "res://assets/art/exploration/hero.png" if kind == "npc" else "res://assets/art/exploration/sentinel.png"
		if ResourceLoader.exists(path):
			texture = load(path)
	queue_redraw()

func _draw() -> void:
	if kind == "discovery":
		return
	var color := Color("#e4bc76") if kind == "encounter" else Color("#9ccdc0")
	draw_arc(Vector2.ZERO, radius, 0, TAU, 32, Color(color,0.35), 1)
	draw_circle(Vector2(0,2), 12, Color(0,0,0,0.3))
	if texture != null:
		draw_texture_rect(texture,Rect2(-20,-35,40,40),false,Color("#d4b899") if kind == "npc" else Color.WHITE)
	else:
		draw_rect(Rect2(-13,-32,26,34),Color("#17272c"))
		draw_rect(Rect2(-10,-29,20,28),color,false,3)
		draw_rect(Rect2(-5,-24,10,22),Color("#547872"))
	draw_string(ThemeDB.fallback_font,Vector2(-70,45),label,HORIZONTAL_ALIGNMENT_CENTER,140,11,color)
