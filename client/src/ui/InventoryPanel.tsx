import { HoverCard } from '@heroui-pro/react/hover-card';
import { ItemDetails } from './ItemDetails';
import { InventorySlotIcon } from './InventorySlotIcon';
import { ContextMenu } from '@heroui-pro/react/context-menu';
import { AlertDialog, Button, Input, Label, TextField } from '@heroui/react';
import {
    DragDropProvider,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useDraggable,
    useDroppable,
} from '@dnd-kit/react';
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type RefObject,
    type ReactNode,
} from 'react';
import type { Immutable } from 'immer';
import { allowed, reduceCommand, type Command } from '../domain/commands';
import { items, shops } from '../domain/catalog';
import {
    backpack,
    equippedSlot,
    equipReason,
    footprint,
    raceReason,
    moveReason,
    slotLabels,
} from '../domain/inventory';
import {
    equipmentSlots,
    type Character,
    type EquipmentSlot,
    type InventoryAnchor,
    type Item,
    type SaveData,
} from '../domain/model';
import { setGesture, acquireBlockingOverlay } from '../game/inputState';

type Destination = { slot: EquipmentSlot } | { anchor: InventoryAnchor };
const inventorySensors = [
    PointerSensor.configure({
        preventActivation: (event) => event.pointerType === 'touch' || event.button !== 0,
    }),
    KeyboardSensor,
];
type Action = { label: string; reason?: string; run: () => void };
function ItemTile({
    item,
    character,
    suppressHover,
    style,
    disabled,
    selected,
    actions,
    onSelect,
    onGrab,
}: {
    item: Immutable<Item>;
    character: Immutable<Character>;
    suppressHover: boolean;
    style?: CSSProperties;
    disabled: boolean;
    selected: boolean;
    actions: Action[];
    onSelect: () => void;
    onGrab: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
    const { ref, isDragging } = useDraggable({ id: item.id, disabled, data: { kind: item.kind } });
    const def = items[item.kind];
    const [menuOpen, setMenuOpen] = useState(false);
    const [hoverOpen, setHoverOpen] = useState(false);
    const showHover = hoverOpen && !menuOpen && !isDragging && !suppressHover;
    return (
        <div
            style={style}
            className="inventory-item-wrap"
            data-item-id={item.id}
            data-dragging={isDragging || undefined}
            onPointerDownCapture={(event) => {
                setHoverOpen(false);
                onGrab(event);
            }}
            onKeyDownCapture={(event) => {
                if (!menuOpen && hoverOpen && event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    setHoverOpen(false);
                    return;
                }
                if (menuOpen && event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(false);
                    const trigger = event.currentTarget.querySelector('button');
                    requestAnimationFrame(() => trigger?.focus());
                    return;
                }
                if (
                    (event.shiftKey && event.key === 'F10') ||
                    (event.ctrlKey && event.key === 'Enter') ||
                    event.key === 'ContextMenu'
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    setMenuOpen(true);
                }
            }}
        >
            <ContextMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <ContextMenu.Trigger tabIndex={-1} className="inventory-menu-trigger">
                    <HoverCard
                        openDelay={450}
                        closeDelay={150}
                        open={showHover}
                        onOpenChange={setHoverOpen}
                        isDisabled={menuOpen || isDragging || suppressHover}
                    >
                        <HoverCard.Trigger className="inventory-hover-trigger">
                            <Button
                                ref={ref}
                                className="inventory-tile"
                                variant="ghost"
                                aria-label={`${def.name} ×${item.count}`}
                                aria-pressed={selected}
                                onPress={onSelect}
                            >
                                <span aria-hidden="true" className="inventory-item-icon">
                                    {def.type === 'gear' && def.slots ? (
                                        <InventorySlotIcon slot={def.slots[0]} />
                                    ) : (
                                        def.icon
                                    )}
                                </span>
                                <span className="inventory-item-name">{def.name}</span>
                                {item.count > 1 && (
                                    <span className="inventory-quantity">{item.count}</span>
                                )}
                            </Button>
                        </HoverCard.Trigger>
                        {/* Unmount immediately: an exiting popover can lose its dragged anchor. */}
                        {showHover && (
                            <HoverCard.Content
                                aria-label={`${def.name} details`}
                                placement="top"
                                isNonModal
                                className="dark inventory-hover-card"
                            >
                                <ItemDetails item={item} character={character} />
                            </HoverCard.Content>
                        )}
                    </HoverCard>
                </ContextMenu.Trigger>
                <ContextMenu.Popover isNonModal className="dark inventory-context-menu">
                    <ContextMenu.Menu autoFocus="first" aria-label={`${def.name} actions`}>
                        {actions.map((action) => (
                            <ContextMenu.Item
                                key={action.label}
                                id={action.label}
                                textValue={action.label}
                                isDisabled={!!action.reason}
                                onAction={action.run}
                                variant={action.label === 'Drop' ? 'danger' : undefined}
                            >
                                <Label>{action.label}</Label>
                                {action.reason && <span className="text-xs">{action.reason}</span>}
                            </ContextMenu.Item>
                        ))}
                    </ContextMenu.Menu>
                </ContextMenu.Popover>
            </ContextMenu>
        </div>
    );
}
function EquipmentTarget({
    slot,
    children,
    onChoose,
    preview,
}: {
    slot: EquipmentSlot;
    children?: ReactNode;
    onChoose: () => void;
    preview?: boolean;
}) {
    const { ref } = useDroppable({ id: `slot:${slot}` });
    return (
        <div ref={ref} className="inventory-equipment-slot" data-slot={slot} data-valid={preview}>
            <Button
                variant="ghost"
                className="inventory-slot-target"
                aria-label={`Choose ${slotLabels[slot]}`}
                onPress={onChoose}
            >
                <span aria-hidden="true">
                    <InventorySlotIcon slot={slot} />
                </span>
                <small>{slotLabels[slot]}</small>
            </Button>
            {children}
        </div>
    );
}
function BackpackGrid({
    gridRef,
    children,
}: {
    gridRef: RefObject<HTMLDivElement | null>;
    children: ReactNode;
}) {
    useDroppable({ id: 'backpack', element: gridRef });
    return (
        <div ref={gridRef} className="inventory-grid">
            {children}
        </div>
    );
}
function DropConfirmation({
    item,
    disabled,
    error,
    onClose,
    send,
}: {
    item: Immutable<Item>;
    disabled: boolean;
    error: string;
    onClose: () => void;
    send: (command: Command) => void;
}) {
    const [quantity, setQuantity] = useState('1');
    useEffect(() => acquireBlockingOverlay(), []);
    return (
        <AlertDialog.Backdrop
            isOpen
            isKeyboardDismissDisabled={false}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            className="dark inventory-confirmation"
        >
            <AlertDialog.Container size="sm">
                <AlertDialog.Dialog className="game-modal">
                    <AlertDialog.Header>
                        <AlertDialog.Heading>Drop {items[item.kind].name}?</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                        <p>Discarded items disappear permanently. This cannot be undone.</p>
                        <TextField>
                            <Label>Quantity to discard (1–{item.count})</Label>
                            <Input
                                type="number"
                                min={1}
                                max={item.count}
                                step={1}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </TextField>
                        {error && <p role="alert">{error}</p>}
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                        <Button autoFocus variant="tertiary" onPress={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            isDisabled={
                                disabled ||
                                !Number.isSafeInteger(Number(quantity)) ||
                                Number(quantity) < 1 ||
                                Number(quantity) > item.count
                            }
                            onPress={() =>
                                send({ type: 'DROP_ITEM', id: item.id, quantity: Number(quantity) })
                            }
                        >
                            Discard
                        </Button>
                    </AlertDialog.Footer>
                </AlertDialog.Dialog>
            </AlertDialog.Container>
        </AlertDialog.Backdrop>
    );
}
export function InventoryPanel({
    character: c,
    service = '',
    save,
    disabled,
    error,
    send,
}: {
    character: Immutable<Character>;
    service?: string;
    save: Immutable<SaveData>;
    disabled: boolean;
    error: string;
    send: (command: Command) => void;
}) {
    const [selected, setSelected] = useState<string | null>(null);
    const [moving, setMoving] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [preview, setPreview] = useState<Destination | null>(null);
    const [message, setMessage] = useState('');
    const [drop, setDrop] = useState<{ id: string; count: number } | null>(null);
    const root = useRef<HTMLDivElement>(null);
    const grid = useRef<HTMLDivElement>(null);
    const grabbed = useRef({ column: 0, row: 0 });
    const dropItem = drop && c.inventory.find((i) => i.id === drop.id && i.count === drop.count);
    const dropOpen = !!dropItem;
    const dropFocus = useRef<string | null>(null);
    useEffect(() => {
        if (dropOpen && drop) dropFocus.current = drop.id;
        else if (dropFocus.current) {
            const target =
                root.current?.querySelector<HTMLElement>(
                    `[data-item-id="${CSS.escape(dropFocus.current)}"] button`,
                ) ?? root.current?.querySelector<HTMLElement>('.inventory-cell');
            target?.focus();
            dropFocus.current = null;
        }
    }, [dropOpen, drop]);
    useEffect(() => () => setGesture(false), []);
    const selectedItem = c.inventory.find((i) => i.id === selected);
    const activeId = dragging ?? moving;
    const activeItem = c.inventory.find((i) => i.id === activeId);
    const commandFor = (id: string, destination: Destination): Command =>
        'slot' in destination
            ? { type: 'EQUIP', id, slot: destination.slot }
            : {
                  type: equippedSlot(c, id) ? 'UNEQUIP' : 'MOVE_ITEM',
                  id,
                  anchor: destination.anchor,
              };
    const reasonFor = (id: string, destination: Destination) => {
        if (disabled) return 'Wait for the current action to finish.';
        if (!allowed(save, commandFor(id, destination)))
            return 'This action is not available now. Equipment changes require town.';
        return 'slot' in destination
            ? equipReason(c, id, destination.slot)
            : moveReason(c, id, destination.anchor);
    };
    const choose = (destination: Destination, id = activeId) => {
        if (!id) return;
        const reason = reasonFor(id, destination);
        setMessage(reason);
        if (!reason) {
            send(commandFor(id, destination));
            setMoving(null);
            setPreview(null);
        }
    };
    const handleDrop = (item: Immutable<Item>) => {
        setMessage('');
        setDrop({ id: item.id, count: item.count });
        setMoving(null);
    };
    const actionsFor = (item: Immutable<Item>): Action[] => {
        const def = items[item.kind];
        const busyReason = disabled ? 'Wait for the current action to finish.' : '';
        const slot = equippedSlot(c, item.id);
        const use: Command | null =
            def.type === 'book'
                ? { type: 'READ', id: item.id }
                : def.type === 'page'
                  ? { type: 'INSERT_PAGE', id: item.id }
                  : def.type === 'consumable'
                    ? { type: 'USE', id: item.id }
                    : null;
        const actions: Action[] = [];
        if (use) {
            let reason = busyReason;
            if (!reason) {
                try {
                    reduceCommand(save, use, `preview:${save.data.revision}`);
                } catch (e) {
                    reason = e instanceof Error ? e.message : 'Unavailable.';
                }
            }
            actions.push({
                label: 'Use',
                reason,
                run: () => {
                    setMessage('');
                    send(use);
                },
            });
        }
        const moveCommand: Command = slot
            ? { type: 'UNEQUIP', id: item.id }
            : { type: 'MOVE_ITEM', id: item.id, anchor: c.placements[item.id] };
        actions.push({
            label: slot ? 'Unequip' : 'Move',
            reason: busyReason || (!allowed(save, moveCommand) ? 'Unavailable in this phase.' : ''),
            run: () => {
                setSelected(item.id);
                setMoving(item.id);
                setMessage('Choose a backpack cell for the top-left corner.');
            },
        });
        if (def.slots && !slot)
            actions.push({
                label: 'Equip',
                reason:
                    busyReason ||
                    raceReason(c, item.kind) ||
                    (!allowed(save, { type: 'EQUIP', id: item.id })
                        ? 'Equipment changes require town.'
                        : ''),
                run: () => {
                    setSelected(item.id);
                    setMoving(item.id);
                    setMessage('Choose an equipment slot.');
                },
            });
        actions.push({
            label: 'Drop',
            reason:
                busyReason ||
                (slot
                    ? 'Unequip this item first.'
                    : !allowed(save, { type: 'DROP_ITEM', id: item.id, quantity: 1 })
                      ? 'Unavailable in this phase.'
                      : ''),
            run: () => handleDrop(item),
        });
        if (shops[service]) {
            const trade = (command: Command) => {
                let reason = busyReason;
                if (!reason) {
                    try {
                        reduceCommand(save, command, `preview:${save.data.revision}`);
                    } catch (error) {
                        reason = error instanceof Error ? error.message : 'Unavailable.';
                    }
                }
                return reason;
            };
            const sell: Command = { type: 'SELL', id: item.id };
            actions.push({
                label: `Sell · ${Math.floor(def.price / 4)}g`,
                reason: trade(sell),
                run: () => send(sell),
            });
            if (service === 'Blacksmith' && item.durability !== undefined) {
                const repair: Command = { type: 'REPAIR', id: item.id };
                actions.push({
                    label: `Repair · ${20 - item.durability}g`,
                    reason: trade(repair),
                    run: () => send(repair),
                });
            }
        }
        return actions;
    };
    const handleGrab = (
        event: React.PointerEvent<HTMLDivElement>,
        item: Immutable<Item>,
        inGrid: boolean,
    ) => {
        const rect = event.currentTarget.getBoundingClientRect(),
            size = footprint(item.kind);
        grabbed.current = inGrid
            ? {
                  column: Math.min(
                      size.width - 1,
                      Math.floor((event.clientX - rect.left) / (rect.width / size.width)),
                  ),
                  row: Math.min(
                      size.height - 1,
                      Math.floor((event.clientY - rect.top) / (rect.height / size.height)),
                  ),
              }
            : { column: 0, row: 0 };
    };
    const tile = (item: Immutable<Item>, inGrid: boolean) => {
        const anchor = c.placements[item.id],
            size = footprint(item.kind);
        return (
            <ItemTile
                key={item.id}
                item={item}
                character={c}
                suppressHover={!!dragging || !!moving || dropOpen}
                selected={selected === item.id}
                disabled={
                    disabled ||
                    !(
                        allowed(save, {
                            type: 'MOVE_ITEM',
                            id: item.id,
                            anchor: anchor ?? { column: 0, row: 0 },
                        }) || allowed(save, { type: 'UNEQUIP', id: item.id })
                    )
                }
                actions={actionsFor(item)}
                style={
                    inGrid
                        ? {
                              gridColumn: `${anchor.column + 1} / span ${size.width}`,
                              gridRow: `${anchor.row + 1} / span ${size.height}`,
                          }
                        : undefined
                }
                onSelect={() => {
                    if (moving) choose(inGrid ? { anchor } : { slot: equippedSlot(c, item.id)! });
                    else {
                        setSelected(item.id);
                        setMessage('');
                    }
                }}
                onGrab={(event) => handleGrab(event, item, inGrid)}
            />
        );
    };
    const destinationAt = (point: { x: number; y: number }): Destination | null => {
        for (const element of root.current?.querySelectorAll<HTMLElement>(
            '.inventory-equipment-slot[data-slot]',
        ) ?? []) {
            const rect = element.getBoundingClientRect();
            if (
                point.x >= rect.left &&
                point.x < rect.right &&
                point.y >= rect.top &&
                point.y < rect.bottom
            )
                return { slot: element.dataset.slot as EquipmentSlot };
        }
        const rect = grid.current?.getBoundingClientRect();
        if (
            !rect ||
            point.x < rect.left ||
            point.x >= rect.right ||
            point.y < rect.top ||
            point.y >= rect.bottom
        )
            return null;
        return {
            anchor: {
                column:
                    Math.floor((point.x - rect.left) / (rect.width / backpack.columns)) -
                    grabbed.current.column,
                row:
                    Math.floor((point.y - rect.top) / (rect.height / backpack.rows)) -
                    grabbed.current.row,
            },
        };
    };
    const previewReason = activeId && preview ? reasonFor(activeId, preview) : '';
    return (
        <div
            ref={root}
            className="inventory-panel"
            onKeyDown={(event) => {
                if (event.key === 'Escape' && moving) {
                    event.stopPropagation();
                    setMoving(null);
                    setPreview(null);
                    setMessage('Move cancelled.');
                }
            }}
        >
            <DragDropProvider
                sensors={inventorySensors}
                onDragStart={(event) => {
                    if (event.operation.activatorEvent instanceof KeyboardEvent)
                        grabbed.current = { column: 0, row: 0 };
                    setDragging(String(event.operation.source!.id));
                    setMoving(null);
                    setMessage('');
                    setGesture(true);
                }}
                onDragMove={(event) =>
                    setPreview(
                        destinationAt(
                            event.to ?? {
                                x: event.operation.position.current.x + (event.by?.x ?? 0),
                                y: event.operation.position.current.y + (event.by?.y ?? 0),
                            },
                        ),
                    )
                }
                onDragEnd={(event) => {
                    setGesture(false);
                    const destination = destinationAt(event.operation.position.current);
                    if (!event.canceled && destination && event.operation.source)
                        choose(destination, String(event.operation.source.id));
                    setDragging(null);
                    setPreview(null);
                }}
            >
                <div className="inventory-layout">
                    <section aria-label="Equipment">
                        <h3>Equipment</h3>
                        <div className="inventory-equipment">
                            {equipmentSlots.map((slot) => {
                                const item = c.inventory.find((i) => i.id === c.equipment[slot]);
                                return (
                                    <EquipmentTarget
                                        key={slot}
                                        slot={slot}
                                        onChoose={() => choose({ slot })}
                                        preview={
                                            activeId ? !reasonFor(activeId, { slot }) : undefined
                                        }
                                    >
                                        {item && tile(item, false)}
                                    </EquipmentTarget>
                                );
                            })}
                        </div>
                        <p className="inventory-gold">
                            Gold <strong>{c.gold.toLocaleString()}</strong>
                        </p>
                    </section>
                    <section aria-label="Backpack">
                        <h3>Backpack · 6 × 10</h3>
                        <BackpackGrid gridRef={grid}>
                            {Array.from({ length: 60 }, (_, index) => {
                                const anchor = { column: index % 6, row: Math.floor(index / 6) };
                                return (
                                    <Button
                                        key={index}
                                        variant="ghost"
                                        className="inventory-cell"
                                        style={{
                                            gridColumn: anchor.column + 1,
                                            gridRow: anchor.row + 1,
                                        }}
                                        aria-label={`Column ${anchor.column + 1}, row ${anchor.row + 1}`}
                                        onPress={() => choose({ anchor })}
                                        onHoverStart={() => {
                                            if (moving) setPreview({ anchor });
                                        }}
                                        onFocus={() => {
                                            if (moving) setPreview({ anchor });
                                        }}
                                    />
                                );
                            })}
                            {c.inventory
                                .filter((item) => c.placements[item.id])
                                .map((item) => tile(item, true))}
                            {activeItem && preview && 'anchor' in preview && (
                                <div
                                    className="inventory-preview"
                                    data-valid={!previewReason}
                                    style={{
                                        left: `${(preview.anchor.column / 6) * 100}%`,
                                        top: `${(preview.anchor.row / 10) * 100}%`,
                                        width: `${(footprint(activeItem.kind).width / 6) * 100}%`,
                                        height: `${(footprint(activeItem.kind).height / 10) * 100}%`,
                                    }}
                                />
                            )}
                        </BackpackGrid>
                    </section>
                </div>
                <DragOverlay dropAnimation={null}>
                    {(source) => (
                        <div className="inventory-tile" aria-hidden="true">
                            <span className="inventory-item-icon">
                                {items[String(source.data.kind)]?.icon}
                            </span>
                        </div>
                    )}
                </DragOverlay>
            </DragDropProvider>
            <p role="status" aria-label="Inventory feedback" className="inventory-hint">
                {previewReason ||
                    message ||
                    'Drag items to organize or equip. Right-click an item for actions.'}
            </p>
            {moving && (
                <Button
                    size="sm"
                    variant="tertiary"
                    onPress={() => {
                        setMoving(null);
                        setPreview(null);
                        setMessage('');
                    }}
                >
                    Cancel move
                </Button>
            )}
            {selectedItem && (
                <section className="inventory-details" aria-label="Item details">
                    <ItemDetails item={selectedItem} character={c} />
                    <div className="inventory-actions">
                        {actionsFor(selectedItem).map((action) => (
                            <span key={action.label}>
                                <Button
                                    size="sm"
                                    variant={action.label === 'Drop' ? 'danger-soft' : 'secondary'}
                                    isDisabled={!!action.reason}
                                    onPress={action.run}
                                >
                                    {action.label}
                                </Button>
                                {action.reason && <small>{action.reason}</small>}
                            </span>
                        ))}
                    </div>
                </section>
            )}
            {c.inventoryRecovery.length > 0 && (
                <section aria-label="Recovered items">
                    <h3>Recovered items</h3>
                    <p>Items preserved from your old backpack. Withdraw when there is space.</p>
                    {c.inventoryRecovery.map((item) => (
                        <div key={item.id} className="item">
                            {items[item.kind].name} ×{item.count}
                            <Button
                                isDisabled={
                                    disabled ||
                                    !allowed(save, { type: 'WITHDRAW_RECOVERY', id: item.id })
                                }
                                onPress={() => send({ type: 'WITHDRAW_RECOVERY', id: item.id })}
                            >
                                Withdraw
                            </Button>
                        </div>
                    ))}
                </section>
            )}
            {dropItem && (
                <DropConfirmation
                    key={dropItem.id}
                    item={dropItem}
                    disabled={disabled}
                    error={error}
                    onClose={() => setDrop(null)}
                    send={send}
                />
            )}
        </div>
    );
}