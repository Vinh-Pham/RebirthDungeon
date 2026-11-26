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
    <div className="loot-panel">
      <p className="muted" id="loot-keys">Arrow keys move. Space toggles selection.</p>
      <ToggleButtonGroup
        className="loot-items"
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
            className="loot-item"
            aria-label={`${name} × ${count}`}
            autoFocus={index === 0}
          >
            <span className="loot-item-face" aria-hidden="true">
              {icon ? (
                <img
                  className="inventory-icon"
                  src={`${import.meta.env.BASE_URL}assets/${icon}`}
                  alt=""
                  draggable={false}
                />
              ) : name[0]}
              <span className="inventory-quantity">× {count}</span>
            </span>
            <span>{name}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <div className="loot-actions">
        <Button
          variant="secondary"
          isDisabled={busy || !selected.length}
          onPress={() => takeLoot(selected)}
        >
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
