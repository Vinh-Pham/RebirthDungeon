import { Button, ProgressBar, Tabs } from "@heroui/react";
import { skillSlotKeys, type GameActions, type GameView, type SkillCategory } from "../app/contracts";
import { SkillSource, type SlotEditor } from "./ActionBar";

const categories = [
  ["all", "All"],
  ["life", "Life"],
  ["combat", "Combat"],
  ["magic", "Magic"],
] as const satisfies readonly [SkillCategory | "all", string][];

export function SkillsPanel({ view, actions, editor }: { view: GameView; actions: GameActions; editor: SlotEditor }) {
  const { selected, select } = editor;
  const selectedSlot = selected && "slot" in selected ? selected.slot : undefined;
  const selectedName =
    selected && "skillId" in selected ? view.skills.find((skill) => skill.id === selected.skillId)?.label : undefined;

  return (
    <div className="skills-sheet flex min-h-0 flex-col">
      <Tabs className="skill-tabs flex min-h-0 flex-col gap-1.5" defaultSelectedKey="all" variant="secondary">
        <Tabs.ListContainer className="rounded-none bg-transparent">
          <Tabs.List className="gap-1 p-0" aria-label="Skill category">
            {categories.map(([id, label]) => (
              <Tabs.Tab
                className="min-h-[30px] rounded-none border border-[#3b5556] bg-[#13272b] px-3 py-1 font-[inherit] text-[13px] leading-[inherit] text-[#c2cfca] data-[selected]:border-[#65805c] data-[selected]:bg-[#2b4239] data-[selected]:text-[#e3f0d3] max-[540px]:px-[9px] max-[540px]:text-[12px]"
                key={id}
                id={id}
              >
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {categories.map(([id, label]) => {
          const skills = id === "all" ? view.skills : view.skills.filter((skill) => skill.category === id);
          return (
            <Tabs.Panel key={id} id={id} className="skill-tab-panel min-h-0 overflow-auto overscroll-contain p-0">
              {skills.length ? (
                <div className="skill-list grid gap-1">
                  {skills.map((skill) => (
                    <section
                      key={skill.id}
                      className="skill-entry grid grid-cols-[48px_minmax(0,1fr)_minmax(120px,160px)] items-center gap-2 border-t border-[#405e60] bg-[#152a2d] p-1.5 [&>.action-icon]:size-12 [&>.skill-passive-icon]:size-12 [&>.action-icon]:overflow-hidden [&>.skill-passive-icon]:overflow-hidden [&>.action-icon]:border [&>.skill-passive-icon]:border [&>.action-icon]:border-[#cfb49a] [&>.skill-passive-icon]:border-[#cfb49a] [&_img]:h-11 [&_img]:w-8 max-[540px]:grid-cols-[39px_minmax(0,1fr)_94px] max-[540px]:gap-[5px] max-[540px]:[&>.action-icon]:size-[39px] max-[540px]:[&>.skill-passive-icon]:size-[39px] max-[540px]:[&_img]:h-9 max-[540px]:[&_img]:w-[26px]"
                      aria-label={skill.label}
                    >
                      <SkillSource
                        skill={skill}
                        busy={view.busy}
                        select={select}
                        selected={Boolean(selected && "skillId" in selected && selected.skillId === skill.id)}
                      />
                      <div className="skill-identity min-w-0 [overflow-wrap:anywhere]">
                        <h3 className="m-0 text-[14px] text-[#e0e8d9] max-[540px]:text-[12px]">{skill.label}</h3>
                        {!skill.command && (
                          <span className="skill-passive-tag text-xs text-[#93afab] max-[540px]:text-[11px]">
                            Passive
                          </span>
                        )}
                        <p className="mt-0.5 mb-0 font-[SourceCode,monospace] text-xs leading-[1.35] text-[#b4c5bf] max-[540px]:text-[11px]">
                          {skill.description}
                        </p>
                      </div>
                      <div className="skill-rank-progress">
                        <div className="skill-rank-line flex flex-wrap items-center justify-between gap-x-1.5 gap-y-[3px] text-xs max-[540px]:text-[11px]">
                          <span>{skill.rank === "novice" ? "Novice" : `Rank ${skill.rank}`}</span>
                          <Button
                            className="h-6 min-h-6 px-1.5 text-[11px]"
                            size="sm"
                            variant="secondary"
                            aria-label={`Advance ${skill.label}`}
                            isDisabled={view.busy || !skill.canAdvance}
                            onPress={() => actions.choose(`advance:${skill.id}`)}
                          >
                            Advance
                          </Button>
                        </div>
                        <ProgressBar
                          size="sm"
                          className="skill-training grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-1 gap-y-[3px] text-xs text-[#acc3bd] max-[540px]:text-[11px]"
                          aria-label={`${skill.label} training`}
                          value={skill.training}
                        >
                          <span>Training</span>
                          <ProgressBar.Output className="text-[11px] text-[#d6ddd0] tabular-nums max-[540px]:text-[10px]" />
                          <ProgressBar.Track className="col-span-full h-[3px] rounded-none bg-[#34494e]">
                            <ProgressBar.Fill className="rounded-none bg-[#a8ca75]" />
                          </ProgressBar.Track>
                        </ProgressBar>
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="skill-empty m-0 border-t border-[#405e60] px-2.5 py-4 text-[#a9bcba]">
                  {id === "all" ? "No skills learned yet." : `No ${label.toLowerCase()} skills learned yet.`}
                </p>
              )}
            </Tabs.Panel>
          );
        })}
      </Tabs>
      <footer className="skill-assignment mt-1.5 flex items-center justify-between gap-2 border-t border-[#405e60] pt-1.5">
        <p className="skill-drag-instructions m-0 text-xs text-[#b1c8c2] max-[540px]:text-[11px]" aria-live="polite">
          {selectedName
            ? `Choose a HUD slot for ${selectedName}.`
            : selectedSlot !== undefined
              ? `Choose a destination for slot ${skillSlotKeys[selectedSlot]}.`
              : "Drag an icon to the HUD, or select the icon and then a HUD slot."}
        </p>
        {selectedSlot !== undefined && (
          <Button
            size="sm"
            variant="ghost"
            isDisabled={view.busy}
            onPress={() => {
              actions.assignSkillSlot(selectedSlot, null);
              select();
            }}
          >
            Clear slot {skillSlotKeys[selectedSlot]}
          </Button>
        )}
      </footer>
    </div>
  );
}
