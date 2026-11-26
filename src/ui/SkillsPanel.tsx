import { useState } from "react";
import { Button } from "@heroui/react";
import { skillSlotKeys, type GameActions, type GameView } from "../app/contracts";
import { SkillSlots, SkillSource, type SkillSelection } from "./ActionBar";

export function SkillsPanel({ view, actions }: { view: GameView; actions: GameActions }) {
  const [selected, select] = useState<SkillSelection>();
  const selectedSlot = selected && "slot" in selected ? selected.slot : undefined;
  const selectedSkill = view.skills.find((skill) => selected && "skillId" in selected && skill.id === selected.skillId);
  return (
    <>
      <div className="skill-editor">
        <p className="skill-editor-instructions" aria-live="polite">
          {selectedSkill
            ? `Choose a slot for ${selectedSkill.label}.`
            : selectedSlot !== undefined
              ? `Choose a destination for slot ${skillSlotKeys[selectedSlot]}.`
              : "Drag a skill icon to a slot, or select the icon and then a slot."}
        </p>
        <SkillSlots view={view} actions={actions} editor={{ selected, select }} />
        {selectedSlot !== undefined && (
          <Button
            size="sm"
            variant="ghost"
            isDisabled={view.busy}
            onPress={() => {
              actions.assignSkillSlot(selectedSlot, null);
              select(undefined);
            }}
          >
            Clear slot {skillSlotKeys[selectedSlot]}
          </Button>
        )}
      </div>
      <p className="panel-copy">{view.details.body}</p>
      <div className="skill-list">
        {view.skills.map((skill) => (
          <section key={skill.id} className="skill-entry">
            <SkillSource skill={skill} busy={view.busy} select={select} selected={selectedSkill?.id === skill.id} />
            <div>
              <h3>
                {skill.label} · Rank {skill.rank}
              </h3>
              {!skill.command && <span className="muted">Passive</span>}
              <p className="panel-copy">{skill.description}</p>
              <div className="skill-training">
                <span>{skill.training}% training</span>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={view.busy || !skill.canAdvance}
                  onPress={() => actions.choose(`advance:${skill.id}`)}
                >
                  Advance
                </Button>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
