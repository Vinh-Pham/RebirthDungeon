package cloud.vinh.rebirthdungeon.application.session

import cloud.vinh.rebirthdungeon.application.persistence.CheckpointRepository
import cloud.vinh.rebirthdungeon.application.run.BattleController
import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.algorithms.RandomStream
import cloud.vinh.rebirthdungeon.game.combat.abilities.EncounterOutcome
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.exploration.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.game.replay.RunRandomStreams

/** All mutations and durable transitions run serially on the creating (render) thread. */
class SessionCoordinator(val catalog: ContentCatalog, val world: WorldContent, private val repository: SessionRepository,
    private val seed: Long, restored: SessionRestore? = null) {
    private val owner = Thread.currentThread()
    private var random = restored?.let { RunRandomStreams.restore(it.random) } ?: RunRandomStreams.seeded(seed)
    private var expedition = restored?.expedition ?: 0L
    var operation = restored?.operation ?: 0L; private set
    private var hero: CombatActorObservation? = restored?.hero
    var exploration: ExplorationSimulation; private set
    var battle: BattleController? = null; private set
    private var encounterId: String? = restored?.encounter
    var gold = restored?.gold ?: world.startingGold; private set
    private val supplies = sortedMapOf<ContentId, Int>(compareBy { it.value }).apply { putAll(restored?.supplies ?: world.offers.associate { it.potion to 0 }) }
    private var pendingGold = restored?.pendingGold ?: 0
    private val pendingSupplies = sortedMapOf<ContentId, Int>(compareBy { it.value }).apply { putAll(restored?.pendingSupplies ?: emptyMap()) }
    var notice = restored?.notice ?: "Welcome. Talk to Liora, visit the potion shop, or enter the dungeon."; private set
    var failure: String? = null; private set
    private var pendingSave = false
    private var closed = false
    val mode get() = if (battle == null) SessionMode.EXPLORATION else SessionMode.BATTLE
    val blocked get() = failure != null || pendingSave || battle?.failure != null || closed
    init {
        restored?.let { validate(it, catalog, world) }
        val area = if (restored == null) AreaBuilder.town(world) else AreaBuilder.build(world, restored.placements, restored.town)
        exploration = ExplorationSimulation(area, restored?.exploration)
        if (restored?.battle != null) installBattle(BattleSimulation.restore(restored.battle, catalog))
        else if (hero == null) {
            val temporary = BattleSimulation.create(BattleSession(seed, catalog, random))
            hero = temporary.combatObservation().actors.single(); temporary.dispose()
        }
    }
    private fun checkOwner() = check(Thread.currentThread() === owner && !closed)
    fun start() { checkOwner(); if (battle != null) battle!!.startOrResume() else persist() }
    fun count(id: ContentId) = supplies[id] ?: 0
    fun pendingReward() = pendingGold
    fun heroObservation() = battle?.combatObservation()?.actors?.single { it.id == EntityId(1) } ?: checkNotNull(hero)
    private fun installBattle(simulation: BattleSimulation) {
        battle = BattleController(simulation, object : CheckpointRepository {
            override fun load(): BattleRestore? = error("Session repository owns restore")
            override fun save(state: BattleRestore) {
                random = RunRandomStreams.restore(state.random)
                repository.save(export(state)); pendingSave = false; failure = null
            }
        }, operation + 1)
    }
    fun command(command: ExplorationCommand): Boolean {
        checkOwner(); if (blocked || battle != null) return false
        return exploration.submit(command).also { if (!it) notice = exploration.message ?: "Unavailable" else if (notice == "That destination is unreachable." || notice == "Unavailable") notice = "Click to run. Select an NPC or doorway to approach it." }
    }
    fun step() {
        checkOwner(); if (blocked || battle != null) return
        exploration.step()
        exploration.encounter?.let { enterBattle(it); return }
        if (exploration.tick % 120 == 0L) persist()
    }
    private fun enterBattle(obj: WorldObject) {
        val encounter = catalog.encounters.getValue(checkNotNull(obj.encounter))
        val enemy = catalog.actors.getValue(encounter.enemy)
        exploration.stop(); encounterId = obj.id; operation++
        val sim = BattleSimulation.create(BattleSession(seed, catalog, random, "expedition.$expedition.${obj.id}"),
            listOf(ActorState(EntityId(Math.addExact(operation, 2L)), enemy.id, false, enemy.resources.hp, enemy.resources.hp)), checkNotNull(hero))
        hero = null
        installBattle(sim); battle!!.startOrResume()
    }
    fun battleCommand(command: RunCommand, token: Long, revision: Long): Boolean {
        checkOwner(); val controller = battle ?: return false
        if (blocked) return false
        if (command is DrinkPotionCommand && count(command.potion) <= 0) { notice = "No potion available"; return false }
        // Supply consumption participates in the first accepted-action checkpoint.
        if (command is DrinkPotionCommand) supplies[command.potion] = count(command.potion) - 1
        val result = controller.submit(command, token, revision)
        if (!result.accepted() && command is DrinkPotionCommand) supplies[command.potion] = count(command.potion) + 1
        return result.accepted()
    }
    fun finishBattleIfReady() {
        checkOwner(); val controller = battle ?: return
        if (controller.failure != null || failure != null) return
        val outcome = controller.combatObservation()?.outcome ?: return
        val state = controller.restoreExport()
        hero = state.combat.actors.single { it.id == EntityId(1) }
        random = RunRandomStreams.restore(state.random)
        controller.close(); battle = null
        if (outcome == EncounterOutcome.VICTORY) {
            val obj = exploration.area.objects.single { it.id == encounterId }
            exploration.defeated(obj.id)
            pendingGold = Math.addExact(pendingGold, world.reward)
            val loot = catalog.loot.getValue(catalog.encounters.getValue(checkNotNull(obj.encounter)).loot)
            val draw = random[RandomStream.LOOT].nextInt(10000); var total = 0
            val entry = loot.entries.first { total += it.probability; draw < total }
            pendingSupplies[entry.potion] = Math.addExact(pendingSupplies[entry.potion] ?: 0, entry.quantity)
            notice = "Victory! Rewards pending: $pendingGold gold. Find the dungeon exit."
        } else {
            pendingGold = 0; pendingSupplies.clear(); exploration = ExplorationSimulation(AreaBuilder.town(world))
            notice = "Defeated. Pending rewards were lost. Visit the healing spring for free recovery."
        }
        encounterId = null; operation++; persist()
    }
    fun dismiss() { checkOwner(); exploration.dismiss() }
    private fun service(expected: Service): Boolean = !blocked && battle == null && exploration.reachedInteraction?.service == expected
    fun enterDungeon(expectedOperation: Long): Boolean {
        checkOwner()
        if (!service(Service.DUNGEON) || expectedOperation != operation) return false
        if (heroObservation().current.hp == 0) { notice = "Visit the healing spring first."; return false }
        val generation = RunRandomStreams.restore(random.capture())
        val area = try { AreaBuilder.dungeon(world, generation[RandomStream.GENERATION]) }
        catch (e: Exception) { notice = e.message ?: "Generation failed"; return false }
        random = generation; expedition++; pendingGold = 0; pendingSupplies.clear()
        exploration = ExplorationSimulation(area); operation++; notice = "Discover rooms, defeat the sentinels, and find the exit."; return persist()
    }
    fun exitDungeon(expectedOperation: Long): Boolean {
        checkOwner()
        if (!service(Service.EXIT) || expectedOperation != operation) return false
        if (!exploration.allDefeated()) { notice = "Defeat all sentinels before exiting."; return false }
        if (world.offers.any { count(it.potion) + (pendingSupplies[it.potion] ?: 0) > it.capacity }) {
            notice = "Potion supplies are full. Use carried potions before claiming dungeon rewards."; return false
        }
        gold = Math.addExact(gold, pendingGold)
        pendingSupplies.forEach { (id, count) -> supplies[id] = count(id) + count }
        pendingGold = 0; pendingSupplies.clear(); exploration = ExplorationSimulation(AreaBuilder.town(world)); operation++
        notice = "Expedition complete. Rewards secured."; return persist()
    }
    fun buy(id: ContentId, expectedOperation: Long): Boolean {
        checkOwner(); if (!service(Service.SHOP) || expectedOperation != operation) return false
        val offer = world.offers.singleOrNull { it.potion == id } ?: return false
        if (gold < offer.price || count(id) >= offer.capacity) { notice = "Not enough gold or potion capacity."; return false }
        gold -= offer.price; supplies[id] = count(id) + 1; operation++; notice = "Purchased ${catalog.potions.getValue(id).name}."; return persist()
    }
    private fun editHero(action: (BattleSimulation) -> Unit) {
        val sim = BattleSimulation.create(BattleSession(seed, catalog, random), hero = checkNotNull(hero))
        try { action(sim); hero = sim.combatObservation().actors.single() } finally { sim.dispose() }
    }
    fun recover(expectedOperation: Long): Boolean {
        checkOwner(); if (!service(Service.RECOVER) || expectedOperation != operation) return false
        editHero { it.recoverHero() }; operation++; notice = "Fully recovered. No charge."; return persist()
    }
    fun drink(id: ContentId, expectedOperation: Long): Boolean {
        checkOwner(); if (blocked || battle != null || expectedOperation != operation || count(id) <= 0 || heroObservation().current.hp == 0) return false
        exploration.stop(); editHero { it.potion(id) }; supplies[id] = count(id) - 1; operation++; return persist()
    }
    fun checkpoint(): Boolean { checkOwner(); exploration.stop(); return if (battle != null) battle!!.checkpoint() else persist() }
    private fun persist(): Boolean {
        pendingSave = true
        return try { repository.save(export()); pendingSave = false; failure = null; true }
        catch (e: Exception) { failure = e.message ?: "Save failed"; false }
    }
    fun retrySave(): Boolean {
        checkOwner()
        val result = battle?.retrySave() ?: persist()
        if (result) { failure = null; finishBattleIfReady() }
        return result
    }
    fun export(overrideBattle: BattleRestore? = null): SessionRestore {
        val b = overrideBattle ?: battle?.restoreExport()
        return SessionRestore(catalog.version, world.version, seed, expedition, operation, exploration.area.town, exploration.area.placements,
            exploration.restoreExport(), gold, supplies, pendingGold, pendingSupplies, if (b == null) hero else null, b, encounterId,
            b?.random ?: random.capture(), notice)
    }
    fun close() { if (!closed) { checkpoint(); battle?.close(); closed = true } }
    companion object {
        fun validate(s: SessionRestore, catalog: ContentCatalog, world: WorldContent) {
            require(s.version == catalog.version && s.worldVersion == world.version && s.expedition >= 0 && s.operation >= 0 && s.gold >= 0 && s.pendingGold >= 0)
            require((s.hero == null) == (s.battle != null) && (s.encounter == null) == (s.battle == null))
            require(s.supplies.keys == world.offers.map { it.potion }.toSet())
            require(world.offers.all { (s.supplies[it.potion] ?: -1) in 0..it.capacity })
            require(s.pendingSupplies.all { it.key in world.offers.map { offer -> offer.potion } && it.value in 0..999 })
            require(!s.town || s.pendingGold == 0 && s.pendingSupplies.isEmpty())
            val area = AreaBuilder.build(world, s.placements, s.town); ExplorationSimulation(area, s.exploration)
            RunRandomStreams.restore(s.random)
            if (s.battle != null) {
                require(!s.town && area.objects.any { it.id == s.encounter && it.service == Service.ENEMY && it.id !in s.exploration.defeated })
                BattleSimulation.validateRestore(s.battle, catalog)
                require(s.battle.random == s.random)
            } else {
                val h = checkNotNull(s.hero); require(h.id == EntityId(1) && !h.open && h.locked == null && h.reserved == ResourceVector(0, 0, 0))
                val sim = BattleSimulation.create(BattleSession(s.seed, catalog), hero = h)
                try { val export = sim.restoreExport(); BattleSimulation.validateRestore(export, catalog) } finally { sim.dispose() }
            }
        }
    }
}
