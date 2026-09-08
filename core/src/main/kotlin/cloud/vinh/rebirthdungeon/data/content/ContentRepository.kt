package cloud.vinh.rebirthdungeon.data.content

import cloud.vinh.rebirthdungeon.game.content.ContentCatalog
import cloud.vinh.rebirthdungeon.game.content.frozenList
import cloud.vinh.rebirthdungeon.game.identity.ContentId

/** Source paths resolve relative to assets/data; no filesystem access in game/. */
fun interface ContentSource { fun read(path: String): String }
interface ContentRepository { fun load(): ContentBundle }
class VisualBinding(val id: ContentId, val atlas: String, val animation: String, frames: List<String>) {
    val frames = frozenList(frames)
}
class ContentBundle(val catalog: ContentCatalog, visuals: List<VisualBinding>) {
    val visuals = frozenList(visuals)
    fun validateVisuals(hasRegion: (String, String) -> Boolean) {
        visuals.forEach { binding -> binding.frames.forEach { frame ->
            require(hasRegion(binding.atlas, frame)) {
                "visuals[${binding.id.value}].animation[${binding.animation}]: missing ${binding.atlas} region $frame"
            }
        } }
    }
}
class ContentException(message: String, cause: Throwable? = null) : IllegalArgumentException(message, cause)
