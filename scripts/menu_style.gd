extends RefCounted

const UI_FONT = preload("res://assets/fonts/DepartureMono/DepartureMono-Regular.otf")
const PROSE_FONT = preload("res://assets/fonts/SourceCodePro/OTF/SourceCodePro-Regular.otf")

const BACK := Color("#28353e")
const SURFACE := Color("#2e222f")
const PANEL := Color("#344a5a")
const BORDER := Color("#407080")
const MUTED := Color("#a9b2a2")
const TEXT := Color("#d6dad3")
const ACCENT := Color("#fbb954")
const TEAL := Color("#5bbfc5")
const ERROR := Color("#f2ec8b")


static func box(fill_color: Color, line_color := Color.TRANSPARENT, line_width := 1) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill_color
	style.border_color = line_color
	style.set_border_width_all(line_width)
	style.set_content_margin_all(8.0)
	style.anti_aliasing = false
	return style


static func make_theme() -> Theme:
	var theme := Theme.new()
	theme.default_font = UI_FONT
	theme.default_font_size = 16
	theme.set_color(&"font_color", &"Label", TEXT)
	theme.set_color(&"font_color", &"LineEdit", TEXT)
	theme.set_color(&"font_placeholder_color", &"LineEdit", MUTED)
	theme.set_color(&"caret_color", &"LineEdit", ACCENT)
	theme.set_color(&"selection_color", &"LineEdit", BORDER)
	theme.set_stylebox(&"normal", &"LineEdit", box(BACK, BORDER))
	theme.set_stylebox(&"focus", &"LineEdit", box(Color.TRANSPARENT, TEAL, 2))
	theme.set_stylebox(&"normal", &"ItemList", box(BACK, BORDER))
	theme.set_stylebox(&"focus", &"ItemList", box(Color.TRANSPARENT, TEAL, 2))
	theme.set_stylebox(&"selected", &"ItemList", box(PANEL, TEAL))
	theme.set_stylebox(&"selected_focus", &"ItemList", box(PANEL, TEAL))
	theme.set_color(&"font_color", &"ItemList", TEXT)
	theme.set_color(&"font_selected_color", &"ItemList", TEXT)
	theme.set_constant(&"v_separation", &"ItemList", 13)
	theme.set_color(&"font_color", &"PopupMenu", TEXT)
	theme.set_color(&"font_hover_color", &"PopupMenu", TEXT)
	theme.set_stylebox(&"panel", &"PopupMenu", box(SURFACE, BORDER))
	theme.set_stylebox(&"hover", &"PopupMenu", box(PANEL))
	theme.set_stylebox(&"scroll", &"VScrollBar", box(SURFACE))
	theme.set_stylebox(&"grabber", &"VScrollBar", box(BORDER))
	theme.set_stylebox(&"grabber_highlight", &"VScrollBar", box(TEAL))
	theme.set_stylebox(&"grabber_pressed", &"VScrollBar", box(TEAL))
	for type in [&"Button", &"OptionButton"]:
		theme.set_color(&"font_color", type, TEXT)
		theme.set_color(&"font_hover_color", type, TEXT)
		theme.set_color(&"font_focus_color", type, TEXT)
		theme.set_color(&"font_pressed_color", type, TEXT)
		theme.set_color(&"font_disabled_color", type, MUTED)
		theme.set_stylebox(&"normal", type, box(BACK, BORDER))
		theme.set_stylebox(&"hover", type, box(PANEL, TEAL))
		theme.set_stylebox(&"pressed", type, box(PANEL, TEAL, 2))
		theme.set_stylebox(&"disabled", type, box(SURFACE, BORDER))
		theme.set_stylebox(&"focus", type, box(Color.TRANSPARENT, TEAL, 2))
	return theme


static func background(parent: Control) -> void:
	var fill := ColorRect.new()
	fill.color = BACK
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(fill)
	fill.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


static func inset(parent: Control, horizontal: int, vertical: int, full := false) -> MarginContainer:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", horizontal)
	margin.add_theme_constant_override("margin_right", horizontal)
	margin.add_theme_constant_override("margin_top", vertical)
	margin.add_theme_constant_override("margin_bottom", vertical)
	parent.add_child(margin)
	if full:
		margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	return margin


static func label(value: String, size: int, color := TEXT, prose := false) -> Label:
	var control := Label.new()
	control.text = value
	control.add_theme_font_size_override("font_size", size)
	control.add_theme_color_override("font_color", color)
	if prose:
		control.add_theme_font_override("font", PROSE_FONT)
	return control


static func button(value: String, primary := false) -> Button:
	var control := Button.new()
	control.text = value
	control.custom_minimum_size = Vector2(0, 38)
	control.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	if primary:
		for state in [&"font_color", &"font_hover_color", &"font_pressed_color", &"font_focus_color"]:
			control.add_theme_color_override(state, SURFACE)
		control.add_theme_stylebox_override("normal", box(ACCENT))
		control.add_theme_stylebox_override("hover", box(ERROR))
		control.add_theme_stylebox_override("pressed", box(TEAL))
		control.add_theme_stylebox_override("focus", box(Color.TRANSPARENT, TEAL, 2))
	return control


static func panel(parent: Control, fill: Color, border := BORDER) -> PanelContainer:
	var control := PanelContainer.new()
	var style := box(fill, border)
	style.set_content_margin_all(0.0)
	control.add_theme_stylebox_override("panel", style)
	parent.add_child(control)
	return control


static func rule() -> ColorRect:
	var line := ColorRect.new()
	line.color = BORDER
	line.custom_minimum_size = Vector2(0, 1)
	line.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return line
