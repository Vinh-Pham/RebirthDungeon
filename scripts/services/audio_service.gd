class_name AudioService
extends Node
## Phase 12 presentation feedback. Plays repository-generated samples on the
## SFX bus and looping pads on the Music bus. Nothing here reads session
## state, draws RNG or changes rules; Main routes accepted events inward.
const SOUNDS := {
	"click": preload("res://assets/audio/ui_click.wav"),
	"dice": preload("res://assets/audio/dice_roll.wav"),
	"hit": preload("res://assets/audio/sword_hit.wav"),
	"heal": preload("res://assets/audio/heal.wav"),
	"door": preload("res://assets/audio/door_open.wav"),
	"victory": preload("res://assets/audio/victory.wav"),
	"defeat": preload("res://assets/audio/defeat.wav"),
}
const MUSIC := {
	"town": preload("res://assets/audio/music_town.wav"),
	"battle": preload("res://assets/audio/music_battle.wav"),
}
const POOL_SIZE := 6
var enabled: bool = true
## Headless runs use the dummy audio driver: playbacks are never mixed, so
## stopping them cannot release the objects and engine shutdown would report
## leaks. Streams are still assigned, keeping the routing logic observable.
var _can_play: bool = DisplayServer.get_name() != "headless"
var _music: AudioStreamPlayer
var _pool: Array[AudioStreamPlayer] = []
var _pool_index: int = 0
var _current_music: String = ""

func _ready() -> void:
	_music = AudioStreamPlayer.new()
	_music.bus = &"Music"
	add_child(_music)
	for i: int in POOL_SIZE:
		var player := AudioStreamPlayer.new()
		player.bus = &"SFX"
		add_child(player)
		_pool.append(player)

## Release players and playback objects on teardown so engine shutdown
## reports no leaked audio resources.
func _exit_tree() -> void:
	_music.stop()
	_music.stream = null
	for player: AudioStreamPlayer in _pool:
		player.stop()
		player.stream = null
	_current_music = ""

func _looping(stream: AudioStreamWAV) -> AudioStreamWAV:
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_begin = 0
	stream.loop_end = stream.data.size() / 2  # 16-bit mono frames
	return stream

func play_music(id: String) -> void:
	if _current_music == id: return
	_current_music = id
	if id.is_empty() or not MUSIC.has(id) or not enabled:
		_music.stop()
		return
	_music.stream = _looping(MUSIC[id])
	if _can_play: _music.play()

func play_sfx(id: String) -> void:
	if not enabled or not SOUNDS.has(id): return
	for attempt: int in POOL_SIZE:
		var player: AudioStreamPlayer = _pool[(_pool_index + attempt) % POOL_SIZE]
		if not player.playing:
			_pool_index = (_pool_index + attempt + 1) % POOL_SIZE
			player.stream = SOUNDS[id]
			if _can_play: player.play()
			return
	# Every voice is busy: steal the next one; feedback never queues work.
	var stolen: AudioStreamPlayer = _pool[_pool_index]
	_pool_index = (_pool_index + 1) % POOL_SIZE
	stolen.stream = SOUNDS[id]
	if _can_play: stolen.play()

## Accepted domain events map to feedback. Unknown events stay silent.
func map_event(event: Dictionary) -> void:
	match str(event.get("type", "")):
		"rolled", "rerolled":
			play_sfx("dice")
		"effect":
			if str(event.get("target_id", "")) != str(event.get("actor_id", "")):
				play_sfx("hit")
		"potion_used":
			play_sfx("heal")
		"battle_finished":
			play_sfx("victory" if str(event.get("outcome", "")) == "victory" else "defeat")
		"enter_dungeon":
			play_sfx("door")
		"buy_potion", "recover", "learn_lesson", "quest_claim", "rank_up":
			play_sfx("heal")
		"keep", "select_skill", "quest_accept", "quest_track":
			play_sfx("click")
