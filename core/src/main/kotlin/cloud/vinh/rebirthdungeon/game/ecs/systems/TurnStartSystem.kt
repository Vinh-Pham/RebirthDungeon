package cloud.vinh.rebirthdungeon.game.ecs.systems
import cloud.vinh.rebirthdungeon.game.BattleWorld
import com.artemis.BaseSystem
internal class TurnStartSystem(private val run: BattleWorld) : BaseSystem() {
    override fun processSystem() = run.combat.begin()
}
