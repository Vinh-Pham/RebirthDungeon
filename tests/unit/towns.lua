local lester = require("tests.vendor.lester")
local describe, it, expect = lester.describe, lester.it, lester.expect
local Ch = require("game.domain.character")
local Cmd = require("game.domain.commands")
local C = require("game.content.catalog")
local Town = require("game.content.town")
local D = require("game.domain.dungeon")
local U = require("game.domain.util")
local I = require("game.domain.inventory")
local Stats = require("game.domain.stats")
local Q = require("game.services.quests")
local Save = require("game.services.save")
local Presenter = require("game.runtime.services_presenter")
local Support = require("tests.support")
local ENV = {now = 1789920000, rng_factory = Support.mock_rng}
local sequence = 0

local function fresh(service)
    local p = Ch.new("profile_01", "Aster", "Human", 17, "Close Combat", ENV.now, 42)
    local npc = C.services[service or "healer"]
    p.position = {x = npc.x * 48, y = npc.y * 48}
    return p
end

local function command(p, c, env)
    sequence = sequence + 1
    c.op = c.op or "town_test_" .. sequence; c.revision = c.revision or p.revision
    return Cmd.execute(p, c, env or ENV)
end

local function story(_, choice, service)
    return {version = 2, service = service, state = {}, paragraphs = {"Elara"}, choices = {}, actions = {}}, choice and "heal" or nil
end

describe("Town services contract", function()
    it("shares authored occupancy between art and navigation and crosses the stream only at the bridge", function()
        local map = D.town()
        for y = 1, map.height do for x = 1, map.width do
            local _, walkable = Town.cell(x, y)
            expect.equal(D.walkable(map, x, y), walkable)
            expect.truthy(Town.visual(x, y))
        end end
        expect.equal(Town.cell(12, 9), "bridge"); expect.equal(Town.cell(12, 11), "stream")
        expect.equal(Town.cell(14, 9), "square"); expect.equal(Town.cell(14, 16), "road")
        for _, id in ipairs(C.service_order) do
            local npc = C.services[id]; expect.truthy(D.walkable(map, npc.x, npc.y))
        end
    end)

    it("requires current town proximity for every service and rejects old character commands", function()
        local p = fresh("gate")
        expect.truthy(Cmd.service_available(p, "gate")); expect.falsy(Cmd.service_available(p, "healer"))
        expect.falsy(pcall(command, p, {type = "buy", service = "shop", def = "bread"}))
        expect.falsy(pcall(command, p, {type = "enter", profile = "profile_02"}))
        p = command(p, {type = "enter"})
        for _, id in ipairs(C.service_order) do expect.falsy(Cmd.service_available(p, id)) end
    end)

    it("previews exact restoration without healing or spending during panel display", function()
        local p = fresh(); p.pools.hp = 1; p.pools.mp = 2; p.pools.sp = 3
        local before, binding = U.copy(p), Q.bound_state()
        local model = Presenter.model(p, {service = "healer"})
        expect.truthy(model.action.enabled); expect.equal(model.action.label, "Full restoration · 10 gold")
        expect.truthy(model.header.effect:find("Restore HP", 1, true))
        expect.truthy(U.equal(before, p)); expect.equal(Q.bound_state(), binding)
        p = command(p, model.action.command)
        expect.equal(p.gold, 90); expect.equal(p.pools.hp, Stats.current(p).hp)
        model = Presenter.model(p, {service = "healer"})
        expect.falsy(model.action.enabled); expect.equal(model.action.reason, "Already fully restored")
    end)

    it("disables unaffordable, full-pack and remote purchases with authoritative reasons", function()
        local p = fresh("shop")
        local model = Presenter.model(p, {service = "shop", quantity = 7})
        expect.equal(model.rows[1].action.label, "Buy 7 · 70 gold")
        expect.truthy(model.rows[1].action.enabled); expect.falsy(model.rows[4].action.enabled)
        I.add(p, "armor", 30)
        model = Presenter.model(p, {service = "shop"})
        expect.falsy(model.rows[1].action.enabled)
        expect.truthy(model.rows[1].action.reason:lower():find("full"))
        p.position = {x = 8 * 48, y = 11 * 48}
        model = Presenter.model(p, {service = "shop"})
        expect.equal(model.rows[1].action.reason, "Walk closer to the service in town")
    end)

    it("rejects invalid purchase quantities atomically and keeps previews RNG-free", function()
        local p = fresh("shop"); local before = U.copy(p)
        for _, n in ipairs({0, -1, 1.5, 100}) do
            expect.falsy(pcall(command, p, {type = "buy", service = "shop", def = "hp_potion", quantity = n}))
        end
        for _, id in ipairs(C.service_order) do Presenter.model(p, {service = id}) end
        expect.truthy(U.equal(before, p))
        p = command(p, {type = "buy", service = "shop", def = "hp_potion", quantity = 3})
        expect.equal(p.gold, 70); expect.equal(p.items[2].quantity, 3)
        expect.truthy(U.equal(before.random, p.random))
    end)

    it("commits story choices and healing as one candidate and deduplicates retries", function()
        local p = fresh(); p.pools.hp = 2
        local env = {now = ENV.now, dialogue = story}
        p = command(p, {type = "dialogue", service = "healer"}, env)
        expect.equal(p.gold, 100); expect.equal(p.pools.hp, 2)
        local c = {type = "dialogue", service = "healer", choice = 1}
        p = command(p, c, env)
        expect.equal(p.gold, 90); expect.equal(p.pools.hp, Stats.current(p).hp)
        local retry, duplicate = Cmd.execute(p, c, env)
        expect.truthy(duplicate); expect.truthy(U.equal(retry, p))
        expect.equal(p.dialogue.healer.version, 2)
    end)

    it("does not advance a spending dialogue choice when funds or save writes fail", function()
        local p = fresh(); p.pools.hp = 1; p.gold = 0
        local before = U.copy(p); local env = {now = ENV.now, dialogue = story}
        expect.falsy(pcall(command, p, {type = "dialogue", service = "healer", choice = 1}, env))
        expect.truthy(U.equal(before, p))
        p.gold = 100; p.revision = 1
        local backend = Support.backend(); local store = Save.new(backend); expect.truthy(store:commit(p))
        local candidate = command(p, {type = "dialogue", service = "healer", choice = 1}, env)
        backend.mode = "fail"; expect.falsy(store:commit(candidate)); expect.truthy(U.equal(store:load(p.id), p))
        backend.mode = "ok"; expect.truthy(store:commit(candidate)); expect.equal(store:load(p.id).gold, 90)
        expect.equal(store:load(p.id).dialogue.healer.version, 2)
    end)

    it("uses the same disabled reasons for dialogue purchases and normal service buttons", function()
        local p = fresh("grocery"); p.gold = 4
        p.dialogue.grocery = {version = 2, service = "grocery", state = {}, paragraphs = {"Nell"}, choices = {"Buy bread"}, actions = {"bread"}}
        local model = Presenter.model(p, {service = "grocery", dialogue = true})
        expect.falsy(model.choices[1].enabled); expect.equal(model.choices[1].reason, "Not enough gold")
        p.gold = 5; model = Presenter.model(p, {service = "grocery", dialogue = true})
        expect.truthy(model.choices[1].enabled)
        model = Presenter.model(p, {service = "grocery"}, "Resolve the save failure first")
        expect.falsy(model.rows[1].action.enabled)
    end)

    it("returns a defeated hero to Elara for free with claimed possessions and experience intact", function()
        local p = command(fresh("gate"), {type = "enter"})
        local room = p.run.map.rooms[2]
        p.position = {x = room.x * 48, y = room.y * 48}
        p = command(p, {type = "encounter", room = room.id})
        p.gold = 147; p.bank.gold = 12; p.xp = 77; I.add(p, "silk", 4)
        p.pools.hp = 1
        local battle = require("game.domain.battle")
        while battle.active(p).hero do p.battle.cursor = p.battle.cursor + 1 end
        p = command(p, {type = "begin_turn", battle = p.battle.id, turn = p.battle.turn})
        p = command(p, battle.ai(p))
        expect.equal(p.phase, "town"); expect.falsy(p.run); expect.falsy(p.battle)
        expect.truthy(Cmd.service_available(p, "healer")); expect.equal(p.gold, 147)
        expect.equal(p.bank.gold, 12); expect.equal(p.xp, 77); expect.equal(p.items[2].quantity, 4)
        expect.falsy(p.quest_evidence.return_home)
        for _, pool in ipairs({"hp", "mp", "sp"}) do expect.equal(p.pools[pool], Stats.current(p)[pool]) end
    end)

    it("previews the gate without generating a dungeon and requires explicit abandonment", function()
        local p = fresh("gate"); local before = U.copy(p)
        expect.truthy(Presenter.model(p, {service = "gate"}).action.enabled)
        expect.truthy(U.equal(before, p))
        p = command(p, {type = "enter"})
        expect.falsy(pcall(command, p, {type = "abandon", confirm = "yes"}))
        p.gold = 143; I.add(p, "silk", 4); local experience = p.xp
        p = command(p, {type = "abandon", confirm = true})
        expect.equal(p.gold, 143); expect.equal(p.xp, experience); expect.falsy(p.run)
        expect.falsy(p.quest_evidence.return_home); expect.truthy(Cmd.service_available(p, "healer"))
        expect.equal(p.pools.hp, Stats.current(p).hp)
    end)
    it("leaves only a confirmed current run at its entrance and saves the outside position atomically", function()
        local p = command(fresh("gate"), {type = "enter"})
        p.gold = 143; I.add(p, "silk", 4)
        local before = U.copy(p)
        expect.falsy(pcall(command, p, {type = "leave_dungeon", run = p.run.id}))
        expect.falsy(pcall(command, p, {type = "leave_dungeon", run = "old_run", confirm = true}))
        local distant = U.copy(p); distant.position.x = distant.position.x + 480
        expect.falsy(pcall(command, distant, {type = "leave_dungeon", run = p.run.id, confirm = true}))
        expect.truthy(U.equal(p, before))
        local backend = Support.backend(); local store = Save.new(backend)
        expect.truthy(store:commit(p))
        before = U.copy(p)
        local leave = {type = "leave_dungeon", run = p.run.id, confirm = true}
        local result = command(p, leave)
        expect.equal(result.phase, "town"); expect.falsy(result.run)
        expect.equal(result.position.x, C.services.gate.x * 48)
        expect.equal(result.position.y, (C.services.gate.y - 1) * 48)
        expect.truthy(D.walkable(D.town(), result.position.x / 48, result.position.y / 48))
        expect.equal(result.gold, p.gold); expect.equal(result.xp, p.xp)
        expect.truthy(U.equal(result.items, p.items)); expect.falsy(result.quest_evidence.return_home)
        backend.mode = "fail"; expect.falsy(store:commit(result))
        expect.truthy(U.equal(store:load(p.id), before))
        backend.mode = "ok"; expect.truthy(store:commit(result))
        local loaded = store:load(p.id); expect.truthy(U.equal(loaded, result))
        local retry, duplicate = Cmd.execute(loaded, leave, ENV)
        expect.truthy(duplicate); expect.truthy(U.equal(retry, loaded))
    end)

end)
