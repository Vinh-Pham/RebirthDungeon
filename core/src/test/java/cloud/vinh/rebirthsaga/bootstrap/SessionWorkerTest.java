package cloud.vinh.rebirthsaga.bootstrap;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayDeque;
import java.util.Queue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

/** Proves the worker handoff contract: results reach the handler only through
 * the trampoline (the postRunnable seam), only for the still-current session,
 * and never after shutdown. Uses a same-thread executor and a manual
 * trampoline queue so the ordering is deterministic. Plain JVM test; no
 * Gdx.app, no OpenGL. */
public class SessionWorkerTest {

    /** Records posted deliveries; the test drains it like the render thread. */
    private static final class ManualTrampoline implements SessionWorker.Trampoline {
        final Queue<Runnable> queue = new ArrayDeque<>();

        @Override
        public void post(Runnable runnable) {
            queue.add(runnable);
        }

        void drain() {
            while(!queue.isEmpty())
                queue.poll().run();
        }
    }

    private static final class RecordingHandler implements SessionWorker.ResultHandler<String> {
        final AtomicReference<String> result = new AtomicReference<>();
        final AtomicReference<Throwable> failure = new AtomicReference<>();
        final AtomicInteger results = new AtomicInteger();
        final AtomicInteger failures = new AtomicInteger();

        @Override
        public void onResult(String value) {
            result.set(value);
            results.incrementAndGet();
        }

        @Override
        public void onFailure(Throwable error) {
            failure.set(error);
            failures.incrementAndGet();
        }
    }

    @Test
    public void resultIsDeliveredOnlyThroughTrampolineForCurrentSession() {
        ManualTrampoline trampoline = new ManualTrampoline();
        SessionWorker worker = new SessionWorker(Runnable::run, trampoline);
        long session = worker.beginSession();
        RecordingHandler handler = new RecordingHandler();

        assertTrue(worker.submit(session, () -> "floor", handler));
        assertEquals("job finished but nothing delivered before the trampoline drains",
                0, handler.results.get());

        trampoline.drain();
        assertEquals(1, handler.results.get());
        assertEquals("floor", handler.result.get());
        assertEquals(0, handler.failures.get());
    }

    @Test
    public void staleSessionResultIsRejectedAtDelivery() {
        ManualTrampoline trampoline = new ManualTrampoline();
        SessionWorker worker = new SessionWorker(Runnable::run, trampoline);
        long session = worker.beginSession();
        RecordingHandler handler = new RecordingHandler();
        assertTrue(worker.submit(session, () -> "late floor", handler));

        // The screen is replaced: a new session begins before the old result
        // gets its turn on the render thread.
        long next = worker.beginSession();
        assertTrue(next != session);

        trampoline.drain();
        assertEquals(0, handler.results.get());
        assertEquals(0, handler.failures.get());
    }

    @Test
    public void submissionWithAlreadyStaleTokenIsRefused() {
        ManualTrampoline trampoline = new ManualTrampoline();
        SessionWorker worker = new SessionWorker(Runnable::run, trampoline);
        long stale = worker.beginSession();
        worker.beginSession();
        RecordingHandler handler = new RecordingHandler();

        assertFalse(worker.submit(stale, () -> "ignored", handler));
        trampoline.drain();
        assertEquals(0, handler.results.get());
    }

    @Test
    public void jobFailureIsReportedOnTheTrampoline() {
        ManualTrampoline trampoline = new ManualTrampoline();
        SessionWorker worker = new SessionWorker(Runnable::run, trampoline);
        long session = worker.beginSession();
        RecordingHandler handler = new RecordingHandler();

        assertTrue(worker.submit(session, () -> {
            throw new IllegalStateException("generation exploded");
        }, handler));

        trampoline.drain();
        assertEquals(1, handler.failures.get());
        assertEquals("generation exploded", handler.failure.get().getMessage());
        assertEquals(0, handler.results.get());
    }

    @Test
    public void shutdownRejectsNewWorkAndOutstandingDeliveries() {
        ManualTrampoline trampoline = new ManualTrampoline();
        SessionWorker worker = new SessionWorker(Runnable::run, trampoline);
        long session = worker.beginSession();
        RecordingHandler handler = new RecordingHandler();
        assertTrue(worker.submit(session, () -> "too late", handler));

        worker.shutdown();

        RecordingHandler second = new RecordingHandler();
        assertFalse(worker.submit(worker.beginSession(), () -> "nope", second));
        trampoline.drain();
        assertEquals(0, handler.results.get());
        assertEquals(0, second.results.get());
        assertNull(second.result.get());
    }
}
