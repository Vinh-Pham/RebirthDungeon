package cloud.vinh.rebirthdungeon.game
import cloud.vinh.rebirthdungeon.data.content.JacksonContentRepository
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.ActorState
import java.io.File
internal object CombatFixtures {
    val content = JacksonContentRepository { File("../assets/data/$it").readText() }.load().catalog
    fun enemy(id: Long = 2, hp: Int = 10) = ActorState(EntityId(id), ContentId("actor.enemy"), false, hp, maxOf(10, hp))
}
