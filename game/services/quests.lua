local quest=require "quest.quest"
local U=require "game.domain.util"
local C=require "game.content.catalog"
local M={}
local config={}
for _,id in ipairs(C.quest_order) do
    local d=C.quests[id]
    -- All onboarding tasks are active from the start; project evidence gates stage order.
    -- This lets progress continue before optional manual reward claims.
    config[id]={autostart=true,autofinish=false,tasks={{action=d.action,object=d.object,required=1}}}
end
quest.set_logger(nil)
local function bind(state)
    quest.on_quest_event:clear()
    quest.set_state(state)
    quest.init(config)
    -- Initialization timestamps are presentation-irrelevant: normalize for deterministic saves.
    for _,q in pairs(state.current) do q.start_time=0 end
    quest.on_quest_event:clear()
end
function M.evaluate(p,evidence)
    local previous=quest.get_state()
    local ok,result=pcall(function()
        bind(p.quests)
        for _,e in ipairs(evidence or {}) do
            for _,id in ipairs(C.quest_order) do
                local d=C.quests[id]
                if e.action==d.action and e.object==d.object and not p.quest_evidence[id]
                    and (not d.previous or p.quest_evidence[d.previous]) then
                    quest.event(e.action,e.object,1);p.quest_evidence[id]=e.id
                end
            end
        end
        return U.copy(quest.get_state())
    end)
    quest.on_quest_event:clear();quest.set_state(previous)
    if not ok then error(result,0) end
    p.quests=result
end
function M.complete(p,id)
    local previous=quest.get_state()
    local ok,result=pcall(function()
        bind(p.quests)
        assert(quest.is_active(id) and quest.get_task_progress(id,1)>=1,"Quest objectives are incomplete")
        quest.complete_quest(id)
        return U.copy(quest.get_state())
    end)
    quest.on_quest_event:clear();quest.set_state(previous)
    if not ok then error(result,0) end
    p.quests=result
end
function M.bound_state() return quest.get_state() end
return M
