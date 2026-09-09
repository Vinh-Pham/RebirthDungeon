package cloud.vinh.rebirthdungeon.game.commands

import cloud.vinh.rebirthdungeon.game.events.Cell
import cloud.vinh.rebirthdungeon.game.events.OrderedEvent
import cloud.vinh.rebirthdungeon.game.identity.EntityId

/** One transient action, consumed only within a single World.process call. */
internal class PendingCommand {
    var command: RunCommand? = null
    var result: CommandResult? = null
    var actor: EntityId? = null
    var target: Cell? = null
    var opensDoor = false
    var finishesActivation = true
    var hostile: EntityId? = null
    val events = ArrayList<OrderedEvent>()
    val observedEvents = ArrayList<OrderedEvent>()
    fun reset(command: RunCommand) {
        this.command = command; result = null; actor = null; target = null; opensDoor = false
        finishesActivation = true; hostile = null
        events.clear(); observedEvents.clear()
    }
    fun accepted() = result?.accepted() == true
}
