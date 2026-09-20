local Save=require "game.services.save"
local U=require "game.domain.util"
local Ch=require "game.domain.character"
local Cmd=require "game.domain.commands"
local B=require "game.domain.battle"
local Stats=require "game.domain.stats"
local R=require "game.services.rng"
local D=require("game.domain.dungeon")
local M={}
function M.run(stage)
    local backend=Save.defsave_backend("RebirthDungeonRestartFixture");assert(backend.lock())
    local store=Save.new(backend);local id="profile_19";local defsave=require "defsave.defsave"
    if stage=="prepare" then
        for _,suffix in ipairs({"a","b"}) do os.remove(defsave.get_file_path(id.."_"..suffix)) end
    end
    local p=stage=="prepare" and Ch.new(id,"Restart Fixture","Human",17,"Close Combat",1789920000,42) or assert(store:load(id))
    local function command(c)
        c.op=c.op or "restart_"..(p.revision+1);c.revision=p.revision
        p=Cmd.execute(p,c,{now=1789920000});assert(store:commit(p));return p
    end
    local function enter_room(index)
        local room=p.run.map.rooms[index];command({type="checkpoint",x=room.x*48,y=room.y*48});command({type="encounter",room=room.id})
    end
    local function win()
        local turns=0
        while p.phase=="battle" do
            turns=turns+1;assert(turns<200)
            if not p.battle.started then command({type="begin_turn",battle=p.battle.id,turn=p.battle.turn}) end
            local a=B.active(p)
            if a.hero then
                if p.pools.hp<85 and not p.battle.item_used then for _,item in ipairs(p.items) do if item.def=="hp_potion" then
                    command({type="use_item",item=item.id,actor=p.id,battle=p.battle.id,turn=p.battle.turn});break
                end end end
                local target;for _,e in ipairs(p.battle.enemies) do if e.pools.hp>0 and (not target or e.pools.hp<target.pools.hp) then target=e end end
                command({type="act",skill=B.eligible(p,a,"smash") and "smash" or "normal",actor=p.id,target=target.id,battle=p.battle.id,turn=p.battle.turn})
            else command(B.ai(p)) end
        end
        assert(p.phase=="rewards" or p.phase=="dungeon" and p.run.cleared.room_5)
    end
    local function claim()
        local ids={};for _,e in ipairs(p.pending.entries) do if not e.claimed then ids[#ids+1]=e.id end end
        command({type="claim",reward=p.pending.id,ids=ids})
        local claimed=U.copy(p);local duplicate=Cmd.execute(p,{op=p.ledger[#p.ledger],revision=p.revision-1},{now=1789920000})
        assert(U.equal(claimed,duplicate),"Duplicate grant changed the saved outcome")
        command({type="leave_rewards"})
    end
    if stage=="prepare" then
        p.revision=1;assert(store:commit(p));command({type="checkpoint",x=14*48,y=4*48});command({type="buy",service="shop",def="hp_potion",quantity=7})
        command({type="checkpoint",x=14*48,y=15*48});command({type="enter"});enter_room(2)
        command({type="begin_turn",battle=p.battle.id,turn=p.battle.turn})
        -- A damaged-hero fixture exercises the optional item checkpoint.
        p.pools.hp=80;p.revision=p.revision+1;assert(store:commit(p))
        local item;for _,it in ipairs(p.items) do if it.def=="hp_potion" then item=it;break end end
        command({type="use_item",item=item.id,actor=p.id,battle=p.battle.id,turn=p.battle.turn})
        assert(p.battle.item_used and p.battle.started and p.pools.hp==110)
        assert(backend.write("expected",{battle=p.battle.id,turn=p.battle.turn,sp=p.pools.sp,next_draw=R.open(U.copy(p.battle.random)):raw()}))
    elseif stage=="battle" then
        local expected=assert(backend.read("expected"));assert(p.phase=="battle" and p.battle.id==expected.battle and p.battle.turn==expected.turn)
        assert(p.battle.item_used and p.battle.started and p.pools.hp==110 and p.pools.sp==expected.sp)
        assert(R.open(U.copy(p.battle.random)):raw()==expected.next_draw);win()
    elseif stage=="reward" then
        assert(p.phase=="rewards" and p.pending.origin=="encounter")
        assert(p.combat_log.record.outcome=="victory" and p.last_events[#p.last_events].kind=="battle_end")
        local terminal=U.copy(p.last_events);local record=U.copy(p.combat_log.record);claim()
        assert(U.equal(record,p.combat_log.record) and U.equal(terminal,p.last_events),"Terminal log was lost during reward cleanup")
        for room=3,5 do
            while p.pools.hp<Stats.current(p).hp-5 do
                local item;for _,it in ipairs(p.items) do if it.def=="hp_potion" then item=it;break end end
                if not item then break end;command({type="use_item",item=item.id})
            end
            enter_room(room);win();if room~=5 then claim() end
        end
        assert(p.phase=="dungeon" and p.run.keys==1)
        local chest=D.treasure_objects(p.run.map)[4];command({type="checkpoint",x=chest.x*48,y=chest.y*48})
        command({type="chest",index=4})
        assert(backend.write("chest_expected",{chosen=4,chests=U.copy(p.run.chests),pending=U.copy(p.pending)}))
    elseif stage=="chest" then
        local expected=assert(backend.read("chest_expected"));assert(p.run.chests[4].opened and p.run.keys==0 and U.equal(p.run.chests,expected.chests) and U.equal(p.pending,expected.pending))
        claim();local statue=D.treasure_objects(p.run.map)[6]
        command({type="checkpoint",x=statue.x*48,y=statue.y*48});command({type="return",confirm=true});assert(p.phase=="town" and not p.run and p.quest_evidence.return_home)
    else error("Unknown restart fixture stage") end
    backend.release();print("RESTART PASS "..stage)
end
return M
