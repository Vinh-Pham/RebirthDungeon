import { useState } from "react";
import { Button, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import type { GameActions, GameView } from "../app/contracts";

export function LootPanel({
  items,
  busy,
  takeLoot,
}: {
  items: GameView["loot"];
  busy: boolean;
  takeLoot: GameActions["takeLoot"];
}) {
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set());
  const selected = items.filter(({ id }) => !excluded.has(id)).map(({ id }) => id);

  return (
    <div className="loot-panel grid gap-3 [&_p]:m-0 [&_p]:text-xs">
      <p className="text-[#8da4a1]" id="loot-keys">
        Arrow keys move. Space toggles selection.
      </p>
      <ToggleButtonGroup
        className="loot-items flex-wrap items-stretch"
        selectionMode="multiple"
        isDetached
        aria-label="Loot items"
        aria-describedby="loot-keys"
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          setExcluded(new Set(items.filter(({ id }) => !keys.has(id)).map(({ id }) => id)));
        }}
        isDisabled={busy}
      >
        {items.map(({ id, name, icon, count }, index) => (
          <ToggleButton
            id={id}
            key={id}
            className="loot-item group flex! h-auto! w-[72px]! flex-col justify-start! gap-1! p-1! text-center text-[11px]! whitespace-normal!"
            aria-label={`${name} × ${count}`}
            autoFocus={index === 0}
          >
            <span
              className="loot-item-face relative grid aspect-square w-full place-items-center border border-[#3b5556] bg-[#11272b] group-data-[selected]:border-[#d3d991] group-data-[selected]:bg-[#344a3e]"
              aria-hidden="true"
            >
              {icon ? (
                <img
                  className="inventory-icon h-8 w-6 object-contain [image-rendering:pixelated]"
                  src={`${import.meta.env.BASE_URL}assets/${icon}`}
                  alt=""
                  draggable={false}
                />
              ) : (
                name[0]
              )}
              <span className="inventory-quantity pointer-events-none absolute right-px bottom-px rounded-[2px] bg-[#101f24e8] px-0.5 py-px text-[clamp(8px,1.6vw,11px)] leading-none whitespace-nowrap text-[#e0e9d9]">
                × {count}
              </span>
            </span>
            <span>{name}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <div className="loot-actions mt-1 flex flex-wrap gap-2">
        <Button variant="secondary" isDisabled={busy || !selected.length} onPress={() => takeLoot(selected)}>
          Take Selected
        </Button>
        <Button
          variant="primary"
          isDisabled={busy || !items.length}
          onPress={() => takeLoot()}
        >
          Take All
        </Button>
      </div>
    </div>
  );
}
