package cloud.vinh.rebirthdungeon.data.save.dto

/** Explicit save schema. All 64-bit values use decimal or hex strings, never JSON doubles. */
class CheckpointEnvelopeDto {
    var schemaVersion = 1
    var revision = ""
    var checksum = ""
    var payload = ""
}
class RunCheckpointDto {
    var runId = ""
    var seed = ""
    var contentVersion = 0
    var rulesVersion = 0
    var contentSchema = 0
    var floorIndex = -1
    var generatorVersion = -1
    var generationAttempt = -1
    var nextEntityId = ""
    var commandCount = ""
    var turnCount = ""
    var eventCount = ""
    var reachedExit = false
    var width = 0
    var height = 0
    var tiles = intArrayOf()
    var explored = booleanArrayOf()
    var remembered = intArrayOf()
    var actors = arrayOf<ActorDto>()
    var tick = ""
    var activeActor = ""
    var nextSequence = ""
    var queue = arrayOf<TurnDto>()
    var random = arrayOf<RandomDto>()
}
class ActorDto {
    var id = ""
    var definition = ""
    var x = 0
    var y = 0
    var player = false
    var ai = false
    var blocks = true
    var vision = 0
    var hp = -1
    var maxHp = -1
}
class TurnDto {
    var actor = ""
    var dueTick = ""
    var insertionSequence = ""
}
class RandomDto {
    var stream = ""
    var algorithm = ""
    var format = 0
    var words = arrayOf<String>()
}
