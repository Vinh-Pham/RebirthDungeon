package cloud.vinh.rebirthdungeon.data.content

import cloud.vinh.rebirthdungeon.data.content.dto.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.ContentId
import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.MapperFeature
import com.fasterxml.jackson.databind.json.JsonMapper

/** Load order is manifest -> rules -> visuals. Publish only after all validation succeeds. */
class JacksonContentRepository(private val source: ContentSource) : ContentRepository {
    private val mapper = JsonMapper.builder()
        .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
        .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .enable(DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
        .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
        .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS)
        .build()

    private fun fail(path: String, message: String): Nothing = throw ContentException("$path: $message")
    private fun checkAt(condition: Boolean, path: String, message: String) {
        if (!condition) fail(path, message)
    }
    private fun <T : Any> required(value: T?, path: String): T = value ?: fail(path, "required field is missing")
    private fun text(value: String?, path: String): String = required(value, path).also {
        checkAt(it.isNotBlank(), path, "must not be blank")
    }
    private fun number(value: Int?, path: String, min: Int = 0, max: Int = 1_000_000): Int = required(value, path).also {
        checkAt(it in min..max, path, "must be in $min..$max")
    }
    private fun id(value: String?, path: String): ContentId = try {
        ContentId(text(value, path))
    } catch (error: IllegalArgumentException) { fail(path, error.message ?: "invalid ID") }
    private fun <T : Any> rows(values: List<T>?, path: String): List<T> = required(values, path).also {
        checkAt(it.isNotEmpty(), path, "must not be empty")
    }
    private fun resources(value: ResourcesDto?, path: String): ResourceVector {
        val d = required(value, path)
        return ResourceVector(number(d.hp, "$path.hp"), number(d.mp, "$path.mp"), number(d.sp, "$path.sp"))
    }
    private fun path(value: String?, field: String): String = text(value, field).also {
        checkAt(it.matches(Regex("[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*[.]json")), field, "expected relative JSON path without traversal")
    }
    private fun rejectNulls(node: JsonNode, path: String) {
        if (node.isNull) fail(path, "explicit null is not allowed; omit optional fields")
        if (node.isObject) node.fields().forEachRemaining { rejectNulls(it.value, "$path.${it.key}") }
        if (node.isArray) node.forEachIndexed { index, child -> rejectNulls(child, "$path[$index]") }
    }
    private fun <T> read(path: String, type: Class<T>): T = try {
        val tree = mapper.readTree(source.read(path)) ?: fail(path, "empty document")
        rejectNulls(tree, path)
        mapper.treeToValue(tree, type)
    } catch (error: ContentException) { throw error
    } catch (error: Exception) { throw ContentException("$path: ${error.message}", error) }

    override fun load(): ContentBundle {
        val manifest = read("manifest.json", ManifestDto::class.java)
        val version = ContentVersion(
            number(manifest.schemaVersion, "manifest.json.schemaVersion", 1, 1),
            number(manifest.contentVersion, "manifest.json.contentVersion", 1),
            number(manifest.rulesVersion, "manifest.json.rulesVersion", 1, 1)
        )
        val file = path(manifest.rules, "manifest.json.rules")
        val d = read(file, CatalogDto::class.java)
        number(d.schemaVersion, "$file.schemaVersion", 1, 1)
        // Global uniqueness prevents references from accidentally changing category.
        val seen = HashSet<ContentId>()
        fun unique(raw: String?, p: String): ContentId = id(raw, "$p.id").also {
            checkAt(seen.add(it), "$p.id", "duplicate ID ${it.value}")
        }
        fun <T : Any, R> convert(values: List<T>?, category: String, build: (T, String) -> R): List<R> =
            rows(values, "$file.$category").mapIndexed { i, row -> build(row, "$file.$category[$i]") }
        val tiles = convert(d.tiles, "tiles") { t, p ->
            TileDefinition(unique(t.id, p), number(t.code, "$p.code", 0, 3), required(t.walkable, "$p.walkable"))
        }
        checkAt(tiles.map { it.code }.toSet() == setOf(0, 1, 2, 3) && tiles.size == 4, "$file.tiles", "prototype requires unique floor/wall/door/exit codes 0..3")
        listOf("wall", "floor", "door", "exit").forEachIndexed { code, name ->
            val tile = tiles.single { it.code == code }
            checkAt(tile.id == ContentId("tile.$name") && tile.walkable == (code != 0), "$file.tiles[${tile.id.value}]",
                "prototype terrain codes and walkability must match wall=0, floor=1, door=2, exit=3")
        }
        val generations = convert(d.generations, "generations") { g, p -> GenerationProfile(
            unique(g.id, p), number(g.generatorVersion, "$p.generatorVersion", 1, 1),
            number(g.width, "$p.width", 8, 256), number(g.height, "$p.height", 8, 256), number(g.maxAttempts, "$p.maxAttempts", 1, 100)
        ) }
        val stats = convert(d.stats, "stats") { s, p ->
            val min = number(s.minimum, "$p.minimum")
            val max = number(s.maximum, "$p.maximum", min)
            StatDefinition(unique(s.id, p), required(s.stage, "$p.stage"), number(s.base, "$p.base", min, max), min, max,
                required(s.terms, "$p.terms").mapIndexed { i, t -> StatTerm(id(t.stat, "$p.terms[$i].stat"),
                    number(t.numerator, "$p.terms[$i].numerator"), number(t.denominator, "$p.terms[$i].denominator", 1)) })
        }
        val scoring = convert(d.scoring, "scoring") { s, p ->
            val multipliers = rows(s.multipliers, "$p.multipliers").mapIndexed { i, m ->
                required(m.combination, "$p.multipliers[$i].combination") to StatRatio(
                    number(m.numerator, "$p.multipliers[$i].numerator", 1), number(m.denominator, "$p.multipliers[$i].denominator", 1))
            }
            checkAt(multipliers.size == 8 && multipliers.map { it.first }.toSet() == Combination.entries.toSet(), "$p.multipliers", "each of the eight combinations must occur exactly once")
            DiceScoring(unique(s.id, p), number(s.diceCount, "$p.diceCount", 5, 5), number(s.rerolls, "$p.rerolls", 2, 2), multipliers.toMap())
        }
        val skills = convert(d.skills, "skills") { s, p ->
            val ranks = rows(s.ranks, "$p.ranks").mapIndexed { i, r ->
                val rp = "$p.ranks[$i]"
                val weights = required(r.weights, "$rp.weights")
                checkAt(weights.size == 6 && weights.all { it >= 0 } && weights.sumOf { it.toLong() } in 1..Int.MAX_VALUE.toLong(), "$rp.weights", "expected six nonnegative weights with positive total <= Int.MAX_VALUE")
                val cost = resources(r.cost, "$rp.cost")
                checkAt(cost.hp + cost.mp + cost.sp > 0, "$rp.cost", "active skills require a positive HP/MP/SP cost")
                SkillRank(text(r.rank, "$rp.rank"), number(r.order, "$rp.order", i, i), number(r.basePower, "$rp.basePower"),
                    number(r.pipScale, "$rp.pipScale"), cost, weights)
            }
            checkAt(ranks.map { it.rank }.distinct().size == ranks.size, "$p.ranks", "duplicate rank")
            val cap = text(s.prototypeCap, "$p.prototypeCap")
            checkAt(cap == ranks.last().rank, "$p.prototypeCap", "must equal last authored rank")
            SkillDefinition(unique(s.id, p), text(s.name, "$p.name"), cap, id(s.scoring, "$p.scoring"), id(s.attackStat, "$p.attackStat"), ranks)
        }
        val actors = convert(d.actors, "actors") { a, p ->
            val pools = resources(a.resources, "$p.resources")
            checkAt(pools.hp > 0, "$p.resources.hp", "living actor requires positive HP")
            val baseline = required(a.stats, "$p.stats").map { (key, value) -> id(key, "$p.stats.$key") to number(value, "$p.stats.$key") }.toMap()
            ActorDefinition(unique(a.id, p), required(a.kind, "$p.kind"), pools, id(a.skill, "$p.skill"), text(a.rank, "$p.rank"), baseline)
        }
        checkAt(actors.any { it.kind == ActorKind.HERO } && actors.any { it.kind == ActorKind.ENEMY }, "$file.actors", "requires hero and enemy")
        val statuses = convert(d.statuses, "statuses") { s, p -> StatusDefinition(unique(s.id, p), id(s.stat, "$p.stat"),
            number(s.flat, "$p.flat", -1_000_000), number(s.duration, "$p.duration", 1, 1000), id(s.group, "$p.group"),
            number(s.priority, "$p.priority"), required(s.timing, "$p.timing")) }
        val potions = convert(d.potions, "potions") { s, p ->
            val recovery = resources(s.recovery, "$p.recovery")
            checkAt(recovery.hp + recovery.mp + recovery.sp > 0 || s.status != null, p, "potion must have an effect")
            PotionDefinition(unique(s.id, p), text(s.name, "$p.name"), recovery, s.status?.let { id(it, "$p.status") })
        }
        val encounters = convert(d.encounters, "encounters") { e, p -> EncounterDefinition(unique(e.id, p), id(e.enemy, "$p.enemy"), id(e.loot, "$p.loot")) }
        val loot = convert(d.loot, "loot") { l, p ->
            val entries = rows(l.entries, "$p.entries").mapIndexed { i, e -> LootEntry(id(e.potion, "$p.entries[$i].potion"),
                number(e.probability, "$p.entries[$i].probability", 0, 10000), number(e.quantity, "$p.entries[$i].quantity", 1, 999)) }
            checkAt(entries.sumOf { it.probability.toLong() } == 10000L, "$p.entries", "probabilities must total 10000 basis points")
            LootDefinition(unique(l.id, p), entries)
        }
        val progression = convert(d.progression, "progression") { c, p ->
            val thresholds = rows(c.thresholds, "$p.thresholds")
            checkAt(thresholds.size >= 2 && thresholds.first() == 0 && thresholds.all { it >= 0 } &&
                thresholds.zipWithNext().all { (a, b) -> a < b }, "$p.thresholds", "cumulative XP must start at zero and strictly increase (at least two levels)")
            ProgressionCurve(unique(c.id, p), thresholds)
        }
        val catalog = ContentCatalog(version, tiles, generations, actors, scoring, skills, stats, statuses, potions, encounters, loot, progression)
        validateReferences(catalog, file)
        checkAt(ContentId("generation.starter") in catalog.generations, "$file.generations", "missing prototype entry profile generation.starter")
        checkAt(catalog.actors[ContentId("actor.hero")]?.kind == ActorKind.HERO, "$file.actors", "missing prototype hero actor.hero")
        val visualFile = path(manifest.visuals, "manifest.json.visuals")
        val visual = read(visualFile, VisualsDto::class.java)
        number(visual.schemaVersion, "$visualFile.schemaVersion", 1, 1)
        val visualIds = HashSet<ContentId>()
        val visuals = rows(visual.bindings, "$visualFile.bindings").mapIndexed { i, v ->
            val p = "$visualFile.bindings[$i]"
            val key = id(v.id, "$p.id")
            checkAt(seen.contains(key) && visualIds.add(key), "$p.id", "unknown or duplicate definition ${key.value}")
            val atlas = text(v.atlas, "$p.atlas")
            checkAt(atlas == "atlases/dungeon.atlas", "$p.atlas", "atlas is not queued by the prototype bootstrap")
            val frames = rows(v.frames, "$p.frames").mapIndexed { n, frame -> text(frame, "$p.frames[$n]") }
            val animation = text(v.animation, "$p.animation")
            val expected = if (key in catalog.tiles) "static" else "idle"
            checkAt(animation == expected, "$p.animation", "expected supported animation $expected")
            if (key in catalog.tiles) checkAt(frames.size == 1, "$p.frames", "static terrain requires exactly one frame")
            VisualBinding(key, atlas, animation, frames)
        }
        val requiredVisuals = tiles.map { it.id } + actors.map { it.id }
        checkAt(visualIds.containsAll(requiredVisuals), "$visualFile.bindings", "missing tile/actor bindings: ${requiredVisuals.filterNot { it in visualIds }}")
        return ContentBundle(catalog, visuals)
    }

    private fun validateReferences(c: ContentCatalog, file: String) {
        fun ref(id: ContentId, keys: Set<ContentId>, p: String) = checkAt(id in keys, "$file.$p", "unknown reference ${id.value}")
        c.skills.values.forEach { s ->
            ref(s.scoring, c.scoring.keys, "skills[${s.id.value}].scoring")
            ref(s.attackStat, c.stats.keys, "skills[${s.id.value}].attackStat")
        }
        c.actors.values.forEach { a ->
            val p = "actors[${a.id.value}]"
            ref(a.skill, c.skills.keys, "$p.skill")
            checkAt(c.skills.getValue(a.skill).ranks.any { it.rank == a.rank }, "$file.$p.rank", "unknown skill rank ${a.rank}")
            a.stats.forEach { (id, value) ->
                ref(id, c.stats.keys, "$p.stats")
                val stat = c.stats.getValue(id)
                checkAt(stat.stage == StatStage.PRIMARY && value in stat.minimum..stat.maximum, "$file.$p.stats.${id.value}", "baseline must be a primary stat within bounds")
            }
        }
        c.statuses.values.forEach { ref(it.stat, c.stats.keys, "statuses[${it.id.value}].stat") }
        c.potions.values.forEach { p -> p.status?.let { ref(it, c.statuses.keys, "potions[${p.id.value}].status") } }
        c.encounters.values.forEach {
            ref(it.enemy, c.actors.keys, "encounters[${it.id.value}].enemy")
            checkAt(c.actors.getValue(it.enemy).kind == ActorKind.ENEMY, "$file.encounters[${it.id.value}].enemy", "must reference an enemy")
            ref(it.loot, c.loot.keys, "encounters[${it.id.value}].loot")
        }
        c.loot.values.forEach { l -> l.entries.forEach { ref(it.potion, c.potions.keys, "loot[${l.id.value}].entries.potion") } }
        val visiting = HashSet<ContentId>()
        val done = HashSet<ContentId>()
        fun visit(id: ContentId) {
            if (id in done) return
            checkAt(visiting.add(id), "$file.stats[${id.value}].terms", "cyclic stat derivation")
            val s = c.stats.getValue(id)
            checkAt(s.stage != StatStage.PRIMARY || s.terms.isEmpty(), "$file.stats[${id.value}].terms", "primary stat cannot derive from other stats")
            checkAt(s.terms.map { it.stat }.distinct().size == s.terms.size, "$file.stats[${id.value}].terms", "duplicate stat contribution")
            s.terms.forEach { ref(it.stat, c.stats.keys, "stats[${id.value}].terms"); visit(it.stat) }
            visiting.remove(id)
            done.add(id)
        }
        c.stats.keys.forEach { visit(it) }
    }
}
