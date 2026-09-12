extends CanvasLayer
signal closed
signal command_requested(kind: String, data: Dictionary)
const Rules = preload("res://scripts/domain/rules/progression_rules.gd")
var snapshot: Dictionary
var catalog: RefCounted
var preview: Callable
var services: bool = false
var tab: String = "Inventory"
var selected: String = ""
var container: String = "backpack"
var _body: VBoxContainer
var _content: VBoxContainer
var _notice: Label
var _quantity: SpinBox
var _search: LineEdit
var _busy: bool = false

func start(observation: Dictionary, definitions: RefCounted, initial_tab: String, service_access: bool, previewer: Callable) -> void:
	snapshot = observation.duplicate(true)
	catalog = definitions
	tab = initial_tab
	services = service_access
	preview = previewer
	layer = 10
	name = "Progression"
	var background := ColorRect.new()
	background.color = Color("#101b20")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for edge: String in ["left","right","top","bottom"]: margin.add_theme_constant_override("margin_"+edge,24)
	background.add_child(margin)
	_body = VBoxContainer.new()
	_body.theme = load("res://scenes/battle/battle_theme.tres")
	margin.add_child(_body)
	var heading := Label.new()
	var g: Dictionary = snapshot.hero.growth
	heading.text = "HAVEN JOURNAL   •   Carried %d / Bank %d   •   Level %d / %d   •   AP %d" % [snapshot.hero.committed_gold,g.banked,g.level,Rules.CONFIG.xp_to_next.size()+1,g.ap]
	heading.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.add_child(heading)
	var tabs := HFlowContainer.new()
	_body.add_child(tabs)
	for title: String in ["Inventory","Skills","Character","Titles"]:
		button(tabs,title,show_tab.bind(title))
	if services:
		button(tabs,"Shop",show_tab.bind("Shop"))
		button(tabs,"Bank",show_tab.bind("Bank"))
		button(tabs,"Lessons",show_tab.bind("Lessons"))
	button(tabs,"Close",func() -> void: closed.emit())
	_notice = Label.new()
	_notice.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_body.add_child(_notice)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.follow_focus = true
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_body.add_child(scroll)
	_content = VBoxContainer.new()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_content)
	show_tab(tab)

func button(parent: Node, text: String, action: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size.y = 48
	b.pressed.connect(action,CONNECT_DEFERRED)
	parent.add_child(b)
	return b

func label(text: String, parent: Node = null) -> void:
	var value := Label.new()
	value.text = text
	value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	(parent if parent != null else _content).add_child(value)

func show_tab(value: String) -> void:
	tab = value
	_busy = false
	for child: Node in _content.get_children():
		_content.remove_child(child)
		child.queue_free()
	_notice.text = "Changes are unavailable during an active run." if snapshot.mode != SessionShell.Mode.TOWN else "Select an action to preview the complete saved transaction."
	match tab:
		"Inventory": inventory()
		"Shop": shop()
		"Bank":
			label("Bank transfers have no fee. Shops use carried gold. Small gold bags grant 10,000 capacity each.")
			quantity()
			button(_content,"Deposit",func(): propose("bank_deposit",data("",int(_quantity.value))))
			button(_content,"Withdraw",func(): propose("bank_withdraw",data("",int(_quantity.value))))
		"Lessons":
			label("Blood Strike lesson • 10 carried gold • Learn Rank F with zero training. Rank Up is a separate Skills action.")
			button(_content,"Learn Blood Strike",func(): propose("learn_lesson",data("")))
		"Skills":
			for id: String in snapshot.hero.skill_ranks:
				var definition: Resource = catalog.definition(id)
				label("%s • Rank %s / prototype cap %s • Training %d / 100" % [definition.display_name,snapshot.hero.skill_ranks[id],definition.prototype_cap,snapshot.hero.training.get(id,0)])
				button(_content,"Rank Up "+definition.display_name,func(): propose("rank_up",data(id)))
		"Character": character()
		"Titles": titles()
	_focus_links()

func quantity() -> void:
	_quantity = SpinBox.new()
	_quantity.min_value = 1
	_quantity.max_value = 1000000
	_quantity.value = 1
	_quantity.custom_minimum_size.y = 48
	_content.add_child(_quantity)

func data(id: String, amount: int = 1, destination: String = "", x: int = 0, y: int = 0) -> Dictionary:
	return {"item":id,"destination":destination,"column":x,"row":y,"quantity":amount}

func propose(kind: String, values: Dictionary) -> void:
	if _busy or not preview.is_valid(): return
	var result: Dictionary = preview.call(kind,values)
	if not result.accepted:
		_notice.text = result.code
		return
	_busy = true
	var message := "Confirm %s — %s ×%d\n%s" % [kind.replace("_"," "),display_name(values.item),values.quantity,result.get("summary","")]
	for stat: String in result.get("stats_before",{}):
		if result.stats_before[stat] != result.stats_after[stat]: message += "\n%s %d → %d" % [display_name(stat),result.stats_before[stat],result.stats_after[stat]]
	_notice.text = message
	var confirmation := HBoxContainer.new()
	_content.add_child(confirmation)
	_content.move_child(confirmation,0)
	button(confirmation,"Confirm",func() -> void:
		if not _busy: return
		_busy = false
		command_requested.emit(kind,values))
	button(confirmation,"Cancel",show_tab.bind(tab))
	_focus_links()
	confirmation.get_child(0).grab_focus()

func inventory() -> void:
	var containers := OptionButton.new()
	containers.custom_minimum_size.y = 48
	var names: Array[String] = ["backpack","overflow"]
	for item: Dictionary in snapshot.hero.items:
		if catalog.definition(item.definition_id).category == "bag" and item.container == "backpack": names.append(item.instance_id)
	for value: String in names: containers.add_item(value)
	containers.selected = maxi(0,names.find(container))
	containers.item_selected.connect(func(index: int): container = names[index]; show_tab("Inventory"))
	_content.add_child(containers)
	_search = LineEdit.new()
	_search.placeholder_text = "Search carried items, equipment and overflow"
	_search.custom_minimum_size.y = 48
	_content.add_child(_search)
	var list := VBoxContainer.new()
	_content.add_child(list)
	for item: Dictionary in snapshot.hero.items:
		var definition: Resource = catalog.definition(item.definition_id)
		var entry := button(list,"%s ×%d • %dx%d • %s%s" % [definition.display_name,item.quantity,definition.width,definition.height,item.container," • LOCKED" if item.locked else ""],func():
			selected = item.instance_id
			item_actions(item))
		_search.text_changed.connect(func(text: String): entry.visible = text.is_empty() or definition.display_name.to_lower().contains(text.to_lower()))
	var dimensions := Vector2i(6,10)
	if container != "backpack":
		for item: Dictionary in snapshot.hero.items:
			if item.instance_id == container:
				var definition: Resource = catalog.definition(item.definition_id)
				dimensions = Vector2i(definition.bag_width,definition.bag_height)
	if container == "overflow": return
	label("Tap an item, then a grid cell to move; desktop also supports dragging. Placement keeps the full item rectangle.")
	var grid := GridContainer.new()
	grid.columns = dimensions.x
	_content.add_child(grid)
	for y: int in dimensions.y:
		for x: int in dimensions.x:
			var cell := preload("res://scripts/presentation/inventory_cell.gd").new()
			cell.column = x
			cell.row = y
			cell.panel = self
			cell.custom_minimum_size = Vector2(52,48)
			cell.text = "·"
			for item: Dictionary in snapshot.hero.items:
				if item.container != container: continue
				var definition: Resource = catalog.definition(item.definition_id)
				if Rect2i(item.column,item.row,definition.width,definition.height).has_point(Vector2i(x,y)):
					cell.item_id = item.instance_id
					cell.text = definition.display_name.substr(0,3) if x == item.column and y == item.row else "■"
					cell.tooltip_text = "%s • %dx%d • %d" % [definition.display_name,definition.width,definition.height,item.quantity]
			cell.pressed.connect(func():
				if not selected.is_empty(): move_item(selected,x,y)
				elif not cell.item_id.is_empty(): selected = cell.item_id)
			grid.add_child(cell)

func item_actions(item: Dictionary) -> void:
	for child: Node in _content.get_children():
		_content.remove_child(child)
		child.queue_free()
	button(_content,"Back to grid / move selected item",show_tab.bind("Inventory"))
	var definition: Resource = catalog.definition(item.definition_id)
	label("%s • %s • Pages %s" % [definition.display_name,str(definition.modifiers),str(item.pages)])
	quantity()
	button(_content,"Lock / unlock",func(): propose("lock_item",data(item.instance_id)))
	if item.container == "overflow":
		button(_content,"Withdraw reward",func(): propose("withdraw_item",data(item.instance_id)))
		return
	if definition.category == "equipment":
		for slot: String in (["main_hand","off_hand"] if definition.slot == "main_hand" else [definition.slot]):
			button(_content,"Equip "+slot,func(): propose("equip_item",data(item.instance_id,1,slot)))
		button(_content,"Unequip",func(): propose("unequip_item",data(item.instance_id)))
	if definition.category == "book":
		button(_content,"Read book",func(): propose("read_book",data(item.instance_id)))
		for page: Dictionary in snapshot.hero.items:
			if catalog.definition(page.definition_id).book_id == item.definition_id:
				button(_content,"Insert "+catalog.definition(page.definition_id).display_name,func(): propose("insert_page",data(item.instance_id,1,page.instance_id)))
	if definition.category == "coupon": button(_content,"Read coupon",func(): propose("read_coupon",data(item.instance_id)))
	if definition.category == "bag": button(_content,"Use bag first for placement",func(): propose("bag_priority",data(item.instance_id)))
	if services: button(_content,"Sell selected quantity",func(): propose("sell_item",data(item.instance_id,int(_quantity.value))))
	button(_content,"Sort this container",func(): propose("sort_items",data(item.instance_id)))
	for target: Dictionary in snapshot.hero.items:
		if target.instance_id != item.instance_id and target.definition_id == item.definition_id:
			button(_content,"Merge into "+target.instance_id,func(): propose("merge_stack",data(item.instance_id,int(_quantity.value),target.instance_id)))
	label("For a split, select the quantity then choose a destination below.")
	var destination := OptionButton.new()
	destination.custom_minimum_size.y = 48
	var options: Array[String] = ["backpack"]
	for bag: Dictionary in snapshot.hero.items:
		if catalog.definition(bag.definition_id).category == "bag": options.append(bag.instance_id)
	for id: String in options: destination.add_item(id)
	_content.add_child(destination)
	var column := SpinBox.new()
	column.max_value = 5
	column.custom_minimum_size.y = 48
	_content.add_child(column)
	var row := SpinBox.new()
	row.max_value = 9
	row.custom_minimum_size.y = 48
	_content.add_child(row)
	button(_content,"Split to column / row",func(): propose("split_stack",data(item.instance_id,int(_quantity.value),options[destination.selected],int(column.value),int(row.value))))
	_focus_links()

func can_move_item(id: String, x: int, y: int) -> bool:
	return preview.is_valid() and preview.call("move_item",data(id,1,container,x,y)).accepted
func move_item(id: String, x: int, y: int) -> void:
	propose("move_item",data(id,1,container,x,y))

func shop() -> void:
	label("All prices use carried gold. Purchases must fit; they never enter reward overflow.")
	for id: String in catalog.ids():
		if not id.begins_with("item."): continue
		var definition: Resource = catalog.definition(id)
		if definition.price <= 0: continue
		button(_content,"%s • %d gold • %dx%d" % [definition.display_name,definition.price,definition.width,definition.height],func(): propose("buy_item",data(id)))

func character() -> void:
	var g: Dictionary = snapshot.hero.growth
	label("Level %d • XP %d / %s • Cumulative %d • AP %d\nAge %d (aging arrives with rebirth) • %s" % [g.level,g.xp,str(Rules.CONFIG.xp_to_next[g.level-1]) if g.level <= Rules.CONFIG.xp_to_next.size() else "MAX",g.cumulative,g.ap,g.age,Rules.CONFIG.talents[g.talent].name])
	label("HP / MP / SP: %s of %s. Increasing a maximum never refills a pool." % [str(snapshot.hero.current),str(snapshot.hero.maximum)])
	if not g.talent_chosen:
		for id: String in Rules.CONFIG.talents:
			button(_content,"Choose "+Rules.CONFIG.talents[id].name,func(): propose("choose_talent",data(id)))
	label("Equipment, skills and titles recompute from their sources; partial training gives no mastery bonus.")
	for id: String in snapshot.get("mastery",{}):
		label("%s mastery: level %d · %d XP" % [Rules.CONFIG.talents[id].name,snapshot.mastery[id].level,snapshot.mastery[id].xp])
	for source: String in snapshot.get("stat_sources",{}):
		label(source+": "+format_stats(snapshot.stat_sources[source]))
	label("Cosmetic talent display: "+g.talent_display)
	for id: String in Rules.CONFIG.talents:
		button(_content,"Display "+Rules.CONFIG.talents[id].name,func(): propose("talent_display",data(id)))
	button(_content,"Clear talent display",func(): propose("talent_display",data("")))

func titles() -> void:
	var g: Dictionary = snapshot.hero.growth
	label("First: %s • Second: %s. Ownership alone grants no effects." % [g.first,g.second])
	for id: String in Rules.CONFIG.titles:
		var definition: Dictionary = Rules.CONFIG.titles[id]
		var earned: bool = g.titles.has(id)
		label("%s • %s • %s" % [definition.name if g.known_titles.has(id) or earned else "???","Earned" if earned else "Known" if g.known_titles.has(id) else "Unknown",format_stats(definition.effects) if earned else definition.hint if g.known_titles.has(id) else ""])
		if earned: button(_content,"Equip "+definition.name,func(): propose("equip_title",data(id,1,definition.slot)))
	for slot: String in ["first","second"]:
		button(_content,"Clear "+slot,func(): propose("equip_title",data("",1,slot)))

func _focus_links() -> void:
	var buttons: Array[Control] = []
	_collect_focus(_body,buttons)
	for i: int in buttons.size():
		buttons[i].focus_next = buttons[i].get_path_to(buttons[(i+1)%buttons.size()])
		buttons[i].focus_previous = buttons[i].get_path_to(buttons[(i-1+buttons.size())%buttons.size()])
	if not buttons.is_empty(): buttons[0].grab_focus()
func _collect_focus(node: Node, result: Array[Control]) -> void:
	for child: Node in node.get_children():
		if child is Control and child.is_visible_in_tree() and child.focus_mode == Control.FOCUS_ALL: result.append(child)
		_collect_focus(child,result)
func _input(event: InputEvent) -> void:
	if event.is_action_pressed("shell_back") and not event.is_echo():
		get_viewport().set_input_as_handled()
		closed.emit()
func _exit_tree() -> void:
	preview = Callable()

func display_name(id: String) -> String:
	var definition: Resource = catalog.definition(id)
	if definition != null: return definition.display_name
	if Rules.CONFIG.titles.has(id): return Rules.CONFIG.titles[id].name
	if Rules.CONFIG.talents.has(id): return Rules.CONFIG.talents[id].name
	for item: Dictionary in snapshot.hero.items:
		if item.instance_id == id: return catalog.definition(item.definition_id).display_name
	return id.replace("equip:","").replace("_"," ").capitalize()

func format_stats(stats: Dictionary) -> String:
	var parts := PackedStringArray()
	for id: String in stats:
		parts.append("%s %+d" % [display_name(id),stats[id]])
	return ", ".join(parts) if not parts.is_empty() else "None"
