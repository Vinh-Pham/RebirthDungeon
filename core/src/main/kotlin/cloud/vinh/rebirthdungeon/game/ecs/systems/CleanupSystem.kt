package cloud.vinh.rebirthdungeon.game.ecs.systems

import cloud.vinh.rebirthdungeon.game.commands.PendingCommand
import com.artemis.Aspect
import com.artemis.BaseEntitySystem

/** Pipeline slot 800. Clears the transient command intent so it cannot leak
 * into a later step; the resolved result stays until the controller reads it.
 * Runs last among this slice's systems. */
class CleanupSystem(private val pending: PendingCommand) : BaseEntitySystem(Aspect.all()) {
    override fun processSystem() {
        pending.clearIntent()
    }
}
