package cloud.vinh.rebirthdungeon.data.save

import com.badlogic.gdx.files.FileHandle

/** Root is platform-selected by bootstrap and must be outside shipped assets. */
class LocalCheckpointStorage(private val root: FileHandle) : CheckpointStorage {
    override fun read(slot: String): String? = root.child(slot).let { if (it.exists()) it.readString("UTF-8") else null }
    override fun write(slot: String, text: String) {
        root.mkdirs()
        root.child(slot).writeString(text, false, "UTF-8")
    }
}
