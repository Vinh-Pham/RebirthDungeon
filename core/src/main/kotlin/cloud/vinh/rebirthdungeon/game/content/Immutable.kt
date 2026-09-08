package cloud.vinh.rebirthdungeon.game.content

import java.util.Collections

/** Copy before wrapping; elements must themselves be immutable project values. */
internal fun <T> frozenList(values: Collection<T>): List<T> = Collections.unmodifiableList(ArrayList(values))
internal fun <K, V> frozenMap(values: Map<K, V>): Map<K, V> = Collections.unmodifiableMap(LinkedHashMap(values))
