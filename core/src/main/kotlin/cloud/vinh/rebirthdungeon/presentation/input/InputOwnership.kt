package cloud.vinh.rebirthdungeon.presentation.input

/** Single accepted gesture; additional pointers stay consumed until their own release. */
class InputOwnership {
    enum class Owner { UI, WORLD, BLOCKED }
    private val pointers = mutableMapOf<Int, Owner>()
    private val keys = mutableSetOf<Int>()
    fun down(pointer: Int, owner: Owner): Owner {
        if (pointer in pointers) return Owner.BLOCKED
        val accepted = if (pointers.isEmpty()) owner else Owner.BLOCKED
        pointers[pointer] = accepted
        return accepted
    }
    fun owner(pointer: Int) = pointers[pointer] ?: Owner.BLOCKED
    fun up(pointer: Int) = pointers.remove(pointer) ?: Owner.BLOCKED
    fun keyDown(key: Int) = keys.add(key)
    fun keyUp(key: Int) { keys.remove(key) }
    fun cancel() { pointers.keys.toList().forEach { pointers[it] = Owner.BLOCKED }; keys.clear() }
}
