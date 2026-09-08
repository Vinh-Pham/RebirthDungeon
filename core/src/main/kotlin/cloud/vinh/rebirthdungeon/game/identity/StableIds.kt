package cloud.vinh.rebirthdungeon.game.identity

/** Namespaced authored identity, independent of file paths and catalog order. */
data class ContentId(val value: String) {
    init { require(value.matches(Regex("[a-z][a-z0-9_]*[.][a-z][a-z0-9_.]*"))) { "Invalid content ID: $value" } }
}

/** Monotonic run-local identity; never an artemis recycled entity index. */
data class EntityId(val value: Long) {
    init { require(value > 0) }
}
