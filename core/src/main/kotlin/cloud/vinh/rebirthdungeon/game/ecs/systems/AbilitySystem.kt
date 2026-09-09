package cloud.vinh.rebirthdungeon.game.ecs.systems

import cloud.vinh.rebirthdungeon.game.RunWorld
import com.artemis.BaseSystem

internal class AbilitySystem(private val run: RunWorld) : BaseSystem() {
    override fun processSystem() = run.combat.ability()
}
