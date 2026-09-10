package cloud.vinh.rebirthdungeon.game

import cloud.vinh.rebirthdungeon.game.algorithms.RandomStream
import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.dice.DiceRules
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.combat.statuses.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.ecs.components.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import com.artemis.Component

/** ECS orchestration only: scoring, costs, stat derivation and damage use shared pure rules. */
internal class CombatRuntime(private val run: RunWorld) {
    private val session get() = run.session
    private val content get() = session.content
    private val pending get() = run.pending
    private fun <T : Component> component(id: EntityId, type: Class<T>): T = run.world.getMapper(type).get(run.entity(id))
    private inline fun <reified T : Component> get(id: EntityId): T = component(id, T::class.java)
    private fun emit(event: DomainEvent, actor: EntityId) = run.emit(event, run.isPlayer(actor) || session.visible[run.grid.index(run.cell(actor).x, run.cell(actor).y)])
    private fun value(id: EntityId, stat: String) = get<Stats>(id).effective.getValue(ContentId("stat.$stat"))
    private fun live(id: EntityId) = id.value in run.entities && get<Health>(id).current > 0
    private var queued: LockedAbility? = null

    fun install(id: EntityId) {
        val entity = run.world.getEntity(run.entity(id))
        val actor = content.actors.getValue(run.actor(id).definition)
        entity.edit().create(DiceHand::class.java)
        entity.edit().create(StatusSet::class.java)
        entity.edit().create(Shield::class.java)
        entity.edit().create(Cooldowns::class.java)
        val player = run.isPlayer(id)
        val defaults = if (player) listOf("sword", "fortify", "focus", "spark", "blood").map { ContentId("skill.$it") }.associateWith {
            if (it == actor.skill) actor.rank else content.skills.getValue(it).ranks.first().rank
        } else mapOf(actor.skill to actor.rank)
        val loadout = if (player) session.combatLoadout ?: CombatLoadout(defaults, setOf("sword")) else CombatLoadout(defaults, emptySet())
        require(loadout.learned.all { (skill, rank) -> content.skills[skill]?.ranks?.any { it.rank == rank } == true })
        entity.edit().create(AbilityLoadout::class.java).apply { learned = loadout.learned; equipment = loadout.equipment }
        entity.edit().create(Stats::class.java).apply {
            // Actor-specific HP capacity is an authored baseline offset, not a second health pool.
            baseline = frozenMap(actor.stats + (ContentId("stat.max_hp") to
                (content.stats.getValue(ContentId("stat.max_hp")).base + get<Health>(id).maximum - StatRules.resolve(content.stats, actor.stats, emptyList()).getValue(ContentId("stat.max_hp")))))
            modifiers = loadout.modifiers
        }
        entity.edit().create(ResourcePools::class.java).apply {
            mp = actor.resources.mp; sp = actor.resources.sp
            costFlat = loadout.costFlat; costPercent = loadout.costPercent
        }
        recompute(id)
    }
    private fun recompute(id: EntityId) {
        val stats = get<Stats>(id)
        val mods = get<StatusSet>(id).entries.map {
            val d = content.statuses.getValue(it.definition)
            StatModifier("status:${d.group.value}", d.stat, d.flat, d.percent)
        }
        stats.effective = StatRules.resolve(content.stats, stats.baseline, stats.modifiers + mods)
        get<Health>(id).apply { maximum = value(id, "max_hp"); current = minOf(current, maximum) }
        get<ResourcePools>(id).apply {
            maxMp = value(id, "max_mp"); maxSp = value(id, "max_sp")
            mp = minOf(mp, maxMp); sp = minOf(sp, maxSp)
        }
    }
    /** Returns true when combat owns this intent, including expected rejections. */
    fun validate(id: EntityId, command: RunCommand): Boolean {
        val hand = get<DiceHand>(id)
        fun reject(reason: CommandResult.Reason): Boolean { run.reject(reason); return true }
        fun accept(finish: Boolean = false): Boolean {
            pending.result = CommandResult.ACCEPTED; pending.finishesActivation = finish; return true
        }
        if (command == UseItemCommand) return reject(CommandResult.Reason.ITEM_UNAVAILABLE)
        if (command is MoveCommand || command == WaitCommand) {
            if (hand.open) return reject(CommandResult.Reason.INVALID_PHASE)
            return false
        }
        if (command == EndTurnCommand) return accept(true)
        if (command is SelectAbilityCommand) {
            if (hand.locked != null) return reject(CommandResult.Reason.INVALID_PHASE)
            val failure = selectionFailure(id, command.skill, command.target)
            return if (failure == null) accept() else reject(failure)
        }
        if (!hand.open) return reject(CommandResult.Reason.INVALID_PHASE)
        return when (command) {
            RollDiceCommand -> {
                val selection = hand.selection ?: return reject(CommandResult.Reason.INVALID_SKILL)
                if (hand.locked != null) reject(CommandResult.Reason.INVALID_PHASE)
                else selectionFailure(id, selection.skill, selection.target)?.let { reject(it) } ?: accept()
            }
            is KeepDieCommand -> if (hand.locked == null || command.die !in 0..4) reject(CommandResult.Reason.INVALID_DICE) else accept()
            is RerollDiceCommand -> if (hand.locked == null || hand.rerolls == 0 || command.dice.isEmpty() ||
                command.dice.distinct().size != command.dice.size || command.dice.any { it !in 0..4 || hand.kept[it] })
                reject(CommandResult.Reason.INVALID_DICE) else accept()
            UseAbilityCommand -> if (hand.locked == null) reject(CommandResult.Reason.INVALID_PHASE) else accept(true)
            else -> reject(CommandResult.Reason.INVALID_PHASE)
        }
    }
    fun selectionFailure(id: EntityId, skill: ContentId, target: EntityId): CommandResult.Reason? {
        val loadout = get<AbilityLoadout>(id)
        val definition = content.skills[skill] ?: return CommandResult.Reason.INVALID_SKILL
        val rankName = loadout.learned[skill] ?: return CommandResult.Reason.INVALID_SKILL
        val rank = definition.ranks.singleOrNull { it.rank == rankName } ?: return CommandResult.Reason.INVALID_SKILL
        if (definition.requiredEquipment != "none" && definition.requiredEquipment !in loadout.equipment) return CommandResult.Reason.EQUIPMENT_REQUIRED
        if (!live(target)) return CommandResult.Reason.INVALID_TARGET
        if (definition.target == TargetKind.SELF) {
            if (target != id) return CommandResult.Reason.INVALID_TARGET
        } else {
            if (run.isPlayer(target) == run.isPlayer(id)) return CommandResult.Reason.INVALID_TARGET
            val a = run.cell(id); val b = run.cell(target)
            if (kotlin.math.abs(a.x - b.x) + kotlin.math.abs(a.y - b.y) > definition.range) return CommandResult.Reason.INVALID_TARGET
        }
        if ((get<Cooldowns>(id).entries[skill.value]?.remaining ?: 0) > 0) return CommandResult.Reason.COOLDOWN
        return affordability(id, costs(id, rank.cost))
    }
    private fun costs(id: EntityId, rank: ResourceVector): ResourceVector {
        val p = get<ResourcePools>(id)
        return ResourceVector(StatRules.cost(rank.hp, p.costFlat.hp, p.costPercent.hp),
            StatRules.cost(rank.mp, p.costFlat.mp, p.costPercent.mp), StatRules.cost(rank.sp, p.costFlat.sp, p.costPercent.sp))
    }
    private fun affordability(id: EntityId, cost: ResourceVector): CommandResult.Reason? {
        val p = get<ResourcePools>(id)
        return when {
            get<Health>(id).current - p.reserved.hp - cost.hp < 1 -> CommandResult.Reason.INSUFFICIENT_HP
            p.mp - p.reserved.mp < cost.mp -> CommandResult.Reason.INSUFFICIENT_MP
            p.sp - p.reserved.sp < cost.sp -> CommandResult.Reason.INSUFFICIENT_SP
            else -> null
        }
    }
    private fun lock(id: EntityId, selection: Selection): LockedAbility {
        val skill = content.skills.getValue(selection.skill)
        val rank = skill.ranks.single { it.rank == selection.rank }
        val magic = skill.attackStat == ContentId("stat.magic_attack")
        return LockedAbility(selection, rank, skill, DamageInputs(rank.basePower, get<Stats>(id).effective.getValue(skill.attackStat),
            rank.pipScale, value(selection.target, if (magic) "magic_defense" else "defense"),
            value(selection.target, if (magic) "magic_protection" else "protection")), costs(id, rank.cost))
    }
    private fun participate(hostile: EntityId) {
        if (session.encounterParticipants.isEmpty()) session.encounterOutcome = null
        if (session.encounterParticipants.add(hostile.value)) emit(EncounterStarted(hostile), run.player())
    }
    fun dice() {
        queued = null
        if (!session.combatEnabled || !pending.accepted()) return
        val id = checkNotNull(pending.actor)
        val hand = get<DiceHand>(id)
        if (pending.hostile != null && run.isPlayer(id)) {
            val hostile = checkNotNull(pending.hostile)
            participate(hostile)
            hand.open = true
            val default = content.actors.getValue(run.actor(id).definition).skill
            val learned = get<AbilityLoadout>(id).learned
            hand.selection = learned[default]?.let { Selection(default, it, hostile) }
        }
        when (val command = pending.command) {
            is SelectAbilityCommand -> {
                hand.open = true
                hand.selection = Selection(command.skill, get<AbilityLoadout>(id).learned.getValue(command.skill), command.target)
                if (command.target != id) participate(command.target)
                emit(AbilitySelected(id, checkNotNull(hand.selection)), id)
            }
            RollDiceCommand -> {
                val locked = lock(id, checkNotNull(hand.selection)); hand.locked = locked
                get<ResourcePools>(id).reserved = locked.cost
                emit(CostsReserved(id, locked.cost), id)
                hand.rerolls = content.scoring.getValue(locked.definition.scoring).rerolls
                sample(id, (0..4).toList())
            }
            is KeepDieCommand -> { hand.kept[command.die] = command.kept; emit(DieKept(id, command.die, command.kept), id) }
            is RerollDiceCommand -> { sample(id, command.dice.sorted()); hand.rerolls-- }
            else -> Unit
        }
    }
    private fun sample(id: EntityId, dice: List<Int>) {
        val hand = get<DiceHand>(id)
        val weights = checkNotNull(hand.locked).rank.weights
        dice.forEach { die ->
            hand.faces[die] = DiceRules.sample(weights, session.random[RandomStream.COMBAT])
            emit(DieChanged(id, die, hand.faces[die]), id)
        }
    }
    private fun pay(id: EntityId) {
        val p = get<ResourcePools>(id); val cost = p.reserved
        check(get<Health>(id).current > cost.hp && p.mp >= cost.mp && p.sp >= cost.sp)
        get<Health>(id).current -= cost.hp; p.mp -= cost.mp; p.sp -= cost.sp
        p.reserved = ResourceVector(0, 0, 0)
        emit(CostsPaid(id, cost), id)
    }
    fun ability() {
        if (!session.combatEnabled || !pending.accepted()) return
        val id = checkNotNull(pending.actor); val hand = get<DiceHand>(id)
        if (pending.command == AutomaticCommand && pending.hostile != null) {
            participate(id)
            val actor = content.actors.getValue(run.actor(id).definition)
            val target = run.player()
            if (selectionFailure(id, actor.skill, target) == null) {
                queued = lock(id, Selection(actor.skill, actor.rank, target))
                get<ResourcePools>(id).reserved = checkNotNull(queued).cost
                pay(id)
            }
        } else if (pending.command == UseAbilityCommand) {
            queued = checkNotNull(hand.locked); pay(id)
        } else if (pending.command == EndTurnCommand && hand.locked != null) pay(id)
        queued?.let { ability ->
            emit(AbilityUsed(id, ability.selection.skill, ability.selection.target), id)
            if (ability.definition.cooldown > 0)
                get<Cooldowns>(id).entries[ability.selection.skill.value] = CooldownState(ability.definition.cooldown, true)
        }
    }
    fun preview(id: EntityId): DamageResult? {
        val hand = get<DiceHand>(id); val locked = hand.locked ?: return null
        if (locked.definition.effect != SkillEffect.DAMAGE) return null
        return resolve(locked, hand.faces.toList())
    }
    private fun resolve(ability: LockedAbility, faces: List<Int>?): DamageResult {
        val score = faces?.let(DiceRules::score)
        val multiplier = score?.let { content.scoring.getValue(ability.definition.scoring).multipliers.getValue(it.combination) } ?: StatRatio(1, 1)
        return DamageRules.resolve(ability.inputs, score?.pips ?: 0, multiplier,
            get<Shield>(ability.selection.target).amount, get<Health>(ability.selection.target).current)
    }
    fun damage() {
        if (!session.combatEnabled || !pending.accepted()) return
        val id = checkNotNull(pending.actor)
        val hand = get<DiceHand>(id)
        queued?.let { ability ->
            val target = ability.selection.target
            when (ability.definition.effect) {
                SkillEffect.DAMAGE -> applyDamage(id, target, resolve(ability, if (run.isPlayer(id)) hand.faces.toList() else null))
                SkillEffect.SHIELD -> {
                    val amount = AbilityPreviewRules.shield(ability, hand.faces.toList(), content.scoring.getValue(ability.definition.scoring))
                    get<Shield>(id).apply { this.amount = amount; remaining = ability.definition.shieldDuration; skipBoundary = true }
                    emit(ShieldGranted(id, amount, ability.definition.shieldDuration), id)
                }
                SkillEffect.BUFF -> Unit // Fixed authored status; dice do not alter magnitude or duration.
            }
            ability.definition.status?.let { if (live(target)) applyStatus(id, target, it) }
        }
        if (pending.finishesActivation) hand.clear()
    }
    private fun applyDamage(source: EntityId, target: EntityId, result: DamageResult) {
        get<Health>(target).current = result.remainingHp
        get<Shield>(target).amount -= result.shieldAbsorbed
        emit(DamageDealt(source, target, result.hpDamage, result.shieldAbsorbed), target)
    }
    private fun applyStatus(source: EntityId, target: EntityId, status: ContentId) {
        val entries = get<StatusSet>(target).entries
        val replacement = StatusRules.apply(entries, content.statuses, status, source, pending.actor == target) ?: return
        entries.clear(); entries.addAll(replacement)
        recompute(target)
        emit(StatusApplied(target, status, source), target)
    }
    private fun recover(id: EntityId, amount: ResourceVector) {
        if (!live(id)) return
        val hp = get<Health>(id); val pools = get<ResourcePools>(id)
        val actual = ResourceVector(minOf(amount.hp, hp.maximum - hp.current), minOf(amount.mp, pools.maxMp - pools.mp), minOf(amount.sp, pools.maxSp - pools.sp))
        hp.current += actual.hp; pools.mp += actual.mp; pools.sp += actual.sp
        if (actual != ResourceVector(0, 0, 0)) emit(ResourcesRecovered(id, actual), id)
    }
    fun status() {
        if (!session.combatEnabled || !pending.accepted() || !pending.finishesActivation) return
        val id = checkNotNull(pending.actor)
        val entries = get<StatusSet>(id).entries
        val updated = ArrayList<ActiveStatus>()
        entries.forEach { active ->
            if (active.skipBoundary) updated.add(active.copy(skipBoundary = false))
            else {
                val definition = content.statuses.getValue(active.definition)
                if (definition.periodicDamage > 0 && live(id)) applyDamage(active.source, id,
                    DamageRules.resolve(DamageInputs(definition.periodicDamage, 0, 0, value(id, "defense"), value(id, "protection")),
                        0, StatRatio(1, 1), get<Shield>(id).amount, get<Health>(id).current))
                recover(id, definition.recovery)
                if (active.remaining > 1) updated.add(active.copy(remaining = active.remaining - 1))
                else emit(StatusExpired(id, active.definition), id)
            }
        }
        entries.clear(); entries.addAll(updated)
        get<Shield>(id).apply {
            if (skipBoundary) skipBoundary = false
            else if (remaining > 0 && --remaining == 0) amount = 0
        }
        val cooldowns = get<Cooldowns>(id).entries
        cooldowns.toMap().forEach { (skill, state) ->
            if (state.skipBoundary) cooldowns[skill] = state.copy(skipBoundary = false)
            else if (state.remaining <= 1) cooldowns.remove(skill)
            else cooldowns[skill] = state.copy(remaining = state.remaining - 1)
        }
        recompute(id)
        recover(id, ResourceVector(value(id, "regen_hp"), value(id, "regen_mp"), value(id, "regen_sp")))
    }
    fun evaluateOutcome() {
        val result = when {
            session.defeated -> EncounterOutcome.DEFEAT
            session.encounterParticipants.isNotEmpty() && session.encounterParticipants.none { it in run.entities } -> EncounterOutcome.VICTORY
            else -> null
        }
        if (result != null && session.encounterOutcome != result) {
            session.encounterOutcome = result; session.encounterParticipants.clear()
            run.emit(EncounterEnded(result), true)
        }
    }
    private fun actorObservation(id: EntityId): CombatActorObservation {
        val p = get<ResourcePools>(id); val h = get<Health>(id); val hand = get<DiceHand>(id)
        val shield = get<Shield>(id)
        return CombatActorObservation(id, ResourceVector(h.current, p.mp, p.sp), ResourceVector(h.maximum, p.maxMp, p.maxSp),
            p.reserved, p.costFlat, p.costPercent, shield.amount, shield.remaining, shield.skipBoundary,
            get<Stats>(id).baseline, get<Stats>(id).modifiers, get<Stats>(id).effective,
            get<AbilityLoadout>(id).learned, get<AbilityLoadout>(id).equipment,
            hand.open, hand.selection, hand.locked, hand.faces.toList(), hand.kept.toList(), hand.rerolls,
            get<StatusSet>(id).entries, get<Cooldowns>(id).entries, preview(id))
    }
    fun observation(): CombatObservation {
        check(session.combatEnabled)
        // Encounter lifetime spans multiple hands. Preserve older checkpoints with a standalone open hand.
        val inBattle = !session.defeated && (session.encounterParticipants.isNotEmpty() || get<DiceHand>(run.player()).open)
        return CombatObservation(session.encounterOutcome, session.defeated, inBattle, run.entities.keys.map(::EntityId).filter {
            run.isPlayer(it) || session.visible[run.grid.index(run.cell(it).x, run.cell(it).y)]
        }.map(::actorObservation))
    }
    fun export(): CombatRestore? = if (!session.combatEnabled) null else CombatRestore(session.defeated,
        session.encounterOutcome, session.encounterParticipants.toList(), run.entities.keys.map(::EntityId).map(::actorObservation))
    fun restore(state: CombatRestore) {
        require(state.actors.map { it.id }.toSet() == run.entities.keys.map(::EntityId).toSet())
        require(state.actors.map { it.id }.distinct().size == state.actors.size)
        session.defeated = state.defeated; session.encounterOutcome = state.outcome
        session.encounterParticipants.addAll(state.participants)
        state.actors.forEach { a ->
            require(a.faces.size == 5 && a.kept.size == 5 && a.rerolls in 0..2)
            require(a.faces.all { it in (if (a.locked == null) 0..0 else 1..6) })
            require(a.locked == null || a.open && a.selection == a.locked.selection)
            require(a.reserved == (a.locked?.cost ?: ResourceVector(0, 0, 0)))
            require(a.current.hp == get<Health>(a.id).current && a.maximum.hp == get<Health>(a.id).maximum)
            require(a.current.mp in 0..a.maximum.mp && a.current.sp in 0..a.maximum.sp)
            require(a.statuses.all { it.definition in content.statuses && it.remaining > 0 })
            require(a.learned.all { (id, rank) -> content.skills[id]?.ranks?.any { it.rank == rank } == true })
            get<Stats>(a.id).apply { baseline = a.baseline; modifiers = a.modifiers; effective = a.stats }
            get<AbilityLoadout>(a.id).apply { learned = a.learned; equipment = a.equipment }
            get<ResourcePools>(a.id).apply {
                mp = a.current.mp; sp = a.current.sp; maxMp = a.maximum.mp; maxSp = a.maximum.sp
                reserved = a.reserved; costFlat = a.costFlat; costPercent = a.costPercent
            }
            get<DiceHand>(a.id).apply {
                open = a.open; selection = a.selection; locked = a.locked; rerolls = a.rerolls
                a.faces.forEachIndexed { i, face -> faces[i] = face }; a.kept.forEachIndexed { i, keep -> kept[i] = keep }
            }
            get<Shield>(a.id).apply { amount = a.shield; remaining = a.shieldDuration; skipBoundary = a.shieldSkipsBoundary }
            get<StatusSet>(a.id).entries.addAll(a.statuses)
            get<Cooldowns>(a.id).entries.putAll(a.cooldowns)
        }
    }
    fun canonical(): String {
        if (!session.combatEnabled) return "disabled"
        return "${session.defeated}|${session.encounterOutcome}|${session.encounterParticipants}|" +
            run.entities.keys.map(::EntityId).joinToString("|") { actorObservation(it).canonical() }
    }
}
