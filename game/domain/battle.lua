local C=require("game.content.catalog")
local U=require("game.domain.util")
local I=require("game.domain.inventory")
local S=require("game.domain.stats")
local R=require("game.services.rng")
local Skills=require("game.domain.skills")
local Log=require("game.domain.combat_log")
local M={}
function M.actor(p,id)
    if id==p.id then return {id=p.id,name=p.name,pools=p.pools,hero=true} end
    for _,a in ipairs(p.battle.enemies) do if a.id==id then return a end end
end
function M.active(p) return p.battle and M.actor(p,p.battle.order[p.battle.cursor]) end
M.event=Log.emit
function M.start(p,room,factory,operation)
    local world=R.open(p.random.world,factory)
    local b={id=U.id(p,"battle"),room=room.id,enemies={},order={},speeds={},cursor=1,round=1,turn=1,started=false,item_used=false,
        operation=operation,sequence=0,events={},statuses={},cooldowns={},random=R.seed(world:int(0,4294967295),world:int(0,4294967295))}
    local D=require("game.domain.dungeon")
    for i,key in ipairs(D.enemies(room)) do
        local d=C.enemies[key];local id=b.id.."_enemy_"..i
        b.enemies[i]={id=id,def=key,name=d.name.." "..i,pools={hp=d.hp,mp=0,sp=20},last_defend=false}
        b.speeds[id]=d.speed
    end
    b.speeds[p.id]=p.run.baseline.speed
    local groups={}
    for id,speed in pairs(b.speeds) do groups[speed]=groups[speed] or {};groups[speed][#groups[speed]+1]=id end
    local speeds=U.keys(groups);local random=R.open(b.random,factory)
    for i=#speeds,1,-1 do local g=groups[speeds[i]];table.sort(g);random:shuffle(g);for _,id in ipairs(g) do b.order[#b.order+1]=id end end
    p.battle=b;p.phase="battle";p.last_events={}
    Log.migrate(p)
    M.event(p,"battle_start","The encounter begins.",{actor=p.id})
end
function M.cost(p,actor,skill)
    if skill=="normal" then
        return "sp",actor.hero and math.ceil((2+.1*Skills.rank(p,"combat_mastery"))*10-1e-8)/10 or 2
    end
    local d=C.skills[skill];return d.pool,math.ceil(d.cost)
end
function M.eligible(p,actor,skill)
    local d=C.skills[skill]
    if not d or d.kind=="passive" then return false,"Not an active skill" end
    if actor.hero then
        if skill~="normal" and Skills.rank(p,skill)==nil then return false,"Skill not learned" end
        if d.category and S.current(p).category~=d.category then return false,"Requires "..d.category.." equipment" end
        if d.no_giant and p.race=="Giant" then return false,"Giants cannot use bows" end
    else
        if skill~="normal" and skill~="defense" and C.enemies[actor.def].skill~=skill then return false,"Enemy cannot use that skill" end
    end
    if ((p.battle.cooldowns[actor.id] or {})[skill] or 0)>0 then return false,"On cooldown" end
    local pool,cost=M.cost(p,actor,skill)
    if actor.pools[pool]<cost then return false,"Not enough "..pool:upper() end
    return true
end
function M.can_wait(p,actor)
    for _,skill in ipairs(U.keys(C.skills)) do if M.eligible(p,actor,skill) then return false end end
    return true
end
local function status(p,id) p.battle.statuses[id]=p.battle.statuses[id] or {};return p.battle.statuses[id] end
function M.ended(p)
    if p.pools.hp<=0 then return "defeat" end
    for _,a in ipairs(p.battle.enemies) do if a.pools.hp>0 then return nil end end
    return "victory"
end
function M.begin(p)
    local b=p.battle;U.require_ok(not b.started,"Turn already initialized")
    local a=M.active(p);U.require_ok(a and a.pools.hp>0,"Actor cannot begin a turn")
    if status(p,a.id).guard then M.event(p,"status_end",a.name.." stops defending",{actor=a.id,target=a.id,status="guard"}) end
    status(p,a.id).guard=nil
    local rank=a.hero and Skills.rank(p,"combat_mastery") or 0
    local amount=a.hero and (.5+.5*math.floor(rank/3)) or .5
    local maximum=a.hero and S.current(p).sp or 20
    local recovered=math.min(maximum-a.pools.sp,amount);a.pools.sp=U.round(a.pools.sp+recovered,4)
    b.started=true;b.item_used=false
    M.event(p,"turn_start",a.name.." begins a turn ("..U.round(recovered,1).." SP recovered)",{actor=a.id,target=a.id,amount=recovered,pool="sp"})
end
function M.preview(p,actor,target,skill)
    local d=C.skills[skill];local category=actor.hero and (d.category or S.current(p).category) or "melee"
    local power=actor.hero and S.power(p,category) or C.enemies[actor.def].attack
    local multiplier=d.multiplier or 1;if d.giant_multiplier and p.race=="Giant" and actor.hero then multiplier=d.giant_multiplier end
    local defense,protection
    if target.hero then local s=S.current(p);defense=category=="magic" and s.magic_defense or s.defense;protection=category=="magic" and s.magic_protection or s.protection
    else defense=C.enemies[target.def].defense;protection=0 end
    local effects=(p.battle.statuses[target.id] or {})
    if effects.guard then defense=defense+effects.guard.defense;protection=protection+effects.guard.protection end
    if effects.armor_break then defense=math.max(0,defense-4) end
    local hits=d.hits or 1
    local base=(d.base or 0)+power*multiplier
    return math.floor(math.floor(math.max(0,base/hits-defense))*(1-U.clamp(protection,0,100)/100)),hits
end
local function finish_owner(p,a,cast)
    local b=p.battle;local effects=status(p,a.id)
    if effects.poison and effects.poison.applied~=b.turn then
        local loss=math.min(a.pools.hp,3);a.pools.hp=a.pools.hp-loss
        M.event(p,"periodic",a.name.." loses "..loss.." HP to poison",{actor=a.id,target=a.id,amount=loss,actual=loss,calculated=3,status="poison",pool="hp"})
        if a.pools.hp<=0 then M.event(p,"defeat",a.name.." is defeated",{target=a.id}) end
        if M.ended(p) then return end
    end
    for _,key in ipairs(U.keys(effects)) do
        local e=effects[key]
        if e.remaining and e.applied~=b.turn then e.remaining=e.remaining-1;if e.remaining<=0 then effects[key]=nil;M.event(p,"status_end",a.name.." recovers from "..key,{target=a.id,status=key}) end end
    end
    for key,n in pairs(b.cooldowns[a.id] or {}) do if key~=cast then b.cooldowns[a.id][key]=math.max(0,n-1) end end
end
function M.act(p,command,factory)
    local b=p.battle;local a=M.active(p)
    U.require_ok(b.started and a and a.id==command.actor and a.pools.hp>0,"It is not this actor's turn")
    local skill=command.skill
    if skill=="wait" then
        U.require_ok(M.can_wait(p,a),"Wait is only available when no main action is affordable")
        M.event(p,"wait",a.name.." waits",{actor=a.id})
    else
        local ok,reason=M.eligible(p,a,skill);U.require_ok(ok,reason)
        local d=C.skills[skill];local target
        if d.kind=="attack" then
            target=M.actor(p,command.target)
            U.require_ok(target and target.pools.hp>0 and target.hero~=a.hero,"Choose a living hostile target")
        end
        local pool,cost=M.cost(p,a,skill);a.pools[pool]=U.round(a.pools[pool]-cost,4)
        M.event(p,"action",a.name.." uses "..d.name.." ("..cost.." "..pool:upper()..")",{actor=a.id,target=target and target.id or a.id,skill=skill,cost=cost,pool=pool})
        if d.kind=="guard" then
            local rank=a.hero and Skills.record(p,"defense")
            status(p,a.id).guard={defense=rank and rank.guard_defense[p.race] or 2,protection=rank and rank.guard_protection[p.race] or 5}
            local guard=status(p,a.id).guard
            M.event(p,"status",a.name.." defends until the next turn",{actor=a.id,target=a.id,status="guard",defense=guard.defense,protection=guard.protection})
            if a.hero then Skills.train(p,{id=b.id..":"..b.turn,skill=skill,damage=0,hero_action=true}) end
        else
            local damage,hits=M.preview(p,a,target,skill)
            -- Critical Hit has no executable starter definition; no fabricated chance or RNG draw.
            local critical=false
            local dealt=0
            for hit=1,hits do
                if target.pools.hp<=0 then break end
                local loss=math.min(target.pools.hp,critical and math.floor(damage*1.5) or damage)
                target.pools.hp=target.pools.hp-loss;dealt=dealt+loss
                M.event(p,"damage",target.name.." takes "..loss.." damage"..(critical and " · Critical" or ""),{actor=a.id,target=target.id,skill=skill,amount=loss,actual=loss,calculated=critical and math.floor(damage*1.5) or damage,absorbed=0,hit=hit,hits=hits,critical=critical})
            end
            if a.hero then
                local weapon=I.equipped(p,"weapon");if weapon then weapon.durability=math.max(0,weapon.durability-1) end
                Skills.train(p,{id=b.id..":"..b.turn,skill=skill,damage=dealt,hero_action=true})
            elseif target.hero then
                local guarded=(b.statuses[p.id] or {}).guard~=nil
                Skills.train(p,{id=b.id..":"..b.turn,skill=skill,damage=dealt,hero_action=false,guarded=guarded})
            end
            if target.pools.hp<=0 then M.event(p,"defeat",target.name.." is defeated",{target=target.id})
            elseif d.status then status(p,target.id)[d.status]={remaining=d.status=="poison" and 3 or 2,applied=b.turn};M.event(p,"status",target.name.." is affected by "..d.status,{actor=a.id,target=target.id,status=d.status,remaining=d.status=="poison" and 3 or 2}) end
        end
        if d.cooldown>0 then b.cooldowns[a.id]=b.cooldowns[a.id] or {};b.cooldowns[a.id][skill]=d.cooldown end
    end
    if not a.hero then a.last_defend=skill=="defense" end
    if not M.ended(p) then finish_owner(p,a,skill) end
    local outcome=M.ended(p)
    if outcome then b.outcome=outcome;M.event(p,"battle_end",outcome=="victory" and "Victory" or "Defeat",{actor=a.id,outcome=outcome});return outcome end
    repeat
        b.cursor=b.cursor+1
        if b.cursor>#b.order then b.cursor=1;b.round=b.round+1 end
    until M.actor(p,b.order[b.cursor]).pools.hp>0
    b.turn=b.turn+1;b.started=false;b.item_used=false

end
function M.ai(p)
    local a=M.active(p);local d=C.enemies[a.def]
    local skill
    if a.pools.hp<=d.hp*.25 and not a.last_defend and M.eligible(p,a,"defense") then skill="defense"
    elseif M.eligible(p,a,d.skill) then skill=d.skill
    elseif M.eligible(p,a,"normal") then skill="normal"
    elseif M.eligible(p,a,"defense") then skill="defense" else skill="wait" end
    return {type="act",actor=a.id,battle=p.battle.id,turn=p.battle.turn,skill=skill,target=p.id}
end
return M
