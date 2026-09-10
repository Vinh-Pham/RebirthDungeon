package cloud.vinh.rebirthdungeon.presentation.hud

import cloud.vinh.rebirthdungeon.application.run.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.content.*
import cloud.vinh.rebirthdungeon.game.identity.*
import cloud.vinh.rebirthdungeon.game.projection.*
import com.badlogic.gdx.Input
import com.badlogic.gdx.math.Vector2
import com.badlogic.gdx.scenes.scene2d.*
import com.badlogic.gdx.scenes.scene2d.ui.*
import ktx.actors.onClick

/** One Stage, stable widgets, four explicit layers. Inspection never changes a combat selection. */
class BattleHud(val stage: Stage, private val skin: Skin, private val content: ContentCatalog,
    private val send: (RunCommand, Long, Long) -> Unit, private val menu: () -> Unit,
    private val retry: () -> Unit, private val skip: () -> Unit, private val newRun: () -> Unit,
    private val settings: PresentationSettings, private val settingsChanged: () -> Unit, private val developmentControls: Boolean = false) {
    val hudLayer = Table()
    val windowLayer = Group()
    val modalLayer = Group()
    val toastLayer = Group()
    val top = Table(skin)
    val bottom = Table(skin)
    private val title = Label("Loading checkpoint...", skin)
    private val summary = Label("", skin)
    private val costs = Label("", skin)
    private val availability = Label("", skin)
    private val diceRow = Table()
    private val actionsRow = Table()
    private val navigation = Table()
    private val dock: GameBar
    private val movement = Table()
    private val actions = linkedMapOf<TextButton, () -> Unit>()
    private val statusSummary = button("Statuses: none") { inspect() }
    private val dice = (0..4).map { id -> button("${id + 1}: -") { model?.let { request(KeepDieCommand(id, !it.hero.kept[id])) } } }
    private val roll = button("Roll") { request(RollDiceCommand) }
    private val reroll = button("Reroll unkept") { model?.let { request(RerollDiceCommand(it.unkept)) } }
    private val use = button("Use Skill") { request(UseAbilityCommand) }
    private val pass = button("Pass") { confirmPass() }
    private val restart = button("New run", newRun)
    private var model: BattleView? = null
    private var observation: DungeonObservation? = null
    private var controller: RunController? = null
    private var dialog: Dialog? = null
    private var opener: Actor? = null
    private var compact = false
    private var focused: TextButton? = null
    private var lastLogEvent = 0L
    private var logRun = ""
    private val log = ArrayDeque<Pair<Boolean, String>>()
    private var lastFailure: String? = null
    var onModal: () -> Unit = {}
    var inputRevision: Long? = null
    var inputToken: Long? = null
    val hasModal get() = dialog != null
    init {
        toastLayer.addActor(object : Actor() {
            override fun draw(batch: com.badlogic.gdx.graphics.g2d.Batch, parentAlpha: Float) {
                val b = focused ?: return
                if (b.stage == null || !b.ancestorsVisible()) return
                val p = b.localToStageCoordinates(Vector2())
                val drawable = skin.getDrawable("white")
                val old = com.badlogic.gdx.graphics.Color(batch.color)
                batch.setColor(1f, 0.85f, 0.4f, parentAlpha)
                drawable.draw(batch, p.x - 2, p.y - 2, b.width + 4, 2f)
                drawable.draw(batch, p.x - 2, p.y + b.height, b.width + 4, 2f)
                drawable.draw(batch, p.x - 2, p.y, 2f, b.height)
                drawable.draw(batch, p.x + b.width, p.y, 2f, b.height)
                batch.color = old
            }
        })
        listOf(hudLayer, windowLayer, modalLayer, toastLayer).forEach { stage.addActor(it) }
        hudLayer.setFillParent(true); hudLayer.touchable = Touchable.childrenOnly
        windowLayer.touchable = Touchable.childrenOnly; modalLayer.touchable = Touchable.childrenOnly
        toastLayer.touchable = Touchable.disabled
        top.background = HudFrame(skin.getDrawable("white")); bottom.background = HudFrame(skin.getDrawable("white"))
        dock = GameBar(skin, ::button, ::character, ::skills,
            { show("Quests", "The quest journal is not implemented yet.") },
            { show("Inventory", "Inventory and equipment management are not implemented yet.") },
            { show("Pets", "Pets are not implemented yet.") }, ::inspect, ::options, menu)
        top.pad(8f); bottom.pad(8f)
        listOf(title, summary, costs, availability).forEach { it.setFontScale(1.33f) }
        title.setWrap(true); summary.setWrap(true); costs.setWrap(true); availability.setWrap(true)
        top.add(title).growX()
        top.add(statusSummary).minSize(100f, 48f).padLeft(8f)
        navigation.add(button("Retry save", retry)).minSize(88f, 48f).pad(4f)
        navigation.add(button("Skip", skip)).minSize(56f, 48f).pad(4f)
        navigation.add(restart).minSize(72f, 48f).pad(4f); restart.isVisible = false
        dice.forEach { diceRow.add(it).minSize(64f, 48f).pad(4f).growX() }
        listOf(roll, reroll, use, pass).forEach { actionsRow.add(it).minSize(72f, 48f).pad(4f).growX() }
        listOf("<" to MoveCommand(-1, 0), "^" to MoveCommand(0, 1), "v" to MoveCommand(0, -1), ">" to MoveCommand(1, 0), "Wait" to WaitCommand).forEach { (name, command) ->
            movement.add(button(name) { request(command) }).minSize(48f, 48f).pad(4f)
        }
        bottom.add(summary).growX().row(); bottom.add(costs).growX().row()
        bottom.add(diceRow).growX().row(); bottom.add(actionsRow).growX().row(); bottom.add(availability).growX().row()
        bottom.add(movement).right().row()
        bottom.add(dock).growX().padTop(6f)
        hudLayer.top().left(); hudLayer.add(top).growX().row()
        hudLayer.add().expand().row(); hudLayer.add(bottom).growX()
        displayPhase(false, false)
    }
    private fun button(text: String, action: () -> Unit): TextButton = TextButton(text, skin).also { b ->
        b.style = TextButton.TextButtonStyle(b.style).apply {
            up = HudFrame(skin.getDrawable("white"))
            over = HudFrame(skin.getDrawable("white"), true)
            down = over; focused = over; checked = over
            disabled = up
            disabledFontColor = com.badlogic.gdx.graphics.Color.valueOf("637b7e")
        }
        b.pad(6f, 10f, 6f, 10f)
        b.label.setFontScale(1.25f)
        actions[b] = action
        b.onClick { if (!b.isDisabled) { focus(b); action() } }
    }
    private fun request(command: RunCommand) {
        val m = model ?: return
        if (!m.inBattle && command !is MoveCommand && command != WaitCommand) return
        send(command, inputToken ?: m.token, inputRevision ?: m.revision)
    }
    fun resize(width: Float, height: Float, left: Float, right: Float, topInset: Float, bottomInset: Float) {
        compact = width - left - right < 760f || height - topInset - bottomInset < 500f
        dock.arrange(width - left - right < 760f)
        // Compact mode puts explanatory detail in the inspection sheet, preserving dice/action target sizes.
        statusSummary.isVisible = !compact
        top.getCell(statusSummary).minWidth(if (compact) 0f else 100f).width(if (compact) 0f else 120f).padLeft(if (compact) 0f else 8f)
        displayPhase(model?.inBattle == true, model?.pass?.enabled == true)
        hudLayer.invalidateHierarchy()
        hudLayer.pad(topInset + 8f, left + 8f, bottomInset + 8f, right + 8f)
        listOf(windowLayer, modalLayer, toastLayer).forEach { it.setSize(width, height) }
        modalLayer.children.firstOrNull()?.takeIf { it is Image }?.setSize(width, height)
        dialog?.let { sizeDialog(it) }
    }
    fun bind(c: RunController, presenting: Boolean) {
        controller = c; val view = c.observe(); observation = view
        val m = c.battleView(presenting); model = m
        restart.setText(if (developmentControls) "Dev new run" else "Try again")
        restart.isVisible = (c.combatObservation()?.defeated == true || developmentControls) && c.failure == null
        if (logRun != view.runId) { log.clear(); lastLogEvent = 0; logRun = view.runId }
        view.events.filter { it.sequence > lastLogEvent }.forEach { e ->
            appendLog(e.event.javaClass.simpleName !in setOf("ActorMoved", "ActivationEnded", "TileExplored"), e.event.toString())
            lastLogEvent = e.sequence
        }
        if (c.failure != lastFailure) { c.failure?.let { appendLog(false, "Save failure: $it") }; lastFailure = c.failure }
        if (m == null) {
            title.setText("Movement checkpoint — continue exploring. Combat is available in new runs.")
            dock.bind(null); displayPhase(false, true); bottom.isVisible = true; return
        }
        bottom.isVisible = true
        val h = m.hero
        dock.bind(h)
        statusSummary.setText(if (h.statuses.isEmpty()) "Statuses: none" else "[S] ${h.statuses.size} active\n" + h.statuses.joinToString { "${it.remaining} activations" })
        val selection = h.locked?.selection ?: h.selection
        val skill = selection?.let { content.skills.getValue(it.skill) }
        val stateMessage = if (c.failure != null) "Save failed — Options > Retry save" else
            (c.combatObservation()?.outcome?.let { "$it — " } ?: "") + (if (view.reachedExit) "Floor exit reached. " else "") + m.message
        title.setText("${if (m.inBattle) "Battle" else "Exploration"}  /  Floor 1  /  ${view.playerCell.x}, ${view.playerCell.y}   |   $stateMessage")
        val target = view.actors.firstOrNull { it.id == selection?.target }
        summary.setText((skill?.name ?: "Choose Skills or approach a hostile") + (selection?.let { " ${it.rank} / ${if (target?.player == true) "Self" else "Enemy"} ${target?.hp ?: "?"}/${target?.maxHp ?: "?"}" } ?: "") +
            if (h.locked != null) " [LOCKED]" else "")
        costs.setText("Reserved HP ${h.reserved.hp}, MP ${h.reserved.mp}, SP ${h.reserved.sp}" +
            (m.score?.let { " | ${it.pips} pips / ${it.combination.name.replace('_', ' ')} " + h.locked!!.let { l -> content.scoring.getValue(l.definition.scoring).multipliers.getValue(it.combination).let { r -> "${r.numerator}/${r.denominator}x" } } } ?: ""))
        dice.forEachIndexed { i, b ->
            b.setText("${i + 1}: ${h.faces[i].takeIf { it > 0 } ?: "-"}\n${if (h.kept[i]) "[KEPT]" else "REROLL"}")
            b.isDisabled = h.locked == null || !m.pass.enabled
            b.isChecked = h.kept[i]
        }
        roll.isDisabled = !m.roll.enabled; reroll.isDisabled = !m.reroll.enabled
        use.isDisabled = !m.use.enabled; pass.isDisabled = !m.pass.enabled
        reroll.setText("Reroll unkept (${m.unkept.size})\n${h.rerolls} remaining")
        pass.setText(if (h.locked == null) "Pass" else "Pass (paid)")
        availability.setText(if (presenting) m.message else when {
            !m.pass.enabled -> m.pass.reason
            h.locked != null -> if (!m.reroll.enabled) m.reroll.reason else "Keep 1–5; Use Skill commits. Pass spends reserved costs."
            else -> m.roll.reason
        })
        displayPhase(m.inBattle, m.pass.enabled)
        bottom.invalidateHierarchy()
    }
    private fun displayPhase(inBattle: Boolean, canMove: Boolean) {
        movement.isVisible = !inBattle && canMove
        bottom.getCell(movement).height(if (movement.isVisible) 56f else 0f)
        listOf(summary, costs, diceRow, actionsRow, availability).forEach {
            it.isVisible = inBattle && (it != availability || !compact)
        }
        bottom.getCell(summary).height(if (inBattle) summary.prefHeight else 0f)
        bottom.getCell(costs).height(if (inBattle) costs.prefHeight else 0f)
        bottom.getCell(diceRow).height(if (inBattle) 56f else 0f)
        bottom.getCell(actionsRow).height(if (inBattle) 64f else 0f)
        bottom.getCell(availability).height(if (inBattle && !compact) 32f else 0f)
    }
    private fun appendLog(combat: Boolean, text: String) {
        log.addLast(combat to text); while (log.size > 100) log.removeFirst()
    }
    fun saving() {
        title.setText("Saving — commands are paused until the checkpoint is durable")
        (dice + listOf(roll, reroll, use, pass)).forEach { it.isDisabled = true }
        movement.isVisible = false
    }
    fun systemMessage(text: String) { appendLog(false, text); availability.setText(text); if (model?.inBattle != true) title.setText(text) }
    private fun confirmPass() {
        val m = model ?: return
        if (m.hero.locked == null) { request(EndTurnCommand); return }
        val token = m.token; val revision = m.revision; val c = m.hero.reserved
        show("Pass — discard this hand", "Spend HP ${c.hp}, MP ${c.mp}, SP ${c.sp}. Discard all five dice.\nCancel keeps your hand and rerolls.") { d ->
            val confirm = button("Spend and Pass") { close(); send(EndTurnCommand, token, revision) }
            d.buttonTable.add(confirm).minHeight(48f).pad(4f)
        }
    }
    private fun show(title: String, text: String, extra: (Dialog) -> Unit = {}) {
        close(); opener = stage.keyboardFocus; onModal()
        val shade = Image(skin.newDrawable("white", com.badlogic.gdx.graphics.Color(0f, 0f, 0f, 0.65f)))
        shade.setSize(stage.width, stage.height); modalLayer.addActor(shade)
        val d = Dialog(title, skin); dialog = d; d.isModal = true; d.isMovable = false
        d.style = Window.WindowStyle(d.style).apply { titleFontColor = com.badlogic.gdx.graphics.Color.WHITE; background = HudFrame(skin.getDrawable("white")) }
        d.padTop(44f); d.titleLabel.setFontScale(1.33f)
        val label = Label(text, skin); label.setFontScale(1.33f); label.setWrap(true)
        val contentTable = Table(); contentTable.add(label).width(minOf(stage.width - 80f, 600f)).growX()
        d.contentTable.add(ScrollPane(contentTable, skin)).grow().minHeight(64f)
        val close = button("Close / Cancel") { close() }; d.buttonTable.add(close).minHeight(48f).pad(4f)
        extra(d)
        if (d.contentTable.cells.size > 1) d.contentTable.cells.first().expand(1, 0).height(80f)
        d.show(stage); modalLayer.addActor(d); sizeDialog(d); focus(close)
    }
    private fun sizeDialog(d: Dialog) {
        d.setSize(minOf(stage.width - 32f, if (compact) stage.width - 32f else 700f), maxOf(100f, minOf(stage.height - 32f, 500f)))
        d.setPosition((stage.width - d.width) / 2, (stage.height - d.height) / 2)
    }
    fun close(): Boolean {
        val d = dialog ?: return false
        d.remove(); actions.keys.filter { it.isDescendantOf(d) && !it.isDescendantOf(navigation) }.toList().forEach { actions.remove(it) }
        modalLayer.clearChildren()
        dialog = null; stage.keyboardFocus = opener; focused = opener as? TextButton; opener = null
        return true
    }
    private fun skills() {
        val m = model ?: return; val c = controller ?: return; val view = observation ?: return
        if (!m.inBattle) {
            show("Skills", learnedSkillsText(m) + "\n\nEncounter an enemy to select a battle skill.")
            return
        }
        show("Skills and targets", if (m.hero.locked != null) "Inputs locked until Use Skill or paid Pass." else "Select a skill and a visible target. Unavailable choices explain why.") { d ->
            val choices = Table()
            m.hero.learned.forEach { (id, rank) ->
                val definition = content.skills.getValue(id)
                val targets = if (definition.target == TargetKind.SELF) listOf(view.player) else view.actors.filter { !it.player && it.hp > 0 }.map { it.id }
                targets.forEach { target ->
                    val reason = if (m.hero.locked != null) "Locked" else c.selectionFailure(id, target)
                    val b = button("${definition.name} $rank / target ${target.value}\n${reason ?: "Select"}") {
                        close(); send(SelectAbilityCommand(id, target), m.token, m.revision)
                    }
                    b.isDisabled = reason != null || !m.pass.enabled
                    choices.add(b).minHeight(48f).growX().pad(4f).row()
                }
            }
            d.contentTable.row(); d.contentTable.add(ScrollPane(choices, skin)).grow()
        }
    }
    private fun learnedSkillsText(m: BattleView) = m.hero.learned.entries.joinToString("\n") { (id, rank) ->
        "${content.skills.getValue(id).name} / Rank $rank"
    }
    private fun character() {
        val h = model?.hero ?: return show("Character", "Character information is unavailable for this checkpoint.")
        show("Character / Active run", buildString {
            append("VITALS\nHP ${h.current.hp} / ${h.maximum.hp}\nMana ${h.current.mp} / ${h.maximum.mp}\nStamina ${h.current.sp} / ${h.maximum.sp}\n\n")
            append("ATTRIBUTES\n")
            h.stats.forEach { (id, value) -> append("${id.value.removePrefix("stat.").replace('_', ' ')}  $value\n") }
            append("\nLevel and experience progression are not implemented yet.")
        })
    }
    private fun inspect() {
        val m = model ?: return
        if (!m.inBattle) { character(); return }
        val h = m.hero
        val selection = h.locked?.selection ?: h.selection
        val definition = selection?.let { content.skills.getValue(it.skill) }
        val rank = h.locked?.rank ?: selection?.let { s -> definition?.ranks?.single { it.rank == s.rank } }
        val text = buildString {
            observation?.let { append("Floor 1 (${it.playerCell.x}, ${it.playerCell.y})\n") }
            append("${m.roll.reason}\nReroll: ${m.reroll.reason}\nUse Skill: ${m.use.reason}\nPass: ${m.pass.reason}\n\n")
            rank?.let { r ->
                val total = r.weights.sum().toDouble()
                append("Face probabilities (rerolls are not guaranteed to improve):\n")
                r.weights.forEachIndexed { i, weight -> append("${i + 1}: ${"%.1f".format(weight * 100 / total)}%  ") }
                val cost = h.locked?.cost ?: ResourceVector(
                    cloud.vinh.rebirthdungeon.game.combat.stats.StatRules.cost(r.cost.hp, h.costFlat.hp, h.costPercent.hp),
                    cloud.vinh.rebirthdungeon.game.combat.stats.StatRules.cost(r.cost.mp, h.costFlat.mp, h.costPercent.mp),
                    cloud.vinh.rebirthdungeon.game.combat.stats.StatRules.cost(r.cost.sp, h.costFlat.sp, h.costPercent.sp))
                append("\nFinal cost: HP ${cost.hp}, MP ${cost.mp}, SP ${cost.sp}\n")
            }
            h.locked?.let { append("Frozen inputs: ${it.inputs}\n") }
            h.locked?.takeIf { it.definition.effect == SkillEffect.SHIELD }?.let {
                append("Shield preview: ${cloud.vinh.rebirthdungeon.game.combat.abilities.AbilityPreviewRules.shield(it, h.faces, content.scoring.getValue(it.definition.scoring))} for ${it.definition.shieldDuration} owner activations\n")
            }
            definition?.status?.let { id -> content.statuses.getValue(id).let { append("Status effect: ${it.stat.value}, flat ${it.flat}, percent ${it.percent}, duration ${it.duration} owner activations\n") } }
            h.preview?.let { append("Shared preview: ${it.hpDamage} HP damage, ${it.shieldAbsorbed} shield absorbed\n") }
            run {
                val scoring = definition?.scoring ?: content.skills.getValue(content.actors.getValue(ContentId("actor.hero")).skill).scoring
                append("\nCombination reference (single highest match):\n")
                content.scoring.getValue(scoring).multipliers.forEach { (combo, ratio) -> append("${combo.name.replace('_', ' ')}: ${ratio.numerator}/${ratio.denominator}x\n") }
            }
            controller?.combatObservation()?.actors?.firstOrNull { it.id == selection?.target && it.id != h.id }?.let { target ->
                append("\nObserved target HP ${target.current.hp}/${target.maximum.hp}\n")
                append("Known defenses: ${target.stats.filterKeys { it.value in setOf("stat.defense", "stat.protection", "stat.magic_defense", "stat.magic_protection") }}\n")
                append("Target statuses: ${target.statuses.joinToString { "${it.definition.value}: ${it.remaining} activations / source ${it.source.value}" }}\n")
                append("Future intent: not observed\n")
            }
            append("\nShield: ${h.shield} (${h.shieldDuration} owner activations)\n")
            append("Statuses: ${h.statuses.joinToString { "${it.definition.value}: ${it.remaining} owner activations / source ${it.source.value}" }}\n")
            append("Cooldowns: ${h.cooldowns}\n\nStat sources:\n${h.baseline}\n${h.modifiers}\nEffective: ${h.stats}")
        }
        show("Battle inspection", text) { d ->
            d.buttonTable.add(button("Combat log") { showLog(true) }).minHeight(48f).pad(4f)
            d.buttonTable.add(button("System log") { showLog(false) }).minHeight(48f).pad(4f)
        }
    }
    private fun options(): Unit = show("Presentation options", "These options affect presentation only. Preferences last until the application closes.") { d ->
        val optionTable = Table()
        optionTable.add(navigation).growX().row()
        fun toggle(text: String, change: () -> Unit) {
            optionTable.add(button(text) { change(); settingsChanged(); options() }).minHeight(48f).growX().pad(4f).row()
        }
        toggle("UI / text: ${if (settings.uiScale > 1f) "Large" else "Normal"}") { settings.uiScale = if (settings.uiScale > 1f) 1f else 1.25f }
        toggle("Reduced motion: ${settings.reducedMotion}") { settings.reducedMotion = !settings.reducedMotion }
        toggle("Sound: ${settings.sound}") { settings.sound = !settings.sound }
        toggle("Optional haptics: ${settings.haptics}") { settings.haptics = !settings.haptics }
        d.contentTable.row(); d.contentTable.add(ScrollPane(optionTable, skin)).grow()
    }
    private fun showLog(combat: Boolean) = show(if (combat) "Combat log" else "System log", log.filter { it.first == combat }.joinToString("\n") { it.second }.ifEmpty { "No events" })
    fun worldBounds(): com.badlogic.gdx.math.Rectangle {
        hudLayer.validate()
        val y = hudLayer.padBottom + if (bottom.isVisible) bottom.height else 0f
        return com.badlogic.gdx.math.Rectangle(hudLayer.padLeft, y, maxOf(1f, stage.width - hudLayer.padLeft - hudLayer.padRight),
            maxOf(1f, stage.height - hudLayer.padTop - top.height - y))
    }
    fun owns(screenX: Int, screenY: Int): Boolean {
        if (hasModal) return true
        val p = stage.screenToStageCoordinates(Vector2(screenX.toFloat(), screenY.toFloat()))
        fun contains(a: Actor): Boolean { val q = a.stageToLocalCoordinates(Vector2(p)); return a.isVisible && q.x >= 0 && q.y >= 0 && q.x < a.width && q.y < a.height }
        return contains(top) || contains(bottom) || p.x < hudLayer.padLeft || p.x > stage.width - hudLayer.padRight ||
            p.y < hudLayer.padBottom || p.y > stage.height - hudLayer.padTop
    }
    private fun focus(button: TextButton) {
        focused?.let { it.color.set(1f, 1f, 1f, 1f) }
        focused = button; stage.keyboardFocus = button; button.color.set(1f, 0.85f, 0.4f, 1f)
        var parent = button.parent
        while (parent != null) {
            if (parent is ScrollPane) {
                val p = button.localToAscendantCoordinates(parent.actor, Vector2())
                parent.scrollTo(p.x, p.y, button.width, button.height); parent.updateVisualScroll()
            }
            parent = parent.parent
        }
    }
    fun key(keycode: Int, shift: Boolean): Boolean {
        if (keycode == Input.Keys.ESCAPE || keycode == Input.Keys.BACK) { if (!close()) menu(); return true }
        if (keycode == Input.Keys.TAB) {
            val available = actions.keys.filter { it.stage != null && it.isVisible && it.ancestorsVisible() && !it.isDisabled && (!hasModal || it.isDescendantOf(dialog)) }
            if (available.isNotEmpty()) {
                val index = available.indexOf(focused)
                focus(available[(index + (if (shift) -1 else 1) + available.size) % available.size])
            }
            return true
        }
        if (keycode == Input.Keys.ENTER || keycode == Input.Keys.SPACE) {
            focused?.takeIf { it.stage != null && it.ancestorsVisible() && !it.isDisabled && (!hasModal || it.isDescendantOf(dialog)) }?.let { actions[it]?.invoke() }
            return true
        }
        if (!hasModal) {
            when (keycode) {
                Input.Keys.C -> { character(); return true }
                Input.Keys.Z -> { skills(); return true }
                Input.Keys.Q -> { show("Quests", "The quest journal is not implemented yet."); return true }
                Input.Keys.I -> { show("Inventory", "Inventory and equipment management are not implemented yet."); return true }
            }
        }
        if (!hasModal && model?.inBattle == true && keycode in Input.Keys.NUM_1..Input.Keys.NUM_5) {
            val die = dice[keycode - Input.Keys.NUM_1]; if (!die.isDisabled) actions[die]?.invoke(); return true
        }
        return hasModal
    }
    private fun Actor.ancestorsVisible(): Boolean { var a: Actor? = this; while (a != null) { if (!a.isVisible) return false; a = a.parent }; return true }
}
