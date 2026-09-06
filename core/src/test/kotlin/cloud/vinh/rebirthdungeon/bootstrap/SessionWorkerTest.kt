package cloud.vinh.rebirthdungeon.bootstrap

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.ArrayDeque
import java.util.Queue
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference

/** Proves the worker handoff contract: results reach the handler only through
 * the trampoline (the postRunnable seam), only for the still-current session,
 * and never after shutdown. Uses a same-thread executor and a manual
 * trampoline queue so the ordering is deterministic. Plain JVM test; no
 * Gdx.app, no OpenGL. */
class SessionWorkerTest {

    /** Records posted deliveries; the test drains it like the render thread. */
    private class ManualTrampoline : SessionWorker.Trampoline {
        val queue: Queue<Runnable> = ArrayDeque()

        override fun post(runnable: Runnable) {
            queue.add(runnable)
        }

        fun drain() {
            while (!queue.isEmpty())
                queue.poll().run()
        }
    }

    private class RecordingHandler : SessionWorker.ResultHandler<String> {
        val result = AtomicReference<String>()
        val failure = AtomicReference<Throwable>()
        val results = AtomicInteger()
        val failures = AtomicInteger()

        override fun onResult(value: String) {
            result.set(value)
            results.incrementAndGet()
        }

        override fun onFailure(error: Throwable) {
            failure.set(error)
            failures.incrementAndGet()
        }
    }

    @Test
    fun resultIsDeliveredOnlyThroughTrampolineForCurrentSession() {
        val trampoline = ManualTrampoline()
        val worker = SessionWorker(Runnable::run, trampoline)
        val session = worker.beginSession()
        val handler = RecordingHandler()

        assertTrue(worker.submit(session, { "floor" }, handler))
        assertEquals("job finished but nothing delivered before the trampoline drains", 0, handler.results.get())

        trampoline.drain()
        assertEquals(1, handler.results.get())
        assertEquals("floor", handler.result.get())
        assertEquals(0, handler.failures.get())
    }

    @Test
    fun staleSessionResultIsRejectedAtDelivery() {
        val trampoline = ManualTrampoline()
        val worker = SessionWorker(Runnable::run, trampoline)
        val session = worker.beginSession()
        val handler = RecordingHandler()
        assertTrue(worker.submit(session, { "late floor" }, handler))

        // The screen is replaced: a new session begins before the old result
        // gets its turn on the render thread.
        val next = worker.beginSession()
        assertTrue(next != session)

        trampoline.drain()
        assertEquals(0, handler.results.get())
        assertEquals(0, handler.failures.get())
    }

    @Test
    fun submissionWithAlreadyStaleTokenIsRefused() {
        val trampoline = ManualTrampoline()
        val worker = SessionWorker(Runnable::run, trampoline)
        val stale = worker.beginSession()
        worker.beginSession()
        val handler = RecordingHandler()

        assertFalse(worker.submit(stale, { "ignored" }, handler))
        trampoline.drain()
        assertEquals(0, handler.results.get())
    }

    @Test
    fun jobFailureIsReportedOnTheTrampoline() {
        val trampoline = ManualTrampoline()
        val worker = SessionWorker(Runnable::run, trampoline)
        val session = worker.beginSession()
        val handler = RecordingHandler()

        assertTrue(worker.submit(session, {
            throw IllegalStateException("generation exploded")
        }, handler))

        trampoline.drain()
        assertEquals(1, handler.failures.get())
        assertEquals("generation exploded", handler.failure.get().message)
        assertEquals(0, handler.results.get())
    }

    @Test
    fun shutdownRejectsNewWorkAndOutstandingDeliveries() {
        val trampoline = ManualTrampoline()
        val worker = SessionWorker(Runnable::run, trampoline)
        val session = worker.beginSession()
        val handler = RecordingHandler()
        assertTrue(worker.submit(session, { "too late" }, handler))

        worker.shutdown()

        val second = RecordingHandler()
        assertFalse(worker.submit(worker.beginSession(), { "nope" }, second))
        trampoline.drain()
        assertEquals(0, handler.results.get())
        assertEquals(0, second.results.get())
        assertNull(second.result.get())
    }
}
