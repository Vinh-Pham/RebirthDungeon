package cloud.vinh.rebirthsaga.bootstrap;

import java.util.concurrent.Callable;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicLong;

/** Single-thread worker with session-tokened result handoff. Jobs run off the
 * render thread; every result returns through the supplied trampoline
 * ({@code Gdx.app::postRunnable} in production) and is delivered only while
 * its submitting session is still current, so a replaced screen or superseded
 * request can never observe a late callback. Jobs must return detached
 * plain-Java data: they never touch artemis entities, Scene2D actors, graphics
 * or audio (game-plan section 4). */
public final class SessionWorker {
    /** Delivers results onto the render thread; production uses
     * {@code Gdx.app::postRunnable}, tests use a direct queue. */
    public interface Trampoline {
        void post(Runnable runnable);
    }

    /** Receives one job outcome on the render thread. */
    public interface ResultHandler<T> {
        void onResult(T result);

        void onFailure(Throwable failure);
    }

    private final Executor executor;
    private final Trampoline trampoline;
    private final AtomicLong currentSession = new AtomicLong(0);
    private volatile boolean shutdown;

    /** Production constructor: a private single-thread daemon worker. */
    public SessionWorker(Trampoline trampoline) {
        this(Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "rebirth-worker");
            thread.setDaemon(true);
            return thread;
        }), trampoline);
    }

    /** Test constructor: any executor (synchronous executors keep tests deterministic). */
    public SessionWorker(Executor executor, Trampoline trampoline) {
        this.executor = executor;
        this.trampoline = trampoline;
    }

    /** Starts a fresh session and returns its token; outstanding results from
     * earlier sessions become stale and are dropped at delivery. */
    public long beginSession() {
        return currentSession.incrementAndGet();
    }

    /** The token a submission must still carry at delivery time. */
    public long currentSession() {
        return currentSession.get();
    }

    /** Submits a job for the given session. Returns false (and runs nothing)
     * when the session is already stale, the worker is shut down, or the
     * executor rejected the task. */
    public <T> boolean submit(long session, Callable<T> job, ResultHandler<T> handler) {
        if(shutdown || job == null || handler == null)
            return false;
        if(session != currentSession.get())
            return false;
        try {
            executor.execute(() -> {
                Throwable failure = null;
                T result = null;
                try {
                    result = job.call();
                } catch(Throwable t) {
                    failure = t;
                }
                final T deliveredResult = result;
                final Throwable deliveredFailure = failure;
                trampoline.post(() -> deliver(session, handler, deliveredResult, deliveredFailure));
            });
            return true;
        } catch(RejectedExecutionException rejected) {
            return false;
        }
    }

    private <T> void deliver(long session, ResultHandler<T> handler, T result, Throwable failure) {
        if(shutdown || session != currentSession.get())
            return;
        if(failure != null)
            handler.onFailure(failure);
        else
            handler.onResult(result);
    }

    /** Stops the worker and invalidates every outstanding result. Called by the
     * owning screen when it is hidden or disposed. */
    public void shutdown() {
        if(shutdown)
            return;
        shutdown = true;
        currentSession.incrementAndGet();
        if(executor instanceof java.util.concurrent.ExecutorService)
            ((java.util.concurrent.ExecutorService)executor).shutdownNow();
    }
}
