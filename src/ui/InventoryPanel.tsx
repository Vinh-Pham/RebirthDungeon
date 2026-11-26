import { Button } from "@heroui/react";
import type { GameActions, GameView } from "../app/contracts";
import { equipmentSlots, type EquipmentSlot } from "../game/systems/inventory";
import { InventoryGrid, InventoryIcon } from "./InventoryGrid";

const slots = [
  "accessory_1", "headgear", "accessory_2",
  "main_hand", "armor", "off_hand",
  "shoes",
] as const satisfies readonly EquipmentSlot[];

export function InventoryPanel({
  view,
  actions,
}: {
  view: GameView;
  actions: GameActions;
}) {
  const { inventory, busy, encounter } = view;
  const gloves = inventory.equipment.gloves;
  const equipmentLocked = busy || Boolean(encounter);
  const toggleEquipment = (id: string) => actions.choose(`equip:${id}`);

  return (
    <div className="inventory-panel">
      <div className="inventory-layout">
        <section aria-labelledby="inventory-bag-heading">
          <h3 id="inventory-bag-heading">Bag</h3>
          <InventoryGrid
            inventory={inventory}
            moveItem={actions.moveItem}
            equipItem={toggleEquipment}
            disabled={equipmentLocked}
          />
          {view.details.body && (
            <p className="panel-copy inventory-materials">{view.details.body}</p>
          )}
        </section>
        <section aria-labelledby="inventory-equipment-heading">
          <h3 id="inventory-equipment-heading">Equipment</h3>
          <dl className="equipment-grid">
            {slots.map((slot) => {
              const item = inventory.equipment[slot];
              return (
                <div className="equipment-slot" data-equipment-slot={slot} key={slot}>
                  <dt>{equipmentSlots[slot]}</dt>
                  <dd>
                    {item ? (
                      <Button
                        className="equipment-item"
                        size="sm"
                        variant="ghost"
                        aria-label={`Unequip ${item.name}`}
                        isDisabled={equipmentLocked}
                        onPress={() => toggleEquipment(item.id)}
                      >
                        <InventoryIcon item={item} />
                        <span className="equipment-item-name" title={item.name}>
                          {item.name}
                        </span>
                      </Button>
                    ) : (
                      <span className="muted">Empty</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {gloves && (
            <Button
              className="equipment-gloves"
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
        <div className="tonic-heading">
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
        <div className="tonic-slots">
          {inventory.quickSlots.map((assigned, index) => {
            const key = `F${index + 1}`;
            return (
              <Button
                className="tonic-slot"
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
