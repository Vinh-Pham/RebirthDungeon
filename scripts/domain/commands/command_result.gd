class_name CommandResult
extends RefCounted
const Session = preload("res://scripts/domain/state/session_shell.gd")
var accepted: bool = false
var code: String = ""
var operation_id: String = ""
var candidate: Session
var events: Array[Dictionary] = []

func observation() -> Dictionary:
	return {"accepted": accepted, "code": code, "operation_id": operation_id, "events": events.duplicate(true)}
