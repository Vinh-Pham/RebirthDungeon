local Ch = require("game.domain.character")
local Cmd = require("game.domain.commands")
local Log = require("game.domain.combat_log")
local Save = require("game.services.save")
local U = require("game.domain.util")
local M = {}
local function fixture()
	local p = Ch.new("profile_18", "Combat Log Storage Test", "Human", 17, "Close Combat", 1789920000, 42)
	p.position = { x = 14 * 48, y = 15 * 48 }
	p = Cmd.execute(p, { type = "enter", op = "enter", revision = p.revision }, { now = 1789920000 })
	local room = p.run.map.rooms[2]
	p.position = { x = room.x * 48, y = room.y * 48 }
	p = Cmd.execute(
		p,
		{ type = "encounter", room = room.id, op = "encounter", revision = p.revision },
		{ now = 1789920000 }
	)
	local events = {}
	for index = 1, 100 do
		events[index] = {
			id = p.battle.id .. ":" .. index,
			sequence = index,
			battle = p.battle.id,
			run = p.run.id,
			round = 1,
			turn = 1,
			operation = "combat_storage_operation_" .. math.ceil(index / 10),
			kind = "damage",
			text = string.rep("Detailed combat feedback ", 10),
			actor = p.id,
			target = p.battle.enemies[1].id,
			skill = "smash",
			amount = 28,
			actual = 28,
			calculated = 60,
			absorbed = 0,
			hit = 1,
			hits = 1,
			critical = false,
		}
	end
	p.battle.events = events
	p.battle.sequence = 100
	Log.sync(p)
	p.last_events = {}
	for index = 37, 100 do
		p.last_events[#p.last_events + 1] = U.copy(events[index])
	end
	return p
end

function M.run()
	local p = fixture()
	local envelope = { magic = "RebirthDungeon", version = 1, generation = 1, payload = p }
	local bytes = #sys.serialize(envelope)
	assert(bytes < 512 * 1024, "Initial combat log exceeds DefSave's envelope budget")
	local backend = Save.defsave_backend("RebirthDungeonCombatLogFixtures")
	assert(backend.lock())
	local defsave = require("defsave.defsave")
	for _, suffix in ipairs({ "a", "b" }) do
		os.remove(defsave.get_file_path(p.id .. "_" .. suffix))
	end
	local store = Save.new(backend)
	assert(store:commit(p))
	assert(U.equal(p, store:load(p.id)))
	local f = assert(io.open(defsave.get_file_path(p.id .. "_a"), "rb"))
	local size = f:seek("end")
	f:close()
	print(
		"ENGINE PASS combat log native save/reload; 100 history + 64 batch, envelope bytes",
		bytes,
		"file bytes",
		size
	)
	local record = U.copy(p.combat_log.record)
	record.events = {}
	for index = 1, 1000 do
		local event = U.copy(p.battle.events[(index - 1) % 100 + 1])
		event.sequence = index
		event.id = record.id .. ":" .. index
		event.operation = "archive_operation_" .. math.ceil(index / 10)
		record.events[index] = event
	end
	local expanded = U.copy(envelope)
	expanded.payload.combat_archives = {}
	for index = 1, 20 do
		expanded.payload.combat_archives[index] = U.copy(record)
	end
	local ok, serialized = pcall(sys.serialize, expanded)
	assert(not ok or #serialized > 512 * 1024, "Archive budget fixture no longer exceeds the project budget")
	print(
		"ENGINE ARCHIVE BUDGET: 20 x 1000 events",
		ok and #serialized or "serialization refused",
		"bytes; exceeds documented 512 KiB save budget, archives remain deferred"
	)
	for _, suffix in ipairs({ "a", "b" }) do
		os.remove(defsave.get_file_path(p.id .. "_" .. suffix))
	end
	backend.release()
end
return M
