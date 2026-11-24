local U = require("game.util")
local Intent = require("game.model.intent")
local M = { PLAYER_CHARGE_SECONDS = 2.5, ENEMY_CHARGE_SECONDS = 4.5 }
local C = {}
C.__index = C
local actions = { attack = true, defend = true, smash = true, counterattack = true, windmill = true }
local function finite_integer(v)
	return type(v) == "number" and v == v and v ~= math.huge and v ~= -math.huge and v == math.floor(v)
end
local function mitigate(d, def, p)
	return math.ceil(math.max(0, d - (def or 0)) * (1 - math.max(0, math.min(100, p or 0)) / 100))
end
function M.new(o)
	o = o or {}
	local s = o.player or {}
	local self = setmetatable(
		{
			character = U.copy(s),
			max_health = s.life or s.max_health or 100,
			max_stamina = s.stamina or 50,
			player_gauge = 0,
			guarded = false,
			countering = false,
			enemies = {},
			target = 1,
			events = {},
			training_events = {},
			round_number = 0,
			seed = o.seed or 1,
			weapon = o.weapon or {},
		},
		C
	)
	self.health = o.health or self.max_health
	if self.health < 0 then
		self.health = self.max_health
	end
	self.health = math.max(1, math.min(self.health, self.max_health))
	self.stamina = self.max_stamina
	for i, d in ipairs(o.enemies or {}) do
		if type(d) ~= "table" or not finite_integer(d.health) or d.health <= 0 then
			self.enemies = {}
			self.active = false
			self:sync()
			return self
		end
		self.enemies[i] = {
			stats = U.copy(d),
			health = d.health or 1,
			gauge = 0,
			actions = 0,
			charge_seconds = 4.5 + (i - 1) * 0.65,
			can_attack = finite_integer(d.damage_min)
				and finite_integer(d.damage_max)
				and d.damage_min >= 0
				and d.damage_max >= d.damage_min,
		}
		for _, key in ipairs({ "defense", "protection", "critical" }) do
			if not finite_integer(self.enemies[i].stats[key]) then
				self.enemies[i].stats[key] = 0
			end
		end
		self.enemies[i].intent = Intent.choose(self.enemies[i].can_attack, 0)
	end
	self.rng = o.rng
	self.active = #self.enemies > 0
	self:sync()
	return self
end
function C:sync()
	self.player_health = self.health
	self.player_stamina = self.stamina
	self.enemy_gauge = self.enemies[1] and self.enemies[1].gauge or 0
	self.won = #self.enemies > 0 and self.health > 0 and not self:living()
end
function C:living()
	for _, e in ipairs(self.enemies) do
		if e.health > 0 then
			return true
		end
	end
	return false
end
function C:random()
	if self.rng then
		return self.rng:float()
	end
	self.seed = (self.seed * 16807) % 2147483647
	return self.seed / 2147483647
end
function C:range(a, b)
	if self.rng then
		return self.rng:range(a, b)
	end
	return a + math.floor(self:random() * (b - a + 1))
end
function C:emit(message, damage, actor)
	local e = {
		action = self.resolving_action,
		weapon_wear = self.last_player_hit and (self.resolving_action == "smash" and 30 or 25) or 0,
		armor_hit = not not self.last_enemy_hit,
		message = message,
		reason = message,
		damage = damage or 0,
		actor = actor,
		training = U.copy(self.training_events),
	}
	self.events[#self.events + 1] = e
	return e
end
function C:effect(id)
	return (self.character.skill_effects or {})[id] or {}
end
function C:stamina_cost(a)
	return self:effect(a).stamina_use or ({ attack = 2, smash = 6, counterattack = 4, windmill = 8 })[a] or 0
end
function C:select_target(i)
	if self.enemies[i] and self.enemies[i].health > 0 then
		self.target = i
		return true
	end
	return false
end
function C:allowed(a)
	if not actions[a] then
		return false
	end
	local required = ({ defend = "defense", smash = "smash", counterattack = "counterattack", windmill = "windmill" })[a]
	if required and self.character.learned_skills then
		local found = false
		for _, id in ipairs(self.character.learned_skills) do
			if id == required then
				found = true
			end
		end
		if not found then
			return false
		end
	end
	return self.stamina >= self:stamina_cost(a)
end
function C:queue(a, i)
	if not self:allowed(a) or not self.active or (i and not self:select_target(i)) then
		return false
	end
	self.queued_action = a
	return true
end
function C:roll()
	local s = self.character
	local lo = s.damage_min or 4
	local hi = s.damage_max or lo
	if hi <= lo then
		return lo
	end
	local median = lo + (hi - lo) * (s.balance or 50) / 100
	local z = math.sqrt(-2 * math.log(math.max(1e-10, self:random()))) * math.cos(6.283185307 * self:random())
	return math.max(lo, math.min(hi, math.floor(median + z * math.max(median - lo, hi - median) / 2 + 0.5)))
end
function C:outgoing(d, e)
	return mitigate(d, math.max(0, (e.stats.defense or 0) - (self.character.armor_pierce or 0)), e.stats.protection)
end
function C:act(a, i)
	if not self:allowed(a) or not self.active then
		return false
	end
	if i and not self:select_target(i) then
		return false
	end
	if self.player_gauge < 1 then
		return self:queue(a, i)
	end
	local e = self.enemies[self.target]
	if not e or e.health <= 0 then
		return false
	end
	local cost = self:stamina_cost(a)
	if self.stamina < cost then
		return false, "Not enough stamina. Defend to recover it."
	end
	self.resolving_action = a
	self.last_player_hit = false
	self.last_enemy_hit = false
	self.training_events = {}
	self.stamina = self.stamina - cost
	self.guarded = a == "defend"
	self.countering = a == "counterattack"
	local d = 0
	local reason = ""
	if self.guarded then
		self.stamina = math.min(self.max_stamina, self.stamina + 4)
		reason = "You guard."
		self.training_events = { "use_defense" }
	elseif self.countering then
		reason = "You prepare Counterattack."
		self.training_events = { "use_a_counterattack" }
	elseif a == "smash" and e.intent == "attack" then
		reason = "Smash interrupted."
	else
		self.last_player_hit = true
		d = self:roll()
		self.training_events = { "attack" }
		if next(self.weapon) ~= nil and (self.weapon.weapon_type or "sword") == "sword" then
			table.insert(self.training_events, "attack_an_enemy_with_sword")
		end
		if a == "smash" then
			local f = self:effect("smash")
			d = math.ceil(d * (f.damage_human_elf or 100) / 100) + (next(f) == nil and 3 or 0)
			if self.weapon.hands == 2 then
				d = math.ceil(
					d * (tonumber(tostring(f.additional_multiplier_two_handed_weapons or "x1.2"):gsub("x", "")) or 1.2)
				)
			end
			table.insert(self.training_events, "use_the_skill_successfully")
			table.insert(self.training_events, "knock_down_an_enemy")
		elseif a == "windmill" then
			d = math.ceil(d * (self:effect(a).human_giant_damage or 100) / 100)
			table.insert(self.training_events, "windmill_attack")
		end
		local critical_chance = (self.character.critical or 0)
		if a == "smash" and self.weapon.hands == 2 then
			critical_chance = critical_chance + (self:effect("smash").additional_critical_two_handed_weapons or 5)
		end
		critical_chance = math.max(0, math.min(30, critical_chance - (e.stats.protection or 0) * 2))
		if critical_chance > 0 and self:random() * 100 < critical_chance then
			d = math.ceil(d * (self.character.critical_multiplier or 1.5))
			table.insert(self.training_events, "score_a_critical_hit")
		end
		local critical = false
		for _, event in ipairs(self.training_events) do
			if event == "score_a_critical_hit" then
				critical = true
			end
		end
		if critical and a == "smash" then
			table.insert(self.training_events, "get_a_critical_hit_with_smash")
		end
		local base = d
		d = self:outgoing(d, e)
		if e.intent == "defend" and a ~= "smash" then
			d = math.ceil(d / 2)
			reason = "Enemy guards."
			table.insert(self.training_events, "observe_an_enemy_using_the_defense_skill")
			table.insert(self.training_events, "watch_an_enemy_defend_itself")
		elseif e.intent == "defend" and a == "smash" then
			reason = "Guard broken."
			table.insert(self.training_events, "land_a_special_skill_on_a_defending_enemy")
			table.insert(self.training_events, "successful_in_using_a_special_skill_to_attack_a_defending_enemy")
		end
		if a == "windmill" then
			local targets, defeated = 1, (e.health - d <= 0 and 1 or 0)
			table.insert(self.training_events, "knock_down_an_enemy")
			for _, other in ipairs(self.enemies) do
				if other ~= e and other.health > 0 then
					targets = targets + 1
					local hit = self:outgoing(base, other)
					if other.intent == "defend" then
						hit = math.ceil(hit / 2)
					end
					other.health = math.max(0, other.health - hit)
					if other.health == 0 then
						defeated = defeated + 1
						table.insert(self.training_events, "windmill_defeat_enemy")
						table.insert(self.training_events, "defeat_enemy")
						if next(self.weapon) ~= nil and (self.weapon.weapon_type or "sword") == "sword" then
							table.insert(self.training_events, "defeat_an_enemy_with_sword")
						end
					end
				end
			end
			if targets >= 4 then
				table.insert(self.training_events, "attack_4_or_more_enemies")
			end
			if defeated >= 4 then
				table.insert(self.training_events, "defeat_4_or_more_enemies")
			end
			reason = reason .. " Windmill hits " .. targets .. " enemies."
		end
		if a == "attack" and e.intent == "smash" then
			e.gauge = 0
			e.intent = "defend"
			reason = "Enemy Smash interrupted."
		end
		e.health = math.max(0, e.health - d)
		reason = reason .. " Dealt " .. d .. " damage."
		if e.health == 0 then
			table.insert(self.training_events, "defeat_enemy")
			if next(self.weapon) ~= nil and (self.weapon.weapon_type or "sword") == "sword" then
				table.insert(self.training_events, "defeat_an_enemy_with_sword")
			end
			if a == "smash" then
				table.insert(self.training_events, "use_smash_as_the_final_blow")
				table.insert(self.training_events, "perform_a_finishing_blow_with_smash")
				if critical then
					table.insert(self.training_events, "get_a_critical_hit_as_the_final_blow")
				end
			end
			if critical then
				table.insert(self.training_events, "finish_off_an_enemy_with_a_critical_hit")
			end
			if a == "windmill" then
				table.insert(self.training_events, "windmill_defeat_enemy")
			end
			reason = reason .. " " .. (e.stats.name or "Enemy") .. " defeated."
		end
	end
	self.player_gauge = 0
	self.queued_action = nil
	self.round_number = self.round_number + 1
	self.active = self.health > 0 and self:living()
	self:sync()
	return self:emit(reason, d, "player")
end
function C:act_enemy(i)
	i = i or 1
	local e = self.enemies[i]
	if not self.active or not e or e.health <= 0 or e.gauge < 1 then
		return false
	end
	self.resolving_action = e.intent
	self.last_player_hit = false
	self.last_enemy_hit = false
	self.training_events = {}
	local d = 0
	local name = e.stats.name or "Enemy"
	local reason = name .. " guards."
	if e.intent ~= "defend" and e.can_attack then
		self.last_enemy_hit = true
		local normal = self:range(e.stats.damage_min, e.stats.damage_max)
		local hit = normal + (e.intent == "smash" and 3 or 0)
		d = mitigate(hit, self.character.defense, self.character.protection)
		if self.countering then
			local f = self:effect("counterattack")
			local reflected = normal * (f.damage_from_opponent_human_giant or 50) / 100
			local crit = (e.stats.critical or 0) + (f.additional_critical_upon_activation or 0)
			if crit > 0 and self:random() * 100 < math.min(crit, 30) then
				reflected = reflected * 1.5
				table.insert(self.training_events, "score_a_critical_hit")
				table.insert(self.training_events, "counterattack_with_a_critical_hit")
			end
			reflected = reflected + self:roll() * (f.damage_from_self_human_elf or 50) / 100
			local damage = self:outgoing(math.ceil(reflected), e)
			e.health = math.max(0, e.health - damage)
			d = 0
			self.last_enemy_hit = false
			self.countering = false
			reason = "You counter " .. name .. " for " .. damage .. " damage."
			table.insert(self.training_events, "attack")
			table.insert(self.training_events, "knock_down_an_enemy")
			table.insert(
				self.training_events,
				e.intent == "smash" and "counter_an_enemy_s_special_attack" or "counter_an_enemy_s_attack"
			)
			if e.health == 0 then
				table.insert(self.training_events, "defeat_enemy")
			end
		elseif self.guarded and e.intent == "attack" then
			local f = self:effect("defense")
			d = math.ceil(
				mitigate(
					hit,
					(self.character.defense or 0) + (f.defense_bonus_human_elf or 0),
					(self.character.protection or 0) + (f.protection_bonus_human_elf or 0)
				) / 2
			)
			reason = "You guard against " .. name .. "."
			self.training_events = { "block_attack" }
		else
			reason = name .. (self.guarded and " breaks your guard." or " strikes.")
		end
		if self.last_enemy_hit and self.character.light_armor_equipped then
			table.insert(self.training_events, "take_melee_attacks_while_wearing_light_armor")
		end
		self.guarded = false
	else
		self.training_events = { "observe_an_enemy_using_the_defense_skill", "watch_an_enemy_defend_itself" }
	end
	self.health = math.max(0, self.health - d)
	e.gauge = 0
	e.actions = e.actions + 1
	e.intent = Intent.choose(e.can_attack, e.actions)
	self.active = self.health > 0 and self:living()
	self:sync()
	return self:emit(reason .. (d > 0 and (" Took " .. d .. " damage.") or ""), d, "enemy")
end
function C:advance_time(dt)
	if not self.active or type(dt) ~= "number" or dt ~= dt or dt <= 0 or dt == math.huge then
		return
	end
	self.player_gauge = math.min(1, self.player_gauge + dt / 2.5)
	for _, e in ipairs(self.enemies) do
		if e.health > 0 then
			e.gauge = math.min(1, e.gauge + dt / e.charge_seconds)
		end
	end
	self:sync()
end
-- Advance to readiness boundaries instead of discarding elapsed time at saturation.
-- At a simultaneous boundary enemy indices resolve first, as in Godot _process.
function C:advance(dt)
	self.events = {}
	if not self.active or type(dt) ~= "number" or dt ~= dt or dt <= 0 or dt == math.huge then
		return self.events
	end
	local remaining = dt
	while self.active do
		local boundary = remaining
		for _, e in ipairs(self.enemies) do
			if e.health > 0 then
				boundary = math.min(boundary, math.max(0, (1 - e.gauge) * e.charge_seconds))
			end
		end
		if self.queued_action and self.stamina >= self:stamina_cost(self.queued_action) then
			boundary = math.min(boundary, math.max(0, (1 - self.player_gauge) * 2.5))
		end
		self:advance_time(boundary)
		for _, e in ipairs(self.enemies) do
			if e.gauge > 1 - 1e-10 then
				e.gauge = 1
			end
		end
		if self.player_gauge > 1 - 1e-10 then
			self.player_gauge = 1
		end
		remaining = math.max(0, remaining - boundary)
		local resolved = false
		for i in ipairs(self.enemies) do
			if self:enemy_ready(i) then
				self:act_enemy(i)
				resolved = true
			end
		end
		if self.queued_action and self:player_ready() and self.stamina >= self:stamina_cost(self.queued_action) then
			local result = self:act(self.queued_action)
			resolved = resolved or not not result
		end
		if remaining < 1e-10 or (boundary == 0 and not resolved) then
			break
		end
	end
	self:sync()
	return self.events
end
function C:use_item(id, amount)
	if amount ~= nil and (type(amount) ~= "number" or amount ~= amount or amount <= 0 or amount == math.huge) then
		return false
	end
	if id ~= "tonic" or self.health >= self.max_health or not self.active then
		return false
	end
	self.resolving_action = "tonic"
	self.last_player_hit = false
	self.last_enemy_hit = false
	self.training_events = {}
	local healed = math.min(amount or 30, self.max_health - self.health)
	self.health = self.health + healed
	self:sync()
	return self:emit("Healing Tonic restores " .. healed .. " Life.", -healed, "item")
end
function C:player_ready()
	return self.active and self.player_gauge >= 1
end
function C:enemy_ready(i)
	local e = self.enemies[i or 1]
	return self.active and e and e.health > 0 and e.gauge >= 1
end
function C:snapshot()
	local state = {}
	for k, v in pairs(self) do
		if k ~= "events" and k ~= "rng" then
			state[k] = U.copy(v)
		end
	end
	if self.rng and self.rng.state then
		state.rng_state = U.copy(self.rng:state())
	end
	return state
end
function C:restore(state)
	local rng = self.rng
	for k in pairs(self) do
		self[k] = nil
	end
	for k, v in pairs(state) do
		self[k] = U.copy(v)
	end
	self.rng = rng
	if rng and state.rng_state then
		if rng.restore then
			rng:restore(state.rng_state)
		elseif rng.set_state then
			rng:set_state(state.rng_state)
		end
	end
	self.rng_state = nil
	self.events = {}
	self:sync()
end
function C:state()
	return self:snapshot()
end
function M.resolve(player, enemy, damage, defense)
	local out = player == "defend" and 0 or damage or 4
	local incoming = enemy == "defend" and 0 or damage or 4
	if player == "smash" then
		out = enemy == "attack" and 0 or out + 3
	end
	if enemy == "smash" then
		incoming = player == "attack" and 0 or incoming + 3
	end
	if enemy == "defend" and player ~= "smash" then
		out = math.ceil(out / 2)
	end
	if player == "defend" and enemy ~= "smash" then
		incoming = math.ceil(incoming / 2)
	end
	return { outgoing = out, incoming = incoming }
end
return M
