package cloud.vinh.rebirthdungeon.game.combat

import cloud.vinh.rebirthdungeon.game.*
import cloud.vinh.rebirthdungeon.game.combat.abilities.*
import cloud.vinh.rebirthdungeon.game.combat.stats.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.events.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import cloud.vinh.rebirthdungeon.data.content.JacksonContentRepository
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class CombatSimulationTest {
    private val hero = EntityId(1)
    private val enemy = EntityId(2)
    private fun loadout(rank: String = "F", modifiers: List<StatModifier> = emptyList(), equipment: Set<String> = setOf("sword")) =
        CombatLoadout(mapOf("sword" to rank, "fortify" to "F", "focus" to "F", "spark" to "F", "blood" to "F")
            .mapKeys { ContentId("skill.${it.key}") }, equipment, modifiers)
    private fun sim(loadout: CombatLoadout = loadout(), enemies: List<ActorState> = listOf(Phase3Fixtures.enemy(2, 1).copy(hp = 60, maxHp = 60)),
        content: ContentCatalog = Phase3Fixtures.content): DungeonSimulation = DungeonSimulation.create(
        Phase3Fixtures.floor("########", "#.....>#", "########"), 1, 1,
        RunSession(71, content, combatEnabled = true, combatLoadout = loadout), enemies)
    private fun view(s: DungeonSimulation) = s.combatObservation().actors.single { it.id == hero }
    private fun accepted(s: DungeonSimulation, command: RunCommand) = assertEquals(CommandResult.Reason.ACCEPTED, s.apply(command).reason)
    private fun select(s: DungeonSimulation, name: String = "sword", target: EntityId = enemy) = accepted(s, SelectAbilityCommand(ContentId("skill.$name"), target))
    private fun rejectUnchanged(s: DungeonSimulation, command: RunCommand, reason: CommandResult.Reason? = null) {
        val before = s.canonicalState()
        val result = s.apply(command)
        assertFalse(result.accepted()); if (reason != null) assertEquals(reason, result.reason)
        assertEquals(before, s.canonicalState()); assertTrue(s.events().isEmpty())
    }
    private fun advance(s: DungeonSimulation) {
        var guard = 0
        while (!s.needsPlayerInput() && !s.isDefeated()) { check(guard++ < 20); accepted(s, AutomaticCommand) }
    }
    private fun altered(change: (ObjectNode) -> Unit): ContentCatalog {
        val tree = ObjectMapper().readTree(File("../assets/data/starter.json")) as ObjectNode
        change(tree)
        return JacksonContentRepository { if (it == "starter.json") tree.toString() else File("../assets/data/$it").readText() }.load().catalog
    }

    @Test fun contactOpensWithoutMovementDamageRngOrInitiative() {
        val s = sim()
        try {
            val before = s.session.random.capture()
            accepted(s, MoveCommand(1, 0))
            assertEquals(Cell(1, 1), s.observe().playerCell); assertEquals(0L, s.observe().turnCount)
            assertEquals(before, s.session.random.capture()); assertTrue(s.needsPlayerInput())
            assertTrue(view(s).open); assertEquals(90, view(s).current.hp)
            assertEquals(enemy, view(s).selection!!.target)
            rejectUnchanged(s, MoveCommand(1, 0)); rejectUnchanged(s, WaitCommand)
        } finally { s.dispose() }
    }
    @Test fun firstRollAndTwoAtomicSubsetsFreezeInputsAndKeepEveryReplacement() {
        val s = sim()
        try {
            rejectUnchanged(s, RollDiceCommand); rejectUnchanged(s, RerollDiceCommand(listOf(0)))
            select(s); accepted(s, RollDiceCommand)
            val first = view(s); val rng = s.session.random.capture()
            assertEquals(ResourceVector(0, 0, 5), first.reserved); assertEquals(40, first.current.sp)
            accepted(s, KeepDieCommand(0, true)); assertEquals(rng, s.session.random.capture())
            rejectUnchanged(s, RerollDiceCommand(emptyList()))
            rejectUnchanged(s, RerollDiceCommand(listOf(1, 1)))
            rejectUnchanged(s, RerollDiceCommand(listOf(0)))
            rejectUnchanged(s, RerollDiceCommand(listOf(1, 5)))
            rejectUnchanged(s, RollDiceCommand)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.spark"), enemy))
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.sword"), hero))
            rejectUnchanged(s, AutomaticCommand)
            rejectUnchanged(s, UseItemCommand)
            accepted(s, RerollDiceCommand(listOf(4, 2, 1)))
            assertEquals(first.faces[0], view(s).faces[0]); assertEquals(first.faces[3], view(s).faces[3])
            accepted(s, RerollDiceCommand(listOf(3)))
            val last = view(s)
            assertEquals(0, last.rerolls); assertEquals(first.locked, last.locked)
            assertEquals(0L, s.observe().turnCount); assertTrue(s.needsPlayerInput())
            rejectUnchanged(s, RerollDiceCommand(listOf(1)))
            assertThrows(UnsupportedOperationException::class.java) { (last.faces as MutableList)[0] = 6 }
            assertThrows(UnsupportedOperationException::class.java) { (last.stats as MutableMap).clear() }
            assertEquals(2, first.rerolls) // Old observations are detached.
        } finally { s.dispose() }
    }
    @Test fun previewMatchesCommitAndPaymentOccursOnceBeforeDamage() {
        val s = sim(enemies = listOf(Phase3Fixtures.enemy(2, 1).copy(hp = 999, maxHp = 999)))
        try {
            select(s); accepted(s, RollDiceCommand); val preview = view(s).preview!!
            accepted(s, UseAbilityCommand)
            val events = s.events().map { it.event }
            assertEquals(preview.hpDamage, (events.single { it is DamageDealt } as DamageDealt).hpDamage)
            assertTrue(events.indexOfFirst { it is CostsPaid } < events.indexOfFirst { it is DamageDealt })
            assertEquals(37, view(s).current.sp); assertEquals(ResourceVector(0, 0, 0), view(s).reserved)
            assertEquals(1, events.count { it is ActivationEnded }); assertEquals(1L, s.observe().turnCount)
            rejectUnchanged(s, UseAbilityCommand); rejectUnchanged(s, EndTurnCommand)
            advance(s); rejectUnchanged(s, UseAbilityCommand)
        } finally { s.dispose() }
    }
    @Test fun paidPassDiscardsHandAndFreePassNeverReportsSkillUse() {
        val s = sim(enemies = emptyList())
        try {
            accepted(s, EndTurnCommand); assertEquals(40, view(s).current.sp)
            select(s, "fortify", hero); accepted(s, RollDiceCommand); accepted(s, EndTurnCommand)
            assertEquals(38, view(s).current.sp); assertEquals(0, view(s).shield)
            assertFalse(s.events().any { it.event is AbilityUsed })
            rejectUnchanged(s, UseAbilityCommand)
            select(s, "fortify", hero); accepted(s, RollDiceCommand); assertEquals(2, view(s).rerolls)
        } finally { s.dispose() }
    }
    @Test fun validatesOwnershipEquipmentRangeAndHpCostTogetherWithoutRng() {
        val s = sim(loadout(equipment = emptySet()))
        try {
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.sword"), enemy), CommandResult.Reason.EQUIPMENT_REQUIRED)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.missing"), enemy), CommandResult.Reason.INVALID_SKILL)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.spark"), hero), CommandResult.Reason.INVALID_TARGET)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.focus"), enemy), CommandResult.Reason.INVALID_TARGET)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.spark"), EntityId(99)), CommandResult.Reason.INVALID_TARGET)
        } finally { s.dispose() }
        val far = sim(enemies = listOf(Phase3Fixtures.enemy(4, 1)))
        try { rejectUnchanged(far, SelectAbilityCommand(ContentId("skill.sword"), enemy), CommandResult.Reason.INVALID_TARGET) } finally { far.dispose() }
        for (hp in listOf(4, 5)) {
            val low = sim(loadout(modifiers = listOf(StatModifier("cap", ContentId("stat.max_hp"), hp - 90))))
            try {
                if (hp == 4) rejectUnchanged(low, SelectAbilityCommand(ContentId("skill.blood"), enemy), CommandResult.Reason.INSUFFICIENT_HP)
                else {
                    select(low, "blood"); accepted(low, RollDiceCommand); accepted(low, EndTurnCommand)
                    assertEquals(1, view(low).current.hp); assertEquals(39, view(low).current.mp); assertEquals(40, view(low).current.sp)
                }
            } finally { low.dispose() }
        }
    }
    @Test fun mixedCostsCannotPartiallyReserveAndDepletedPoolsHaveLegalContinuation() {
        val content = altered { tree ->
            val actor = tree["actors"][0]["resources"] as ObjectNode
            actor.put("sp", 0); actor.put("mp", 0)
        }
        val s = sim(content = content)
        try {
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.blood"), enemy), CommandResult.Reason.INSUFFICIENT_MP)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.sword"), enemy), CommandResult.Reason.INSUFFICIENT_SP)
            repeat(3) { accepted(s, EndTurnCommand); advance(s) }
            assertEquals(6, view(s).current.sp); assertEquals(3, view(s).current.mp)
            select(s); accepted(s, RollDiceCommand)
            assertEquals(6, view(s).current.sp); assertEquals(5, view(s).reserved.sp)
        } finally { s.dispose() }
    }
    @Test fun selfBuffSkipsCastingBoundaryAndDiceDoNotTickIt() {
        val s = sim(enemies = emptyList())
        try {
            select(s, "focus", hero); accepted(s, RollDiceCommand); accepted(s, UseAbilityCommand)
            assertEquals(13, view(s).stats[ContentId("stat.str")]); assertEquals(3, view(s).statuses.single().remaining)
            val hp = view(s).current.hp; assertEquals(90, hp); assertEquals(93, view(s).maximum.hp)
            select(s, "focus", hero); accepted(s, RollDiceCommand); accepted(s, KeepDieCommand(0, true))
            accepted(s, RerollDiceCommand(listOf(1))); assertEquals(3, view(s).statuses.single().remaining)
            accepted(s, EndTurnCommand); assertEquals(2, view(s).statuses.single().remaining)
            repeat(2) { accepted(s, EndTurnCommand) }
            assertTrue(view(s).statuses.isEmpty()); assertEquals(90, view(s).maximum.hp); assertEquals(hp, view(s).current.hp)
        } finally { s.dispose() }
    }
    @Test fun enemyDebuffUsesSameResolverAndExpiresOnOwnerBoundaries() {
        val s = sim()
        try {
            accepted(s, EndTurnCommand); advance(s)
            assertEquals(81, view(s).current.hp) // 4 + 10 - 5, no enemy dice draw.
            assertEquals(7, view(s).stats[ContentId("stat.str")]); assertEquals(3, view(s).statuses.single().remaining)
            select(s); accepted(s, RollDiceCommand)
            assertEquals(7, view(s).locked!!.inputs.attack)
        } finally { s.dispose() }
    }
    @Test fun shieldAndCooldownSkipCastingBoundaryAndHpPaymentBypassesShield() {
        val s = sim()
        try {
            select(s, "fortify", hero); accepted(s, RollDiceCommand); accepted(s, UseAbilityCommand)
            val shield = view(s).shield; assertTrue(shield > 0)
            assertEquals(1, view(s).cooldowns["skill.fortify"]!!.remaining)
            advance(s); assertEquals(87, view(s).current.hp); assertEquals(shield - 9, view(s).shield)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.fortify"), hero), CommandResult.Reason.COOLDOWN)
            select(s, "blood"); accepted(s, RollDiceCommand); accepted(s, EndTurnCommand)
            assertEquals(83, view(s).current.hp) // enemy STR debuff clamped max HP to 87, then HP payment 4.
            assertEquals(0, view(s).shield); assertTrue(view(s).cooldowns.isEmpty())
        } finally { s.dispose() }
    }
    @Test fun fairAndWeightedRanksWinDeterministicallyWithoutExpeditionResult() {
        for (rank in listOf("F", "E")) {
            val a = sim(loadout(rank)); val b = sim(loadout(rank))
            try {
                var turns = 0
                while (a.combatObservation().outcome == null) {
                    check(turns++ < 10)
                    val commands = listOf(SelectAbilityCommand(ContentId("skill.sword"), enemy), RollDiceCommand,
                        KeepDieCommand(0, true), RerollDiceCommand(listOf(1, 2)), RerollDiceCommand(listOf(3, 4)), UseAbilityCommand)
                    for (command in commands) {
                        accepted(a, command); accepted(b, command)
                        assertEquals(a.canonicalState(), b.canonicalState()); assertEquals(a.events(), b.events())
                    }
                    advance(a); advance(b)
                    assertEquals(a.canonicalState(), b.canonicalState())
                }
                assertEquals(EncounterOutcome.VICTORY, a.combatObservation().outcome)
                assertFalse(a.observe().reachedExit); assertFalse(a.isDefeated()); assertTrue(a.needsPlayerInput())
                assertEquals(1, a.combatObservation().actors.size)
                rejectUnchanged(a, UseAbilityCommand)
                accepted(a, MoveCommand(1, 0)) // dead hostile no longer blocks occupancy
            } finally { a.dispose(); b.dispose() }
        }
    }
    @Test fun defeatIsTerminalAndEmptyFloorsNeverWin() {
        val empty = sim(enemies = emptyList())
        try { repeat(5) { accepted(empty, EndTurnCommand) }; assertNull(empty.combatObservation().outcome) } finally { empty.dispose() }
        val s = sim()
        try {
            var guard = 0
            while (!s.isDefeated()) { check(guard++ < 30); accepted(s, EndTurnCommand); advance(s) }
            assertEquals(EncounterOutcome.DEFEAT, s.combatObservation().outcome); assertEquals(0, view(s).current.hp)
            rejectUnchanged(s, EndTurnCommand, CommandResult.Reason.TERMINAL)
            rejectUnchanged(s, AutomaticCommand, CommandResult.Reason.TERMINAL)
        } finally { s.dispose() }
    }
    @Test fun lastHostileAndPeriodicPlayerDeathPreferDefeatAndNeverRegenerateDeadActor() {
        val content = altered { tree ->
            val status = tree["statuses"][0] as ObjectNode
            status.put("duration", 1); status.put("periodicDamage", 10000)
            (status["recovery"] as ObjectNode).put("hp", 10000)
        }
        val s = sim(content = content, enemies = listOf(Phase3Fixtures.enemy(2, 1, hp = 1)))
        try {
            select(s, "focus", hero); accepted(s, RollDiceCommand); accepted(s, UseAbilityCommand); advance(s)
            select(s); accepted(s, RollDiceCommand); accepted(s, UseAbilityCommand)
            assertTrue(s.isDefeated()); assertEquals(EncounterOutcome.DEFEAT, s.combatObservation().outcome)
            val events = s.events().map { it.event }
            assertEquals(1, events.count { it is ActivationEnded })
            assertEquals(1, events.count { it is EncounterEnded }); assertEquals(0, view(s).current.hp)
            assertTrue(events.indexOfFirst { it is DamageDealt && it.target == hero } < events.indexOfFirst { it is StatusExpired })
        } finally { s.dispose() }
    }
    @Test fun encounterParticipationExcludesUncontactedHostiles() {
        val s = sim(enemies = listOf(Phase3Fixtures.enemy(2, 1, hp = 1), Phase3Fixtures.enemy(6, 1, id = 3)))
        try {
            select(s); accepted(s, RollDiceCommand); accepted(s, UseAbilityCommand)
            assertEquals(EncounterOutcome.VICTORY, s.combatObservation().outcome)
            assertTrue(s.combatObservation().actors.any { it.id == EntityId(3) })
        } finally { s.dispose() }
    }
    @Test fun movementOnlyCheckpointApiCannotSilentlyLoseCombatState() {
        val s = sim()
        try { assertThrows(IllegalStateException::class.java) { s.restoreExport() } } finally { s.dispose() }
    }
    @Test fun seededRollAndSubsetRerollFixturePinsFacesAndCanonicalState() {
        val s = sim()
        try {
            select(s); accepted(s, RollDiceCommand)
            val lines = mutableListOf(view(s).faces.joinToString(","))
            accepted(s, KeepDieCommand(0, true)); accepted(s, RerollDiceCommand(listOf(4, 2, 1)))
            lines.add(view(s).faces.joinToString(","))
            accepted(s, RerollDiceCommand(listOf(3)))
            lines.add(view(s).faces.joinToString(","))
            val hash = java.security.MessageDigest.getInstance("SHA-256").digest(s.canonicalState().toByteArray(Charsets.UTF_8))
                .joinToString("") { "%02x".format(it.toInt() and 255) }
            lines.add(hash)
            val expected = javaClass.getResourceAsStream("/replay/combat-seed71.txt")!!.bufferedReader().use { it.readText().trim() }
            assertEquals(expected, lines.joinToString("\n"))
        } finally { s.dispose() }
    }
    @Test fun loweringThenRestoringAMaximumDoesNotRefundClampedHealth() {
        val content = altered { tree -> (tree["statuses"][0] as ObjectNode).put("flat", -20).put("duration", 1) }
        val s = sim(enemies = emptyList(), content = content)
        try {
            select(s, "focus", hero); accepted(s, RollDiceCommand); accepted(s, UseAbilityCommand)
            assertEquals(80, view(s).current.hp); assertEquals(80, view(s).maximum.hp)
            accepted(s, EndTurnCommand)
            assertEquals(90, view(s).maximum.hp); assertEquals(80, view(s).current.hp)
        } finally { s.dispose() }
    }
    @Test fun manaAttackLocksMagicalMitigationAndReplayingRankChangeCannotReplaceLock() {
        val s = sim(loadout(modifiers = listOf(StatModifier("staff", ContentId("stat.magic_attack"), 11))))
        try {
            select(s, "spark"); accepted(s, RollDiceCommand)
            val locked = view(s).locked!!
            assertEquals(21, locked.inputs.attack); assertEquals(5, locked.inputs.defense)
            assertEquals(ResourceVector(0, 5, 0), locked.cost)
            rejectUnchanged(s, SelectAbilityCommand(ContentId("skill.sword"), enemy))
            accepted(s, EndTurnCommand); assertEquals(36, view(s).current.mp)
        } finally { s.dispose() }
    }

    @Test fun loadoutCostModifiersAreRoundedAndFrozenWithEveryReservedPool() {
        val input = loadout()
        val s = sim(CombatLoadout(input.learned, input.equipment.toSet(), costFlat = ResourceVector(-3, 0, 0),
            costPercent = ResourceVector(-10000, 1, -10000)))
        try {
            select(s, "blood"); accepted(s, RollDiceCommand)
            assertEquals(ResourceVector(1, 3, 1), view(s).reserved)
            accepted(s, RerollDiceCommand(listOf(0)))
            assertEquals(ResourceVector(1, 3, 1), view(s).reserved)
            accepted(s, EndTurnCommand)
            assertEquals(ResourceVector(89, 38, 40), view(s).current)
        } finally { s.dispose() }
    }

}
