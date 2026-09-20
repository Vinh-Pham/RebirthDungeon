local U=require("game.domain.util")
local C=require("game.content.catalog")
local I=require("game.domain.inventory")
local S=require("game.domain.stats")
local T=require("game.domain.time")
local R=require("game.services.rng")
local XP=require("game.content.experience")
local Skills=require("game.domain.skills")
local M={}
-- Explicit first-release naming policy: ASCII letters/numbers, spaces, ' and -.
-- Reject all other UTF-8 instead of silently counting bytes or inconsistent case folding.
function M.name(name)
    if type(name)~="string" then return nil,"Enter a name" end
    name=name:match("^%s*(.-)%s*$")
    if #name<2 or #name>24 then return nil,"Use 2–24 characters" end
    if not name:match("^[A-Za-z][A-Za-z0-9 '%-]*$") then return nil,"Names use A–Z, numbers, spaces, apostrophes and hyphens" end
    return name,name:lower()
end
function M.new(id,name,race,age,talent,now,seed)
    local clean,reason=M.name(name);U.require_ok(clean,reason)
    U.require_ok(U.contains({"Human","Elf","Giant"},race) and U.integer(age,10,17) and C.talents[talent],"Invalid character choices")
    U.require_ok(not(race=="Giant" and talent=="Archery"),"Giants cannot select Archery")
    local p={format_version=3,rules_version=2,content_version=1,id=id,name=clean,race=race,age=age,talent=talent,
        level=1,xp=0,cumulative=1,ap=5,gold=100,bank={gold=0,items={}},items={},growth={},skills={},
        created=now,reborn=now,age_boundary=T.latest(now),life=1,next_id=0,revision=0,generation=0,
        phase="town",position={x=14*48,y=9*48},ledger={},claims={},quest_evidence={},quest_claims={},quests={current={},completed={}},
        dialogue={},combat_log={version=1},last_events={},last_message="Welcome to Town1. Speak with Aren at the northern gate.",
        random={world=R.seed(seed,54),reward=R.seed((seed+17)%4294967296,91)}}
    for _,skill in ipairs({"combat_mastery","defense",C.talents[talent].skill}) do Skills.learn(p,skill) end
    I.add(p,C.talents[talent].weapon,1);I.equip(p,p.items[1].id)
    S.restore(p)
    return p
end
function M.xp(p,amount)
    U.require_ok(U.integer(amount,0,10000000),"Invalid experience")
    p.xp=p.xp+amount
    while p.level<200 and p.xp>=XP[p.level] do
        p.xp=p.xp-XP[p.level];p.level=p.level+1;p.cumulative=p.cumulative+1;p.ap=p.ap+1
        for k,v in pairs(C.talents[p.talent].growth) do p.growth[k]=U.round((p.growth[k] or 0)+v,4) end
    end
    if p.level==200 then p.xp=0 end
    S.clamp(p)
end
function M.age(p,now)
    if p.run then return end
    local latest=T.latest(now)
    while p.age_boundary<latest do
        p.age_boundary=p.age_boundary+7;p.age=p.age+1;p.ap=p.ap+5
        if p.age<=20 then for k,v in pairs(C.talents[p.talent].aging) do p.growth[k]=U.round((p.growth[k] or 0)+v,4) end end
    end
    S.clamp(p)
end
function M.rebirth(p,talent,age,now)
    U.require_ok(not p.run and p.phase=="town","Abandon the active run before rebirth")
    M.age(p,now)
    U.require_ok(now>=p.reborn+T.cooldown(p.cumulative),"Rebirth is still on cooldown")
    U.require_ok(C.talents[talent] and not(p.race=="Giant" and talent=="Archery"),"Choose a compatible talent")
    U.require_ok(U.integer(age,10,17) and age<=p.age,"Choose an age no older than your current age")
    p.age=age;p.talent=talent;p.level=1;p.xp=0;p.growth={};p.life=p.life+1;p.reborn=now
    Skills.learn(p,C.talents[talent].skill)
    S.restore(p);p.last_message="A new life begins. Your skills and possessions remain."
end
return M
