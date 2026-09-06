package cloud.vinh.rebirthdungeon.bootstrap

import java.util.concurrent.Callable
import java.util.concurrent.Executor
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.atomic.AtomicLong

/** Single-thread worker with session-tokened result handoff. Jobs run off the
 * render thread; every result returns through the supplied trampoline
 * (`Gdx.app::postRunnable` in production) and is delivered only while
 * its submitting session is still current, so a replaced screen or superseded
 * request can never observe a late callback. Jobs must return detached
 * plain-JVM data: they never touch artemis entities, Scene2D actors, graphics
 * or audio (game-plan section 4). */
class SessionWorker(
    /** Test constructor: any executor (synchronous executors keep tests deterministic). */
    private val executor: Executor,
    private val trampoline: Trampoline
) {
    /** Delivers results onto the render thread; production uses
     * `Gdx.app::postRunnable`, tests use a direct queue. */
    fun interface Trampoline {
        fun post(runnable: Runnable)
    }

    /** Receives one job outcome on the render thread. */
    interface ResultHandler<T> {
        fun onResult(result: T)

        fun onFailure(failure: Throwable)
    }

    /** Production constructor: a private single-thread daemon worker. */
    constructor(trampoline: Trampoline) : this(
        Executors.newSingleThreadExecutor { runnable ->
            Thread(runnable, "rebirth-worker").apply { isDaemon = true }
        },
        trampoline
    )

    private val currentSession = AtomicLong(0)

    @Volatile
    private var shutdown = false

    /** Starts a fresh session and returns its token; outstanding results from
     * earlier sessions become stale and are dropped at delivery. */
    fun beginSession(): Long = currentSession.incrementAndGet()

    /** The token a submission must still carry at delivery time. */
    fun currentSession(): Long = currentSession.get()

    /** Submits a job for the given session. Returns false (and runs nothing)
     * when the session is already stale, the worker is shut down, or the
     * executor rejected the task. */
    fun <T> submit(session: Long, job: Callable<T>, handler: ResultHandler<T>): Boolean {
        if (shutdown)
            return false
        if (session != currentSession.get())
            return false
        return try {
            executor.execute {
                var failure: Throwable? = null
                var result: T? = null
                try {
                    result = job.call()
                } catch (t: Throwable) {
                    failure = t
                }
                trampoline.post { deliver(session, handler, result, failure) }
            }
            true
        } catch (rejected: RejectedExecutionException) {
            false
        }
    }

    private fun <T> deliver(session: Long, handler: ResultHandler<T>, result: T?, failure: Throwable?) {
        if (shutdown || session != currentSession.get())
            return
        if (failure != null)
            handler.onFailure(failure)
        else
            @Suppress("UNCHECKED_CAST")
            handler.onResult(result as T)
    }

    /** Stops the worker and invalidates every outstanding result. Called by the
     * owning screen when it is hidden or disposed. */
    fun shutdown() {
        if (shutdown)
            return
        shutdown = true
        currentSession.incrementAndGet()
        (executor as? ExecutorService)?.shutdownNow()
    }
}
