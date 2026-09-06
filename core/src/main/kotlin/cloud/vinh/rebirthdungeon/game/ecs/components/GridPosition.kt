package cloud.vinh.rebirthdungeon.game.ecs.components

import com.artemis.Component

/** Authoritative grid cell of an entity on the current floor, in floor
 * coordinates (y-up). artemis components need a public constructor; the
 * defaulted parameters also generate the no-arg constructor artemis uses
 * reflectively. */
class GridPosition(var x: Int = 0, var y: Int = 0) : Component()
