class_name DomainCommand
extends RefCounted
## Constructed by the application from value-only intent data.
var session_id: int = 0
var expected_revision: int = 0
var operation_id: String = ""
var kind: String = ""
var actor_id: String = ""
var skill_id: String = ""
var target_id: String = ""

var indices: Array = []
