package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import com.artemis.Component

internal class CombatRuntime(private val run: BattleWorld) {
    private val session get() = run.session
    private val content get() = session.content
    private val pending get() = run.pending
    private inline fun <reified T : Component> get(id: EntityId): T = run.world.getMapper(T::class.java).get(run.entity(id))
    private fun emit(event: DomainEvent) = run.emit(event, true)
    private fun value(id: EntityId, stat: String) = get<Stats>(id).effective.getValue(ContentId("stat.$stat"))
    private fun live(id: EntityId) = id.value in run.entities && get<Health>(id).current > 0
    private var queued: ResolvedAbility? = null
    fun install(id: EntityId) {
        val entity = run.world.getEntity(run.entity(id))
        val actor = content.actors.getValue(run.actor(id).definition)
        entity.edit().create(TurnMemory::class.java).items = actor.items
        entity.edit().create(StatusSet::class.java); entity.edit().create(Shield::class.java); entity.edit().create(Cooldowns::class.java)
        val defaults = (if (run.isPlayer(id)) listOf("normal", "defend", "sword", "fortify", "focus", "spark", "blood")
            else listOf("normal", "defend", actor.skill.value.removePrefix("skill."))).map { ContentId("skill.$it") }.associateWith {
                if (it == actor.skill) actor.rank else content.skills.getValue(it).ranks.first().rank
            }
        val loadout = if (run.isPlayer(id)) session.combatLoadout ?: CombatLoadout(defaults, setOf("sword")) else CombatLoadout(defaults, emptySet())
        require(loadout.learned.all { (skill, rank) -> content.skills[skill]?.ranks?.any { it.rank == rank } == true })
        StaminaRules.index(loadout.masteryRank)
        entity.edit().create(AbilityLoadout::class.java).apply { learned = loadout.learned; equipment = loadout.equipment }
        get<TurnMemory>(id).masteryRank = loadout.masteryRank
        entity.edit().create(Stats::class.java).apply {
            baseline = frozenMap(actor.stats + (ContentId("stat.max_hp") to
                (content.stats.getValue(ContentId("stat.max_hp")).base + get<Health>(id).maximum - StatRules.resolve(content.stats, actor.stats, emptyList()).getValue(ContentId("stat.max_hp")))))
            modifiers = loadout.modifiers
        }
        entity.edit().create(ResourcePools::class.java).apply {
            mp = actor.resources.mp; spTenths = actor.resources.spTenths; costFlat = loadout.costFlat; costPercent = loadout.costPercent
        }
        recompute(id)
    }
    private fun recompute(id: EntityId) {
        val stats = get<Stats>(id)
        val mods = get<StatusSet>(id).entries.map { val d = content.statuses.getValue(it.definition); StatModifier("status:${d.group.value}", d.stat, d.flat, d.percent) }
        stats.effective = StatRules.resolve(content.stats, stats.baseline, stats.modifiers + mods + BattleRules.guardModifiers(get<TurnMemory>(id).defending))
        get<Health>(id).apply { maximum = value(id, "max_hp"); current = minOf(current, maximum) }
        get<ResourcePools>(id).apply {
            maxMp = value(id, "max_mp"); maxSpTenths = Math.multiplyExact(value(id, "max_sp"), 10)
            mp = minOf(mp, maxMp); spTenths = minOf(spTenths, maxSpTenths)
        }
    }
    fun turnRef() = TurnRef(session.runId, run.scheduler.active, run.scheduler.sequence)
    fun selectionFailure(id: EntityId, skill: ContentId, target: EntityId) = BattleRules.failure(actorObservation(id),
        if (target.value in run.entities) actorObservation(target) else null, content.skills[skill])
    fun legalSkills(id: EntityId) = get<AbilityLoadout>(id).learned.keys.sortedBy { it.value }.flatMap { skill ->
        run.entities.keys.map(::EntityId).filter { selectionFailure(id, skill, it) == null }.map { skill to it }
    }
    fun validate(id: EntityId, command: RunCommand) {
        fun reject(reason: CommandResult.Reason) = run.reject(reason)
        if (command is BeginTurnCommand) {
            if (command.turn != turnRef()) return reject(CommandResult.Reason.STALE_SESSION)
            if (run.scheduler.started) return reject(CommandResult.Reason.INVALID_PHASE)
            pending.finishesActivation = false; pending.result = CommandResult.ACCEPTED; return
        }
        val action = command as? BattleActionCommand ?: return reject(CommandResult.Reason.INVALID_PHASE)
        if (action.turn != turnRef()) return reject(CommandResult.Reason.STALE_SESSION)
        if (!run.scheduler.started) return reject(CommandResult.Reason.INVALID_PHASE)
        val selection = when (command) {
            is AttackCommand -> BattleRules.normal to command.target
            is UseSkillCommand -> command.skill to command.target
            is DefendCommand -> BattleRules.defend to id
            else -> null
        }
        if (selection != null) selectionFailure(id, selection.first, selection.second)?.let { return reject(it) }
        if (command is WaitCommand && legalSkills(id).isNotEmpty()) return reject(CommandResult.Reason.ACTION_AVAILABLE)
        if (command is DrinkPotionCommand) {
            if (run.scheduler.itemUsed) return reject(CommandResult.Reason.ITEM_USED)
            val potion = content.potions[command.potion] ?: return reject(CommandResult.Reason.ITEM_UNAVAILABLE)
            if (!run.isPlayer(id) && (get<TurnMemory>(id).items[command.potion] ?: 0) <= 0) return reject(CommandResult.Reason.ITEM_UNAVAILABLE)
            if (!BattleRules.potionUseful(actorObservation(id), potion, content)) return reject(CommandResult.Reason.ITEM_UNAVAILABLE)
        }
        pending.finishesActivation = command !is DrinkPotionCommand
        pending.result = CommandResult.ACCEPTED
    }
    fun begin() {
        if (!pending.accepted() || pending.command !is BeginTurnCommand) return
        val id = checkNotNull(pending.actor)
        if (get<TurnMemory>(id).defending) { get<TurnMemory>(id).defending = false; emit(StatusExpired(id, BattleRules.defend)); recompute(id) }
        run.scheduler.begin(); emit(TurnStarted(id))
        recover(id, ResourceVector(0, 0, StaminaRules.recovery(get<TurnMemory>(id).masteryRank)))
    }
    fun ability() {
        queued = null
        if (!pending.accepted() || pending.command is BeginTurnCommand) return
        val id = checkNotNull(pending.actor)
        val selection = when (val c = pending.command) {
            is AttackCommand -> BattleRules.normal to c.target
            is DefendCommand -> BattleRules.defend to id
            is UseSkillCommand -> c.skill to c.target
            else -> null
        }
        if (selection != null) {
            val ability = BattleRules.resolve(actorObservation(id), actorObservation(selection.second), content.skills.getValue(selection.first))
            val p = get<ResourcePools>(id); val cost = ability.cost
            get<Health>(id).current -= cost.hp; p.mp -= cost.mp; p.spTenths -= cost.spTenths
            emit(CostsPaid(id, cost)); emit(AbilityUsed(id, selection.first, selection.second)); queued = ability
            if (ability.definition.cooldown > 0) get<Cooldowns>(id).entries[selection.first.value] = CooldownState(ability.definition.cooldown, true)
            get<TurnMemory>(id).previousAction = selection.first.value
        } else if (pending.command is WaitCommand) { get<TurnMemory>(id).previousAction = "wait"; emit(Waited(id)) }
        val item = pending.command as? DrinkPotionCommand
        if (item != null) {
            if (!run.isPlayer(id)) get<TurnMemory>(id).items = frozenMap(get<TurnMemory>(id).items + (item.potion to (get<TurnMemory>(id).items.getValue(item.potion) - 1)))
            emit(ItemUsed(id, item.potion)); potion(id, item.potion); run.scheduler.useItem()
        }
    }
    fun damage() {
        if (!pending.accepted()) return
        val id = checkNotNull(pending.actor)
        queued?.let { ability ->
            val target = ability.selection.target
            when (ability.definition.effect) {
                SkillEffect.DAMAGE -> applyDamage(id, target, DamageRules.resolve(ability.inputs, get<Shield>(target).amount, get<Health>(target).current))
                SkillEffect.SHIELD -> {
                    get<Shield>(id).apply { amount = ability.rank.basePower; remaining = ability.definition.shieldDuration; skipBoundary = true }
                    emit(ShieldGranted(id, ability.rank.basePower, ability.definition.shieldDuration))
                }
                SkillEffect.DEFEND -> { get<TurnMemory>(id).defending = true; recompute(id); emit(StatusApplied(id, BattleRules.defend, id)) }
                SkillEffect.BUFF -> Unit
            }
            if (live(target)) ability.definition.status?.let { applyStatus(id, target, it) }
        }
        evaluateOutcome()
    }
    private fun applyDamage(source: EntityId, target: EntityId, result: DamageResult) {
        get<Health>(target).current = result.remainingHp; get<Shield>(target).amount -= result.shieldAbsorbed
        emit(DamageDealt(source, target, result.hpDamage, result.shieldAbsorbed))
    }
    private fun applyStatus(source: EntityId, target: EntityId, status: ContentId) {
        val entries = get<StatusSet>(target).entries
        val replacement = StatusRules.apply(entries, content.statuses, status, source, pending.actor == target) ?: return
        entries.clear(); entries.addAll(replacement); recompute(target); emit(StatusApplied(target, status, source))
    }
    private fun recover(id: EntityId, amount: ResourceVector) {
        if (!live(id)) return
        val hp = get<Health>(id); val pools = get<ResourcePools>(id)
        val actual = ResourceVector(minOf(amount.hp, hp.maximum - hp.current), minOf(amount.mp, pools.maxMp - pools.mp), minOf(amount.spTenths, pools.maxSpTenths - pools.spTenths))
        hp.current += actual.hp; pools.mp += actual.mp; pools.spTenths += actual.spTenths
        if (actual != ResourceVector(0, 0, 0)) emit(ResourcesRecovered(id, actual))
    }
    fun status() {
        if (!pending.accepted() || !pending.finishesActivation || session.encounterOutcome != null) return
        val id = checkNotNull(pending.actor)
        val entries = get<StatusSet>(id).entries
        val updated = ArrayList<ActiveStatus>()
        for (active in entries) {
            if (session.encounterOutcome != null || active.skipBoundary) { updated.add(if (session.encounterOutcome == null) active.copy(skipBoundary = false) else active); continue }
            val d = content.statuses.getValue(active.definition)
            if (d.periodicDamage > 0) applyDamage(active.source, id, DamageRules.resolve(DamageInputs(d.periodicDamage, 0, value(id, "defense"), value(id, "protection")), get<Shield>(id).amount, get<Health>(id).current))
            evaluateOutcome()
            if (session.encounterOutcome != null) { updated.add(active); continue }
            recover(id, d.recovery)
            if (active.remaining > 1) updated.add(active.copy(remaining = active.remaining - 1)) else emit(StatusExpired(id, active.definition))
        }
        entries.clear(); entries.addAll(updated)
        if (session.encounterOutcome != null) return
        get<Shield>(id).apply { if (skipBoundary) skipBoundary = false else if (remaining > 0 && --remaining == 0) amount = 0 }
        val cooldowns = get<Cooldowns>(id).entries
        cooldowns.toMap().forEach { (skill, state) ->
            if (state.skipBoundary) cooldowns[skill] = state.copy(skipBoundary = false)
            else if (state.remaining <= 1) cooldowns.remove(skill) else cooldowns[skill] = state.copy(remaining = state.remaining - 1)
        }
        recompute(id)
        recover(id, ResourceVector(value(id, "regen_hp"), value(id, "regen_mp"), Math.multiplyExact(value(id, "regen_sp"), 10)))
    }
    fun evaluateOutcome() {
        if (session.encounterOutcome != null) return
        val result = when {
            !live(run.player()) -> EncounterOutcome.DEFEAT
            session.encounterParticipants.isNotEmpty() && session.encounterParticipants.none { live(EntityId(it)) } -> EncounterOutcome.VICTORY
            else -> null
        }
        if (result != null) { session.defeated = result == EncounterOutcome.DEFEAT; session.encounterOutcome = result; session.encounterParticipants.clear(); emit(EncounterEnded(result)) }
    }
    fun actorObservation(id: EntityId): CombatActorObservation {
        val p = get<ResourcePools>(id); val h = get<Health>(id); val shield = get<Shield>(id); val memory = get<TurnMemory>(id)
        return CombatActorObservation(id, ResourceVector(h.current, p.mp, p.spTenths), ResourceVector(h.maximum, p.maxMp, p.maxSpTenths), p.costFlat, p.costPercent,
            shield.amount, shield.remaining, shield.skipBoundary, get<Stats>(id).baseline, get<Stats>(id).modifiers, get<Stats>(id).effective,
            get<AbilityLoadout>(id).learned, get<AbilityLoadout>(id).equipment, get<StatusSet>(id).entries, get<Cooldowns>(id).entries,
            memory.defending, memory.previousAction, memory.masteryRank, memory.items)
    }
    fun observation() = CombatObservation(session.encounterOutcome, session.defeated, session.encounterParticipants.isNotEmpty() || session.encounterOutcome != null,
        run.entities.keys.map(::EntityId).map(::actorObservation), run.scheduler.capture())
    fun export() = CombatRestore(session.defeated, session.encounterOutcome, session.encounterParticipants.toList(), run.entities.keys.map(::EntityId).map(::actorObservation))
    fun restore(state: CombatRestore) {
        require(state.actors.map { it.id }.toSet() == run.entities.keys.map(::EntityId).toSet())
        session.defeated = state.defeated; session.encounterOutcome = state.outcome; session.encounterParticipants.addAll(state.participants)
        state.actors.forEach { a ->
            get<Health>(a.id).apply { current = a.current.hp; maximum = a.maximum.hp }
            get<Stats>(a.id).apply { baseline = a.baseline; modifiers = a.modifiers; effective = a.stats }
            get<AbilityLoadout>(a.id).apply { learned = a.learned; equipment = a.equipment }
            get<ResourcePools>(a.id).apply { mp = a.current.mp; spTenths = a.current.spTenths; maxMp = a.maximum.mp; maxSpTenths = a.maximum.spTenths; costFlat = a.costFlat; costPercent = a.costPercent }
            get<Shield>(a.id).apply { amount = a.shield; remaining = a.shieldDuration; skipBoundary = a.shieldSkipsBoundary }
            get<StatusSet>(a.id).entries.apply { clear(); addAll(a.statuses) }
            get<Cooldowns>(a.id).entries.apply { clear(); putAll(a.cooldowns) }
            get<TurnMemory>(a.id).apply { defending = a.defending; previousAction = a.previousAction; masteryRank = a.masteryRank; items = a.items }
        }
    }
    fun potion(id: EntityId, potion: ContentId) {
        val d = content.potions.getValue(potion); recover(id, d.recovery); d.status?.let { applyStatus(id, id, it) }
    }
    fun recoverHero() {
        session.defeated = false; session.encounterOutcome = null
        val id = run.player(); get<StatusSet>(id).entries.clear(); get<Cooldowns>(id).entries.clear()
        get<TurnMemory>(id).defending = false
        get<Shield>(id).apply { amount = 0; remaining = 0; skipBoundary = false }
        recompute(id); get<Health>(id).current = get<Health>(id).maximum
        get<ResourcePools>(id).apply { mp = maxMp; spTenths = maxSpTenths }
    }
    fun canonical() = "${session.defeated}|${session.encounterOutcome}|${session.encounterParticipants}|" + run.entities.keys.map(::EntityId).joinToString("|") { actorObservation(it).canonical() }
}
