/**
 * Initial run component set (Phase 3), all data-only `@ECSComponent` classes:
 * formulas and state transitions live in systems or pure helpers, never in
 * component methods. Fields are assigned in constructors so the
 * legacy-decorator transform stays trivially correct.
 */

import { Component, ECSComponent } from '@esengine/ecs-framework';

@ECSComponent('StableId')
export class StableId extends Component {
  readonly value: string;

  constructor(id: string) {
    super();
    this.value = id;
  }
}

@ECSComponent('GridPosition')
export class GridPosition extends Component {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
}

/** Position at the start of the current move — drives interpolation only. */
@ECSComponent('PreviousGridPosition')
export class PreviousGridPosition extends Component {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
}

@ECSComponent('Actor')
export class Actor extends Component {}

@ECSComponent('PlayerControlled')
export class PlayerControlled extends Component {}

@ECSComponent('EnemyBrain')
export class EnemyBrain extends Component {
  /** Last cell where the enemy saw the player; null until first sight. */
  lastSeenPlayerX: number | null;
  lastSeenPlayerY: number | null;

  constructor() {
    super();
    this.lastSeenPlayerX = null;
    this.lastSeenPlayerY = null;
  }
}

@ECSComponent('BlocksMovement')
export class BlocksMovement extends Component {}

@ECSComponent('BlocksVision')
export class BlocksVision extends Component {}

/** Scheduler weight; rot speed = value / 100. */
@ECSComponent('Speed')
export class Speed extends Component {
  value: number;

  constructor(value: number = 100) {
    super();
    this.value = value;
  }
}

@ECSComponent('Vision')
export class Vision extends Component {
  radius: number;

  constructor(radius: number = 8) {
    super();
    this.radius = radius;
  }
}

@ECSComponent('Health')
export class Health extends Component {
  current: number;
  max: number;

  constructor(max: number) {
    super();
    this.current = max;
    this.max = max;
  }
}

@ECSComponent('Stats')
export class Stats extends Component {
  attack: number;
  defense: number;

  constructor(attack: number = 0, defense: number = 0) {
    super();
    this.attack = attack;
    this.defense = defense;
  }
}

/** Status ids with stack counts; combat systems own the semantics (Phase 4). */
@ECSComponent('StatusSet')
export class StatusSet extends Component {
  entries: readonly { readonly statusId: string; readonly stacks: number }[];

  constructor() {
    super();
    this.entries = [];
  }
}

@ECSComponent('Door')
export class Door extends Component {
  open: boolean;

  constructor() {
    super();
    this.open = false;
  }
}

@ECSComponent('Trap')
export class Trap extends Component {
  armed: boolean;
  readonly kind: string;

  constructor(kind: string) {
    super();
    this.armed = true;
    this.kind = kind;
  }
}

@ECSComponent('Pickup')
export class Pickup extends Component {
  readonly itemId: string;

  constructor(itemId: string) {
    super();
    this.itemId = itemId;
  }
}

@ECSComponent('MoveIntent')
export class MoveIntent extends Component {
  readonly dx: number;
  readonly dy: number;

  constructor(dx: number, dy: number) {
    super();
    this.dx = dx;
    this.dy = dy;
  }
}

@ECSComponent('AttackIntent')
export class AttackIntent extends Component {
  readonly targetId: string;

  constructor(targetId: string) {
    super();
    this.targetId = targetId;
  }
}

/** Marks an entity for the cleanup system to destroy at end of turn. */
@ECSComponent('PendingRemoval')
export class PendingRemoval extends Component {}

/** Presentation view of an actor; positions/frames stay in presentation. */
@ECSComponent('Sprite')
export class Sprite extends Component {
  animation: string;
  facing: 1 | -1;
  kind: 'hero' | 'monster';

  constructor(animation: string, kind: 'hero' | 'monster') {
    super();
    this.animation = animation;
    this.kind = kind;
    this.facing = 1;
  }
}

export type PendingActionKind =
  'move' | 'bump' | 'openDoor' | 'wait' | 'rejected';

/**
 * The validated action for the current actor's turn, written by the input
 * (player) or enemy-intent system and consumed by movement.
 */
@ECSComponent('PendingAction')
export class PendingAction extends Component {
  kind: PendingActionKind;
  toX: number;
  toY: number;
  /** For bumps: the stable id of the attacked actor. */
  targetId: string | null;
  /** For rejections: machine-readable reason surfaced as INPUT_REJECTED. */
  reason: string | null;

  constructor(
    kind: PendingActionKind,
    toX: number = 0,
    toY: number = 0,
    targetId: string | null = null,
    reason: string | null = null,
  ) {
    super();
    this.kind = kind;
    this.toX = toX;
    this.toY = toY;
    this.targetId = targetId;
    this.reason = reason;
  }
}
