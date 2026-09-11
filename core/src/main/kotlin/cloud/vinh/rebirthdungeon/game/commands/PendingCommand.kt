package cloud.vinh.rebirthdungeon.game.commands
import cloud.vinh.rebirthdungeon.game.events.OrderedEvent
import cloud.vinh.rebirthdungeon.game.identity.EntityId
internal class PendingCommand {
    var command: RunCommand? = null
    var result: CommandResult? = null
    var actor: EntityId? = null
    var finishesActivation = true
    var hostile: EntityId? = null
    val events = ArrayList<OrderedEvent>()
    val observedEvents = ArrayList<OrderedEvent>()
    fun reset(command: RunCommand) {
        this.command = command; result = null; actor = null
        finishesActivation = true; hostile = null; events.clear(); observedEvents.clear()
    }
    fun accepted() = result?.accepted() == true
}
