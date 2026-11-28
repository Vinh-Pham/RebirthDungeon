import { Button } from "@heroui/react";
import type { GameActions, GameView } from "../app/contracts";
import { equipmentSlots, type EquipmentSlot } from "../game/systems/inventory";
import { InventoryGrid, InventoryIcon } from "./InventoryGrid";

const slots = [
  "accessory_1", "headgear", "accessory_2",
  "main_hand", "armor", "off_hand",
  "shoes",
] as const satisfies readonly EquipmentSlot[];

export function InventoryPanel({ view, actions }: { view: GameView; actions: GameActions }) {
  const { inventory, busy, encounter } = view;
  const gloves = inventory.equipment.gloves;
  const equipmentLocked = busy || Boolean(encounter);
  const toggleEquipment = (id: string) => actions.choose(`equip:${id}`);

  return (
    <div className="inventory-panel grid gap-5">
      <div className="inventory-layout grid grid-cols-[minmax(0,3fr)_minmax(240px,2fr)] gap-5 max-[640px]:grid-cols-[minmax(0,1fr)] [&_h3]:m-0 [&_h3]:mb-2 [&_h3]:text-[14px] [&_h3]:text-[#b8cd98]">
        <section aria-labelledby="inventory-bag-heading">
          <h3 id="inventory-bag-heading">Bag</h3>
          <InventoryGrid
            inventory={inventory}
            moveItem={actions.moveItem}
            equipItem={toggleEquipment}
            equipOffhand={(id) => actions.choose(`equip-offhand:${id}`)}
            disabled={equipmentLocked}
          />
          {view.details.body && (
            <p className="inventory-materials font-[SourceCode,monospace] leading-[1.7] text-[#becbc4] mt-2 mb-0 text-xs">
              {view.details.body}
            </p>
          )}
        </section>
        <section aria-labelledby="inventory-equipment-heading">
          <h3 id="inventory-equipment-heading">Equipment</h3>
          <dl className="equipment-grid m-0 grid grid-cols-3 gap-1">
            {slots.map((slot) => {
              const item = inventory.equipment[slot];
              return (
                <div
                  className="equipment-slot flex min-h-[66px] flex-col border border-[#3b5556] bg-[#11272b] px-1 py-[5px] text-center text-[10px] data-[equipment-slot=shoes]:col-start-2 [&_dt]:text-[#d6ddd0] [&_dd]:m-0 [&_dd]:grid [&_dd]:min-w-0 [&_dd]:flex-1 [&_dd]:place-items-center"
                  data-equipment-slot={slot}
                  key={slot}
                >
                  <dt>{equipmentSlots[slot]}</dt>
                  <dd>
                    {item ? (
                      <Button
                        className="equipment-item h-auto! w-full min-w-0 flex-col gap-0.5 p-0.5! text-[inherit] [&_.inventory-icon]:h-6"
                        size="sm"
                        variant="ghost"
                        aria-label={`Unequip ${item.name}`}
                        isDisabled={equipmentLocked}
                        onPress={() => toggleEquipment(item.id)}
                      >
                        <InventoryIcon item={item} />
                        <span
                          className="equipment-item-name max-w-full overflow-hidden text-ellipsis"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                      </Button>
                    ) : (
                      <span className="text-[#8da4a1]">Empty</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {gloves && (
            <Button
              className="equipment-gloves mt-2"
              size="sm"
              variant="ghost"
              isDisabled={equipmentLocked}
              onPress={() => toggleEquipment(gloves.id)}
            >
              Unequip {gloves.name}
            </Button>
          )}
        </section>
      </div>
      <section className="tonic-quickbar" aria-labelledby="tonic-quickbar-heading">
        <div className="tonic-heading mb-2 flex items-center justify-between gap-2 [&_h3]:m-0 [&_h3]:text-[14px] [&_h3]:text-[#b8cd98]">
          <h3 id="tonic-quickbar-heading">Tonic Quick Slots</h3>
          <Button
            size="sm"
            variant="secondary"
            aria-label={`Use Healing Tonic (${inventory.tonics} available)`}
            isDisabled={busy || inventory.tonics === 0}
            onPress={() => actions.choose("tonic")}
          >
            Use Tonic ({inventory.tonics})
          </Button>
        </div>
        <div className="tonic-slots grid grid-cols-4 gap-2">
          {inventory.quickSlots.map((assigned, index) => {
            const key = `F${index + 1}`;
            return (
              <Button
                className="tonic-slot h-auto! w-full min-w-0 flex-col gap-0.5 px-1! py-1.5! text-xs! [&_kbd]:font-[inherit] [&_kbd]:text-[10px]"
                key={key}
                size="sm"
                variant={assigned ? "secondary" : "outline"}
                aria-label={`${key} · ${assigned ? "Clear Tonic" : "Assign Tonic"}`}
                aria-pressed={assigned}
                isDisabled={busy}
                onPress={() => actions.choose(`slot:${index}`)}
              >
                <kbd>{key}</kbd>
                <span>{assigned ? "Tonic" : "Assign"}</span>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
