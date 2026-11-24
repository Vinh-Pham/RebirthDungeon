extends RefCounted
## The pixel math behind compare_screenshots (1.17): which pixels changed between a frame and its baseline, how many,
## where (the box around them) and by how much, plus the picture of the change.
##
## Why it exists: diff_pct shrinks both frames to 64x64 and averages the difference. Soft light over the whole frame
## reads about 2% there, while a few hundred flickering pixels barely move it, so the one number cannot tell a lighting
## tweak from a broken sprite. changed counts every pixel whose largest channel (R, G, B or A) moved by more than
## threshold levels, at the captured resolution, and bbox says where they are in the form screenshot region= takes.
##
## Speed, on the editor's main thread: identical buffers return at once; one native compute_image_metrics over the
## whole frame answers a change no pixel of which passes the threshold (soft light); otherwise only the TILE x TILE
## tiles whose bytes differ are scanned, pixel by pixel, as packed 32-bit ints, skipping the equal ones.
##
## Full edition only: compare_screenshots is a Full tool, so pack.ps1 trims this file with qa_tools.gd, and the unit
## suite loads it by path (ResourceLoader.exists) so the Lite suite still parses. Static, no class_name, no editor
## classes, parse-safe on 4.2+.

const CallArgs := preload("res://addons/beckett/core/callargs.gd")

const TILE := 32
const DEFAULT_THRESHOLD := 8
## The colour a changed pixel takes in the diff picture (the Set-of-Mark magenta), over the frame dimmed to gray.
const MARK := Color(1, 0, 1)
const DIM := 0.35


## The threshold argument as levels: {value} for a whole number 0..255 (default DEFAULT_THRESHOLD when absent or null),
## else {error}. A number that came as text ("12") is taken; a fraction, a word or a value out of range is refused.
static func threshold_of(args: Dictionary) -> Dictionary:
	var raw: Variant = args.get("threshold", null)
	if raw == null:
		return {"value": DEFAULT_THRESHOLD}
	if raw is bool:
		return {"error": "threshold: expected a whole number of channel levels 0..255, got %s" % str(raw)}
	var c: Dictionary = CallArgs.coerce(raw, TYPE_INT)
	if not bool(c.get("ok", false)):
		return {"error": "threshold: %s; pass a whole number of channel levels 0..255 (default %d)" % [str(c.get("error", "")), DEFAULT_THRESHOLD]}
	var t := int(c["value"])
	if t < 0 or t > 255:
		return {"error": "threshold %d is out of range: pass a whole number of channel levels 0..255 (default %d)" % [t, DEFAULT_THRESHOLD]}
	return {"value": t}


## compare_screenshots' diff_pct, exactly as 1.16 computed it from a frame the game shrank to a quarter: the same
## bilinear resize to a quarter (run here, on the native frame the game now sends), the baseline shrunk to that size
## only when it is larger, both to 64x64, then the mean absolute byte difference in percent. Byte-identical to 1.16 for
## 8-bit frames, which the unit suite pins against the old two-step chain. The baseline takes the SAME chain because
## Godot's bilinear resize does not pre-filter: a one-step and a two-step downscale of one picture land on different
## samples (2.50% on a detailed 1280x720 frame, past the 2.0 default tolerance, and 0.00% once the chains match).
static func diff_pct_64(cur: Image, base: Image) -> float:
	var c := cur.duplicate() as Image
	var b := base.duplicate() as Image
	c.resize(maxi(1, roundi(c.get_width() * 0.25)), maxi(1, roundi(c.get_height() * 0.25)), Image.INTERPOLATE_BILINEAR)
	if b.get_width() > c.get_width() or b.get_height() > c.get_height():
		b.resize(c.get_width(), c.get_height(), Image.INTERPOLATE_BILINEAR)
	c.resize(64, 64)
	b.resize(64, 64)
	c.convert(Image.FORMAT_RGBA8)
	b.convert(Image.FORMAT_RGBA8)
	return mean_abs_pct(c, b)


## The sum of |byte difference| over two same-size RGBA8 buffers, as a percent of the most it could be.
static func mean_abs_pct(a: Image, b: Image) -> float:
	var ad := a.get_data()
	var bd := b.get_data()
	var d := 0
	for i in ad.size():
		d += absi(int(ad[i]) - int(bd[i]))
	return 100.0 * float(d) / float(maxi(1, ad.size()) * 255)


## The pixels of `a` that differ from `b` by more than `threshold` levels in some channel (R, G, B or A):
## {changed, total, max_delta, bbox, mask}, or {error} when the sizes differ. bbox is [x, y, w, h] around them ([]
## when none changed); max_delta is the largest channel move anywhere in the frame, under the threshold or not; mask
## (want_mask only) is an LA8 image, opaque exactly on the changed pixels. Every pixel is counted: nothing is sampled.
static func changed_pixels(a: Image, b: Image, threshold: int, want_mask: bool = false) -> Dictionary:
	if a.get_width() != b.get_width() or a.get_height() != b.get_height():
		return {"error": "the images differ in size (%dx%d and %dx%d)" % [a.get_width(), a.get_height(), b.get_width(), b.get_height()]}
	var ia := _rgba8(a)
	var ib := _rgba8(b)
	var w := ia.get_width()
	var h := ia.get_height()
	var out := {"changed": 0, "total": w * h, "max_delta": 0, "bbox": [], "mask": null}
	if ia.get_data() == ib.get_data():
		return out
	var max_delta := -1
	if ia.has_method("compute_image_metrics"):
		var whole: Variant = ia.call("compute_image_metrics", ib, false)
		if whole is Dictionary and (whole as Dictionary).has("max"):
			max_delta = int((whole as Dictionary)["max"])
			if max_delta <= threshold:
				out["max_delta"] = max_delta
				return out
	var mb := PackedByteArray()
	if want_mask:
		mb.resize(w * h * 2)
		mb.fill(0)
	var changed := 0
	var seen_max := 0
	var x0 := w
	var y0 := h
	var x1 := -1
	var y1 := -1
	for ty in range(0, h, TILE):
		var th := mini(TILE, h - ty)
		for tx in range(0, w, TILE):
			var tw := mini(TILE, w - tx)
			var rect := Rect2i(tx, ty, tw, th)
			var pa := ia.get_region(rect).get_data()
			var pb := ib.get_region(rect).get_data()
			if pa == pb:
				continue
			var qa := pa.to_int32_array()
			var qb := pb.to_int32_array()
			var i := 0
			for yy in th:
				for xx in tw:
					var u := qa[i]
					var v := qb[i]
					i += 1
					if u == v:
						continue
					var d := absi((u & 0xFF) - (v & 0xFF))
					d = maxi(d, absi(((u >> 8) & 0xFF) - ((v >> 8) & 0xFF)))
					d = maxi(d, absi(((u >> 16) & 0xFF) - ((v >> 16) & 0xFF)))
					d = maxi(d, absi(((u >> 24) & 0xFF) - ((v >> 24) & 0xFF)))
					if d > seen_max:
						seen_max = d
					if d <= threshold:
						continue
					changed += 1
					var x := tx + xx
					var y := ty + yy
					x0 = mini(x0, x)
					y0 = mini(y0, y)
					x1 = maxi(x1, x)
					y1 = maxi(y1, y)
					if want_mask:
						var at := (y * w + x) * 2
						mb[at] = 255
						mb[at + 1] = 255
	out["changed"] = changed
	out["max_delta"] = max_delta if max_delta >= 0 else seen_max
	if changed > 0:
		out["bbox"] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]
	if want_mask:
		out["mask"] = Image.create_from_data(w, h, false, Image.FORMAT_LA8, mb)
	return out


## The picture of a change: the frame dimmed to gray, with every pixel the mask marks in MARK magenta.
static func diff_picture(frame: Image, mask: Image) -> Image:
	var pic := _rgba8(frame)
	pic.adjust_bcs(DIM, 1.0, 0.0)
	var mark := Image.create(pic.get_width(), pic.get_height(), false, Image.FORMAT_RGBA8)
	mark.fill(MARK)
	pic.blend_rect_mask(mark, mask, Rect2i(0, 0, pic.get_width(), pic.get_height()), Vector2i.ZERO)
	return pic


## An RGBA8 copy of `img`, decompressed when it has to be: two frames compare byte for byte only in one format, and a
## baseline saved as RGB compares with an RGBA frame as if its alpha were 255.
static func _rgba8(img: Image) -> Image:
	var c := img.duplicate() as Image
	if c.is_compressed():
		c.decompress()
	if c.get_format() != Image.FORMAT_RGBA8:
		c.convert(Image.FORMAT_RGBA8)
	return c
