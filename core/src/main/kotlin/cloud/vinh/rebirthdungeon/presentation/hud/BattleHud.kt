package cloud.vinh.rebirthdungeon.presentation.hud

import cloud.vinh.rebirthdungeon.application.run.*
import cloud.vinh.rebirthdungeon.game.commands.*
import cloud.vinh.rebirthdungeon.game.combat.abilities.BattleRules
import cloud.vinh.rebirthdungeon.game.combat.stats.*
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
    private val settings: PresentationSettings, private val settingsChanged: () -> Unit, private val developmentControls: Boolean = false, private val supplyCount: (ContentId) -> Int = { 0 }) {
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
    private val orderRow = Table()
    private val actionsRow = Table()
    private val navigation = Table()
    private val party = Label("", skin)
    private var battleMenu = false
    private var returnTo: (() -> Unit)? = null
    private val movement = Table()
    private val actions = linkedMapOf<TextButton, () -> Unit>()
    private val statusSummary = button("Statuses: none") { inspect() }
    private val attack = button("Attack") { model?.let { m -> observation?.actors?.firstOrNull { !it.player && it.hp > 0 }?.let { confirmSkill(BattleRules.normal, it.id) } } }
    private val skillButton = button("Skills") { skills() }
    private val defend = button("Defend") { model?.let { confirmSkill(BattleRules.defend, it.hero.id) } }
    private val potion = button("Items") { potions() }
    private val wait = button("Wait") { model?.let { request(WaitCommand(it.turn)) } }
    private val orderLabel = Label("", skin)
    private val restart = button("New run", newRun)
    private var model: BattleView? = null
    private var observation: BattleObservation? = null
    private var controller: BattleController? = null
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
        top.background = BattleFrame(skin.getDrawable("white")); bottom.background = BattleFrame(skin.getDrawable("white"))
        top.pad(8f); bottom.pad(10f)
        listOf(title, summary, costs, availability, party).forEach { it.setFontScale(1.25f); it.setWrap(true) }
        top.add(title).growX()
        top.add(button("Log") { showLog(true) }).minSize(56f, 40f).padLeft(8f)
        top.add(button("Options") { options() }).minSize(80f, 40f).padLeft(4f)
        top.add(statusSummary).minSize(88f, 40f).padLeft(4f)
        navigation.add(button("Retry save", retry)).minSize(88f, 48f).pad(4f)
        navigation.add(button("Skip", skip)).minSize(56f, 48f).pad(4f)
        navigation.add(button("Title", menu)).minSize(56f, 48f).pad(4f)
        orderLabel.setWrap(true)
        listOf(attack, skillButton, potion, defend, wait).forEach {
            it.label.setAlignment(com.badlogic.gdx.utils.Align.left)
            actionsRow.add(it).minHeight(40f).growX().row()
        }
        val status = Table()
        status.add(party).growX().left().row()
        status.add(summary).growX().padTop(10f).row()
        status.add(orderLabel).growX().padTop(8f)
        bottom.add(actionsRow).width(160f).top().padRight(18f)
        bottom.add(status).growX().top()
        hudLayer.top().left(); hudLayer.add(top).growX().row()
        hudLayer.add(availability).growX().height(32f).pad(4f).row()
        hudLayer.add().expand().row(); hudLayer.add(bottom).growX()
        displayPhase(false, false)
    }
    private fun button(text: String, action: () -> Unit): TextButton = TextButton(text, skin).also { b ->
        b.style = TextButton.TextButtonStyle(b.style).apply {
            up = BattleFrame(skin.getDrawable("white"))
            over = BattleFrame(skin.getDrawable("white"), true)
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
        if (!m.inBattle) return
        send(command, inputToken ?: m.token, inputRevision ?: m.revision)
    }
    fun resize(width: Float, height: Float, left: Float, right: Float, topInset: Float, bottomInset: Float) {
        compact = width - left - right < 760f || height - topInset - bottomInset < 500f
        bottom.getCell(actionsRow).width(if (compact) 128f else 160f)
        // Compact mode puts explanatory detail in the inspection sheet, preserving action target sizes.
        statusSummary.isVisible = !compact
        top.getCell(statusSummary).minWidth(if (compact) 0f else 100f).width(if (compact) 0f else 120f).padLeft(if (compact) 0f else 8f)
        displayPhase(model?.inBattle == true, model?.ready == true)
        hudLayer.invalidateHierarchy()
        hudLayer.pad(topInset + 8f, left + 8f, bottomInset + 8f, right + 8f)
        listOf(windowLayer, modalLayer, toastLayer).forEach { it.setSize(width, height) }
        modalLayer.children.firstOrNull()?.takeIf { it is Image }?.setSize(width, height)
        dialog?.let { sizeDialog(it) }
    }
    fun bind(c: BattleController, presenting: Boolean) {
        controller = c; val view = c.observe(); observation = view
        val m = c.battleView(presenting); model = m
        restart.setText(if (developmentControls) "Dev new run" else "Try again")
        restart.isVisible = false
        if (logRun != view.runId) { log.clear(); lastLogEvent = 0; logRun = view.runId }
        view.events.filter { it.sequence > lastLogEvent }.forEach { e ->
            appendLog(true, cloud.vinh.rebirthdungeon.presentation.hud.BattleLog.text(e))
            lastLogEvent = e.sequence
        }
        if (c.failure != lastFailure) { c.failure?.let { appendLog(false, "Save failure: $it") }; lastFailure = c.failure }
        if (m == null) {
            title.setText("Battle unavailable")
            party.setText("No active party"); displayPhase(false, true); bottom.isVisible = true; return
        }
        bottom.isVisible = true
        val h = m.hero
        party.setText("HERO     ${if (m.ready) "Ready" else ""}\nHP  ${h.current.hp} / ${h.maximum.hp}\nMP  ${h.current.mp} / ${h.maximum.mp}\nSP  ${StaminaRules.format(h.current.spTenths)} / ${StaminaRules.format(h.maximum.spTenths)}")
        statusSummary.setText(if (h.statuses.isEmpty()) "Statuses: none" else "[S] ${h.statuses.size} active\n" + h.statuses.joinToString { "${it.remaining} activations" })
        val combat = c.combatObservation()
        val turn = combat.turn
        title.setText("Round ${turn.round}  /  ${if (turn.active == h.id) "Hero" else "Enemy"}")
        summary.setText("${if (turn.itemUsed) "Item used" else "Item available"}")
        orderLabel.setText(turn.order.joinToString("  >  ") { entry ->
            val name = if (entry.actor == h.id) "Hero" else "Enemy"
            val dead = combat.actors.firstOrNull { it.id == entry.actor }?.current?.hp == 0
            "${if (entry.actor == turn.active) "[" else ""}$name ${entry.speed}${if (dead) " defeated" else ""}${if (entry.actor == turn.active) "]" else ""}"
        })
        attack.isDisabled = !m.attack.enabled; defend.isDisabled = !m.defend.enabled
        skillButton.isDisabled = !m.ready; potion.isDisabled = !m.item.enabled
        wait.isDisabled = !m.wait.enabled; wait.isVisible = m.wait.enabled
        actionsRow.getCell(wait).height(if (wait.isVisible) 40f else 0f).minHeight(if (wait.isVisible) 40f else 0f)
        if (focused == null && m.ready && !hasModal) focus(attack.takeUnless { it.isDisabled } ?: skillButton)
        availability.setText(if (!m.ready) m.message else view.events.lastOrNull { it.event !is cloud.vinh.rebirthdungeon.game.events.TurnStarted && it.event !is cloud.vinh.rebirthdungeon.game.events.ActivationEnded }?.let { BattleLog.text(it) } ?: m.message)
        displayPhase(m.inBattle, m.ready)
        bottom.invalidateHierarchy()
    }
    private fun displayPhase(inBattle: Boolean, canMove: Boolean) {
        actionsRow.isVisible = inBattle
        availability.isVisible = true
    }
    private fun appendLog(combat: Boolean, text: String) {
        log.addLast(combat to text); while (log.size > 100) log.removeFirst()
    }
    fun saving() {
        title.setText("Saving — commands are paused until the checkpoint is durable")
        listOf(attack, skillButton, potion, defend, wait).forEach { it.isDisabled = true }
        movement.isVisible = false
    }
    fun systemMessage(text: String) { appendLog(false, text); availability.setText(text); if (model?.inBattle != true) title.setText(text) }
    private fun potions() {
        val m = model ?: return
        show("Items", "One item before your command", battle = true) { d ->
            val choices = Table()
            content.potions.values.forEach { definition ->
                val count = supplyCount(definition.id)
                val b = button("${definition.name} ($count)") {
                    close(); send(DrinkPotionCommand(m.turn, definition.id), m.token, m.revision)
                }
                b.isDisabled = count <= 0 || !m.item.enabled || !BattleRules.potionUseful(m.hero, definition, content)
                choices.add(b).growX().minHeight(48f).pad(4f).row()
            }
            d.contentTable.row(); d.contentTable.add(choices).growX()
        }
    }
    private fun confirmSkill(id: ContentId, target: EntityId) {
        val m = model ?: return
        val targetActor = controller?.combatObservation()?.actors?.firstOrNull { it.id == target } ?: return
        val definition = content.skills.getValue(id)
        if (BattleRules.failure(m.hero, targetActor, definition) != null || !m.ready) return
        val ability = BattleRules.resolve(m.hero, targetActor, definition)
        val cost = ability.cost
        val result = if (definition.effect == SkillEffect.DAMAGE) DamageRules.resolve(ability.inputs, targetActor.shield, targetActor.current.hp) else null
        val effect = result?.let { "${it.hpDamage} HP damage; ${it.shieldAbsorbed} shield absorbed" } ?: when (definition.effect) {
            SkillEffect.DEFEND -> "+2 Defense, +5 Protection until your next turn"
            SkillEffect.SHIELD -> "${ability.rank.basePower} shield for ${definition.shieldDuration} owner turns"
            else -> "Apply ${definition.status?.value}"
        }
        show("${definition.name} / ${if (target == m.hero.id) "Hero" else "Enemy"}", "HP ${cost.hp} / MP ${cost.mp} / SP ${StaminaRules.format(cost.spTenths)}\n$effect", battle = true, back = if (id != BattleRules.normal && id != BattleRules.defend) ::skills else null) { d ->
            d.buttonTable.add(button("Confirm") {
                close()
                val command = when (id) {
                    BattleRules.normal -> AttackCommand(m.turn, target)
                    BattleRules.defend -> DefendCommand(m.turn)
                    else -> UseSkillCommand(m.turn, id, target)
                }
                send(command, m.token, m.revision)
            }).minHeight(48f).pad(4f)
        }
    }
    private fun show(title: String, text: String, battle: Boolean = false, back: (() -> Unit)? = null, extra: (Dialog) -> Unit = {}) {
        close(); opener = stage.keyboardFocus; onModal(); battleMenu = battle; returnTo = back
        val shade = Image(skin.newDrawable("white", com.badlogic.gdx.graphics.Color(0f, 0f, 0f, 0.65f)))
        shade.setSize(stage.width, stage.height); if (!battle) modalLayer.addActor(shade)
        val d = Dialog(title, skin); dialog = d; d.isModal = true; d.isMovable = false
        d.style = Window.WindowStyle(d.style).apply { titleFontColor = com.badlogic.gdx.graphics.Color.WHITE; background = BattleFrame(skin.getDrawable("white")) }
        d.padTop(if (battle) 32f else 44f); d.titleLabel.setFontScale(1.33f)
        val label = Label(text, skin); label.setFontScale(1.33f); label.setWrap(true)
        val contentTable = Table(); contentTable.add(label).width(minOf(stage.width - 80f, 600f)).growX()
        d.contentTable.add(ScrollPane(contentTable, skin)).grow().minHeight(64f)
        val close = button("Back") { this.back() }; d.buttonTable.add(close).minHeight(48f).pad(4f)
        extra(d)
        if (d.contentTable.cells.size > 1) d.contentTable.cells.first().expand(1, 0).height(if (battle) 32f else 80f)
        d.show(stage); modalLayer.addActor(d); sizeDialog(d)
        focus(if (battle) actions.keys.firstOrNull { it != close && it.isDescendantOf(d) && !it.isDisabled } ?: close else close)
    }
    private fun back() { val previous = returnTo; close(); previous?.invoke() }
    private fun sizeDialog(d: Dialog) {
        if (battleMenu) {
            d.setSize(stage.width - hudLayer.padLeft - hudLayer.padRight, minOf(stage.height - 80f, if (compact) 240f else 290f))
            d.setPosition(hudLayer.padLeft, hudLayer.padBottom)
            return
        }
        d.setSize(minOf(stage.width - 32f, if (compact) stage.width - 32f else 700f), maxOf(100f, minOf(stage.height - 32f, 500f)))
        d.setPosition((stage.width - d.width) / 2, (stage.height - d.height) / 2)
    }
    fun close(): Boolean {
        val d = dialog ?: return false
        d.remove(); actions.keys.filter { it.isDescendantOf(d) && !it.isDescendantOf(navigation) }.toList().forEach { actions.remove(it) }
        modalLayer.clearChildren()
        dialog = null; returnTo = null; battleMenu = false; stage.keyboardFocus = opener; focused = opener as? TextButton; opener = null
        return true
    }
    private fun skills() {
        val m = model ?: return; val c = controller ?: return; val view = observation ?: return
        if (!m.inBattle) {
            show("Skills", learnedSkillsText(m) + "\n\nEncounter an enemy to select a battle skill.")
            return
        }
        show("Skills", "Choose a skill", battle = true) { d ->
            val choices = Table()
            m.hero.learned.filterKeys { it != BattleRules.normal && it != BattleRules.defend }.forEach { (id, rank) ->
                val definition = content.skills.getValue(id)
                val targets = if (definition.target == TargetKind.SELF) listOf(view.player) else view.actors.filter { !it.player && it.hp > 0 }.map { it.id }
                targets.forEach { target ->
                    val reason = c.selectionFailure(id, target)
                    val b = button("${definition.name} $rank    ${BattleRules.cost(m.hero, definition).let { "${it.mp} MP / ${StaminaRules.format(it.spTenths)} SP" }}${reason?.let { "  / $it" } ?: ""}") {
                        close(); confirmSkill(id, target)
                    }
                    b.isDisabled = reason != null || !m.ready
                    b.label.setAlignment(com.badlogic.gdx.utils.Align.left)
                    choices.add(b).minHeight(44f).growX().pad(2f).row()
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
            append("VITALS\nHP ${h.current.hp} / ${h.maximum.hp}\nMana ${h.current.mp} / ${h.maximum.mp}\nStamina ${StaminaRules.format(h.current.spTenths)} / ${StaminaRules.format(h.maximum.spTenths)}\n\n")
            append("ATTRIBUTES\n")
            h.stats.forEach { (id, value) -> append("${id.value.removePrefix("stat.").replace('_', ' ')}  $value\n") }
            append("\nLevel and experience progression are not implemented yet.")
        })
    }
    private fun inspect() {
        val m = model ?: return
        if (!m.inBattle) { character(); return }
        val h = m.hero
        val text = buildString {
            append("${m.message}\nAttack: ${m.attack.reason}\nDefend: ${m.defend.reason}\nItems: ${m.item.reason}\n")
            append("\nShield: ${h.shield} (${h.shieldDuration} owner turns)\n")
            append("Statuses: ${h.statuses.joinToString { "${it.definition.value}: ${it.remaining} turns" }}\n")
            append("Cooldowns: ${h.cooldowns}\n")
            append("Combat Mastery ${h.masteryRank}: ${StaminaRules.format(StaminaRules.recovery(h.masteryRank))} SP at turn start\n")
            append("Captured Speed: ${controller?.combatObservation()?.turn?.order?.firstOrNull { it.actor == h.id }?.speed}\n")
            append("\nAttributes: ${h.stats}\n")
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
        val y = if (battleMenu && dialog != null) dialog!!.y + dialog!!.height else hudLayer.padBottom + if (bottom.isVisible) bottom.height else 0f
        return com.badlogic.gdx.math.Rectangle(hudLayer.padLeft, y, maxOf(1f, stage.width - hudLayer.padLeft - hudLayer.padRight),
            maxOf(1f, stage.height - hudLayer.padTop - top.height - 40f - y))
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
        if (keycode == Input.Keys.ESCAPE || keycode == Input.Keys.BACK) { if (hasModal) back() else options(); return true }
        if (keycode == Input.Keys.TAB || keycode == Input.Keys.UP || keycode == Input.Keys.DOWN) {
            val available = actions.keys.filter { it.stage != null && it.isVisible && it.ancestorsVisible() && !it.isDisabled &&  (if (hasModal) it.isDescendantOf(dialog) else keycode == Input.Keys.TAB || it.isDescendantOf(actionsRow)) }
            if (available.isNotEmpty()) {
                val index = available.indexOf(focused)
                focus(available[(index + (if (shift || keycode == Input.Keys.UP) -1 else 1) + available.size) % available.size])
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
        return hasModal
    }
    private fun Actor.ancestorsVisible(): Boolean { var a: Actor? = this; while (a != null) { if (!a.isVisible) return false; a = a.parent }; return true }
}
