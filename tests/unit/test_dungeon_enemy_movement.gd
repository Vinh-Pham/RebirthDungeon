extends GutTest

const Movement = preload("res://scripts/dungeon_enemy_movement.gd")


func _floor() -> Dictionary:
	var cells := {}
	for x in range(12):
		for y in range(4):
			cells[Vector2i(x, y)] = true
	return cells


func _rng() -> RandomNumberGenerator:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	return rng


func test_nearby_enemy_moves_toward_player_and_reports_contact() -> void:
	var enemies: Array[Vector2i] = [Vector2i(3, 1)]
	assert_eq(Movement.step(enemies, Vector2i(1, 1), _floor(), {}, _rng()), -1)
	assert_eq(enemies[0], Vector2i(2, 1))
	assert_eq(Movement.step(enemies, Vector2i(1, 1), _floor(), {}, _rng()), 0)
	assert_eq(enemies[0], Vector2i(2, 1))


func test_pursuit_routes_around_blocked_cells() -> void:
	var enemies: Array[Vector2i] = [Vector2i(3, 1)]
	var blocked := {Vector2i(2, 1): true, Vector2i(3, 0): true}
	Movement.step(enemies, Vector2i(1, 1), _floor(), blocked, _rng())
	assert_eq(enemies[0], Vector2i(3, 2))


func test_distant_wander_is_seeded_and_preserves_unique_positions() -> void:
	var first: Array[Vector2i] = [Vector2i(10, 1), Vector2i(10, 2)]
	var second: Array[Vector2i] = first.duplicate()
	var before: Array[Vector2i] = first.duplicate()
	Movement.step(first, Vector2i.ZERO, _floor(), {}, _rng())
	Movement.step(second, Vector2i.ZERO, _floor(), {}, _rng())
	assert_eq(first, second)
	assert_ne(first[0], first[1])
	for index in first.size():
		assert_eq(absi(first[index].x - before[index].x) + absi(first[index].y - before[index].y), 1)
		assert_true(_floor().has(first[index]))


func test_boxed_enemy_stays_and_does_not_overlap_neighbor() -> void:
	var enemies: Array[Vector2i] = [Vector2i(2, 1), Vector2i(1, 1)]
	var blocked := {Vector2i(2, 0): true, Vector2i(3, 1): true, Vector2i(2, 2): true}
	Movement.step(enemies, Vector2i.ZERO, _floor(), blocked, _rng())
	assert_eq(enemies[0], Vector2i(2, 1))
	assert_ne(enemies[0], enemies[1])
