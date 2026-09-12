extends RefCounted
## In-memory test boundary only. Phase 6 supplies an actual save repository.
var next_behavior: String = "immediate"
var state: String = "idle"
var pending: RefCounted

func stage(result: RefCounted) -> bool:
	assert(pending == null)
	pending = result
	state = {"immediate": "ready", "pending": "pending", "failure": "failed"}.get(next_behavior, "ready")
	next_behavior = "immediate"
	return state == "ready"

func complete(success: bool) -> bool:
	if pending == null or state != "pending": return false
	state = "ready" if success else "failed"
	return true

func retry() -> bool:
	if pending == null or state != "failed": return false
	state = "ready"
	return true

func take() -> RefCounted:
	if state != "ready": return null
	var result := pending
	pending = null
	state = "idle"
	return result

func busy() -> bool:
	return pending != null
