extends Node2D
## Authored geometry uses a ten-pixel navigation inset for the eight-pixel hero.
@export var room_id: String = ""
@export var title: String = ""
@export var left_door: bool = false
@export var right_door: bool = false
@export var next_room_id: String = ""
@export var town: bool = false
@onready var region: NavigationRegion2D = $NavigationRegion2D
var floor_texture: Texture2D
var gate: CollisionShape2D

func _ready() -> void:
	if ResourceLoader.exists("res://assets/art/exploration/floor.png"):
		floor_texture = load("res://assets/art/exploration/floor.png")
	_build_geometry()
	queue_redraw()

func _build_geometry() -> void:
	_wall(Rect2(-16, -16, 512, 16))
	_wall(Rect2(-16, 320, 512, 16))
	if left_door:
		_wall(Rect2(-16, 0, 16, 128))
		_wall(Rect2(-16, 192, 16, 128))
	else:
		_wall(Rect2(-16, 0, 16, 320))
	if right_door:
		_wall(Rect2(480, 0, 16, 128))
		_wall(Rect2(480, 192, 16, 128))
		_wall(Rect2(480, 112, 80, 16))
		_wall(Rect2(480, 192, 80, 16))
		gate = _wall(Rect2(480, 128, 8, 64))
	else:
		_wall(Rect2(480, 0, 16, 320))
	var points := PackedVector2Array([Vector2(10,10), Vector2(470,10)])
	if right_door:
		points.append_array(PackedVector2Array([Vector2(470,138),Vector2(560,138),Vector2(560,182),Vector2(470,182)]))
	points.append_array(PackedVector2Array([Vector2(470,310),Vector2(10,310)]))
	if left_door:
		points.append_array(PackedVector2Array([Vector2(10,182),Vector2(0,182),Vector2(0,138),Vector2(10,138)]))
	var polygon := NavigationPolygon.new()
	polygon.vertices = points
	var triangles := Geometry2D.triangulate_polygon(points)
	for i: int in range(0, triangles.size(), 3):
		polygon.add_polygon(PackedInt32Array([triangles[i], triangles[i+1], triangles[i+2]]))
	region.navigation_polygon = polygon
	polygon.emit_changed()

func _wall(rect: Rect2) -> CollisionShape2D:
	var body := StaticBody2D.new()
	body.collision_layer = 1
	body.collision_mask = 2
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = rect.size
	shape.shape = box
	body.position = rect.get_center()
	body.add_child(shape)
	add_child(body)
	return shape

func set_discovered(value: bool) -> void:
	visible = value
	region.enabled = value

func open_connector() -> void:
	if is_instance_valid(gate):
		gate.set_deferred("disabled", true)

func _draw() -> void:
	var base := Color("#455b53") if town else Color("#303d43")
	draw_rect(Rect2(0,0,480,320), base)
	if floor_texture != null:
		draw_texture_rect(floor_texture, Rect2(0,0,480,320), true, Color("#a4b8a0") if town else Color("#798f96"))
	if right_door:
		draw_rect(Rect2(480,128,80,64), base)
		if floor_texture != null:
			draw_texture_rect(floor_texture, Rect2(480,128,80,64), true, Color("#798f96"))
	# Raised border courses and warm doorway lamps remain independent of collision.
	for x: int in range(-16, 496, 32):
		draw_rect(Rect2(x,-16,30,14), Color("#59666a"))
		draw_rect(Rect2(x,320,30,14), Color("#263238"))
	for y: int in range(0,320,32):
		if not left_door or y < 128 or y >= 192:
			draw_rect(Rect2(-16,y,14,30), Color("#4c5a5f"))
		if not right_door or y < 128 or y >= 192:
			draw_rect(Rect2(480,y,14,30), Color("#4c5a5f"))
	for p: Vector2 in [Vector2(28,24), Vector2(448,24), Vector2(28,288), Vector2(448,288)]:
		draw_rect(Rect2(p-Vector2(4,6),Vector2(8,12)),Color("#202e32"))
		draw_rect(Rect2(p-Vector2(2,5),Vector2(4,5)),Color("#edbd73"))
	draw_string(ThemeDB.fallback_font, Vector2(24,54), title.to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("#c6ceba"))
