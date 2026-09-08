package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.content.ContentCatalog
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams

/** Non-component run foundation. Owner supplies a validated, version-pinned catalog. */
class RunSession(val seed: Long, val content: ContentCatalog, val random: RunRandomStreams = RunRandomStreams.seeded(seed))
