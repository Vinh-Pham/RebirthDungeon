local lester=require "tests.vendor.lester"
local describe,it,expect=lester.describe,lester.it,lester.expect
local U=require "game.domain.util"
local Ch=require "game.domain.character"
local Cmd=require "game.domain.commands"
local B=require "game.domain.battle"
local I=require "game.domain.inventory"
local S=require "game.domain.stats"
local D=require "game.domain.dungeon"
local T=require "game.domain.time"
local R=require "game.services.rng"
local Q=require "game.services.quests"
local Save=require "game.services.save"
local V=require "game.domain.validate"
local Support=require "tests.support"
local env={now=1789920000,rng_factory=Support.mock_rng}
local function fresh(race,talent) return Ch.new("profile_01","Aster",race or "Human",17,talent or "Close Combat",env.now,42) end
local serial=0
local function command(p,c)
    serial=serial+1;c.op=c.op or "test_"..serial;c.revision=c.revision or p.revision
    return Cmd.execute(p,c,env)
end
local function enter(p)
    p=command(p,{type="checkpoint",x=14*48,y=15*48})
    return command(p,{type="enter"})
end
local function start(p,room)
    local r=p.run.map.rooms[room]
    p=command(p,{type="checkpoint",x=r.x*48,y=r.y*48})
    return command(p,{type="encounter",room=r.id})
end
local function begin(p) return command(p,{type="begin_turn",battle=p.battle.id,turn=p.battle.turn}) end
local function win(p)
    local limit=0
    while p.phase=="battle" do
        limit=limit+1;assert(limit<300,"battle must terminate")
        if not p.battle.started then p=begin(p) end
        local a=B.active(p);local c
        if a.hero then
            if p.pools.hp<85 and not p.battle.item_used then
                for _,item in ipairs(p.items) do if item.def=="hp_potion" then
                    p=command(p,{type="use_item",item=item.id,actor=p.id,battle=p.battle.id,turn=p.battle.turn});break
                end end
            end
            if p.pools.sp<8 and not p.battle.item_used then
                for _,item in ipairs(p.items) do if item.def=="sp_potion" then
                    p=command(p,{type="use_item",item=item.id,actor=p.id,battle=p.battle.id,turn=p.battle.turn});break
                end end
            end
            local target;local hp=math.huge
            for _,e in ipairs(p.battle.enemies) do if e.pools.hp>0 and e.pools.hp<hp then target=e.id;hp=e.pools.hp end end
            local talent=require("game.content.catalog").talents[p.talent].skill
            local skill=B.eligible(p,a,talent) and talent or B.eligible(p,a,"normal") and "normal" or B.eligible(p,a,"defense") and "defense" or "wait"
            c={type="act",actor=p.id,battle=p.battle.id,turn=p.battle.turn,target=target,skill=skill}
        else c=B.ai(p) end
        p=command(p,c)
    end
    return p
end
local function take(p)
    local ids={};for _,e in ipairs(p.pending.entries) do if not e.claimed then ids[#ids+1]=e.id end end
    p=command(p,{type="claim",reward=p.pending.id,ids=ids})
    return command(p,{type="leave_rewards"})
end
local function boss_drop()
    local p=enter(fresh());p.run.cleared={room_2=true,room_3=true,room_4=true}
    p=start(p,5)
    for _,enemy in ipairs(p.battle.enemies) do enemy.pools.hp=1 end
    return win(p)
end
local function at_treasure(p,index)
    local object=D.treasure_objects(p.run.map)[index]
    return command(p,{type="checkpoint",x=object.x*48,y=object.y*48})
end
local function reachable_cells(map,run,battle)
    local start=map.rooms[1];local queue={{x=start.x,y=start.y}};local seen={[D.index(map,start.x,start.y)]=true}
    local head=1
    while queue[head] do
        local cell=queue[head];head=head+1
        for _,offset in ipairs({{-1,0},{1,0},{0,-1},{0,1}}) do
            local x,y=cell.x+offset[1],cell.y+offset[2];local key=D.index(map,x,y)
            if not seen[key] and D.walkable(map,x,y,run,battle) then seen[key]=true;queue[#queue+1]={x=x,y=y} end
        end
    end
    return seen
end
describe("Durable game rules",function()
    it("maps fixed-fit screen positions consistently at both desktop aspects",function()
        local coords=require "game.world.coordinates"
        local x,y=coords.design(512,384,1024,768);expect.equal(x,640);expect.equal(y,360)
        x,y=coords.design(0,96,1024,768);expect.equal(x,0);expect.equal(y,0)
        x,y=coords.design(205,266,1280,720);expect.equal(x,205);expect.equal(y,266)
    end)
    it("creates independent legal characters and rejects invalid names/talents",function()
        local p=fresh();expect.truthy(V.safe(p));expect.equal(p.gold,100);expect.equal(p.ap,5)
        expect.falsy(pcall(fresh,"Giant","Archery"));expect.falsy(Ch.name("é"));expect.equal(Ch.name("  Aster  "),"Aster")
        local q=fresh();p.items[1].durability=0;expect.equal(q.items[1].durability,20)
    end)
    it("rejects stale commands without changing inputs, RNG or quest bindings",function()
        local p=fresh();local copy=U.copy(p);local binding=Q.bound_state()
        expect.falsy(pcall(command,p,{type="enter"}));expect.truthy(U.equal(p,copy));expect.equal(Q.bound_state(),binding)
        expect.falsy(pcall(command,p,{type="age",revision=99}));expect.truthy(U.equal(p,copy))
    end)
    it("serializes duplicate operation outcomes without reapplying costs",function()
        local p=fresh();p.position={x=14*48,y=4*48}
        local c={type="buy",service="shop",def="hp_potion",op="purchase_once",revision=0}
        local next=command(p,c);local retry,duplicate=command(next,c)
        expect.truthy(duplicate);expect.equal(retry.gold,90);expect.truthy(U.equal(next,retry));expect.equal(p.gold,100)
    end)
    it("validates whole transfers, stacked capacity, equipment and repairs",function()
        local p=fresh();I.add(p,"hp_potion",99);I.add(p,"hp_potion",1);expect.equal(#p.items,3)
        p.position={x=8*48,y=6*48};p=command(p,{type="bank_item",item=p.items[2].id,quantity=99,deposit=true})
        expect.equal(#p.bank.items,1);expect.equal(p.bank.items[1].quantity,99)
        local weapon=p.items[1];weapon.durability=11;p.position={x=19*48,y=6*48}
        p=command(p,{type="repair",item=weapon.id});expect.equal(p.gold,91);expect.equal(p.items[1].durability,20)
        for _=1,29 do I.add(p,"armor",1) end
        local before=U.copy(p);expect.falsy(pcall(command,p,{type="buy",service="blacksmith",def="sword"}));expect.truthy(U.equal(p,before))
    end)
    it("proves 1000 dungeon seeds connect all eight rooms with only three required",function()
        for seed=1,1000 do
            local d=R.seed(seed,54);local map=D.generate(R.open(d,Support.mock_rng))
            expect.truthy(D.reachable(map));expect.equal(#map.rooms,8)
            local run={map=map,cleared={room_2=true,room_3=true,room_4=true}}
            expect.truthy(D.boss_open(run));expect.falsy(run.cleared.room_6)
        end
    end)
    it("gates every monster room and blocks forward and side routes until its victory",function()
        for seed=1,40 do
            local map=D.generate(R.open(R.seed(seed,54),Support.mock_rng));local run={map=map,cleared={}}
            local owners={};for _,gate in ipairs(map.gates) do owners[gate.room]=true end
            for _,room in ipairs(map.rooms) do if D.enemies(room) then expect.truthy(owners[room.id]) end end
            for stage=2,5 do
                local seen=reachable_cells(map,run)
                for index=1,5 do
                    local room=map.rooms[index]
                    expect.equal(seen[D.index(map,room.x,room.y)]==true,index<=stage)
                end
                local reward=map.rooms[8];expect.falsy(seen[D.index(map,reward.x,reward.y)])
                local optional,supplies=map.rooms[6],map.rooms[7]
                expect.equal(seen[D.index(map,optional.x,optional.y)]==true,stage>=3)
                expect.equal(seen[D.index(map,supplies.x,supplies.y)]==true,stage>=4)
                run.cleared[map.rooms[stage].id]=true
            end
            expect.truthy(D.boss_open(run));expect.falsy(run.cleared.room_6)
            local reward=map.rooms[8];expect.truthy(reachable_cells(map,run)[D.index(map,reward.x,reward.y)])
            local legacy=U.copy(map);legacy.gates=nil
            expect.truthy(U.equal(D.gates(legacy),map.gates))
        end
    end)
    it("seals every door during each active encounter, including optional and boss rooms",function()
        local map=D.generate(R.open(R.seed(44,54),Support.mock_rng))
        local run={map=map,cleared={room_2=true,room_3=true,room_4=true}}
        for _,room in ipairs(map.rooms) do
            if D.enemies(room) then
                local battle={room=room.id}
                for _,gate in ipairs(map.gates) do if gate.room==room.id then
                    expect.falsy(D.walkable(map,gate.x,gate.y,run,battle))
                    battle.outcome="victory";run.cleared[room.id]=true
                    expect.truthy(D.walkable(map,gate.x,gate.y,run,battle));battle.outcome=nil
                end end
            end
        end
    end)
    it("opens gates only after the last monster dies and preserves locked gates on save failure",function()
        local p=start(enter(fresh()),2)
        p.battle.enemies[1].pools.hp=0;p.battle.enemies[2].pools.hp=1
        for index,id in ipairs(p.battle.order) do if id==p.id then p.battle.cursor=index end end
        p.battle.started=true
        expect.falsy(B.ended(p));expect.falsy(p.run.cleared.room_2)
        local gate
        for _,candidate in ipairs(p.run.map.gates) do if candidate.room=="room_2" and candidate.forward then gate=candidate;break end end
        expect.falsy(D.gate_open(p.run,gate))
        local backend=Support.backend();local store=Save.new(backend);expect.truthy(store:commit(p))
        local before=U.copy(p)
        local result=command(p,{type="act",actor=p.id,battle=p.battle.id,turn=p.battle.turn,target=p.battle.enemies[2].id,skill="normal"})
        expect.equal(result.phase,"rewards");expect.truthy(D.gate_open(result.run,gate))
        backend.mode="fail";expect.falsy(store:commit(result))
        expect.truthy(U.equal(store:load(p.id),before));expect.falsy(D.gate_open(store:load(p.id).run,gate))
        backend.mode="ok";expect.truthy(store:commit(result))
        expect.truthy(D.gate_open(store:load(p.id).run,gate))
    end)
    it("restores counted RNG draws and leaves previews deterministic",function()
        local d=R.seed(42,54);local a=R.open(d,Support.mock_rng);a:int(1,3);a:int(0,9999)
        local saved=U.copy(d);local expected=a:int(2,200);local restored=R.open(saved,Support.mock_rng)
        expect.equal(restored:int(2,200),expected);expect.truthy(U.equal(saved,d))
        local draws=d.raw_draw_count;expect.falsy(a:chance(0));expect.truthy(a:chance(1));expect.equal(d.raw_draw_count,draws)
    end)
    it("initializes a turn once, keeps fractional costs and allows one item",function()
        local p=start(enter(fresh()),2);p.pools.sp=50;p.pools.hp=80;I.add(p,"hp_potion",2)
        p=begin(p);expect.equal(p.pools.sp,50.5)
        expect.falsy(pcall(begin,p))
        local turn=p.battle.turn;local id=p.items[2].id
        p=command(p,{type="use_item",item=id,actor=p.id,battle=p.battle.id,turn=turn})
        expect.equal(p.battle.turn,turn);expect.equal(p.pools.hp,110)
        expect.falsy(pcall(command,p,{type="use_item",item=id,actor=p.id,battle=p.battle.id,turn=turn}))
        expect.falsy(B.can_wait(p,B.active(p)))
        for rank=0,14 do p.skills.combat_mastery.rank=rank;local _,cost=B.cost(p,B.active(p),"normal");expect.equal(cost,2) end
    end)
    it("uses fixed Speed order, skips dead actors and rejects stale turns",function()
        local p=start(enter(fresh()),2);local order=U.copy(p.battle.order);p=begin(p)
        local target=p.battle.enemies[1].id;p.battle.enemies[1].pools.hp=1
        local c={type="act",actor=p.id,battle=p.battle.id,turn=1,skill="normal",target=target}
        p=command(p,c);expect.truthy(U.equal(p.battle.order,order));expect.equal(B.active(p).id,p.battle.enemies[2].id)
        c.op=nil;c.revision=p.revision;expect.falsy(pcall(command,p,c))
    end)
    it("survives the full Alby loop, keeps optional rooms optional and one chest",function()
        local p=enter(fresh())
        for room=2,4 do p=take(win(start(p,room)));expect.equal(p.phase,"dungeon") end
        expect.truthy(D.boss_open(p.run));expect.falsy(p.run.cleared.room_6)
        -- Supply reserves are legitimate items used between encounters.
        I.add(p,"hp_potion",3)
        while p.pools.hp<S.current(p).hp do
            local potion;for _,item in ipairs(p.items) do if item.def=="hp_potion" then potion=item.id;break end end
            p=command(p,{type="use_item",item=potion})
        end
        p=win(start(p,5));expect.equal(p.phase,"dungeon");expect.equal(#p.run.chests,5);expect.equal(p.run.keys,1)
        local chest=D.treasure_objects(p.run.map)[3];p=command(p,{type="checkpoint",x=chest.x*48,y=chest.y*48})
        p=command(p,{type="chest",index=3});expect.truthy(p.run.chests[3].opened);expect.equal(p.run.keys,0)
        expect.falsy(pcall(command,p,{type="chest",index=2}))
        p=take(p);local gold=p.gold
        local statue=D.treasure_objects(p.run.map)[6];p=command(p,{type="checkpoint",x=statue.x*48,y=statue.y*48})
        p=command(p,{type="return",confirm=true})
        expect.equal(p.phase,"town");expect.equal(p.gold,gold);expect.truthy(p.quest_evidence.return_home)
        p=command(p,{type="claim_quest",quest="return_home"});expect.equal(p.gold,gold+50)
        expect.falsy(pcall(command,p,{type="claim_quest",quest="return_home"}))
    end)
    it("awards exactly one boss key with no ordinary loot and spends one key per unopened chest",function()
        local p=boss_drop();expect.equal(p.run.keys,1);expect.falsy(p.pending);expect.equal(p.gold,100)
        expect.equal(#p.items,1);expect.equal(#p.run.chests,5)
        expect.falsy(pcall(command,p,{type="chest",index=3}))
        p=at_treasure(p,3);local before=U.copy(p)
        local c={type="chest",index=3};local opened=command(p,c)
        expect.equal(opened.run.keys,0);expect.truthy(opened.run.chests[3].opened)
        local retry,duplicate=Cmd.execute(opened,c,env);expect.truthy(duplicate);expect.truthy(U.equal(retry,opened))
        p=take(opened);p=at_treasure(p,4)
        expect.falsy(pcall(command,p,{type="chest",index=4}))
        p.run.keys=1;p=command(p,{type="chest",index=4});p=take(p)
        expect.truthy(p.run.chests[3].opened and p.run.chests[4].opened);expect.equal(p.run.keys,0)
        p.run.keys=1;p=at_treasure(p,3);expect.falsy(pcall(command,p,{type="chest",index=3}))
        expect.truthy(before.run.keys==1 and not before.run.chests[3].opened)
    end)
    it("saves key consumption, chest opening and pending treasure as one recoverable action",function()
        local p=at_treasure(boss_drop(),2)
        for _=1,30 do I.add(p,"armor",1) end
        local backend=Support.backend();local store=Save.new(backend);expect.truthy(store:commit(p))
        local before=U.copy(p);local candidate=command(p,{type="chest",index=2})
        backend.mode="fail";expect.falsy(store:commit(candidate));expect.truthy(U.equal(store:load(p.id),before))
        backend.mode="ok";expect.truthy(store:commit(candidate))
        local loaded=store:load(p.id);expect.equal(loaded.run.keys,0);expect.truthy(loaded.run.chests[2].opened)
        expect.truthy(U.equal(loaded.pending,candidate.pending))
        expect.falsy(pcall(take,loaded));expect.truthy(U.equal(store:load(p.id).pending,candidate.pending))
    end)
    it("allows confirmed goddess return with an unused key but requires proximity and keeps possessions",function()
        local p=boss_drop();local before=U.copy(p)
        expect.falsy(pcall(command,p,{type="return",confirm=true}))
        expect.truthy(U.equal(p,before));p=at_treasure(p,6)
        expect.falsy(pcall(command,p,{type="return"}))
        local result=command(p,{type="return",confirm=true})
        expect.equal(result.phase,"town");expect.falsy(result.run)
        expect.truthy(U.equal(result.items,p.items));expect.equal(result.gold,p.gold);expect.equal(result.xp,p.xp)
        expect.equal(result.position.x,14*48);expect.equal(result.position.y,14*48)
    end)
    it("migrates old treasure choices without rerolling or duplicating their key",function()
        for _,chosen in ipairs({false,2}) do
            local p=boss_drop();local map=p.run.map;local cells={}
            for y=1,43 do for x=1,83 do
                cells[(y-1)*83+x]=x>map.rooms[5].x2 and 0 or map.tiles[D.index(map,x,y)]
            end end
            map.width=83;map.tiles=cells;map.rooms[8]=nil;map.gates=nil
            p.run.treasure_version=nil;p.run.keys=nil;p.run.chosen=chosen or nil;p.phase="treasure"
            for _,chest in ipairs(p.run.chests) do chest.opened=nil end
            local backend=Support.backend();local store=Save.new(backend);expect.truthy(store:commit(p))
            backend.data[p.id.."_a"].payload.format_version=2
            local raw=U.copy(backend.data[p.id.."_a"]);local random=U.copy(p.random)
            local loaded=store:load(p.id);expect.equal(loaded.phase,"dungeon");expect.equal(#loaded.run.map.rooms,8);expect.equal(loaded.format_version,3)
            expect.equal(loaded.run.keys,chosen and 0 or 1);expect.equal(loaded.run.chests[2].opened,chosen~=false)
            expect.truthy(U.equal(loaded.random,random));expect.truthy(U.equal(backend.data[p.id.."_a"],raw))
            expect.truthy(U.equal(store:load(p.id),loaded))
        end
    end)
    it("makes reward overflow and failed commands atomic",function()
        local p=win(start(enter(fresh()),2));for _=1,30 do I.add(p,"armor",1) end
        local ids={};for _,e in ipairs(p.pending.entries) do ids[#ids+1]=e.id end
        local copy=U.copy(p)
        expect.falsy(pcall(command,p,{type="claim",reward=p.pending.id,ids=ids}));expect.truthy(U.equal(copy,p))
        expect.falsy(pcall(command,p,{type="leave_rewards"}))
        p=command(p,{type="leave_rewards",confirm=true});expect.equal(p.phase,"dungeon")
    end)
    it("lets every legal race/talent finish Alby with town-bought supplies",function()
        for _,race in ipairs({"Human","Elf","Giant"}) do
            for _,talent in ipairs(require("game.content.catalog").talent_order) do
                if not(race=="Giant" and talent=="Archery") then
                    local p=fresh(race,talent);p.position={x=14*48,y=4*48}
                    p=command(p,{type="buy",service="shop",def="hp_potion",quantity=7})
                    p=command(p,{type="buy",service="shop",def="sp_potion",quantity=3})
                    p=enter(p)
                    for _,room in ipairs({2,3,4,5}) do
                        while p.pools.hp<S.current(p).hp-5 do
                            local potion;for _,item in ipairs(p.items) do if item.def=="hp_potion" then potion=item.id;break end end
                            if not potion then break end
                            p=command(p,{type="use_item",item=potion})
                        end
                        p=win(start(p,room));assert(p.phase==(room==5 and "dungeon" or "rewards"),race.." / "..talent.." lost at room "..room)
                        if room~=5 then p=take(p) end
                    end
                    expect.equal(p.phase,"dungeon");expect.equal(p.run.keys,1)
                end
            end
        end
    end)
    it("recovers A/B generations, uncertain writes and corrupted slots",function()
        local backend=Support.backend();local store=Save.new(backend);local p=fresh();p.revision=1
        expect.truthy(store:commit(p));local first=U.copy(p)
        local next=command(p,{type="age"});backend.mode="fail";expect.falsy(store:commit(next));expect.truthy(U.equal(store:load(p.id),first))
        backend.mode="uncertain";expect.truthy(store:commit(next));expect.equal(store:load(p.id).revision,next.revision)
        backend.data[p.id.."_b"]="corrupt";local restored,warning=store:load(p.id);expect.truthy(warning);expect.truthy(U.equal(restored,first))
        backend.data[p.id.."_b"]={magic="RebirthDungeon",version=2};expect.falsy(store:load(p.id));expect.falsy(store:commit(next))
    end)
    it("uses Los Angeles Saturday noon independent of host DST and catches up once",function()
        local march7=T.days(2026,3,7);local march14=T.days(2026,3,14)
        expect.equal(T.noon(march7),march7*86400+20*3600);expect.equal(T.noon(march14),march14*86400+19*3600)
        expect.equal(T.latest(T.noon(march7)-1),march7-7);expect.equal(T.latest(T.noon(march7)),march7)
        local p=fresh();local ap=p.ap;local future=T.noon(p.age_boundary+21)
        Ch.age(p,future);expect.equal(p.age,20);expect.equal(p.ap,ap+15)
        Ch.age(p,future);Ch.age(p,future-30*86400);expect.equal(p.ap,ap+15)
    end)
    it("rejects malformed headers and future content without overwriting them",function()
        local backend=Support.backend();local store=Save.new(backend);local p=fresh();p.revision=1;expect.truthy(store:commit(p))
        backend.data.profile_01_b={magic="RebirthDungeon",version="broken",payload=42}
        local recovered,warning=store:load(p.id);expect.truthy(recovered);expect.truthy(warning)
        local future=U.copy(backend.data.profile_01_a);future.payload.content_version=2;future.generation=2
        backend.data.profile_01_b=future
        expect.falsy(store:load(p.id));p.revision=2;expect.falsy(store:commit(p));expect.truthy(U.equal(future,backend.data.profile_01_b))
        local battle=start(enter(fresh()),2);battle.battle.statuses[battle.id]={guard={defense="bad",protection=5}}
        expect.falsy(V.safe(battle));battle.battle.statuses={};battle.battle.cooldowns[battle.id]={smash="bad"};expect.falsy(V.safe(battle))
        local malformed=fresh();malformed.position.x=1e99;expect.falsy(V.safe(malformed))
    end)
    it("rebirth preserves possessions, AP and cumulative progress without item gifts",function()
        local p=fresh();local weapon=p.items[1].id;Ch.xp(p,1200);local ap=p.ap;local cumulative=p.cumulative
        expect.falsy(pcall(Ch.rebirth,p,"Magic",10,env.now))
        Ch.rebirth(p,"Magic",10,env.now+86400)
        expect.equal(p.level,1);expect.equal(p.cumulative,cumulative);expect.equal(p.ap,ap)
        expect.equal(p.items[1].id,weapon);expect.equal(#p.items,1);expect.truthy(p.skills.icebolt)
    end)
end)
