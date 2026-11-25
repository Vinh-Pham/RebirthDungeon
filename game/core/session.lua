local U = require("game.util")
local Entity = require("game.core.entity")
local Events = require("game.core.events")
local Scheduler = require("game.core.scheduler")
local Dialogue = require("game.systems.dialogue")
local Environment = require("game.systems.environment")
local Faction = require("game.systems.faction")
local Encounters = require("game.generation.encounters")
local Catalog = require("game.data.catalog")
local Data = require("game.data.characters")
local Profile = require("game.persistence.migrations")
local Stats = require("game.systems.anatomy")
local Skills = require("game.systems.skills")
local Inventory = require("game.systems.inventory")
local Equipment = require("game.systems.equipment")
local Economy = require("game.systems.economy")
local Loot = require("game.systems.loot")
local Combat = require("game.systems.combat")
local World = require("game.core.world")
local Rng = require("game.core.rng")
local Quests = require("game.systems.quests")
local Storage = require("game.persistence.save")
local Settings = require("game.services.settings")
local Input = require("game.services.input")
local M = {}
local S = {}
S.__index = S

local names = { lantern_rest = "Lantern Rest", spindle_hollow = "Spindle Hollow", threshold = "The Threshold" }

local function option(id, label, params)
	return { id = id, label = label, params = params }
end

function M.new(options)
	options = options or {}
	local self = setmetatable({
		store = options.store or Storage.new(),
		screen = "title",
		revision = 0,
		log = {},
		forms = {
			name = "",
			race = 0,
			gender = 0,
			age = 17,
			talent = 0,
			body = 1,
			hair = 0,
			hair_color = 0,
			skin = 1,
			eyes = 0,
			eye_color = 0,
			face = 0,
		},
		clock = options.clock or os.time,
		settings = options.settings or Settings.load(),
		save_settings = options.save_settings or Settings.save,
		selected_skill = 1,
		shoprows = {},
		move_queue = {},
		move_timer = 0,
		combat = nil,
		quick_index = 1,
	}, S)
	self.entities = options.decore and Entity.new(options.decore)
	self.form = self.forms
	self.input = options.input or Input.new(options.input_options)
	self.profiles = self.store:list()
	local last_character = self.store:resume_id()
	if last_character then
		self:load_character(last_character, true)
	end
	return self
end

function S:touch()
	self.revision = self.revision + 1
end
function S:note(message)
	if message and message ~= "" then
		self.message = message
		Events.append(self.log, message)
		self:touch()
	end
end
function S:adopt(profile, rebuild)
	self.profile = profile
	self.inventory = assert(Inventory.new(profile.world))
	self.weapon = Catalog.items()[self.inventory:serialize().equipped] or {}
	self.stats = Stats.calculate(profile, self.weapon)
	self.skills = Skills.entries(profile, self.service and self.service.id == "school")
	if rebuild or not self.world then
		self.world = World.new(profile)
	else
		self.world.profile, self.world.world = profile, profile.world
	end
	self.profiles = self.store:list()
	self:touch()
end
function S:commit(changes, message, experience)
	if not self.profile then
		return false
	end
	local previous = self.profile
	local candidate, err = Profile.update(previous, changes or {})
	if not candidate then
		self:note(err)
		return false
	end
	candidate.experience = math.min(2000000000, candidate.experience + (experience or 0))
	local saved
	saved, err = self.store:save(candidate)
	if not saved then
		self:note(err or "Progress could not be saved. Please try again.")
		return false
	end
	self:adopt(saved)
	self:note(message)
	return true
end

function S:open_panel(name)
	self.move_queue = {}
	self.panel, self.modal = name, nil
	if name == "skills" then
		self.skills = Skills.entries(self.profile, self.service and self.service.id == "school")
	end
	if name == "gates" then
		local options = {}
		for _, town in ipairs(self.profile.world.gates) do
			if town ~= self.profile.world.location then
				options[#options + 1] = option("gate_travel", "Travel to " .. names[town], { town = town })
			end
		end
		self.modal = {
			title = "Moon Gates",
			body = "Gates remember the settlements you have visited in person. Registered gates are available from anywhere in the dungeon.",
			options = options,
		}
	end
	self:touch()
end
function S:say(title, body, choices)
	self.panel = "dialogue"
	self.modal = { title = title, body = body, options = choices or {} }
	self.move_queue = {}
	self:touch()
end
function S:near(id)
	if not self.world or self.combat and self.combat.active then
		return false
	end
	return Entity.nearby_landmark(self.entities, self.world, id)
end
function S:choose_service(place)
	self.service = place
	local w = self.profile.world
	local title = place.name or place.label or place.id
	local id = place.id
	if id == "warden" then
		local choices = {}
		if w.location == "lantern_rest" and w.quest == 0 then
			choices[1] = option("quest_accept", "Accept passage quest")
		end
		if w.location == "spindle_hollow" and w.quest == 2 then
			choices[1] = option("quest_reward", "Complete quest · 32 gold")
		end
		self:say(
			title,
			w.location == "lantern_rest"
					and "Speak to Venn for a blade, then carry our signal through the dungeon to Watchkeeper Oren in Spindle Hollow."
				or "Your arrival means the road is open again. Rest here, and awaken our Moon Gate.",
			choices
		)
	elseif id == "blacksmith" then
		local choices = { option("shop_open", "Browse equipment"), option("repair_open", "Repair equipment") }
		if not w.starter_sword_claimed then
			choices[#choices + 1] = option("starter_sword", "Claim starter sword")
		end
		if not w.armor_owned then
			choices[#choices + 1] = option("armor", "Claim Riveted Jack")
		end
		self:say(title, "A good blade and sound armor will bring you back to town.", choices)
	elseif id == "general_shop" then
		self:say(title, "Stock up before taking the lower road.", {
			option("buy_tonic", "Buy Healing Tonic · 8 gold"),
			option("pouch_shop", "Browse gold pouches"),
			option("activity", "Buy fiber · 3 gold", { action = "buy_fiber" }),
			option("activity", "Sell cloth · 4 gold", { action = "sell_cloth" }),
		})
	elseif id == "school" then
		self:say(title, "Train through action, study the principles, and spend AP when your rank is ready.", {
			option("school", "Study skills"),
			option("combat_lesson", "Ask about combat"),
		})
	elseif id == "church" then
		self:say(
			title,
			"The Moon Gates join the towns we remember. Touch a gate to register it. Once awakened, you may travel to it from anywhere."
		)
	elseif id == "grocery_store" then
		self:say(
			title,
			"Mill grain into flour at the windmill, then bake it at the oven.",
			{ option("activity", "Buy grain · 2 gold", { action = "buy_grain" }) }
		)
	elseif id == "healer" then
		self:say(title, "Rest here until your strength returns.", { option("heal", "Rest and recover") })
	elseif id == "oven" then
		self:say(title, "Prepare a meal to recover up to 15 Life.", {
			option("activity", "Cook cave fish", { action = "cook_fish" }),
			option("activity", "Bake bread", { action = "bake" }),
		})
	elseif id == "loom" then
		self:say(
			title,
			"Weave thread into cloth. Tamsin buys finished cloth at the General Shop.",
			{ option("activity", "Weave cloth", { action = "weave" }) }
		)
	elseif id == "spinning_wheel" then
		self:say(
			title,
			"Spin fiber into thread for the loom.",
			{ option("activity", "Spin thread", { action = "spin" }) }
		)
	elseif id == "fishing" then
		self:say(
			title,
			"Cave fish gather in the quiet pools.",
			{ option("activity", "Cast your line", { action = "fish" }) }
		)
	elseif id == "windmill" then
		self:say(
			title,
			"Grind grain into flour for the oven.",
			{ option("activity", "Mill grain", { action = "mill" }) }
		)
	elseif id == "tree" then
		local key = w.location .. ":" .. place.x .. ":" .. place.y
		local state = Environment.tree_status(w, key, self.clock())
		self:say(
			"Cavewood",
			string.format("%d pieces ready. One piece regrows every five minutes.", state.count),
			{ option("chop", "Collect firewood", { key = key }) }
		)
	elseif id == "gate" then
		local choices = {}
		if not U.contains(w.gates, w.location) then
			choices[#choices + 1] = option("gate_register", "Touch the mechanism to register this gate")
		end
		for _, town in ipairs(w.gates) do
			if town ~= w.location then
				choices[#choices + 1] = option("gate_travel", "Travel to " .. names[town], { town = town })
			end
		end
		self:say(
			"Moon Gate",
			"Pale light traces a crescent through the stone. A gate must be visited and registered in person.",
			choices
		)
	elseif id == "bank" then
		self:say("Ledger Keeper", "Store gold here to make room in your bag.", {
			option("bank", "Deposit 10 gold", { amount = 10, deposit = true }),
			option("bank", "Deposit all carried gold", { amount = w.gold, deposit = true }),
			option("bank", "Withdraw 10 gold", { amount = 10, deposit = false }),
			option("bank", "Withdraw all bank gold", { amount = w.bank_gold, deposit = false }),
		})
	elseif id == "dungeon" then
		self:say(
			"The Threshold",
			"Hostile chambers connect Lantern Rest to Spindle Hollow. Defeat the enemies in each chamber to open the passage.",
			{ option("enter_dungeon", "Enter the Threshold") }
		)
	elseif id == "exit" then
		self:dispatch("next_room")
	elseif id == "passage" then
		self:dispatch("dungeon_passage", { target = place.target })
	elseif id:find("chest") then
		local number = tonumber(id:match("(%d+)$")) or 0
		self:dispatch("chest", { index = number + 1 })
	elseif id == "practice" then
		self:dispatch("practice")
	elseif id == "rack" then
		self:dispatch("armory_open", { family = place.family })
	elseif id == "entry" then
		self:transition(function(world)
			return world:previous_room()
		end)
	end
end

function S:load_character(id, resuming)
	if not self.store:select(id) then
		self:note("Could not load that character.")
		return false
	end
	local profile = self.store:load_selected()
	if not profile then
		return false
	end
	if
		profile.world.location ~= "arrival"
		and profile.world.location ~= "threshold"
		and not U.contains(profile.world.visited, profile.world.location)
	then
		profile.world.visited[#profile.world.visited + 1] = profile.world.location
		profile = self.store:save(profile) or profile
	end
	self.combat, self.panel, self.modal, self.service = nil, nil, nil, nil
	self.move_queue = {}
	self.arrival_spoken = false
	self:adopt(profile, true)
	self.screen = profile.world.location == "arrival" and "arrival" or "world"
	if next(profile.world.pending_loot) then
		self:open_panel("loot")
	end
	if not resuming and not self.store:remember_selected() then
		self:note("Could not remember the selected character for next launch.")
	end
	return true
end
function S:create_character()
	local form = U.copy(self.forms)
	if not form.name or form.name:match("^%s*$") then
		self:note("Enter a character name first.")
		return false
	end
	form.world = form.world or { location = "arrival" }
	local profile, err = self.store:create(form)
	if not profile then
		self:note(err)
		return false
	end
	return self:load_character(profile.id)
end
function S:cycle_form(field, direction)
	local choices = Data.CREATION_CHOICES[field]
	direction = direction or 1
	if field == "age" then
		local min_age, max_age = Data.MIN_START_AGE, Data.MAX_START_AGE
		self.forms.age = min_age + (self.forms.age - min_age + direction) % (max_age - min_age + 1)
	elseif field == "talent" then
		local available = Data.available_talents(self.forms.race)
		local index = 1
		for i, v in ipairs(available) do
			if v == self.forms.talent then
				index = i
			end
		end
		self.forms.talent = available[(index - 1 + direction) % #available + 1]
	elseif choices then
		self.forms[field] = (self.forms[field] + direction) % #choices
		if field == "race" and not U.contains(Data.available_talents(self.forms.race), self.forms.talent) then
			self.forms.talent = 0
		end
	end
	self:touch()
end
function S:move(dx, dy)
	if self.screen ~= "world" or self.panel or self.combat and self.combat.active then
		return false
	end
	local before = self.world.player
	local previous = U.copy(self.profile)
	local previous_world = U.copy(self.world)
	local previous_enemies = U.copy(self.world.enemies)
	local previous_random = self.world.rng:state()
	local ok, reason, enemy = self.world:move(dx, dy)
	if not ok then
		if reason == "encounter" then
			self:start_combat(enemy)
		elseif reason == "Defeat all enemies first."
			or reason == "Clear the remaining chambers before entering the boss room."
			or reason == "Collect or leave the treasure before exiting." then
			self:note(reason)
		end
		return false
	end
	local changes = U.copy(self.world.world)
	self.profile = previous
	if not self:commit(changes, reason ~= "encounter" and reason or nil) then
		self.world.player = before
		self.world.profile = previous
		self.world.world = previous.world
		self.world.visible = previous_world.visible
		self.world.enemies = previous_enemies
		self.world.map.enemies = previous_enemies
		self.world.rng:restore(previous_random)
		if self.world.room ~= previous_world.room or self.world.currentLocation ~= previous_world.currentLocation then
			local restored = previous_world
			setmetatable(restored, getmetatable(self.world))
			restored.profile, restored.world = previous, previous.world
			restored.rng = Rng.new(previous_random)
			self.world = restored
		end
		return false
	end
	if reason == "encounter" then
		self:start_combat(enemy)
	end
	return true
end
function S:transition(fn)
	if self.combat and self.combat.active then
		return false
	end
	local before = U.copy(self.profile)
	local ok, message = fn(self.world)
	if not ok then
		self.profile = before
		self:adopt(before)
		self:note(message)
		return false
	end
	local changed = U.copy(self.world.world)
	self.profile = before
	if not self:commit(changed, message) then
		self:adopt(before, true)
		return false
	end
	self.panel, self.modal, self.service = nil, nil, nil
	self:touch()
	return true
end

function S:start_combat()
	if self.combat and self.combat.active then
		return false
	end
	if not Faction.is_hostile_zone(self.profile.world.location) then
		return false
	end
	local room = (self.world.room or 1) - 1
	local enemies = Encounters.for_room(self.world.map, room)
	if #enemies == 0 then
		return false
	end
	self.combat = Combat.new({
		player = self.stats,
		enemies = enemies,
		seed = self.profile.seed + room * 97,
		health = self.profile.world.health,
		weapon = self.weapon,
	})
	self.encounter_enemies = enemies
	self.panel, self.modal = nil, nil
	self.move_queue = {}
	self:note("Enemy preparation is visible. Queue a command while your Time gauge fills.")
	return true
end
function S:combat_result(events, before)
	if #events == 0 then
		return true
	end
	local w = self.profile.world
	local changes = { health = self.combat.health }
	local training = {}
	local durability = U.copy(w.equipment_durability)
	for _, event in ipairs(events) do
		for _, id in ipairs(event.training or {}) do
			training[#training + 1] = id
		end
		local wear = event.weapon_wear
			or (event.actor == "player" and event.damage > 0 and (event.action == "smash" and 30 or 25) or 0)
		local work = U.merge(w, { equipment_durability = durability })
		durability =
			Equipment.wear(work, self.weapon, wear, event.armor_hit or event.actor == "enemy" and event.damage > 0)
	end
	changes.skills = Skills.train(w, training)
	changes.equipment_durability = durability
	local xp = 0
	local won = not self.combat.active and self.combat.health > 0
	local lost = self.combat.health <= 0
	if won then
		local progress = self.world:cleared_room_changes()
		if progress then
			for field, value in pairs(progress) do
				changes[field] = value
			end
			for _, e in ipairs(self.encounter_enemies) do
				xp = xp + (e.experience or 0)
			end
			changes.pending_loot =
				Loot.combine(w.pending_loot, Loot.roll(self.encounter_enemies, Rng.new(self.combat.seed)))
		end
	elseif lost then
		changes.location = w.dungeon_from
		changes.health = -1
		changes.threshold_cleared = 0
		changes.threshold_defeated, changes.threshold_explored, changes.threshold_links = {}, {}, {}
		changes.threshold_treasure_claimed = false
		changes.threshold_treasure_chest = -1
		changes.threshold_run = w.threshold_run + 1
		changes.pending_loot = {}
		changes.map_position = { location = w.dungeon_from, landmark = "dungeon" }
		changes.legacy_layouts = {}
	end
	if not self:commit(changes, nil, xp) then
		self.combat:restore(before)
		return false
	end
	for _, event in ipairs(events) do
		self:note(event.message)
	end
	if won then
		self.world:commit_combat_win()
		local cleared = self.world.map.boss and "Boss defeated. The treasure room is open." or "Room cleared. The door opens."
		self:note(cleared .. (xp > 0 and " +" .. xp .. " XP." or ""))
		if next(self.profile.world.pending_loot) then
			self:open_panel("loot")
		else
			self.combat = nil
		end
	elseif lost then
		self.combat = nil
		self:adopt(self.profile, true)
		self:note("You wake in the settlement. The Threshold has shifted into a new run.")
	else
		-- Equipment can break while gauges are running. Refresh derived damage
		-- without resetting charge, health, target or enemy intent.
		self.combat.character = U.copy(self.stats)
	end
	return true
end
function S:combat_command(action)
	if not self.combat or not self.combat.active then
		return false
	end
	local before = self.combat:snapshot()
	self.combat.events = {}
	local result, message = self.combat:act(action)
	if not result then
		self:note(message)
		return false
	end
	if type(result) == "table" then
		return self:combat_result({ result }, before)
	end
	self:note(action:sub(1, 1):upper() .. action:sub(2) .. " queued.")
	return true
end
function S:update(dt)
	if self.combat and self.combat.active then
		local before = self.combat:snapshot()
		local events = self.combat:advance(dt)
		if #events > 0 then
			self:combat_result(events, before)
		end
	elseif not self.panel and self.move_queue[1] then
		local next_cell
		next_cell, self.move_timer = Scheduler.take_step(self.move_queue, self.move_timer, dt)
		if next_cell then
			local ok = self:move(next_cell.x - self.world.player.x, next_cell.y - self.world.player.y)
			if not ok then
				self.move_queue = {}
			end
		end
	end
end
function S:inventory_action(action, args)
	if self.combat and self.combat.active then
		self:note("Change equipment between encounters.")
		return false
	end
	local inv = assert(Inventory.new(self.profile.world))
	local ok, message
	if action == "equip" then
		ok, message = inv:equip(args.id, args.slot)
	elseif action == "unequip" then
		ok, message = inv:unequip(args.slot)
	elseif action == "inventory_move" then
		ok, message = inv:move(args.id, args.x, args.y)
	elseif action == "stack_move" then
		ok, message = inv:move_item(args.from, args.to)
	elseif action == "inventory_drop" then
		ok, message = inv:remove(args.id)
	end
	if not ok then
		self:note(message)
		return false
	end
	return self:commit({ gear_inventory = inv:serialize() }, "Inventory updated.")
end
function S:apply_result(result)
	if not result then
		return false
	end
	if result.changes and next(result.changes) then
		return self:commit(result.changes, result.message)
	end
	self:note(result.message)
	return false
end

function S:dispatch(id, args)
	args = args or {}
	-- Aliases keep UI shortcuts and semantic automation on one command path.
	local aliases = {
		select_character = "load",
		arrive = "arrival_continue",
		advance_skill = "skill_advance",
		learn_skill = "skill_learn",
		study_skill = "skill_study",
	}
	id = aliases[id] or id
	if id == "rebind" then
		self.pending_binding = args.command
		self:touch()
		return true
	elseif id == "reset_bindings" then
		local ok, err = self.input:reset()
		self:note(ok and "Default controls restored." or err)
		return ok

	end
	if id == "new_character" then
		self.screen = "creation"
		self.panel = nil
		self:touch()
		return true
	elseif id == "characters" then
		self.screen = "characters"
		self.panel = nil
		self.profiles = self.store:list()
		self:touch()
		return true
	elseif id == "title" or id == "back" then
		self.screen = "title"
		self.panel = nil
		self.move_queue = {}
		self.combat = nil
		self:touch()
		return true
	elseif id == "create" then
		return self:create_character()
	elseif id == "load" then
		return self:load_character(args.id)
	elseif id == "continue" then
		if self.profiles[1] then
			return self:load_character(self.profiles[1].id)
		end
		return self:dispatch("new_character")
	elseif id == "cycle_form" then
		self:cycle_form(args.field, args.direction)
		return true
	elseif id == "choose_form" then
		local field, value = args.field, args.value
		local choices = Data.CREATION_CHOICES[field]
		local valid = field == "talent" and U.contains(Data.available_talents(self.forms.race), value)
			or field == "age" and U.integer(value, Data.MIN_START_AGE, Data.MAX_START_AGE)
			or field ~= "talent" and field ~= "race" and field ~= "gender" and choices and U.integer(value, 0, #choices - 1)
		if self.screen ~= "creation" or not valid then
			return false
		end
		self.forms[field] = value
		self:touch()
		return true
	elseif id == "edit_name" then
		self.name_editing = true
		self:touch()
		return true
	elseif id == "set_name" then
		self.forms.name = U.utf8_prefix(args.name or "", 24)
		self:touch()
		return true
	elseif id == "arrival_continue" then
		if not self.arrival_spoken then
			self.arrival_spoken = true
			self:note(Dialogue.arrival())
			return true
		end
		if self:commit({ location = "lantern_rest", visited = { "lantern_rest" } }, "You enter Lantern Rest.") then
			self.screen = "world"
			self:adopt(self.profile, true)
			return true
		end
		return false
	elseif id == "settings" then
		self:open_panel("settings")
		return true
	elseif id == "close" then
		if self.panel then
			self.panel, self.modal = nil, nil
			self.service = nil
		elseif self.screen == "creation" or self.screen == "characters" then
			self.screen = "title"
		elseif self.screen == "arrival" then
			self.screen = "characters"
		else
			self:open_panel("settings")
		end
		self:touch()
		return true
	end
	if not self.profile and id ~= "setting" then
		return false
	end
	if id == "panel" then
		self:open_panel(args.name)
		return true
	elseif
		id == "inventory"
		or id == "skills"
		or id == "quests"
		or id == "character"
		or id == "gates"
		or id == "libraries"
	then
		self:open_panel(id)
		return true
	elseif id == "move" then
		self.move_queue = {}
		return self:move(args.dx, args.dy)
	elseif id == "path" then
		if self.panel or self.combat and self.combat.active then
			return false
		end
		self.move_queue = self.world:path_to(args.x, args.y)
		return #self.move_queue > 0
	elseif id == "interact" then
		if self.screen == "arrival" then
			return self:dispatch("arrival_continue")
		end
		if self.combat and self.combat.active then
			return false
		end
		local place, message = self.world:interact()
		if place then
			self:choose_service(place)
			return true
		end
		self:note(message or "Nothing nearby. Walk beside a resident or landmark and press E.")
		return false
	elseif id == "attack" or id == "defend" or id == "smash" or id == "counterattack" or id == "windmill" then
		return self:combat_command(id)
	elseif id == "target" then
		local ok = self.combat and self.combat:select_target(args.index)
		self:touch()
		return ok
	elseif id == "tonic" then
		local health = self.combat and self.combat.active and self.combat.health or self.profile.world.health
		local result = Economy.use_item("tonic", self.profile.world, health, self.stats.life)
		if not result.changes.health then
			return self:apply_result(result)
		end
		if self:commit(result.changes, result.message) then
			if self.combat and self.combat.active then
				self.combat.health = result.changes.health
				self.combat:sync()
			end
			return true
		end
		return false
	elseif
		id == "equip"
		or id == "unequip"
		or id == "inventory_move"
		or id == "stack_move"
		or id == "inventory_drop"
	then
		return self:inventory_action(id, args)
	elseif id == "skill_advance" then
		return self:apply_result(Skills.advance(self.profile, args.id))
	elseif id == "skill_learn" or id == "skill_study" then
		if not self:near("school") then
			self:note("Visit Elian at the school for lessons.")
			return false
		end
		return self:apply_result(
			id == "skill_learn" and Skills.learn(self.profile, args.id) or Skills.study(self.profile.world, args.id)
		)
	elseif id == "school" then
		if not self:near("school") then
			return false
		end
		self:open_panel("skills")
		return true
	elseif id == "quest_accept" then
		if not self:near("warden") or self.profile.world.location ~= "lantern_rest" then
			return false
		end
		local changes, message = Quests.accept(self.profile.world)
		if changes then
			return self:commit(changes, message)
		end
		self:note(message)
		return false
	elseif id == "quest_reward" then
		if not self:near("warden") then
			return false
		end
		local changes, message = Quests.reward(self.profile.world)
		if changes then
			return self:commit(changes, message)
		end
		self:note(message)
		return false
	elseif id == "starter_sword" then
		if not self:near("blacksmith") or self.profile.world.starter_sword_claimed then
			return false
		end
		local inv = assert(Inventory.new(self.profile.world))
		local ok, err = inv:take("ashen_arcblade")
		if not ok then
			self:note(err)
			return false
		end
		local equipped = inv:equip("ashen_arcblade")
		return self:commit(
			{ starter_sword_claimed = true, gear_inventory = inv:serialize() },
			equipped and "Venn: Your starter sword is ready and equipped." or "Your starter sword is in your satchel."
		)
	elseif id == "armor" then
		if not self:near("blacksmith") or self.profile.world.armor_owned then
			return false
		end
		return self:commit(
			{ armor_owned = true },
			"The Riveted Jack is equipped. Its armor protects you while it has durability."
		)
	elseif id == "shop_open" then
		if not self:near("blacksmith") then
			return false
		end
		self.shoprows = {}
		for _, category in ipairs(Catalog.shop().categories) do
			for _, item in ipairs(category.items) do
				local row = U.copy(item)
				row.category = category.name
				self.shoprows[#self.shoprows + 1] = row
			end
		end
		if self.profile.world.location == "spindle_hollow" then
			return self:dispatch("armory_open", { family = "heavy" })
		end
		self:open_panel("shop")
		return true
	elseif id == "pouch_shop" then
		if not self:near("general_shop") then
			return false
		end
		self.shoprows = { U.copy(Inventory.POUCHES.gold_pouch_small), U.copy(Inventory.POUCHES.gold_pouch_large) }
		self:open_panel("shop")
		return true
	elseif id == "buy" then
		if args.id == "gold_pouch_small" or args.id == "gold_pouch_large" then
			if not self:near("general_shop") then
				return false
			end
			local inv = assert(Inventory.new(self.profile.world))
			local ok, result = inv:purchase_pouch(args.id, Inventory.POUCHES[args.id].price)
			if not ok then
				self:note(result)
				return false
			end
			return self:commit(result, "Purchased a gold pouch.")
		end
		if not self:near("blacksmith") then
			return false
		end
		return self:apply_result(Economy.shop_buy(self.profile, args.id))
	elseif id == "buy_tonic" then
		if not self:near("general_shop") then
			return false
		end
		local w = self.profile.world
		if w.gold < 8 or w.tonics >= 2000000000 then
			self:note("You need 8 gold and room for a tonic.")
			return false
		end
		return self:commit({ gold = w.gold - 8, tonics = w.tonics + 1 }, "One Healing Tonic, packed for the journey.")
	elseif id == "heal" then
		if not self:near("healer") then
			return false
		end
		return self:commit({ health = self.stats.life }, "You wake fully healed. Travel carefully.")
	elseif id == "activity" then
		local services = {
			fish = "fishing",
			buy_grain = "grocery_store",
			buy_fiber = "general_shop",
			sell_cloth = "general_shop",
			mill = "windmill",
			spin = "spinning_wheel",
			weave = "loom",
			bake = "oven",
			cook_fish = "oven",
		}
		if not self:near(services[args.action]) then
			return false
		end
		return self:apply_result(Economy.perform(args.action, self.profile.world, self.stats.life))
	elseif id == "chop" then
		local place = self:near("tree")
		if not place then
			return false
		end
		local key = self.profile.world.location .. ":" .. place.x .. ":" .. place.y
		return self:apply_result(Environment.harvest(self.profile.world, key, self.clock()))
	elseif id == "bank" then
		if not self:near("bank") then
			return false
		end
		return self:apply_result(Economy.bank(self.profile.world, args.amount, args.deposit))
	elseif id == "gate_register" then
		local old = U.copy(self.profile)
		local ok, message = self.world:register_gate()
		if not ok then
			self:note(message)
			return false
		end
		local changes = { gates = U.copy(self.world.world.gates), visited = U.copy(self.world.world.visited) }
		self.profile = old
		local saved = self:commit(changes, "The Moon Gate remembers " .. names[self.world.currentLocation] .. ".")
		if not saved then
			self:adopt(old)
		end
		return saved
	elseif id == "gate_travel" then
		local w = self.profile.world
		if not U.contains(w.gates, args.town) or not U.contains(w.visited, args.town) then
			self:note("Register the destination gate in person first.")
			return false
		end
		local h = self.combat and self.combat.health or w.health
		local destination_profile = U.copy(self.profile)
		destination_profile.world = U.merge(w, { location = args.town, map_position = {} })
		local destination_world = World.new(destination_profile)
		local arrival = destination_world:landmark_spawn("gate") or destination_world.player
		if
			self:commit(
				{ location = args.town, map_position = { location = args.town, x = arrival.x, y = arrival.y }, health = h },
				"You emerge beneath " .. names[args.town] .. "'s Moon Gate."
			)
		then
			self.combat = nil
			self.panel, self.modal = nil, nil
			self:adopt(self.profile, true)
			return true
		end
		return false
	elseif id == "enter_dungeon" then
		if not self:near("dungeon") then
			return false
		end
		return self:transition(function(world)
			return world:enter_dungeon()
		end)
	elseif id == "leave_dungeon" then
		return self:transition(function(world)
			return world:leave_dungeon()
		end)
	elseif id == "dungeon_passage" then
		return self:transition(function(world)
			return world:cross_door(args.target, true)
		end)
	elseif id == "next_room" then
		local world = self.world
		local exit = world.currentLocation == "threshold" and world.map.exit
		if not exit or math.abs(exit.x - world.player.x) + math.abs(exit.y - world.player.y) > 1 then
			self:note("Move next to the exit first.")
			return false
		end
		return self:transition(function(world)
			return world:advance_room()
		end)
	elseif id == "chest" then
		local target = self.world.map.chests and self.world.map.chests[args.index]
		if not target or math.abs(target.x - self.world.player.x) + math.abs(target.y - self.world.player.y) > 1 then
			self:note("Move next to a chest to open it.")
			return false
		end
		local old = U.copy(self.profile)
		local ok, message = self.world:open_chest(args.index)
		if not ok then
			self:note(message)
			return false
		end
		local world = U.copy(self.world.world)
		self.profile = old
		if self:commit(world, "The chest opens. Choose which rewards to take.") then
			self:open_panel("loot")
			return true
		end
		self:adopt(old)
		return false
	elseif id == "take_loot" then
		local ids = args.ids or U.sorted_keys(self.profile.world.pending_loot)
		local changes =
			Loot.collect(self.profile.world, ids, self.inventory:capacity("cobweb"), self.inventory:capacity("gold"))
		if next(changes) == nil then
			self:note("There is not enough room. Rearrange your satchel or leave these items.")
			return false
		end
		local ok = self:commit(changes, "Loot packed into your satchel.")
		if ok and not next(self.profile.world.pending_loot) then
			self.panel = nil
			self.combat = nil
			self:touch()
		end
		return ok
	elseif id == "leave_loot" then
		if self:commit({ pending_loot = {} }, "You leave the remaining loot.") then
			self.panel = nil
			self.combat = nil
			self:touch()
			return true
		end
		return false
	elseif id == "repair_open" then
		if not self:near("blacksmith") then
			return false
		end
		local opts = {}
		local gear = self.inventory:serialize()
		local ids = U.sorted_keys(gear.placements)
		if gear.equipped ~= "" then
			ids[#ids + 1] = gear.equipped
		end
		for _, item in pairs(gear.slots or {}) do
			ids[#ids + 1] = item
		end
		if self.profile.world.armor_owned then
			ids[#ids + 1] = "riveted_jack"
		end
		for _, itemid in ipairs(ids) do
			local item = Catalog.items()[itemid] or Equipment.ARMOR
			local price = Equipment.repair_cost(self.profile.world, item, true)
			opts[#opts + 1] = option(
				"repair",
				(item.name or itemid) .. " · repair fully " .. price .. "g",
				{ id = itemid, full = true }
			)
		end
		self:say(
			"Equipment repairs",
			"Equipment loses durability through combat. Broken gear contributes no damage or defense.",
			opts
		)
		return true
	elseif id == "repair" then
		if not self:near("blacksmith") then
			return false
		end
		local item = Catalog.items()[args.id] or args.id == "riveted_jack" and Equipment.ARMOR
		if not item then
			return false
		end
		local changes = Equipment.repair(self.profile.world, item, args.full)
		return self:apply_result({
			changes = changes,
			message = next(changes) and "Equipment repaired." or "Already repaired, or insufficient gold.",
		})
	elseif id == "combat_lesson" then
		self:say(
			"Elian",
			"Normal Attack interrupts Smash. Defend reduces Normal Attack damage. Smash breaks Defend. The latest queued command executes when Time is full. Items preserve your gauge."
		)
		return true
	elseif id == "practice" then
		if self.profile.world.location ~= "threshold" or self.world.room ~= 1 or not self:near("practice") then
			return false
		end
		if not self.weapon.id or Equipment.current(self.profile.world, self.weapon) == 0 then
			self:note("Equip a usable sword from the satchel first.")
			return false
		end
		local states = self.profile.world.skills
		if states.combat_mastery.rank == "novice" then
			states = Skills.train(self.profile.world, { "attack" })
		end
		local damage = Stats.roll_melee(self.stats)
		return self:commit(
			{ skills = states },
			self.weapon.name .. " strikes the practice post for " .. damage .. " damage."
		)
	elseif id == "armory_open" then
		local rack = self:near("rack")
		if not (rack and rack.family == args.family) and not self:near("blacksmith") then
			return false
		end
		self.armory_family = args.family
		self.armory_rows = {}
		for _, item in ipairs(Catalog.swords()) do
			if item.family == args.family then
				self.armory_rows[#self.armory_rows + 1] = item
			end
		end
		self:open_panel("armory")
		return true
	elseif id == "take_sword" or id == "return_sword" then
		local item = Catalog.items()[args.id]
		local rack = self:near("rack")
		if
			not item
			or item.family ~= self.armory_family
			or not (rack and rack.family == item.family) and not self:near("blacksmith")
		then
			return false
		end
		local inv = assert(Inventory.new(self.profile.world))
		local ok, err
		if id == "take_sword" then
			ok, err = inv:take(args.id)
		else
			ok, err = inv:remove(args.id)
		end
		if not ok then
			self:note(err)
			return false
		end
		return self:commit(
			{ gear_inventory = inv:serialize() },
			id == "take_sword" and "Sword packed into your satchel." or "Sword returned to the rack."
		)
	elseif id == "quick_slot" then
		if not U.integer(args.index, 1, 4) or args.item ~= "tonic" and args.item ~= "" then
			return false
		end
		local slots = U.copy(self.profile.world.quick_slots)
		slots[args.index] = args.item
		return self:commit({ quick_slots = slots }, "Quick slot updated.")
	elseif id == "setting" then
		local candidate = U.copy(self.settings)
		if candidate[args.key] ~= nil then
			candidate[args.key] = U.clamp(args.value, 0, 1)
		end
		if self.save_settings(candidate) then
			self.settings = Settings.apply(candidate)
			self:touch()
			return true
		end
		return false
	end
	return false
end

function S:state()
	local discovered_rooms, explored_tiles = 0, 0
	for _, tiles in pairs(self.profile and self.profile.world.threshold_explored or {}) do
		discovered_rooms = discovered_rooms + 1
		for _ in pairs(tiles) do
			explored_tiles = explored_tiles + 1
		end
	end
	return {
		screen = self.screen,
		panel = self.panel or "",
		revision = self.revision,
		message = self.message or "",
		character = self.profile and self.profile.name or "",
		character_id = self.profile and self.profile.id or "",
		location = self.profile and self.profile.world.location or "",
		position = self.world and U.copy(self.world.player) or {},
		health = self.combat and self.combat.health or self.profile and self.profile.world.health or 0,
		gold = self.profile and self.profile.world.gold or 0,
		experience = self.profile and self.profile.experience or 0,
		gear_inventory = self.profile and U.copy(self.profile.world.gear_inventory) or {},
		armor_owned = self.profile and self.profile.world.armor_owned or false,
		starter_sword_claimed = self.profile and self.profile.world.starter_sword_claimed or false,
		quest = self.profile and self.profile.world.quest or 0,
		room = self.world and self.world.room or 0,
		threshold_completions = self.profile and self.profile.world.threshold_completions or 0,
		treasure_chest = self.profile and self.profile.world.threshold_treasure_chest or -1,
		pending_loot = self.profile and U.copy(self.profile.world.pending_loot) or {},
		gates = self.profile and U.copy(self.profile.world.gates) or {},
		combat = self.combat and self.combat.active or false,
		won = self.combat and self.combat.won or false,
		player_gauge = self.combat and self.combat.player_gauge or 0,
		queued_action = self.combat and self.combat.queued_action or "",
		enemies = self.combat and U.copy(self.combat.enemies) or {},
		move_queued = #self.move_queue,
		forms = U.copy(self.forms),
		map = self.world and {
			width = self.world.map.width,
			height = self.world.map.height,
			entry = U.copy(self.world.map.entry),
			exit = U.copy(self.world.map.exit),
			doors = U.copy(self.world.map.doors),
			discovered_rooms = discovered_rooms,
			explored_tiles = explored_tiles,
			exit_locked = self.world:exit_locked(),
			boss = self.world.map.boss,
			chests = U.copy(self.world.map.chests),
			landmarks = U.copy(self.world.landmarks),
			enemies = U.copy(self.world.enemies),
		} or {},
		modal = self.modal and U.copy(self.modal) or {},
		log = U.copy(self.log),
	}
end
return M
