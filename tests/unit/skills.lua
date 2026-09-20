local lester = require("tests.vendor.lester")
local describe, it, expect = lester.describe, lester.it, lester.expect
local U = require("game.domain.util")
local Content = require("game.content.skills")
local C = require("game.content.catalog")
local K = require("game.domain.skills")
local Ch = require("game.domain.character")
local Cmd = require("game.domain.commands")
local B = require("game.domain.battle")
local S = require("game.domain.stats")
local V = require("game.domain.validate")
local Save = require("game.services.save")
local Presenter = require("game.runtime.skills_presenter")
local Support = require("tests.support")
local ENV = {now = 1789920000, rng_factory = Support.mock_rng}
local sequence = 0

local function fresh(race, talent)
    return Ch.new("profile_01", "Aster", race or "Human", 17, talent or "Close Combat", ENV.now, 42)
end
local function command(p, c)
    sequence = sequence + 1
    c.op = c.op or "skills_test_" .. sequence; c.revision = c.revision or p.revision
    return Cmd.execute(p, c, ENV)
end
local function encounter(p)
    p.position = {x = 14 * 48, y = 15 * 48}
    p = command(p, {type = "enter"})
    local room = p.run.map.rooms[2]
    p.position = {x = room.x * 48, y = room.y * 48}
    p = command(p, {type = "encounter", room = room.id})
    return command(p, {type = "begin_turn", battle = p.battle.id, turn = p.battle.turn})
end
local function action(p, skill)
    return {type = "act", actor = p.id, battle = p.battle.id, turn = p.battle.turn,
        target = p.battle.enemies[1].id, skill = skill}
end
local function legacy(p)
    p.rules_version = 1
    for _, learned in pairs(p.skills) do learned.objectives = nil; learned.legacy_training = nil; learned.last_training_action = nil end
    if p.run then p.run.skill_ranks = nil end
    return p
end

describe("Starter skills contract", function()
    it("owns exactly the starter skills and shares Attack progression with Combat Mastery", function()
        expect.equal(table.concat(Content.ranks, ","), "F,E,D,C,B,A,9,8,7,6,5,4,3,2,1")
        for _, talent in ipairs(C.talent_order) do
            local p = fresh("Human", talent)
            expect.equal(U.count(p.skills), 3)
            expect.falsy(p.skills.normal)
            expect.equal(K.rank(p, "normal"), 0)
            expect.equal(p.skills[C.talents[talent].skill].training, 0)
            expect.truthy(V.safe(p))
        end
    end)
    it("makes duplicate learning a no-op and preserves rebirth progress without equipment gifts", function()
        local p = fresh()
        K.train(p, {id = "fixture:1", skill = "smash", damage = 5, hero_action = true})
        local before = U.copy(p)
        expect.falsy(K.learn(p, "smash")); expect.truthy(U.equal(p, before))
        local items, ap = U.copy(p.items), p.ap
        Ch.rebirth(p, "Magic", 10, ENV.now + 86400)
        expect.equal(p.skills.smash.training, 5); expect.equal(p.skills.icebolt.training, 0)
        expect.equal(p.ap, ap); expect.truthy(U.equal(items, p.items))
        expect.falsy(pcall(K.learn, p, "normal")); expect.falsy(pcall(K.learn, p, "pounce"))
        expect.falsy(pcall(K.learn, p, "wand_mastery")); expect.falsy(pcall(K.learn, fresh("Giant"), "power_shot"))
    end)
    it("validates objective reachability and rejects fabricated costs and effects", function()
        expect.truthy(K.validate_content())
        local defs = U.copy(Content.definitions)
        defs.smash.ranks[1].objectives[1].limit = 1
        expect.falsy(pcall(K.validate_content, defs))
        defs = U.copy(Content.definitions); defs.icebolt.cost = 0 / 0
        expect.falsy(pcall(K.validate_content, defs))
        defs = U.copy(Content.definitions); defs.defense.kind = "counter"
        expect.falsy(pcall(K.validate_content, defs))
        defs = U.copy(Content.definitions); defs.smash.ranks[1].attributes.str = math.huge
        expect.falsy(pcall(K.validate_content, defs))
        defs = U.copy(Content.definitions); defs.normal.progression = "missing"
        expect.falsy(pcall(K.validate_content, defs))
    end)
    it("trains Combat Mastery with damaging Attack in every category and unarmed", function()
        for _, talent in ipairs(C.talent_order) do
            local p = encounter(fresh("Human", talent))
            p = command(p, action(p, "normal"))
            expect.equal(p.skills.combat_mastery.training, 5)
            expect.equal(p.skills[C.talents[talent].skill].training, 0)
        end
        local p = fresh(); p.items[1].slot = nil; p = encounter(p)
        p = command(p, action(p, "normal"))
        expect.equal(p.skills.combat_mastery.objectives.damaging_attack, 1)
    end)
    it("credits Double Shot once per action, never once per hit or repeated operation", function()
        local p = encounter(fresh("Human", "Dual Gun"))
        local c = action(p, "double_shot")
        local before = U.copy(p)
        local after = command(p, c)
        expect.equal(after.skills.double_shot.training, 5)
        expect.equal(after.skills.double_shot.objectives.damaging_skill, 1)
        expect.equal(after.pools.sp, p.pools.sp - 6)
        local retry, duplicate = Cmd.execute(after, c, ENV)
        expect.truthy(duplicate); expect.truthy(U.equal(retry, after)); expect.truthy(U.equal(before, p))
    end)
    it("does not train from menus, previews, failed actions or blocked damage", function()
        local p = encounter(fresh())
        local before = U.copy(p)
        B.preview(p, B.active(p), B.actor(p, p.battle.enemies[1].id), "normal")
        Presenter.model(p, {group = "All", skill = "smash"})
        expect.truthy(U.equal(before, p))
        local foreign = action(p, "smash"); foreign.profile = "profile_02"
        expect.falsy(pcall(command, p, foreign)); expect.truthy(U.equal(before, p))
        local c = action(p, "smash"); c.target = p.id
        expect.falsy(pcall(command, p, c)); expect.truthy(U.equal(before, p))
        p.battle.statuses[p.battle.enemies[1].id] = {guard = {defense = 1000, protection = 100}}
        p = command(p, action(p, "smash"))
        expect.equal(p.skills.smash.training, 0)
    end)
    it("separates casting Defense, fully mitigated hits and counter-negated attacks", function()
        local p = encounter(fresh())
        p = command(p, action(p, "defense"))
        expect.equal(p.skills.defense.objectives.prepare_guard, 1)
        p = command(p, {type = "begin_turn", battle = p.battle.id, turn = p.battle.turn})
        p = command(p, B.ai(p))
        expect.equal(p.skills.defense.objectives.fully_block, 1)
        local training = p.skills.defense.training
        K.train(p, {id = "counter_fixture", skill = "normal", damage = 0, hero_action = false, guarded = true, counter_negated = true})
        expect.equal(p.skills.defense.training, training)
        K.train(p, {id = "partial_fixture", skill = "normal", damage = 1, hero_action = false, guarded = true})
        expect.equal(p.skills.defense.training, training)
    end)
    it("bounds each objective and total, with one credit per resolved action identity", function()
        local p = fresh()
        for index = 1, 40 do
            local outcome = {id = "fixture:" .. index, skill = "normal", damage = 2, hero_action = true}
            K.train(p, outcome); K.train(p, outcome)
        end
        expect.equal(p.skills.combat_mastery.training, 100)
        expect.equal(p.skills.combat_mastery.objectives.damaging_attack, 20)
        expect.truthy(V.safe(p))
        p.skills.combat_mastery.objectives.damaging_attack = 21; expect.falsy(V.safe(p))
    end)
    it("freezes learned ranks for run costs, recovery and availability", function()
        local p = encounter(fresh())
        local baseline = U.copy(p.run.baseline)
        p.skills.combat_mastery.rank = 14
        expect.equal(select(2, B.cost(p, B.active(p), "normal")), 2)
        expect.equal(K.rank(p, "combat_mastery"), 0)
        expect.truthy(U.equal(baseline, p.run.baseline))
        p.skills.icebolt = {rank = 0, training = 0}
        expect.falsy(B.eligible(p, B.active(p), "icebolt"))
        expect.falsy(V.safe(p))
    end)
    it("does not infer playable higher ranks, enemy skills or a separate Attack record", function()
        local p = fresh()
        local before = U.copy(p)
        expect.falsy(K.can_advance(p, "smash"))
        expect.falsy(pcall(command, p, {type = "advance_skill", skill = "smash", rank = 0}))
        expect.truthy(U.equal(before, p))
        p.skills.smash.rank = 1; expect.falsy(V.safe(p))
        p = fresh(); p.skills.normal = U.copy(p.skills.smash); expect.falsy(V.safe(p))
        p = fresh(); p.skills.pounce = U.copy(p.skills.smash); expect.falsy(V.safe(p))
    end)
    it("applies cumulative F-rank bonuses once and mastery attack bonuses only to melee", function()
        for _, race in ipairs({"Human", "Elf", "Giant"}) do
            local p = fresh(race)
            local base = S.profile(p)
            K.learn(p, "icebolt")
            local after = S.profile(p)
            expect.equal(after.int, base.int + 1)
            expect.equal(after.hp, base.hp)
            K.learn(p, "icebolt"); expect.truthy(U.equal(after, S.profile(p)))
            local mastery = race == "Human" and 1.5 or 1
            expect.equal(after.melee, math.floor(after.str * .1) + mastery)
            expect.equal(after.ranged, math.floor(after.dex * .1))
            expect.equal(after.guns, math.floor((after.str + after.int) * .05))
        end
    end)
    it("migrates old aggregate training and frozen runs without rewriting the old slot", function()
        local p = legacy(encounter(fresh())); p.skills.smash.training = 35; p.revision = 4; p.generation = 1
        local before = U.copy(p)
        local backend = Support.backend()
        backend.write(p.id .. "_a", {magic = "RebirthDungeon", version = 1, generation = 1, payload = p})
        local store = Save.new(backend); local migrated = store:load(p.id)
        expect.equal(migrated.rules_version, 2)
        expect.equal(migrated.skills.smash.training, 35); expect.equal(migrated.skills.smash.legacy_training, 35)
        expect.equal(migrated.run.skill_ranks.smash, 0)
        expect.truthy(U.equal(migrated.run.baseline, before.run.baseline))
        expect.truthy(U.equal(backend.data[p.id .. "_a"].payload, before))
        migrated = command(migrated, action(migrated, "smash"))
        expect.equal(migrated.skills.smash.training, 40)
        expect.truthy(store:commit(migrated)); expect.equal(store:load(p.id).skills.smash.training, 40)
    end)
    it("preserves committed training on abandon and rolls back failed writes", function()
        local p = encounter(fresh()); p.revision = 4
        local backend = Support.backend(); local store = Save.new(backend); expect.truthy(store:commit(p))
        local c = action(p, "smash"); local candidate = command(p, c)
        backend.mode = "fail"; expect.falsy(store:commit(candidate))
        expect.truthy(U.equal(store:load(p.id), p))
        backend.mode = "ok"; expect.truthy(store:commit(candidate))
        local loaded = store:load(p.id)
        expect.equal(loaded.skills.smash.training, 5)
        loaded = command(loaded, {type = "abandon", confirm = true})
        expect.equal(loaded.skills.smash.training, 5); expect.falsy(loaded.run)
    end)
    it("shows categories, exact costs, requirements and authoritative disabled reasons", function()
        local p = fresh()
        local model = Presenter.model(p, {group = "Life"})
        expect.equal(#model.rows, 0)
        model = Presenter.model(p, {group = "Combat", skill = "normal"})
        expect.truthy(model.detail.alias); expect.equal(model.detail.rank, "F")
        expect.falsy(model.detail.use.enabled); expect.falsy(model.detail.advance.enabled)
        p = encounter(fresh("Human", "Magic"))
        model = Presenter.model(p, {group = "Magic", skill = "icebolt"})
        expect.equal(#model.rows, 1); expect.truthy(model.detail.use.enabled)
        expect.truthy(model.detail.cost:match("1 MP once"))
        p.pools.mp = 0
        model = Presenter.model(p, {group = "Magic", skill = "icebolt"})
        expect.falsy(model.detail.use.enabled); expect.equal(model.detail.use.reason, "Not enough MP")
        model = Presenter.model(p, {group = "All", skill = "normal"}, "Resolve the save failure first")
        expect.falsy(model.detail.use.enabled); expect.equal(model.detail.use.reason, "Resolve the save failure first")
    end)
end)
