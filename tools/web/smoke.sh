#!/usr/bin/env bash
# Run against a locally served Vite production build.
set -euo pipefail

url="${1:-http://127.0.0.1:4173/}"
out="${2:-$(mktemp -d /tmp/rebirth-web-smoke.XXXXXX)}"
mkdir -p "$out"
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix "rebirth-smoke-$$")"
trap 'agent-browser close >/dev/null 2>&1 || true' EXIT

assert_world_fits() {
  agent-browser wait --fn '(() => {
    const page = document.scrollingElement;
    const map = document.querySelector(".map-surface");
    const canvas = map?.querySelector(".world-canvas canvas");
    const minimap = map?.querySelector(".world-minimap");
    const minimapBounds = minimap?.getBoundingClientRect();
    const layout = document.querySelector(".game-layout");
    const actionBar = document.querySelector(".action-bar");
    const overlay = actionBar?.getBoundingClientRect();
    const mapBounds = map?.getBoundingClientRect();
    const log = map?.querySelector(".game-log")?.getBoundingClientRect();
    const menu = document.querySelector(".game-menu").getBoundingClientRect();
    const vitals = document.querySelector(".game-vitals");
    const panels = document.querySelector("nav[aria-label=\"Game panels\"]");
    const xp = document.querySelector(".menu-xp meter")?.getBoundingClientRect();
    const level = document.querySelector(".menu-level")?.getBoundingClientRect();
    const xpReadout = document.querySelector(".menu-xp .vital-value > span")?.getBoundingClientRect();
    const selectors = [".map-surface", ".world-minimap", ".game-log", ".action-bar", ".game-menu"];
    return canvas && canvas.width === map.clientWidth && canvas.height === map.clientHeight &&
      map.clientWidth === layout.clientWidth && mapBounds.left === 0 && mapBounds.top === 0 &&
      Math.abs(mapBounds.bottom - menu.top) < 1 &&
      log && log.left === mapBounds.left && log.bottom === mapBounds.bottom && log.width < mapBounds.width &&
      (innerWidth < 760 || Math.abs(log.width - mapBounds.width / 3) < 1) &&
      overlay && mapBounds && overlay.left === mapBounds.left && overlay.top === mapBounds.top &&
      minimapBounds && minimapBounds.width === minimapBounds.height && minimapBounds.top === mapBounds.top + 12 &&
      mapBounds.right - minimapBounds.right === (innerWidth < 360 ? 8 : 12) &&
      document.elementFromPoint(minimapBounds.right - 1, minimapBounds.top + 1) === canvas &&
      [...actionBar.querySelectorAll("button")].every(slot => slot.getBoundingClientRect().right <= minimapBounds.left) &&
      overlay.right <= mapBounds.right && overlay.bottom <= mapBounds.bottom &&
      getComputedStyle(actionBar).backgroundColor === "rgba(0, 0, 0, 0)" &&
      document.elementFromPoint(overlay.right - 1, overlay.top + 1) === canvas &&
      xp && level && xpReadout && panels && level.right <= xp.left &&
      xp.bottom <= vitals?.getBoundingClientRect().top &&
      Math.abs(xp.right - panels.getBoundingClientRect().right) < 1 &&
      Math.abs(xpReadout.left + xpReadout.right - xp.left - xp.right) < 1 &&
      vitals?.getBoundingClientRect().bottom <= panels?.getBoundingClientRect().top &&
      page.scrollHeight <= innerHeight + 1 && page.scrollWidth <= innerWidth + 1 &&
      selectors.every(selector => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const bounds = element.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.left >= -1 &&
          bounds.top >= -1 && bounds.right <= innerWidth + 1 && bounds.bottom <= innerHeight + 1;
      });
  })()'
}

agent-browser set viewport 1600 900
agent-browser open "$url"
agent-browser wait --fn 'Array.from(document.querySelectorAll("button")).some(button => button.textContent === "Create Character" && !button.disabled)'
agent-browser press n
agent-browser wait --text 'Create Your Traveler'
agent-browser find role textbox fill 'Smoke Signal' --name 'Name*'
agent-browser find role button click --name 'Enter the Dungeon'
agent-browser find role button click --name 'Speak with Ilex'
agent-browser find role button click --name 'Follow the Lanterns'
agent-browser wait '.world-canvas canvas'
agent-browser wait --fn '(() => {
  const map = document.querySelector(".map-surface").getBoundingClientRect();
  const meters = [...document.querySelectorAll(".game-vitals meter")];
  const xp = document.querySelector(".menu-xp meter[aria-label=XP]");
  const log = document.querySelector(".game-log").getBoundingClientRect();
  return !document.querySelector(".status-nearby, .game-sidebar") &&
    ![...document.querySelectorAll("button")].some(button => button.textContent.trim().startsWith("Interact [")) &&
    log.bottom === map.bottom && log.left === map.left && Math.abs(log.width - map.width / 3) < 1 &&
    meters.map(meter => meter.getAttribute("aria-label")).join(",") === "HP,MP,Stamina" &&
    new Set(meters.map(meter => getComputedStyle(meter).getPropertyValue("--meter-fill"))).size === 3 &&
    meters.every(meter => {
      const readout = meter.parentElement.querySelector(".vital-value");
      const track = meter.getBoundingClientRect();
      const value = readout?.firstElementChild.getBoundingClientRect();
      return meter.value === meter.max && readout?.textContent.trim() === `${meter.value} / ${meter.max}` &&
        value && value.left > track.left && value.left - track.left <= 8 &&
        value.right <= track.right && value.top >= track.top && value.bottom <= track.bottom;
    }) &&
    xp?.value === 0 && xp.max === 400 && xp.getAttribute("aria-valuetext") === "0 / 400" &&
    document.querySelector(".menu-level").textContent === "Lv. 1";
})()'
agent-browser eval 'window.initialMinimap = document.querySelector(".world-minimap").toDataURL(); true'
assert_world_fits
agent-browser eval 'window.logToggleCanvasHeight = document.querySelector(".world-canvas canvas").height'
agent-browser press l
agent-browser wait --fn '!document.querySelector(".game-log") && !document.querySelector("[role=dialog]") && document.querySelector(".world-canvas canvas").height === window.logToggleCanvasHeight'
agent-browser press l
agent-browser wait '.map-surface .game-log'
agent-browser screenshot "$out/town.png"

# The authored Lantern Rest gate sits at tile (48, 5) in the initial 24px viewport.
gate_x="$(agent-browser eval 'Math.round(document.querySelector(".world-canvas canvas").getBoundingClientRect().left + 1164)')"
gate_y="$(agent-browser eval 'Math.round(document.querySelector(".world-canvas canvas").getBoundingClientRect().top + 132)')"
agent-browser mouse move "$gate_x" "$gate_y"
agent-browser mouse down
agent-browser mouse up
agent-browser wait --text 'Register This Moon Gate'
agent-browser wait --fn 'document.querySelector(".world-minimap").toDataURL() !== window.initialMinimap'
agent-browser find role button click --name 'Register This Moon Gate'
agent-browser wait --fn '![...document.querySelectorAll(".world-dialogue button")].some(button => button.textContent === "Register This Moon Gate")'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'
agent-browser wait --text 'Lantern Rest Moon Gate registered.'
agent-browser wait --fn '(() => {
  const nearby = document.querySelector(".map-surface .status-nearby");
  const map = document.querySelector(".map-surface").getBoundingClientRect();
  const bounds = nearby?.getBoundingClientRect();
  return nearby?.textContent.includes("Moon Gate") && bounds.right === map.right - 12 && bounds.bottom === map.bottom - 12;
})()'
agent-browser wait --fn 'document.querySelector(".game-log").getBoundingClientRect().bottom <= document.querySelector("nav[aria-label=\"Game panels\"]").getBoundingClientRect().top'
agent-browser find role button click --name 'Expand Log'
agent-browser wait --fn 'document.querySelector("[data-wm-window=log] .log-messages").textContent.includes("Lantern Rest Moon Gate registered.")'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'

# Short desktop windows must keep the world controls within the page.
agent-browser set viewport 1280 650
assert_world_fits
agent-browser screenshot "$out/short-desktop.png"
agent-browser set viewport 1600 900
assert_world_fits

# Skill assignments start empty, support both drag and keyboard, and swap in place.
agent-browser wait --fn '(() => {
  const slots = [...document.querySelectorAll(".action-bar [data-skill-slot]")];
  return slots.length === 10 &&
    slots.map(slot => slot.dataset.skillSlot).join("") === "1234567890" &&
    slots.every(slot => slot.getAttribute("aria-label").endsWith(", Empty")) &&
    document.querySelectorAll(".action-bar [aria-label=\"Tonic quick slots\"] button").length === 4;
})()'
agent-browser press k
agent-browser wait '.skills-dialog'
agent-browser wait --fn 'document.querySelector(".skills-dialog").getBoundingClientRect().top >= document.querySelector(".action-bar").getBoundingClientRect().bottom'
agent-browser drag '.skills-dialog [data-skill-source="combat_mastery"]' '.action-bar [data-skill-slot="1"]'
agent-browser wait --fn 'document.querySelector(".action-bar [data-skill-slot=\"1\"]")?.getAttribute("aria-label") === "Skill slot 1, Normal Attack"'
agent-browser focus '.skills-dialog [data-skill-source="defense"]'
agent-browser press Enter
agent-browser focus '.action-bar [data-skill-slot="0"]'
agent-browser press Enter
agent-browser wait --fn 'document.querySelector(".action-bar [data-skill-slot=\"0\"]")?.getAttribute("aria-label") === "Skill slot 0, Defend"'
agent-browser drag '.action-bar [data-skill-slot="1"]' '.action-bar [data-skill-slot="0"]'
agent-browser wait --fn 'document.querySelector(".action-bar [data-skill-slot=\"1\"]")?.getAttribute("aria-label") === "Skill slot 1, Defend" && document.querySelector(".action-bar [data-skill-slot=\"0\"]")?.getAttribute("aria-label") === "Skill slot 0, Normal Attack"'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'

agent-browser press i
agent-browser wait '[role=grid]'
agent-browser eval 'window.inventoryStartX = document.querySelector("[data-wm-window=inventory]").getBoundingClientRect().x'
agent-browser focus '[data-wm-drag]'
agent-browser press ArrowRight
agent-browser wait --fn 'document.querySelector("[data-wm-window=inventory]").getBoundingClientRect().x >= window.inventoryStartX + 15'
title_x="$(agent-browser eval '(() => { const bar = document.querySelector("[data-wm-drag]").getBoundingClientRect(); return Math.round(bar.x + bar.width / 2); })()')"
title_y="$(agent-browser eval '(() => { const bar = document.querySelector("[data-wm-drag]").getBoundingClientRect(); return Math.round(bar.y + bar.height / 2); })()')"
agent-browser mouse move "$title_x" "$title_y"
agent-browser mouse down
agent-browser mouse move "$((title_x + 64))" "$title_y"
agent-browser mouse up
agent-browser wait --fn 'document.querySelector("[data-wm-window=inventory]").getBoundingClientRect().x >= window.inventoryStartX + 79'
agent-browser wait --fn '(() => {
  const cells = [...document.querySelectorAll(".inventory-cell")];
  const first = cells[0]?.getBoundingClientRect();
  const gold = cells[0]?.querySelector("img");
  const slots = [...document.querySelectorAll(".tonic-slot")];
  const equipment = [...document.querySelectorAll(".equipment-slot dt")];
  const headgear = equipment[1]?.getBoundingClientRect();
  const shoes = equipment[6]?.getBoundingClientRect();
  return first?.width > 0 && gold?.naturalWidth > 0 &&
    cells[0].querySelector(".inventory-quantity")?.textContent === "× 24" &&
    cells.every(cell => {
      const { width, height } = cell.getBoundingClientRect();
      return Math.abs(width - first.width) < 0.1 && Math.abs(width - height) < 0.1;
    }) &&
    equipment.map(slot => slot.textContent).join(",") === "Acc 1,Headgear,Acc 2,Main Hand,Armor,Offhand,Shoes" &&
    Math.abs(shoes.x - headgear.x) < 0.1 && shoes.y > equipment[5].getBoundingClientRect().y &&
    slots.length === 4 && slots.every(slot => slot.offsetTop === slots[0].offsetTop);
})()'
agent-browser find role button click --name 'F1 · Assign Tonic'
agent-browser wait --fn 'document.querySelector(".tonic-slot")?.getAttribute("aria-pressed") === "true"'
agent-browser find role gridcell click --name 'Row 1, column 1, Gold'
agent-browser press ArrowRight
agent-browser press Enter
agent-browser wait --fn 'Array.from(document.querySelectorAll("[role=gridcell]")).some(cell => /Row 1, column 2.*Gold/.test(cell.getAttribute("aria-label") ?? ""))'
agent-browser drag '[aria-rowindex="1"][aria-colindex="2"]' '[aria-rowindex="1"][aria-colindex="3"]'
agent-browser wait --fn 'Array.from(document.querySelectorAll("[role=gridcell]")).some(cell => /Row 1, column 3.*Gold/.test(cell.getAttribute("aria-label") ?? ""))'
agent-browser screenshot "$out/inventory.png"

agent-browser open "$url"
agent-browser wait '.world-canvas canvas'
agent-browser find role button click --name 'Character [C]'
agent-browser wait '.character-dialog'
agent-browser wait --text 'Smoke Signal'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'
agent-browser wait --fn 'document.querySelector(".action-bar [data-skill-slot=\"1\"]")?.getAttribute("aria-label") === "Skill slot 1, Defend" && document.querySelector(".action-bar [data-skill-slot=\"0\"]")?.getAttribute("aria-label") === "Skill slot 0, Normal Attack"'
agent-browser wait --fn 'document.querySelector(".action-bar [aria-label=\"F1 Healing Tonic\"] img")?.naturalWidth > 0'

agent-browser find role button click --name 'Inventory [I]'
agent-browser wait --fn 'Array.from(document.querySelectorAll("[role=gridcell]")).some(cell => /Row 1, column 3.*Gold/.test(cell.getAttribute("aria-label") ?? ""))'
agent-browser wait --fn 'document.querySelector(".tonic-slot")?.getAttribute("aria-pressed") === "true"'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'
agent-browser find role button click --name 'Gates [G]'
agent-browser wait --text 'Travel to any other registered gate.'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'
agent-browser set viewport 390 844
agent-browser wait --fn '(() => {
  const map = document.querySelector(".map-surface").getBoundingClientRect();
  const log = document.querySelector(".game-log").getBoundingClientRect();
  return log.bottom === map.bottom && log.left === map.left && log.width < map.width;
})()'
agent-browser wait --fn '(() => {
  const slots = [...document.querySelectorAll(".action-bar [data-skill-slot]")];
  return slots.length === 10 && slots.every(slot => {
    const bounds = slot.getBoundingClientRect();
    return bounds.width > 0 && bounds.left >= 0 && bounds.right <= innerWidth &&
      bounds.top >= 0 && bounds.bottom <= innerHeight;
  });
})()'
assert_world_fits
agent-browser screenshot "$out/narrow.png"
agent-browser eval 'JSON.stringify({viewport:innerWidth, pageWidth:document.documentElement.scrollWidth, canvas:document.querySelector(".world-canvas canvas")?.width})'
agent-browser set viewport 320 568
assert_world_fits
agent-browser set viewport 390 844
assert_world_fits
agent-browser find role button click --name 'Inventory [I]'
agent-browser wait --fn '(() => {
  const dialog = document.querySelector(".inventory-dialog");
  const slots = [...document.querySelectorAll(".tonic-slot")];
  return dialog && dialog.scrollWidth <= dialog.clientWidth &&
    slots.length === 4 && slots.every(slot => slot.offsetTop === slots[0].offsetTop);
})()'
agent-browser screenshot "$out/inventory-narrow.png"
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'
agent-browser find role button click --name 'Settings [Esc]'
agent-browser wait --fn '!document.querySelector("audio, input[aria-label=music], input[aria-label=effects]") && !performance.getEntriesByType("resource").some(entry => entry.name.includes("/assets/audio/"))'
agent-browser find role button click --name 'Save & Exit'
agent-browser wait --text 'Create Character'
agent-browser console > "$out/console.txt"
agent-browser errors > "$out/errors.txt"
test ! -s "$out/errors.txt"
printf 'Browser evidence saved to %s\n' "$out"
