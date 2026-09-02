/**
 * Data-only spike components registered through the `@ECSComponent` decorator,
 * which gives them stable type names in the ECS registry. They verify that
 * the decorators compile and execute on Hermes; Phase 3 replaces them with
 * the real component set.
 *
 * Fields are assigned in constructors (no class-property initializers) so the
 * legacy-decorator transform stays trivially correct.
 */

import { Component, ECSComponent } from '@esengine/ecs-framework';

import type { GridPoint } from '@/game/grid/dungeon-grid';

@ECSComponent('SpikeGridPosition')
export class GridPosition extends Component {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
}

@ECSComponent('SpikeSprite')
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

@ECSComponent('SpikePatrolRoute')
export class PatrolRoute extends Component {
  readonly points: readonly GridPoint[];
  index: number;
  /** Set by PatrolSystem each step, consumed and cleared by SpriteSystem. */
  movedThisStep: boolean;
  lastDx: number;

  constructor(points: readonly GridPoint[]) {
    super();
    this.points = points;
    this.index = 0;
    this.movedThisStep = false;
    this.lastDx = 0;
  }
}
