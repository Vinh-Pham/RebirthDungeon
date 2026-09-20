local lester = require("tests.vendor.lester")
local describe, it, expect = lester.describe, lester.it, lester.expect
local UI = require("game.runtime.ui_presenter")
local Ch = require("game.domain.character")
local Cmd = require("game.domain.commands")
local I = require("game.domain.inventory")
local U = require("game.domain.util")
local Q = require("game.services.quests")
local Support = require("tests.support")
local NOW = 1789920000
local ENV = {now = NOW, rng_factory = Support.mock_rng}

local function fresh()
    return Ch.new("profile_01", "Aster", "Human", 17, "Close Combat", NOW, 42)
end
local function state(p)
    return {screen = p and p.phase or "title", settings = {music = .4, effects = .65, reduced_motion = false, hud_scale = 1.3}, profiles = p and {p} or {}, epoch = 1}
end
local function battle()
    local p = fresh(); p.position = {x = 14 * 48, y = 15 * 48}
    p = Cmd.execute(p, {type = "enter", op = "ui_enter", revision = p.revision}, ENV)
    local room = p.run.map.rooms[2]; p.position = {x = room.x * 48, y = room.y * 48}
    p = Cmd.execute(p, {type = "encounter", room = room.id, op = "ui_encounter", revision = p.revision}, ENV)
    return p
end

describe("UI projections", function()
    it("provides neutral title data and exposes no save/RNG/treasure internals", function()
        local model = UI.model(nil, state(), {}, NOW)
        expect.falsy(model.profile); expect.equal(model.screen, "title")
        local p = battle(); model = UI.model(p, state(p), {}, NOW)
        expect.falsy(model.profile.random); expect.falsy(model.profile.ledger)
        expect.falsy(model.profile.run.map); expect.falsy(model.profile.run.chests)
        expect.falsy(model.profile.battle.random); expect.falsy(model.profiles[1].items)
    end)
    it("shows exact fractional costs and turn/cooldown reasons without advancing turns", function()
        local p = battle(); local before = U.copy(p)
        local model = UI.model(p, state(p), {}, NOW)
        expect.falsy(model.profile.battle.actions.normal.enabled)
        expect.equal(model.profile.battle.actions.normal.cost, 2)
        expect.truthy(U.equal(before, p))
        p = Cmd.execute(p, {type = "begin_turn", battle = p.battle.id, turn = p.battle.turn, op = "ui_begin", revision = p.revision}, ENV)
        p.battle.cooldowns[p.id] = {smash = 2}
        model = UI.model(p, state(p), {}, NOW)
        expect.equal(model.profile.battle.actions.smash.reason, "Cooldown: 2 turn(s)")
        expect.truthy(model.profile.battle.actions.normal.enabled)
        expect.equal(model.profile.battle.actions.normal.command.revision, p.revision)
    end)
    it("previews selected reward capacity independently from Take All and preserves offers", function()
        local p = battle(); p.phase = "rewards"; p.battle.outcome = "victory"
        p.pending = {id = "ui_rewards", origin = "encounter", entries = {
            {id = "gold", kind = "gold", amount = 12, claimed = false},
            {id = "silk", kind = "item", def = "silk", amount = 2, claimed = false}}}
        local defaults = UI.model(p, state(p), {}, NOW)
        expect.equal(#defaults.profile.pending.selected.command.ids, 2)
        expect.truthy(defaults.profile.pending.selected.command.finish)
        I.add(p, "armor", 30)
        local before, binding = U.copy(p), Q.bound_state()
        local model = UI.model(p, state(p), {selected = {gold = true, silk = false}}, NOW)
        expect.falsy(model.profile.pending.all.enabled); expect.truthy(model.profile.pending.selected.enabled)
        expect.equal(#model.profile.pending.selected.command.ids, 1)
        expect.truthy(U.equal(before, p)); expect.equal(Q.bound_state(), binding)
        local take = model.profile.pending.selected.command; take.op = "take_selected"
        local result = Cmd.execute(p, take, ENV)
        expect.equal(result.phase, "dungeon"); expect.falsy(result.pending)
        expect.equal(result.gold, p.gold + 12)
        expect.truthy(U.equal(result.items, p.items))
        local empty = UI.model(p, state(p), {selected = {gold = false, silk = false}}, NOW)
        expect.truthy(empty.profile.pending.selected.enabled)
    end)
    it("projects current stats, frozen-run explanations and rebirth eligibility", function()
        local p = fresh(); local model = UI.model(p, state(p), {}, NOW)
        expect.falsy(model.profile.rebirth.enabled); expect.truthy(model.profile.rebirth.seconds > 0)
        model = UI.model(p, state(p), {}, NOW + 8 * 86400)
        expect.truthy(model.profile.rebirth.enabled)
        p = battle(); model = UI.model(p, state(p), {}, NOW + 8 * 86400)
        expect.falsy(model.profile.rebirth.enabled)
        expect.equal(model.profile.stats.str, p.run.baseline.str)
        expect.truthy(model.profile.sources[4]:find("frozen", 1, true))
    end)
    it("bounds log pages and supplies map cells without mutating gameplay", function()
        local p = battle()
        for index = 1, 35 do p.battle.events[index] = {sequence = index, operation="op_"..index, kind="wait", text = "Example", turn = 1,round=1} end
        p.battle.sequence=35;require("game.domain.combat_log").sync(p)
        local shell = state(p); shell.modal = "log"
        local model = UI.model(p, shell, {log_anchor = 5}, NOW)
        expect.equal(model.profile.combat_log.last, 5); expect.equal(#model.profile.combat_log.rows, 5)
        p = fresh(); shell = state(p); shell.modal = "map"
        local before = U.copy(p); model = UI.model(p, shell, {}, NOW)
        expect.equal(#model.map.points, 6); expect.truthy(#model.map.cells > 0)
        expect.truthy(U.equal(before, p))
    end)
end)
