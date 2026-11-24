local U = require("game.domain.util")
local C = require("game.content.catalog")
local M = { PAGE_SIZE = 6, DETAIL_LINES = 8 }
local OUTCOMES = { active = "In progress", victory = "Victory", defeat = "Defeat", abandonment = "Abandoned" }
local function number(value)
	return string.format("%.4f", value):gsub("0+$", ""):gsub("%.$", "")
end
local function label(record, id)
	for _, participant in ipairs(record.participants) do
		if participant.id == id then
			return participant.name
		end
	end
	return id or "Unknown actor"
end
local function prefix(text, limit)
	local last = math.min(#text, limit)
	while last > 0 do
		local next_byte = text:byte(last + 1)
		if not next_byte or next_byte < 128 or next_byte >= 192 then
			break
		end
		last = last - 1
	end
	return text:sub(1, last)
end
local function short(text, limit)
	return #text > limit and prefix(text, limit - 3) .. "..." or text
end
local function skill(event)
	return C.skills[event.skill] and C.skills[event.skill].name or event.skill or "Action"
end

---@return string Plain display text shared by compact and expanded views.
function M.event(record, event)
	local actor, target = label(record, event.actor), label(record, event.target)
	if event.kind == "action" and not event.target then
		return event.text
	end
	if event.kind == "action" then
		return actor
			.. " uses "
			.. skill(event)
			.. " on "
			.. target
			.. "; cost "
			.. number(event.cost)
			.. " "
			.. event.pool:upper()
	end
	if event.kind == "damage" then
		local text = target
			.. ": hit "
			.. (event.hit or 1)
			.. "/"
			.. (event.hits or 1)
			.. ", "
			.. number(event.actual or event.amount)
			.. " HP lost"
		if event.calculated then
			text = text .. " (" .. number(event.calculated) .. " calculated)"
		end
		if event.critical then
			text = text .. "; critical"
		end
		if (event.absorbed or 0) > 0 then
			text = text .. "; shield absorbed " .. number(event.absorbed)
		end
		return text
	end
	if event.kind == "turn_start" then
		return actor .. " begins turn; recovered " .. number(event.amount) .. " " .. (event.pool or "sp"):upper()
	end
	if event.kind == "item" then
		return actor
			.. " uses "
			.. (C.items[event.item] and C.items[event.item].name or event.item)
			.. "; restored "
			.. number(event.amount)
			.. " "
			.. (event.pool or "hp"):upper()
	end
	if event.kind == "status" then
		if event.status == "guard" then
			return target
				.. ": defending, +"
				.. number(event.defense)
				.. " defense, +"
				.. number(event.protection)
				.. " protection until next turn"
		end
		return target
			.. ": "
			.. event.status
			.. (event.remaining and " for " .. event.remaining .. " owner turns" or "")
	end
	if event.kind == "status_end" then
		return target .. ": " .. event.status .. " ended"
	end
	if event.kind == "periodic" then
		return label(record, event.target or event.actor)
			.. ": "
			.. (event.status or "periodic effect")
			.. ", "
			.. number(event.actual or event.amount)
			.. " HP lost"
	end
	if event.kind == "defeat" then
		return target .. " is defeated"
	end
	if event.kind == "battle_end" then
		return OUTCOMES[event.outcome] or event.text
	end
	if event.kind == "healing" or event.kind == "recovery" then
		return target .. ": restored " .. number(event.amount) .. " " .. (event.pool or "hp"):upper()
	end
	if event.kind == "absorption" then
		return target .. ": shield absorbed " .. number(event.amount)
	end
	if event.kind == "counter" then
		return actor .. " counters " .. target
	end
	return event.text
end

local function summary(record, events)
	local action, loss, last = nil, 0, events[#events]
	for _, event in ipairs(events) do
		if event.kind == "action" or event.kind == "item" or event.kind == "wait" or event.kind == "turn_start" then
			action = action or event
		end
		if event.kind == "damage" then
			loss = loss + (event.actual or event.amount)
		end
	end
	local event = action or last
	if event.kind == "action" then
		return label(record, event.actor)
			.. " · "
			.. skill(event)
			.. (loss > 0 and " · " .. number(loss) .. " HP lost" or "")
	end
	return M.event(record, event)
end

---@return table[] Chronological groups; turn-start recovery is its own committed operation.
function M.groups(record)
	local groups = {}
	for _, event in ipairs(record.events) do
		local group = groups[#groups]
		if not group or group.id ~= event.operation then
			group = {
				id = event.operation,
				first = event.sequence,
				last = event.sequence,
				turn = event.turn,
				round = event.round,
				events = {},
			}
			groups[#groups + 1] = group
		end
		group.events[#group.events + 1] = event
		group.last = event.sequence
	end
	for _, group in ipairs(groups) do
		group.summary = summary(record, group.events)
	end
	return groups
end

---Wrap bounded text before handing it to fixed-height GUI rows.
function M.wrap(text, width)
	local lines, line = {}, ""
	for word in text:gmatch("%S+") do
		while #word > width do
			if line ~= "" then
				lines[#lines + 1] = line
				line = ""
			end
			local part = prefix(word, width)
			lines[#lines + 1] = part
			word = word:sub(#part + 1)
		end
		if #line + #word + 1 > width and line ~= "" then
			lines[#lines + 1] = line
			line = ""
		end
		if word ~= "" then
			line = line == "" and word or line .. " " .. word
		end
	end
	if line ~= "" then
		lines[#lines + 1] = line
	end
	return lines
end

---@param request table Sequence anchor 0 follows the bottom; positive anchors never shift on append.
---@return table Only visible groups/details, not the entire retained event stream.
function M.model(record, request)
	if not record then
		return { available = false, rows = {}, compact = {}, details = {} }
	end
	if request.log_record and request.log_record ~= record.id then
		request = {}
	end
	local groups = M.groups(record)
	local anchor = request.log_anchor or 0
	local finish = #groups
	if anchor > 0 then
		finish = 0
		for index, group in ipairs(groups) do
			if group.first <= anchor then
				finish = index
			end
		end
		if #groups > 0 then
			finish = math.max(1, finish)
		end
	end
	local first = math.max(1, finish - M.PAGE_SIZE + 1)
	local model = {
		available = true,
		id = record.id,
		encounter = record.encounter,
		origin = record.origin == "rp" and "RP (display only)" or "Hero",
		outcome = OUTCOMES[record.outcome],
		round = record.round,
		incomplete = record.incomplete,
		sequence = record.sequence,
		following = anchor == 0,
		rows = {},
		compact = {},
		details = {},
		detail_page = 1,
		detail_pages = 1,
		earlier = first > 1 and groups[first - 1].first or nil,
		later = finish < #groups and groups[math.min(#groups, finish + M.PAGE_SIZE)].first or nil,
		compact_earlier = finish > 3 and groups[finish - 3].first or nil,
		compact_later = finish < #groups and groups[math.min(#groups, finish + 3)].first or nil,
		first = first,
		last = finish,
		total = #groups,
		new_entries = 0,
		anchor = finish > 0 and groups[finish].first or 0,
		trimmed = anchor > 0 and groups[1] and anchor < groups[1].first or false,
	}
	for index = first, finish do
		local group = groups[index]
		if group then
			model.rows[#model.rows + 1] = {
				id = group.id,
				first = group.first,
				turn = group.turn,
				round = group.round,
				summary = short(group.summary, 62),
				selected = group.id == request.log_group,
			}
		end
	end
	for index = math.max(1, finish - 2), finish do
		if groups[index] then
			model.compact[#model.compact + 1] = short("T" .. groups[index].turn .. " · " .. groups[index].summary, 44)
		end
	end
	if anchor > 0 then
		for _, group in ipairs(groups) do
			if group.first > anchor then
				model.new_entries = model.new_entries + 1
			end
		end
	end
	for _, group in ipairs(groups) do
		if group.id == request.log_group then
			local lines = {}
			for _, event in ipairs(group.events) do
				for _, line in ipairs(M.wrap(M.event(record, event), 47)) do
					lines[#lines + 1] = line
				end
			end
			model.selected = group.id
			model.detail_title = "Round " .. group.round .. " / Turn " .. group.turn
			model.detail_pages = math.max(1, math.ceil(#lines / M.DETAIL_LINES))
			model.detail_page = U.clamp(request.log_detail_page or 1, 1, model.detail_pages)
			for index = (model.detail_page - 1) * M.DETAIL_LINES + 1, math.min(#lines, model.detail_page * M.DETAIL_LINES) do
				model.details[#model.details + 1] = lines[index]
			end
		end
	end
	return model
end

return M
