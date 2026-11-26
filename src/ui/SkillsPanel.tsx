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
    <div className="skills-sheet">
      <Tabs className="skill-tabs" defaultSelectedKey="all" variant="secondary">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Skill category">
            {categories.map(([id, label]) => (
              <Tabs.Tab key={id} id={id}>
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {categories.map(([id, label]) => {
          const skills = id === "all" ? view.skills : view.skills.filter((skill) => skill.category === id);
          return (
            <Tabs.Panel key={id} id={id} className="skill-tab-panel">
              {skills.length ? (
                <div className="skill-list">
                  {skills.map((skill) => (
                    <section key={skill.id} className="skill-entry" aria-label={skill.label}>
                      <SkillSource
                        skill={skill}
                        busy={view.busy}
                        select={select}
                        selected={Boolean(selected && "skillId" in selected && selected.skillId === skill.id)}
                      />
                      <div className="skill-identity">
                        <h3>{skill.label}</h3>
                        {!skill.command && <span className="skill-passive-tag">Passive</span>}
                        <p>{skill.description}</p>
                      </div>
                      <div className="skill-rank-progress">
                        <div className="skill-rank-line">
                          <span>{skill.rank === "novice" ? "Novice" : `Rank ${skill.rank}`}</span>
                          <Button
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
                          className="skill-training"
                          aria-label={`${skill.label} training`}
                          value={skill.training}
                        >
                          <span>Training</span>
                          <ProgressBar.Output />
                          <ProgressBar.Track>
                            <ProgressBar.Fill />
                          </ProgressBar.Track>
                        </ProgressBar>
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <p className="skill-empty">
                  {id === "all" ? "No skills learned yet." : `No ${label.toLowerCase()} skills learned yet.`}
                </p>
              )}
            </Tabs.Panel>
          );
        })}
      </Tabs>
      <footer className="skill-assignment">
        <p className="skill-drag-instructions" aria-live="polite">
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
