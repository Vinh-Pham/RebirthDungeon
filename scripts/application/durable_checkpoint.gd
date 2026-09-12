extends "res://scripts/application/checkpoint_test_adapter.gd"
## A candidate is visible only after its disk checkpoint verifies.
var repository: RefCounted
func stage(result: RefCounted) -> bool:
	assert(pending == null)
	pending = result
	state = "pending"
	return _write()
func _write() -> bool:
	if repository.save(pending.candidate):
		state = "ready"
		return true
	state = "failed"
	return false
func retry() -> bool:
	if pending == null or state != "failed": return false
	return _write()
func complete(_success: bool) -> bool:
	return false
