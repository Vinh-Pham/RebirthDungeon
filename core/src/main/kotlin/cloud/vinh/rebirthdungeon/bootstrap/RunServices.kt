package cloud.vinh.rebirthdungeon.bootstrap
import cloud.vinh.rebirthdungeon.application.session.*
import cloud.vinh.rebirthdungeon.data.content.ContentBundle
import cloud.vinh.rebirthdungeon.data.save.*
import com.badlogic.gdx.*
/** Sessions outlive screens; only this bootstrap resolves filesystem locations. */
class RunServices(private val bundle: ContentBundle) {
    private val root = if (Gdx.app.type == Application.ApplicationType.Desktop)
        Gdx.files.absolute(System.getenv("REBIRTH_CHECKPOINT_DIR") ?: (System.getProperty("user.home") + "/.rebirthdungeon/saves")) else Gdx.files.local("saves")
    private val repository = AlternatingSessionRepository(LocalCheckpointStorage(root)) { SessionCoordinator.validate(it, bundle.catalog, bundle.world) }
    var active: SessionCoordinator? = null; private set
    fun resume(): SessionCoordinator {
        active?.let { return it }
        val saved = repository.load()
        val session = SessionCoordinator(bundle.catalog, bundle.world, repository, saved?.seed ?: java.util.Random().nextLong(), saved)
        active = session; session.start(); return session
    }
    fun dispose() { active?.close(); active = null }
}
