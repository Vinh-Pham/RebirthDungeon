local lester=require("tests.vendor.lester")
local describe,it,expect=lester.describe,lester.it,lester.expect
local Ch=require("game.domain.character")
local Cmd=require("game.domain.commands")
local B=require("game.domain.battle")
local Log=require("game.domain.combat_log")
local Format=require("game.presentation.combat_log")
local Save=require("game.services.save")
local V=require("game.domain.validate")
local U=require("game.domain.util")
local Support=require("tests.support")
local NOW=1789920000
local ENV={now=NOW,rng_factory=Support.mock_rng}
local function command(p,c)
    c.op=c.op or "log_"..(p.revision+1);c.revision=p.revision
    return Cmd.execute(p,c,ENV)
end
local function fresh()
    local p=Ch.new("profile_01","Aster","Human",17,"Close Combat",NOW,42)
    p.position={x=14*48,y=15*48};p=command(p,{type="enter"})
    local room=p.run.map.rooms[2];p.position={x=room.x*48,y=room.y*48}
    p=command(p,{type="encounter",room=room.id})
    return command(p,{type="begin_turn",battle=p.battle.id,turn=p.battle.turn})
end
local function act(p,skill)
    return command(p,{type="act",skill=skill or "normal",actor=p.id,target=p.battle.enemies[1].id,battle=p.battle.id,turn=p.battle.turn})
end
local function victorious()
    local p=fresh()
    p.battle.enemies[1].pools.hp=1;p.battle.enemies[2].pools.hp=0
    return act(p)
end
local function synthetic(count,group_size)
    local record=U.copy(fresh().combat_log.record);record.events={};record.sequence=count
    for index=1,count do record.events[index]={id=record.id..":"..index,battle=record.id,run=record.run,sequence=index,
        operation="operation_"..math.ceil(index/group_size),turn=math.ceil(index/group_size),round=1,kind="wait",text="Aster waits",actor="profile_01"} end
    return record
end

describe("Combat log contract",function()
    it("captures identities and separates calculated hits from actual HP loss",function()
        local p=fresh();p.battle.enemies[1].pools.hp=1
        local turn=p.battle.turn;p=act(p)
        local damage
        for _,event in ipairs(p.last_events) do
            expect.equal(event.turn,turn);expect.equal(event.run,p.run.id);expect.equal(event.operation,p.ledger[#p.ledger])
            if event.kind=="damage" then damage=event end
        end
        expect.equal(damage.actual,1);expect.truthy(damage.calculated>damage.actual)
        expect.equal(damage.hit,1);expect.equal(damage.critical,false);expect.truthy(V.safe(p))
    end)
    it("records recovery, guard application and expiration as separate operations",function()
        local p=fresh();local recovery=p.last_events[1]
        expect.equal(recovery.kind,"turn_start");expect.equal(recovery.pool,"sp")
        p=act(p,"defense");expect.equal(p.last_events[2].status,"guard")
        while not B.active(p).hero do
            p=command(p,{type="begin_turn",battle=p.battle.id,turn=p.battle.turn})
            p=command(p,B.ai(p))
        end
        p=command(p,{type="begin_turn",battle=p.battle.id,turn=p.battle.turn})
        expect.equal(p.last_events[1].kind,"status_end");expect.equal(p.last_events[2].kind,"turn_start")
    end)
    it("retains terminal history and latest batch through claims, cleanup and rebirth",function()
        local p=victorious();local record,batch=U.copy(p.combat_log.record),U.copy(p.last_events)
        expect.equal(record.outcome,"victory")
        p=command(p,{type="claim",reward=p.pending.id,ids={p.pending.entries[1].id}})
        p=command(p,{type="leave_rewards",confirm=true})
        expect.falsy(p.battle);expect.truthy(U.equal(record,p.combat_log.record));expect.truthy(U.equal(batch,p.last_events))
        p=command(p,{type="abandon",confirm=true})
        p=Cmd.execute(p,{type="rebirth",age=10,talent="Magic",op="rebirth_log",revision=p.revision},{now=NOW+8*86400})
        expect.truthy(U.equal(record,p.combat_log.record));expect.truthy(U.equal(batch,p.last_events))
    end)
    it("retains defeat and abandonment before battle/run cleanup",function()
        local p=fresh();p.pools.hp=1;p.battle.statuses[p.id]={poison={remaining=2,applied=0}}
        p=act(p,"defense")
        expect.equal(p.phase,"town");expect.falsy(p.battle);expect.equal(p.combat_log.record.outcome,"defeat")
        expect.equal(p.last_events[#p.last_events].kind,"battle_end")
        p=fresh();p=command(p,{type="abandon",confirm=true})
        expect.equal(p.combat_log.record.outcome,"abandonment");expect.falsy(p.run)
    end)
    it("trims whole operations at every boundary including oversized groups",function()
        local record=synthetic(108,9);Log.trim(record,100)
        expect.equal(#record.events,99);expect.equal(record.events[1].sequence,10);expect.truthy(record.incomplete)
        record=synthetic(101,101);Log.trim(record,100);expect.equal(#record.events,0);expect.truthy(record.incomplete)
        local p=fresh();p.battle.events=synthetic(100,10).events;p.battle.sequence=100;p.battle.turn=11;Log.sync(p)
        p.battle.enemies[1].pools.hp=1;p.battle.enemies[2].pools.hp=0
        p=act(p);expect.equal(p.combat_log.record.outcome,"victory");expect.truthy(#p.battle.events<=100);expect.truthy(p.combat_log.record.incomplete)
        expect.truthy(#p.last_events>0)
    end)
    it("deduplicates operations and rolls back a failed terminal save",function()
        local p=fresh();p.battle.enemies[1].pools.hp=1;p.battle.enemies[2].pools.hp=0
        local backend=Support.backend();local store=Save.new(backend);expect.truthy(store:commit(p))
        local candidate=act(p);local before=U.copy(p);backend.mode="fail"
        expect.falsy(store:commit(candidate));expect.truthy(U.equal(before,store:load(p.id)))
        backend.mode="ok";expect.truthy(store:commit(candidate));expect.truthy(U.equal(candidate,store:load(p.id)))
        local duplicate=Cmd.execute(candidate,{op=candidate.ledger[#candidate.ledger],revision=0},ENV)
        expect.truthy(U.equal(candidate,duplicate));expect.equal(#Format.groups(candidate.combat_log.record),3)
    end)
    it("migrates legacy active history without rewriting its stored generation",function()
        local p=fresh();p.combat_log=nil;p.format_version=1
        for _,event in ipairs(p.battle.events) do event.run=nil end
        local backend=Support.backend();p.generation=1
        backend.data[p.id.."_a"]={magic="RebirthDungeon",version=1,generation=1,payload=U.copy(p)}
        local loaded=Save.new(backend):load(p.id)
        expect.equal(loaded.format_version,3);expect.truthy(loaded.combat_log.record.incomplete);expect.equal(loaded.battle.sequence,p.battle.sequence)
        expect.falsy(backend.data[p.id.."_a"].payload.combat_log);expect.truthy(V.safe(loaded))
        loaded.combat_log.version=99;backend.data[p.id.."_b"]={magic="RebirthDungeon",version=1,generation=2,payload=loaded}
        local newer,reason=Save.new(backend):load(p.id);expect.falsy(newer);expect.truthy(reason:find("newer",1,true))
        loaded.format_version=4;loaded.combat_log.version=1
        expect.falsy(pcall(Log.migrate,loaded));expect.equal(loaded.format_version,4)
    end)
    it("formats full details and compact summaries with bounded long-text lines",function()
        local p=victorious();local record=p.combat_log.record
        local model=Format.model(record,{log_group=p.last_events[1].operation})
        expect.truthy(model.selected);expect.truthy(#model.details<=8)
        for _,line in ipairs(model.details) do expect.truthy(#line<=47) end
        local event={kind="damage",actor=p.id,target=p.id,actual=2,calculated=40,hit=2,hits=3,critical=true,absorbed=9}
        local text=Format.event(record,event)
        expect.truthy(text:find("2 HP lost",1,true));expect.truthy(text:find("40 calculated",1,true));expect.truthy(text:find("critical",1,true));expect.truthy(text:find("absorbed 9",1,true))
        for _,line in ipairs(Format.wrap(string.rep("LongLabel",40),47)) do expect.truthy(#line<=47) end
        for _,line in ipairs(Format.wrap(string.rep("漢",40),47)) do expect.equal(#line%3,0) end
        local long=synthetic(10,10)
        for _,entry in ipairs(long.events) do entry.text=string.rep("Long detail ",20) end
        local page=Format.model(long,{log_group="operation_1",log_detail_page=999})
        expect.truthy(page.detail_pages>1);expect.equal(page.detail_page,page.detail_pages);expect.truthy(#page.details<=8)
    end)
    it("anchors browsing against appended/trimmed groups and explicitly jumps to latest",function()
        local record=synthetic(60,2);local before=U.copy(record)
        local first=Format.model(record,{log_anchor=20});expect.equal(first.rows[#first.rows].first,19)
        local next=synthetic(70,2);local anchored=Format.model(next,{log_anchor=20})
        expect.truthy(U.equal(first.rows,anchored.rows));expect.equal(anchored.new_entries,25)
        local bottom=Format.model(next,{});expect.truthy(bottom.following);expect.equal(bottom.new_entries,0);expect.equal(bottom.last,35)
        local earlier_compact=Format.model(next,{log_anchor=bottom.compact_earlier})
        expect.equal(earlier_compact.last,bottom.last-3)
        Log.trim(next,10);expect.truthy(Format.model(next,{log_anchor=20}).trimmed)
        expect.truthy(U.equal(before,record))
        local switched=Format.model(record,{log_record="another_character_battle",log_anchor=20,log_group="operation_5"})
        expect.truthy(switched.following);expect.falsy(switched.selected)
        local empty=synthetic(10,10);Log.trim(empty,5)
        local expired=Format.model(empty,{log_anchor=8})
        expect.equal(#expired.rows,0);expect.equal(expired.anchor,0)
    end)
    it("replaces the latest encounter on a new battle and rejects corrupt/unbounded records",function()
        local p=victorious();local old=p.combat_log.record.id
        p=command(p,{type="leave_rewards",confirm=true})
        local room=p.run.map.rooms[3];p.position={x=room.x*48,y=room.y*48};p=command(p,{type="encounter",room=room.id})
        expect.truthy(p.combat_log.record.id~=old);expect.equal(p.combat_log.record.outcome,"active")
        expect.equal(#p.combat_log.record.events,1)
        p.combat_log.record.events[1].text=string.rep("x",257);expect.falsy(V.safe(p))
    end)
end)
