export interface RenderEntity {
  readonly id: string;
  readonly name: string;
  readonly side: 'player' | 'enemy';
  readonly x: number;
  readonly y: number;
  readonly sprite: { readonly atlas: string; readonly frame: number; readonly idleFrames?: readonly number[] };
  readonly health: number;
  readonly maxHealth: number;
  readonly mana: number;
  readonly maxMana: number;
  readonly dead: boolean;
  readonly stamina?: number; readonly maxStamina?: number; readonly wounds?: number; readonly fullness?: number;
  readonly weapon?: { readonly name: string; readonly durability: number; readonly maxDurability: number };
}
