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

function skillRankLabel(rank: string) {
  if (rank === "novice") return "Novice";
  if (rank.startsWith("dan_")) return `Dan ${rank.slice(4)}`;
  return `Rank ${rank}`;
}

function ActionIcon({
  label,
  description,
  stats = [],
  hotkey,
  shortcut = true,
  icon,
  empty = false,
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
        className="action-icon relative bg-black/35 size-11 p-0 data-[movable=true]:cursor-grab data-[movable=true]:opacity-100 data-[drop-target=true]:shadow-[inset_0_0_0_2px_var(--accent)] [&[data-skill-category]]:bg-[var(--skill-icon-background)] data-[skill-category=combat]:[--skill-icon-background:#a3512a] data-[skill-category=magic]:[--skill-icon-background:#2e609f] data-[skill-category=life]:[--skill-icon-background:#957521] [&[data-skill-category][aria-pressed=true]]:shadow-[inset_0_0_0_2px_var(--accent)]"
        variant={highlighted ? "primary" : empty ? "outline" : "secondary"}
        isIconOnly
        aria-label={label}
        aria-keyshortcuts={keyshortcuts ?? (shortcut ? hotkey : undefined)}
        {...button}
      >
        {icon ? (
          <img
            className="h-7 w-6 object-contain [image-rendering:pixelated]"
            src={`${assetBase}${icon}`}
            alt=""
            draggable={false}
          />
        ) : null}
        {hotkey && (
          <kbd
            className="absolute right-0.5 bottom-0.5 min-w-[13px] bg-[#101f24] px-0.5 py-px text-center font-[Departure,monospace] text-[10px] leading-none text-[#d6ddd0]"
            aria-hidden="true"
          >
            {hotkey}
          </kbd>
        )}
      </Button>
      <Tooltip.Content
        className="action-tooltip w-max max-w-[min(17rem,calc(100vw-32px))] px-3 py-2.5 font-[Departure,monospace] text-xs leading-[1.4] [overflow-wrap:anywhere]"
        placement="top"
      >
        <strong>{label}</strong>
        <p className="mt-1.5 mb-0">{description}</p>
        {stats.length > 0 && (
          <dl className="mt-1.5 mb-0">
            {stats.map(([name, value]) => (
              <div className="flex justify-between gap-3" key={name}>
                <dt>{name}</dt>
                <dd className="m-0 text-right">{value}</dd>
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
  const movable = !!command;
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
    canDrag: movable && !busy,
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
  const label = command && skill ? `${name} (${skillRankLabel(skill.rank)})` : name;
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
  const available = !!editor || !command || !!encounter?.available.includes(command);
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
      label={label}
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
      onPress={available && !busy ? press : undefined}
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
    <div
      className="skill-slots grid grid-cols-[repeat(10,44px)] gap-1 max-[570px]:grid-cols-[repeat(5,44px)] @max-[476px]:grid-cols-[repeat(5,44px)] max-[360px]:grid-cols-[repeat(5,38px)]!"
      role="group"
      aria-label="Skill slots"
    >
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
      <span
        className="skill-passive-icon grid place-items-center data-[skill-category=combat]:bg-[#a3512a] data-[skill-category=magic]:bg-[#2e609f] data-[skill-category=life]:bg-[#957521]"
        data-skill-category={skill.category}
      >
        <img
          className="h-7 w-6 object-contain [image-rendering:pixelated]"
          src={`${import.meta.env.BASE_URL}assets/${icon}`}
          alt=""
          draggable={false}
        />
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
      active
      data-skill-source={id}
      data-skill-category={skill.category}
      data-movable
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
    <div className="action-bar @container pointer-events-none z-2 col-start-1 row-start-1 flex flex-wrap gap-x-4 gap-y-2.5 py-2.5 pr-[calc(var(--minimap-size,0px)_+_16px)] pl-3 max-[360px]:gap-y-1.5 max-[360px]:py-2 max-[360px]:pr-[calc(var(--minimap-size,0px)_+_12px)] [&_.action-icon]:pointer-events-auto [&_.action-icon[data-skill-category]_img]:h-9 [&_.action-icon[data-skill-category]_img]:w-[30px] max-[360px]:[&_.action-icon]:size-[38px]">
      <SkillSlots view={view} actions={actions} editor={editor} />
      <div className="tonic-quick-slots flex flex-wrap gap-1" role="group" aria-label="Tonic quick slots">
        {quickSlots.map((assigned, index) => {
          const hotkey = `F${index + 1}`;
          const active = assigned && canHeal;
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
              onPress={active && !busy ? () => actions.useQuickSlot(index) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
