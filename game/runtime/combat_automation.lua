-- Debug bridge adapter; all writes go through the normal session/save boundary.
local Stats = require("game.domain.stats")
local M = {}

---@param p table|nil Committed profile only.
---@param session table
function M.publish(p, session)
	if not automation_bridge then
		return
	end
	local state = {
		screen = session.screen,
		modal = session.modal or "",
		error = session.error or "",
		notice = session.notice or "",
	}
	if p then
		state.profile = {
			id = p.id,
			revision = p.revision,
			phase = p.phase,
			race = p.race,
			pools = p.pools,
			skills = p.skills,
			items = p.items,
			gold = p.gold,
			position = p.position,
		}
		state.stats = Stats.current(p)
		if p.run then
			state.rooms = p.run.map.rooms
		end
		if p.battle then
			local b = p.battle
			state.battle = {
				id = b.id,
				turn = b.turn,
				started = b.started,
				active = b.order[b.cursor],
				enemies = b.enemies,
				statuses = b.statuses,
				cooldowns = b.cooldowns,
				outcome = b.outcome,
				random_draws = b.random.raw_draw_count,
				events = p.last_events,
			}
		end
	end
	automation_bridge.publish("combat", state)
end

---@param session table Normal runtime session interface.
function M.register(session)
	if not automation_bridge then
		return
	end
	automation_bridge.command("combat.command", function(data)
		local accepted = session.command(data)
		return { accepted = accepted, reason = session.notice or session.error or "" }
	end)
	automation_bridge.command("combat.create", function(data)
		return { accepted = session.create(data.name, data.race, data.age, data.talent) }
	end)
	automation_bridge.command("combat.select", function(data)
		return { accepted = session.select(data.id) }
	end)
	automation_bridge.command("combat.panel", function(data)
		return { accepted = session.panel(data.name ~= "" and data.name or nil) }
	end)
	automation_bridge.command("combat.reload", function()
		session.reload()
		return { accepted = session.error == nil }
	end)
end
return M
