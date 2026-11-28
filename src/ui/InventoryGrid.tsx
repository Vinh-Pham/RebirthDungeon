import { useCallback, useState } from "react";
import { Button } from "@heroui/react";
import { useDrag, useDrop } from "react-dnd";
import type { GameActions, GameView, InventoryItem } from "../app/contracts";
import { canPlace } from "../game/systems/inventory";

const inventoryItem = "inventory-item";
const compactCount = new Intl.NumberFormat("en", { notation: "compact" });

export function InventoryIcon({ item }: { item: InventoryItem }) {
  return item.texture ? (
    <img
      className="inventory-icon h-8 w-6 object-contain [image-rendering:pixelated]"
      src={`${import.meta.env.BASE_URL}assets/frames/${item.texture}.png`}
      alt=""
      draggable={false}
    />
  ) : (
    <span className="inventory-icon-fallback" aria-hidden="true">
      {item.name[0]}
    </span>
  );
}

interface DraggedItem {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface InventoryCellProps {
  x: number;
  y: number;
  item?: InventoryItem;
  inventory: GameView["inventory"];
  disabled: boolean;
  focused: boolean;
  picked: boolean;
  onFocus: () => void;
  onPick: () => void;
  clearPick: () => void;
  moveItem: GameActions["moveItem"];
}

function InventoryCell({
  x,
  y,
  item,
  inventory,
  disabled,
  focused,
  picked,
  onFocus,
  onPick,
  clearPick,
  moveItem,
}: InventoryCellProps) {
  const movable = !disabled && Boolean(item && !item.equipped);
  const [{ dragging }, drag] = useDrag<DraggedItem, void, { dragging: boolean }>({
    type: inventoryItem,
    canDrag: movable,
    item: () => {
      if (!item) return null;
      clearPick();
      return { id: item.id, offsetX: x - item.x, offsetY: y - item.y };
    },
    collect: (monitor) => ({ dragging: monitor.isDragging() }),
  });
  const [{ dropTarget }, drop] = useDrop<
    DraggedItem,
    void,
    { dropTarget: boolean }
  >({
    accept: inventoryItem,
    canDrop: ({ id, offsetX, offsetY }) => {
      const moving = inventory.items.find((candidate) => candidate.id === id);
      return Boolean(!disabled && moving && !moving.equipped && canPlace(inventory, moving, x - offsetX, y - offsetY));
    },
    drop: ({ id, offsetX, offsetY }) => moveItem(id, x - offsetX, y - offsetY),
    collect: (monitor) => ({
      dropTarget: monitor.isOver({ shallow: true }) && monitor.canDrop(),
    }),
  });
  const connect = useCallback(
    (element: HTMLButtonElement | null) => {
      drag(movable ? element : null);
      drop(element);
    },
    [drag, drop, movable],
  );
  const anchor = item && item.x === x && item.y === y;
  const label = item && item.name + (item.amount ? " × " + item.amount : "");
  return (
    <button
      ref={connect}
      type="button"
      role="gridcell"
      aria-rowindex={y + 1}
      aria-colindex={x + 1}
      tabIndex={focused ? 0 : -1}
      className="inventory-cell relative grid aspect-square min-w-0 place-items-center border border-[#3b5556] bg-[#11272b] p-0 text-[#e0e9d9] data-[movable=true]:cursor-grab data-[dragging=true]:opacity-55 data-[picked=true]:bg-[#3b523d] data-[picked=true]:shadow-[inset_0_0_0_2px_#d3d991] data-[drop-target=true]:bg-[#3b523d] data-[drop-target=true]:shadow-[inset_0_0_0_2px_#d3d991] focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-[#66c4ce] focus-visible:outline-offset-1 [&_.inventory-icon]:absolute [&_.inventory-icon]:inset-0 [&_.inventory-icon]:m-auto [&_.inventory-icon]:h-[76%] [&_.inventory-icon]:w-[72%]"
      data-movable={movable}
      data-picked={picked}
      data-dragging={dragging}
      data-drop-target={dropTarget}
      aria-selected={focused}
      aria-label={`Row ${y + 1}, column ${x + 1}${label ? ", " + label : " empty"}`}
      title={label}
      onFocus={onFocus}
      onClick={onPick}
    >
      {anchor && (
        <>
          <InventoryIcon item={item} />
          {item.amount !== undefined && item.amount > 1 && (
            <span
              className="inventory-quantity pointer-events-none absolute right-px bottom-px rounded-[2px] bg-[#101f24e8] px-0.5 py-px text-[clamp(8px,1.6vw,11px)] leading-none whitespace-nowrap text-[#e0e9d9]"
              aria-hidden="true"
            >
              × {compactCount.format(item.amount)}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export function InventoryGrid({
  inventory,
  moveItem,
  equipItem,
  equipOffhand,
  disabled,
}: {
  inventory: GameView["inventory"];
  moveItem: GameActions["moveItem"];
  equipItem: (id: string) => void;
  equipOffhand: (id: string) => void;
  disabled: boolean;
}) {
  const [picked, setPicked] = useState<string>();
  const [cursor, setCursor] = useState(0);
  const selectedItem = inventory.items.find((item) => item.id === picked);
  const clearPick = () => setPicked(undefined);
  const pick = (x: number, y: number, item?: InventoryItem) => {
    if (disabled) return;
    if (picked) {
      moveItem(picked, x, y);
      clearPick();
    } else if (item && !item.equipped) setPicked(item.id);
  };
  return (
    <>
      <div
        role="grid"
        aria-label="Inventory"
        aria-describedby="inventory-help"
        aria-rowcount={inventory.height}
        aria-colcount={inventory.width}
        className="item-grid grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${inventory.width}, minmax(0, 1fr))`,
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && picked) {
            event.preventDefault();
            event.stopPropagation();
            clearPick();
            return;
          }
          let next = cursor;
          if (event.key === "ArrowLeft")
            next = Math.max(Math.floor(cursor / inventory.width) * inventory.width, cursor - 1);
          else if (event.key === "ArrowRight")
            next = Math.min((Math.floor(cursor / inventory.width) + 1) * inventory.width - 1, cursor + 1);
          else if (event.key === "ArrowUp") next = Math.max(0, cursor - inventory.width);
          else if (event.key === "ArrowDown")
            next = Math.min(inventory.width * inventory.height - 1, cursor + inventory.width);
          else return;
          event.preventDefault();
          event.stopPropagation();
          setCursor(next);
          const row = Math.floor(next / inventory.width) + 1;
          const column = (next % inventory.width) + 1;
          event.currentTarget
            .querySelector<HTMLButtonElement>(`[aria-rowindex="${row}"][aria-colindex="${column}"]`)
            ?.focus();
        }}
      >
        {Array.from({ length: inventory.height }, (_, row) => (
          <div role="row" className="inventory-row contents" key={row}>
            {Array.from({ length: inventory.width }, (_, column) => {
              const index = row * inventory.width + column;
              const item = inventory.items.find(
                (item) =>
                  column >= item.x &&
                  column < item.x + item.width &&
                  row >= item.y &&
                  row < item.y + item.height,
              );
              return (
                <InventoryCell
                  key={index}
                  x={column}
                  y={row}
                  item={item}
                  inventory={inventory}
                  disabled={disabled}
                  focused={cursor === index}
                  picked={Boolean(item && picked === item.id)}
                  onFocus={() => setCursor(index)}
                  onPick={() => pick(column, row, item)}
                  clearPick={clearPick}
                  moveItem={moveItem}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-[#8da4a1] mt-2 mb-0 text-xs" id="inventory-help">
        {picked ? "Enter places the item. Esc cancels." : "Drag items or use the arrow keys and Enter."}
      </p>
      {selectedItem && (
        <div className="inventory-selection mt-2 flex flex-wrap gap-2">
          {selectedItem.equipmentSlot && (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={disabled}
              onPress={() => {
                clearPick();
                equipItem(selectedItem.id);
              }}
            >
              Equip {selectedItem.name}
            </Button>
          )}
          {selectedItem.canOffHand &&
            Boolean(inventory.equipment.main_hand) &&
            Boolean(inventory.equipment.off_hand) && (
              <Button
                size="sm"
                variant="secondary"
                isDisabled={disabled}
                onPress={() => {
                  clearPick();
                  equipOffhand(selectedItem.id);
                }}
              >
                Equip Offhand
              </Button>
            )}
          <Button size="sm" variant="ghost" onPress={clearPick}>
            Cancel Move
          </Button>
        </div>
      )}
    </>
  );
}
