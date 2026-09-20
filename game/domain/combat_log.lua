local U = require("game.domain.util")
local M = {VERSION = 1, HISTORY_LIMIT = 100, BATCH_LIMIT = 64, TEXT_LIMIT = 256}
local KINDS = {battle_start=true, turn_start=true, action=true, item=true, damage=true, periodic=true,
    status=true, status_end=true, defeat=true, battle_end=true, wait=true, absorption=true, counter=true, healing=true, recovery=true, cost=true}

---@param record table Mutable candidate history; only complete operation groups are removed.
function M.trim(record, limit)
    while #record.events > limit do
        local operation = record.events[1].operation
        repeat table.remove(record.events, 1) until #record.events == 0 or record.events[1].operation ~= operation
        record.incomplete = true
    end
end

local function metadata(p)
    local b = p.battle
    local encounter = "Encounter"
    for _, room in ipairs(p.run.map.rooms) do if room.id == b.room then encounter = "Alby / " .. room.kind end end
    local participants = {{id=p.id, name=p.name, side="hero"}}
    for _, actor in ipairs(b.enemies) do participants[#participants+1] = {id=actor.id, name=actor.name, side="enemy"} end
    return {id=b.id, run=p.run.id, encounter=encounter, origin="hero", outcome=b.outcome or "active",
        participants=participants, round=b.round, turn=b.turn, sequence=b.sequence, events={}, incomplete=false}
end

---@param p table Candidate profile; latest encounter survives rewards, defeat and rebirth.
function M.sync(p)
    local b = p.battle
    if not b then return end
    M.trim(b, M.HISTORY_LIMIT)
    local record = p.combat_log.record
    if not record or record.id ~= b.id then record = metadata(p); p.combat_log.record = record end
    record.events = U.copy(b.events)
    record.sequence = b.sequence; record.round = b.round; record.turn = b.turn
    record.outcome = b.outcome or "active"; record.incomplete = b.incomplete == true
end

---Additive migration: preserve existing text and sequence IDs; mark legacy histories partial.
function M.migrate(p)
    U.require_ok(p.format_version==1 or p.format_version==2 or p.format_version==3,"Unsupported profile format")
    U.require_ok(p.combat_log==nil or type(p.combat_log)=="table" and p.combat_log.version==M.VERSION,"Unsupported combat log format")
    if p.format_version==1 then p.format_version=2 end
    if p.combat_log then return p end
    p.combat_log = {version=M.VERSION}
    if p.battle then
        local b = p.battle
        for _, event in ipairs(b.events) do
            event.run = p.run.id
            event.operation = event.operation or "legacy_turn_" .. event.turn
            event.text = event.text:sub(1, M.TEXT_LIMIT)
        end
        b.incomplete = true; M.sync(p)
    end
    return p
end

---@param p table Candidate profile; never publish directly from this function.
function M.emit(p, kind, text, fields)
    local b = p.battle
    U.require_ok(#p.last_events < M.BATCH_LIMIT, "Combat operation exceeds the event budget")
    b.sequence = b.sequence + 1
    local event = {id=b.id .. ":" .. b.sequence, sequence=b.sequence, battle=b.id, run=p.run.id,
        turn=b.turn, round=b.round, operation=b.operation, kind=kind, text=text}
    for key, value in pairs(fields or {}) do event[key] = value end
    U.require_ok(#text <= M.TEXT_LIMIT and type(event.operation)=="string", "Invalid combat event content")
    b.events[#b.events+1] = event; p.last_events[#p.last_events+1] = U.copy(event)
end

local EVENT_FIELDS={}
for _,key in ipairs({"id","sequence","battle","run","turn","round","operation","kind","text","actor","target","skill","status","pool","item","outcome",
    "amount","actual","calculated","absorbed","cost","hit","hits","remaining","defense","protection","critical"}) do EVENT_FIELDS[key]=true end

local function bounded(value, limit) return type(value)=="string" and #value>0 and #value<=limit end
local function check(ok, reason) U.require_ok(ok, "Invalid save: combat log " .. reason) end
local function events(list, battle, sequence, limit, strict)
    check(type(list)=="table" and #list<=limit and U.count(list)==#list, "event bound")
    local previous, completed, operation = 0, {}, nil
    for _, event in ipairs(list) do
        for key in pairs(event) do check(EVENT_FIELDS[key],"unknown event field") end
        check(bounded(event.battle,128) and event.id==event.battle..":"..event.sequence and U.integer(event.sequence,previous+1,sequence or 10000000), "sequence")
        check(not battle or event.battle==battle, "battle identity")
        check(KINDS[event.kind] and type(event.text)=="string" and #event.text<=M.TEXT_LIMIT, "event content")
        check(U.integer(event.turn,1,1000000) and U.integer(event.round,1,1000000), "turn boundary")
        if strict then check(bounded(event.operation,128) and bounded(event.run,128), "operation/run identity") end
        check((event.operation==nil or bounded(event.operation,128)) and (event.run==nil or bounded(event.run,128)),"operation/run fields")
        if event.operation~=operation then
            check(not completed[event.operation or "legacy"], "noncontiguous operation")
            if operation then completed[operation]=true end
            operation=event.operation
        end
        for _, key in ipairs({"actor","target","skill","status","pool","item","outcome"}) do
            check(event[key]==nil or bounded(event[key],128), key)
        end
        for _, key in ipairs({"amount","actual","calculated","absorbed","cost","hit","hits","remaining","defense","protection"}) do
            check(event[key]==nil or U.finite(event[key]) and event[key]>=0 and event[key]<=100000000, key)
        end
        check(event.critical==nil or type(event.critical)=="boolean", "critical")
        previous=event.sequence
    end
end

function M.validate(p)
    if p.combat_log==nil then check(p.format_version==1,"missing schema");return end -- legacy save
    check(type(p.combat_log)=="table" and p.combat_log.version==M.VERSION, "unsupported version")
    check(U.count(p.combat_log)<=2,"schema fields")
    local record=p.combat_log.record
    if record then
        check(U.count(record)==11,"record fields")
        check(bounded(record.id,128) and bounded(record.run,128) and bounded(record.encounter,96), "identity")
        check(record.origin=="hero" or record.origin=="rp", "origin")
        check(U.contains({"active","victory","defeat","abandonment"},record.outcome), "outcome")
        check(type(record.incomplete)=="boolean" and U.integer(record.sequence,0,10000000), "history metadata")
        check(U.integer(record.round,1,1000000) and U.integer(record.turn,1,1000000), "final cursor")
        check(type(record.participants)=="table" and #record.participants>=1 and #record.participants<=8, "participants")
        local ids={}
        for _, actor in ipairs(record.participants) do
            check(U.count(actor)==3,"participant fields")
            check(bounded(actor.id,128) and not ids[actor.id] and bounded(actor.name,64) and (actor.side=="hero" or actor.side=="enemy"), "participant")
            ids[actor.id]=true
        end
        events(record.events,record.id,record.sequence,M.HISTORY_LIMIT,true)
        for _,event in ipairs(record.events) do
            check(event.run==record.run and event.turn<=record.turn and event.round<=record.round,"record boundary")
            check((not event.actor or ids[event.actor]) and (not event.target or ids[event.target]),"event participant")
        end
        check(record.outcome~="active" or p.battle~=nil,"active record ownership")
        if p.battle then check(record.id==p.battle.id and record.sequence==p.battle.sequence and U.equal(record.events,p.battle.events), "active history mismatch") end
    else check(not p.battle,"missing active history") end
    events(p.last_events,nil,nil,M.BATCH_LIMIT,false)
end

return M
