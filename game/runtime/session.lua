local C = require("game.content.catalog")
local U = require("game.domain.util")
local Ch = require("game.domain.character")
local Cmd = require("game.domain.commands")
local Q = require("game.services.quests")
local Save = require("game.services.save")
local B = require("game.domain.battle")
local Event = require("event.event")
local M = {
	changed = Event.create(),
	screen = "title",
	modal = nil,
	read_only = false,
	error = nil,
	notice = nil,
	ready = false,
	settings = { music = 0.4, effects = 0.65, reduced_motion = false, hud_scale = 1 },
	controls = {},
}
local current, store, backend, pending, sequence, delay, epoch = nil, nil, nil, nil, 0, 0, 0
function M.snapshot()
	return current and U.copy(current)
end
local function publish()
	epoch = epoch + 1
	M.epoch = epoch
	M.changed:trigger(M.snapshot())
end
function M.clear_controls()
	M.controls = {}
	M.path_target = nil
	M.control_epoch = (M.control_epoch or 0) + 1
end
function M.init()
	backend = Save.defsave_backend()
	store = Save.new(backend)
	M.read_only = not backend.lock()
	if M.read_only then
		M.notice = "Save storage is locked or unavailable. Close another instance or check folder access."
	end
	local settings = backend.read("settings")
	if settings and settings.version == 1 and U.finite(settings.music) and U.finite(settings.effects) then
		M.settings.music = U.clamp(settings.music, 0, 1)
		M.settings.effects = U.clamp(settings.effects, 0, 1)
		M.settings.reduced_motion = settings.reduced_motion == true
		M.settings.hud_scale = U.clamp(settings.hud_scale or 1, 1, 1.3)
	end
	M.profiles, M.recovery_errors = store:list()
	M.ready = true
	publish()
end
function M.list()
	M.profiles, M.recovery_errors = store:list()
	return U.copy(M.profiles)
end
function M.set_screen(screen)
	M.screen = screen
	M.modal = nil
	M.clear_controls()
	publish()
end
function M.panel(panel, storyteller)
	if
		panel == "goddess"
		and (not current or current.phase ~= "dungeon" or not current.run or not current.run.cleared.room_5)
	then
		return false
	end
	if panel == "leave_dungeon" and (not current or current.phase ~= "dungeon" or not current.run) then
		return false
	end
	local parent = panel == "settings" and M.modal == "menu" and "menu"
		or panel == "abandon" and M.modal == "menu" and "menu"
		or panel == "log" and M.modal == "menu" and "menu"
		or panel == "dialogue" and (storyteller or M.dialogue_service)
		or nil
	local service = C.services[panel] and panel or panel == "dialogue" and (storyteller or M.dialogue_service)
	if
		(C.services[panel] or panel == "dialogue")
		and (not current or M.screen ~= current.phase or not Cmd.service_available(current, service))
	then
		M.notice = "Walk closer to the service in town"
		publish()
		return false
	end
	M.dialogue_service = panel == "dialogue" and service or nil
	M.modal_parent = parent
	M.modal = panel
	M.clear_controls()
	publish()
	return true
end
function M.close_panel()
	local parent = M.modal_parent
	M.modal_parent = nil
	M.panel(parent)
end
function M.refresh()
	publish()
end
local function accept(candidate)
	local changed_phase = not current or current.phase ~= candidate.phase
	current = candidate
	M.error = nil
	pending = nil
	M.screen = current.phase
	delay = M.settings.reduced_motion and 0.08 or 0.55
	if changed_phase then
		M.modal = nil
		M.clear_controls()
	end
	publish()
end
function M.command(c)
	if M.read_only or M.error or M.busy or not current then
		return false
	end
	sequence = sequence + 1
	c = U.copy(c)
	c.op = c.op or current.id .. ":" .. current.revision .. ":" .. sequence
	c.revision = c.revision or current.revision
	local ok, candidate, duplicate =
		pcall(Cmd.execute, current, c, { now = os.time(), dialogue = require("game.services.dialogue").advance })
	if not ok then
		M.notice = tostring(candidate)
		publish()
		return false
	end
	if duplicate then
		return true
	end
	M.busy = true
	local saved, err = store:commit(candidate)
	M.busy = false
	if not saved then
		pending = candidate
		M.error = err
		M.clear_controls()
		publish()
		return false
	end
	M.notice = nil
	accept(candidate)
	return true
end
function M.retry()
	if not pending then
		return
	end
	local ok, err = store:commit(pending)
	if ok then
		accept(pending)
	else
		M.error = err
		publish()
	end
end
function M.reload()
	if not current then
		return
	end
	local p, err = store:load(current.id)
	if not p then
		M.error = err
		publish()
		return
	end
	M.notice = err
	accept(p)
end
function M.create(name, race, age, talent)
	if M.read_only then
		return false
	end
	local clean, reason = Ch.name(name)
	if not clean then
		M.notice = reason
		publish()
		return false
	end
	local profiles = store:list()
	for _, p in ipairs(profiles) do
		if p.name:lower() == clean:lower() then
			M.notice = "That name is already taken"
			publish()
			return false
		end
	end
	local id
	for i = 1, 20 do
		local slot = string.format("profile_%02d", i)
		local _, _, exists = store:load(slot)
		if not exists then
			id = slot
			break
		end
	end
	if not id then
		M.notice = "All 20 character slots are occupied"
		publish()
		return false
	end
	local now = os.time()
	local seed = (now * 37 + sequence * 997 + tonumber(id:sub(-2))) % 4294967296
	local ok, p = pcall(Ch.new, id, clean, race, age, talent, now, seed)
	if not ok then
		M.notice = tostring(p)
		publish()
		return false
	end
	Q.evaluate(p, {})
	p.revision = 1
	local saved, err = store:commit(p)
	if not saved then
		M.notice = err
		publish()
		return false
	end
	M.notice = nil
	M.modal = nil
	accept(p)
	return true
end
function M.select(id)
	local p, err = store:load(id)
	if not p then
		M.notice = err
		publish()
		return false
	end
	current = p
	M.notice = err
	M.modal = nil
	if not p.run and not M.read_only then
		-- Aging is reconciled before publishing a selected profile.
		return M.command({ type = "age" })
	end
	accept(p)
	return true
end
function M.update(dt)
	if not current or M.modal or M.error or M.read_only or M.busy or M.screen ~= current.phase then
		return
	end
	delay = math.max(0, delay - dt)
	if current.phase == "battle" and delay == 0 then
		local b = current.battle
		if not b.started then
			M.command({ type = "begin_turn", battle = b.id, turn = b.turn })
		elseif not B.active(current).hero then
			M.command(B.ai(current))
		end
	end
end
function M.set_setting(key, value)
	if M.read_only then
		return
	end
	local candidate = U.copy(M.settings)
	candidate[key] = value
	candidate.version = 1
	local ok, result = pcall(backend.write, "settings", candidate)
	if not ok or not result then
		M.notice = "Settings could not be saved"
		publish()
		return
	end
	M.settings = candidate
	publish()
end
function M.finish()
	if backend then
		backend.release()
	end
end
return M
