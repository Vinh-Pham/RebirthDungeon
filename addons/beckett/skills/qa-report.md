# QA reports - turn a failed playtest into one artifact a human can act on

> `playtest op=run name=<n> report=true` returns `result.report` and writes `res://tests/playtests/<n>.report.json`. It is the difference between "the suite went red" and "here is what broke, what the engine said, what the screen looked like, and the exact call that reproduces it". Read `playtest` first for the suites themselves; this pack is only about the report. Beckett **1.14+**, Full-only.

## Version note
- Server runs **4.6.2**; the 4.2+ engine floor holds. One caveat with teeth: the `errors` section reads the RUNNING game's log buffer, which needs `OS.add_logger` (**Godot 4.5+**). On 4.2-4.4 the report says capture is unavailable rather than pretending the game logged nothing - if you see that note, read `logs_read` (the file log) before concluding the run was clean.
- The `frame` section needs an RHI. A headless run produces a report with every other section and no picture.

## When to ask for one
Turn `report=true` on when the run is going to be READ BY SOMEONE ELSE - a teammate, an issue tracker, a CI artifact, or your own future self after a context reset. For a tight edit-run-edit loop you are watching live, leave it off: a passing report still costs a file write, and the point of the artifact is transport, not observation.

## What is in it

| Section | Always? | What it answers |
|---|---|---|
| `verdict`, `suite`, `when`, `engine`, `beckett` | yes | which suite, which build, when; `verdict` is `pass`, `fail`, or `blocked` (1.16: the run could not judge something, nothing failed) |
| `totals` | yes | `{passed, failed, blocked, skipped}` |
| `failures` | yes (empty on a pass) | everything that kept the suite from passing: the asserts, invariants and steps that failed or were blocked, each with its own `status`, the assert as written, and its expected vs actual |
| `repro` | yes | `scene`, `suite_file`, the replay `mode`, and `rerun` - the literal call sequence |
| `errors` | when the game logged any | the game's OWN errors during the run, with stack traces |
| `perf`, `perf_delta` | when the run measured | the window's stats, and the per-metric diff against the suite baseline |
| `frame` | **only when the run did not pass** (fail or blocked) | `capture://` uri + the absolute path of the frozen, Set-of-Mark-annotated frame |
| `written_to` | yes | where the report landed, or why it could not be written |

## Reading one: which section answers which failure class

**`verdict: "blocked"`.** Nothing failed; the run could not get to a judgement, so there is no game bug in the report yet. The blocked entries in `failures` (`status: "blocked"`) say why: a node the assert reads was missing, the game connection dropped, a `wait` timed out before the assert behind it could run, a per-frame invariant never evaluated, the game was paused in the editor's debugger (a script error or a breakpoint: `get_play_state` shows `debugger_break`, and the entry says what to do). Fix the suite or the setup first, then rerun. Do not file a bug from a blocked report.

**A rule broke in the middle of the run.** An entry with `type: "invariant"` carries `first_violation.frame` (the replay's own physics frame, the numbering of the events' `f` stamps), the expression, and the values it read. The frame tells you which recorded input to look at: find the events stamped near that `f` in the suite file (`playtest op=show`).

**An assert failed and you do not know why yet.** Start at `errors`. A `node_state` assert that reads `<null>` when you expected a number is almost always a game-side error that already fired - a null dereference in `_ready`, a missing resource, a signal that never connected. The stack trace names the line. Only when `errors` is empty is the assert itself the interesting thing.

**The assert failed but the game looks fine.** Read `failures[].actual` against `failures[].expected` literally. The commonest real cause is a settle problem, not a logic problem: the value was right one frame later. Raise `settle_frames` on `op=save`, or convert the assert to a `ui_do` `assert` step, which polls until true instead of sampling once.

**A perf assert failed.** Look at `perf_baseline_comparable` next to `perf_delta` first: `false` (the baseline came from another GPU, renderer, window size, engine or recording, or was timed by another clock, `perf_clock`; `perf_baseline_mismatch` names which) means the delta says nothing about your change. Otherwise `perf_delta` is the whole answer and `perf` is the noise: a metric that moved 3% is measurement, one that moved 40% is a change you made. If there is no `perf_delta`, the suite has no baseline yet - rerun once with `save_baseline=true` and you get the diff from then on. Remember frame/fps/draw metrics are meaningless headless, and the report says so rather than passing vacuously.

**A UI assert failed and you want to SEE it.** `frame.uri` is a `capture://` resource. Read it with the MCP client's own resource read, or open `frame.path` directly - it is an absolute path on disk. The capture is annotated, so the numbered boxes tell you what was clickable at the moment of failure, which is usually the fastest route to "the modal was still up".

## Turning a report into a bug report

The report is already the body. What a human needs added is intent:

1. **Title** = the failing assert in plain words, not the assert JSON. "Health does not decrease when the player takes contact damage", not `node_state Player.health equals 2`.
2. **Steps** = `repro.rerun` verbatim, then `repro.suite_file` so the reader can see the recorded run.
3. **Evidence** = the `failures` entry, the `errors` entries if any, and `frame.path` attached as an image.
4. **Environment** = `engine` + `beckett` + `verdict.when`, which the report already stamped.
5. **What you already ruled out.** This is the part only you can write, and it is the part that saves the next person an hour.

Do NOT paste the whole JSON into an issue. It carries `perf` series and full assert records that read as noise to anyone who did not run it; link the file instead.

## Honest limits
- The report describes ONE run. A flaky failure needs several - run `playtest op=repeat` (1.16: n runs from a restarted scene, with `pass_all`, the flaky steps ranked and the first divergence named) before filing anything. `op=repeat` does not write a report; report the one failing run with `op=run report=true`.
- `errors` is capped at the newest 20 entries. A game spewing per-frame errors will show you the tail, not the first one; clear the buffer with `game_logs clear=true` before the run when you need the origin.
- The frame is captured AFTER the run froze, so it shows the settled end state, not the instant of the failure. For the moment itself, record with `events` and step to the failing frame with `time_control op=step`.
- **An assert whose own expression errors shows a backtrace through Beckett, not your game.** `errors` reads the game process's log buffer, and an `expr` assert is evaluated inside Beckett's runtime autoload - so `{"type":"expr","condition":"get_node('Typo').x > 0"}` files an error whose top frame is `mcp_runtime.gd`. That is honest (the error really did happen in that process) but it is not a bug in Beckett: read the message, not the frame. A backtrace that starts in YOUR script is the interesting kind.
- The capture store keeps the newest 20 captures. A `capture://` uri from an old report will be gone; `frame.path` points at the same file and is equally mortal. Copy anything you intend to attach to a long-lived issue.
