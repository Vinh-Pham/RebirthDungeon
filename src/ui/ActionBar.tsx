import { useCallback, type ComponentProps } from "react";
import { Button, Tooltip } from "@heroui/react";
import { useDrag, useDrop } from "react-dnd";
import { skillSlotKeys, type CombatCommand, type GameActions, type GameView } from "../app/contracts";
import { tonicHealing } from "../game/systems/combat";

const tonicIcon = "items/consumables/hp-30-potion.png";
const tonicDescription = "Restores HP immediately and leaves your Time gauge intact.";

const commands = {
  attack: ["Normal Attack", "Strikes one enemy and interrupts Smash.", "frames/skill_attack.png"],
  defend: [
    "Defend",
    "Guards against the next Normal Attack and restores stamina. Smash breaks your guard.",
    "frames/skill_defense.png",
  ],
  smash: [
    "Smash",
    "Breaks Defend and bypasses its damage reduction. Normal Attack interrupts it.",
    "frames/skill_smash.png",
  ],
  counterattack: [
    "Counterattack",
    "Prepares a counter that strikes back when an enemy attacks.",
    "frames/skill_counterattack.png",
  ],
  windmill: [
    "Windmill",
    "Sweeps in a circle, striking every living enemy in the encounter.",
    "frames/skill_windmill_sweep.png",
  ],
} satisfies Record<Exclude<CombatCommand, "tonic">, [string, string, string]>;

type Stat = [string, string | number];
type Skill = GameView["skills"][number];
export type SkillSelection = { skillId: string } | { slot: number };
const dragType = "game-skill";

function ActionIcon({
  label,
  description,
  stats = [],
  hotkey,
  shortcut = true,
  icon,
  empty = false,
  active = true,
  highlighted,
  keyshortcuts,
  ...button
}: {
  label: string;
  description: string;
  stats?: Stat[];
  hotkey?: string;
  shortcut?: boolean;
  icon?: string;
  empty?: boolean;
  active?: boolean;
  highlighted?: boolean;
  keyshortcuts?: string;
} & Pick<ComponentProps<typeof Button>, "ref" | "onPress" | "onKeyDown" | "aria-label" | "aria-pressed"> &
  Partial<
    Record<"data-skill-slot" | "data-skill-source" | "data-skill-category", string> &
      Record<"data-movable" | "data-drop-target", boolean>
  >) {
  const assetBase = `${import.meta.env.BASE_URL}assets/`;
  return (
    <Tooltip delay={300}>
      <Button
        className="action-icon"
        variant={highlighted ? "primary" : empty ? "outline" : "secondary"}
        isIconOnly
        aria-label={label}
        aria-keyshortcuts={keyshortcuts ?? (shortcut ? hotkey : undefined)}
        aria-disabled={!active || undefined}
        {...button}
      >
        {icon ? <img src={`${assetBase}${icon}`} alt="" draggable={false} /> : null}
        {hotkey && <kbd aria-hidden="true">{hotkey}</kbd>}
      </Button>
      <Tooltip.Content className="action-tooltip" placement="top">
        <strong>{label}</strong>
        <p>{description}</p>
        {stats.length > 0 && (
          <dl>
            {stats.map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Tooltip.Content>
    </Tooltip>
  );
}

export interface SlotEditor {
  selected?: SkillSelection;
  select: (selection?: SkillSelection) => void;
}

function placeSkill(actions: GameActions, source: SkillSelection, index: number) {
  if ("skillId" in source) actions.assignSkillSlot(index, source.skillId);
  else actions.moveSkillSlot(source.slot, index);
}

function SkillSlot({
  index,
  view,
  actions,
  editor,
}: {
  index: number;
  view: GameView;
  actions: GameActions;
  editor?: SlotEditor;
}) {
  const { encounter, busy } = view;
  const skill = view.skills.find((entry) => entry.id === view.skillSlots[index]);
  const command = skill?.command;
  const hotkey = skillSlotKeys[index];
  const movable = !!command && !busy;
  const [{ isOver }, drop] = useDrop<SkillSelection, void, { isOver: boolean }>({
    accept: dragType,
    canDrop: (source) => !busy && ("skillId" in source || source.slot !== index),
    drop: (source) => {
      placeSkill(actions, source, index);
      editor?.select();
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) && monitor.canDrop() }),
  });
  const [, drag] = useDrag<SkillSelection>({
    type: dragType,
    canDrag: movable,
    item: () => {
      editor?.select();
      return { slot: index };
    },
  });
  const connect = useCallback(
    (element: HTMLButtonElement | null) => {
      drag(movable ? element : null);
      drop(element);
    },
    [drag, drop, movable],
  );

  const [name, description, icon] = command
    ? commands[command]
    : [
        "Empty",
        editor ? "Drop a skill here or choose this slot after selecting a skill." : "Open Skills to assign a skill.",
      ];
  const detail = encounter?.actionDetails.find(({ action }) => action === command);
  const stats: Stat[] = [];
  if (detail) {
    stats.push(["Stamina cost", detail.stamina]);
    if (detail.damage) {
      const { min, max } = detail.damage;
      stats.push(["Base damage", min === max ? min : `${min}–${max}`]);
    }
    if (detail.counter) {
      const { enemy, self } = detail.counter;
      stats.push(["Base damage", `${enemy}% enemy attack + ${self}% weapon damage`]);
    }
    if (detail.staminaRecovered) stats.push(["Stamina restored", detail.staminaRecovered]);
  }

  const queued = command && encounter ? encounter.queued === command : undefined;
  const selected = editor?.selected && "slot" in editor.selected && editor.selected.slot === index;
  const available = !busy && (!!editor || !command || !!encounter?.available.includes(command));
  const press = () => {
    if (!editor) {
      if (command) actions.useSkillSlot(index);
      else actions.panel("skills");
    } else if (editor.selected && !selected) {
      placeSkill(actions, editor.selected, index);
      editor.select();
    } else {
      editor.select(command && !selected ? { slot: index } : undefined);
    }
  };

  return (
    <ActionIcon
      ref={connect}
      label={name}
      aria-label={`Skill slot ${hotkey}, ${name}`}
      description={description}
      stats={stats}
      hotkey={hotkey}
      shortcut={!editor}
      icon={icon}
      empty={!command}
      active={available}
      highlighted={editor ? selected : queued}
      aria-pressed={editor && command ? !!selected : queued}
      data-skill-slot={hotkey}
      data-skill-category={skill?.category}
      data-movable={movable}
      data-drop-target={isOver}
      onPress={available ? press : undefined}
      keyshortcuts={editor && command ? "Delete Backspace" : undefined}
      onKeyDown={(event) => {
        if (!editor || busy || !command || (event.key !== "Delete" && event.key !== "Backspace")) return;
        event.preventDefault();
        event.stopPropagation();
        actions.assignSkillSlot(index, null);
        editor.select();
      }}
    />
  );
}

function SkillSlots({ view, actions, editor }: { view: GameView; actions: GameActions; editor?: SlotEditor }) {
  return (
    <div className="skill-slots" role="group" aria-label="Skill slots">
      {skillSlotKeys.map((key, index) => (
        <SkillSlot key={key} index={index} view={view} actions={actions} editor={editor} />
      ))}
    </div>
  );
}

export function SkillSource({
  skill,
  busy,
  selected,
  select,
}: {
  skill: Skill;
  busy: boolean;
  selected: boolean;
  select: SlotEditor["select"];
}) {
  const { id, label, command } = skill;
  const icon = command && id !== "combat_mastery" ? commands[command][2] : `frames/skill_${id}.png`;
  const [, drag] = useDrag<SkillSelection>({
    type: dragType,
    canDrag: !busy && Boolean(command),
    item: () => {
      select();
      return { skillId: id };
    },
  });
  const connect = useCallback(
    (element: HTMLButtonElement | null) => {
      drag(element);
    },
    [drag],
  );

  if (!command)
    return (
      <span className="skill-passive-icon" data-skill-category={skill.category}>
        <img src={`${import.meta.env.BASE_URL}assets/${icon}`} alt="" draggable={false} />
      </span>
    );
  const [name] = commands[command];
  return (
    <ActionIcon
      ref={connect}
      label={name === label ? label : `${label} · ${name}`}
      aria-label={`Assign ${label}${id === "combat_mastery" ? " (Normal Attack)" : ""}`}
      description={`Drag to a slot or select this skill to assign ${name}.`}
      icon={icon}
      highlighted={selected}
      aria-pressed={selected}
      active={!busy}
      data-skill-source={id}
      data-skill-category={skill.category}
      data-movable={!busy}
      onPress={busy ? undefined : () => select(selected ? undefined : { skillId: id })}
    />
  );
}

export function ActionBar({ view, actions, editor }: { view: GameView; actions: GameActions; editor?: SlotEditor }) {
  const { inventory, encounter, player, busy } = view;
  const { tonics, quickSlots } = inventory;
  const canHeal = encounter
    ? encounter.available.includes("tonic")
    : !!player && player.hp < player.maxHp && tonics > 0;
  const tonicStats: Stat[] = [
    ["Heals", `Up to ${tonicHealing} HP`],
    ["Tonics available", tonics],
  ];

  return (
    <div className="action-bar">
      <SkillSlots view={view} actions={actions} editor={editor} />
      <div className="tonic-quick-slots" role="group" aria-label="Tonic quick slots">
        {quickSlots.map((assigned, index) => {
          const hotkey = `F${index + 1}`;
          const active = assigned && canHeal && !busy;
          return (
            <ActionIcon
              key={hotkey}
              label={assigned ? `${hotkey} Healing Tonic` : `${hotkey} Empty quick slot`}
              description={assigned ? tonicDescription : "Assign a Healing Tonic in Inventory."}
              stats={assigned ? tonicStats : []}
              hotkey={hotkey}
              icon={assigned ? tonicIcon : undefined}
              active={active}
              empty={!assigned}
              onPress={active ? () => actions.useQuickSlot(index) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
