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
    const canvas = map?.querySelector("canvas");
    const selectors = [".map-surface", ".game-log", ".action-bar", ".game-sidebar", "nav[aria-label=\"Game panels\"]"];
    return canvas && canvas.width === map.clientWidth && canvas.height === map.clientHeight &&
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

agent-browser set viewport 1440 900
agent-browser open "$url"
agent-browser wait --fn 'Array.from(document.querySelectorAll("button")).some(button => button.textContent === "Create Character" && !button.disabled)'
agent-browser press n
agent-browser wait --text 'Create Your Traveler'
agent-browser find role textbox fill 'Smoke Signal' --name 'Name*'
agent-browser find role button click --name 'Enter the Dungeon'
agent-browser find role button click --name 'Speak with Ilex'
agent-browser find role button click --name 'Follow the Lanterns'
agent-browser wait '.map-surface canvas'
agent-browser wait --fn '(() => {
  const minimap = document.querySelector("[aria-label=\"Minimap of Lantern Rest\"]");
  const map = document.querySelector(".map-surface").getBoundingClientRect();
  const status = document.querySelector(".status-rail").getBoundingClientRect();
  const meters = [...document.querySelectorAll(".status-rail meter")];
  const xp = meters[3];
  const log = document.querySelector(".game-log").getBoundingClientRect();
  const bounds = minimap?.getBoundingClientRect();
  return bounds && bounds.width === bounds.height && bounds.left >= map.right &&
    bounds.bottom <= status.top && !document.querySelector(".game-header") &&
    log.top === map.bottom && log.left === map.left && log.width === map.width &&
    meters.map(meter => meter.getAttribute("aria-label")).join(",") === "HP,Mana,Stamina,XP" &&
    new Set(meters.map(meter => getComputedStyle(meter).getPropertyValue("--meter-fill"))).size === 4 &&
    xp.value === 0 && xp.max === 100 && !document.querySelector(".status-rail").textContent.includes(" AP");
})()'
agent-browser eval 'window.initialMinimap = document.querySelector(".world-minimap").toDataURL(); true'
assert_world_fits
agent-browser screenshot "$out/town.png"

# The authored Lantern Rest gate sits at tile (8, 23) in the initial 24px viewport.
gate_x="$(agent-browser eval 'Math.round(document.querySelector(".map-surface canvas").getBoundingClientRect().left + 204)')"
gate_y="$(agent-browser eval 'Math.round(document.querySelector(".map-surface canvas").getBoundingClientRect().top + 564)')"
agent-browser mouse move "$gate_x" "$gate_y"
agent-browser mouse down
agent-browser mouse up
agent-browser wait --text 'Register This Moon Gate'
agent-browser wait --fn 'document.querySelector(".world-minimap").toDataURL() !== window.initialMinimap'
agent-browser find role button click --name 'Register This Moon Gate'
agent-browser wait --text 'Lantern Rest Moon Gate registered.'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'
agent-browser wait --fn 'document.querySelector(".game-log").getBoundingClientRect().bottom <= document.querySelector("nav[aria-label=\"Game panels\"]").getBoundingClientRect().top'
agent-browser find role button click --name 'Expand Log'
agent-browser wait --fn 'document.querySelector("[data-wm-window=log] .log-messages").textContent.includes("Lantern Rest Moon Gate registered.")'
agent-browser find role button click --name 'Close [Esc]'
agent-browser wait --fn '!document.querySelector("[role=dialog]")'

# Short desktop windows must keep the world controls within the page.
agent-browser set viewport 1280 650
assert_world_fits
agent-browser screenshot "$out/short-desktop.png"
agent-browser set viewport 1440 900
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
agent-browser drag '.skills-dialog [data-skill-source="combat_mastery"]' '.skills-dialog [data-skill-slot="1"]'
agent-browser wait --fn 'document.querySelector(".skills-dialog [data-skill-slot=\"1\"]")?.getAttribute("aria-label") === "Skill slot 1, Normal Attack"'
agent-browser focus '.skills-dialog [data-skill-source="defense"]'
agent-browser press Enter
agent-browser focus '.skills-dialog [data-skill-slot="0"]'
agent-browser press Enter
agent-browser wait --fn 'document.querySelector(".skills-dialog [data-skill-slot=\"0\"]")?.getAttribute("aria-label") === "Skill slot 0, Defend"'
agent-browser drag '.skills-dialog [data-skill-slot="1"]' '.skills-dialog [data-skill-slot="0"]'
agent-browser wait --fn 'document.querySelector(".skills-dialog [data-skill-slot=\"1\"]")?.getAttribute("aria-label") === "Skill slot 1, Defend" && document.querySelector(".skills-dialog [data-skill-slot=\"0\"]")?.getAttribute("aria-label") === "Skill slot 0, Normal Attack"'
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
agent-browser wait --text 'Smoke Signal'
agent-browser wait '.map-surface canvas'
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
  const bounds = document.querySelector(".world-minimap").getBoundingClientRect();
  const map = document.querySelector(".map-surface").getBoundingClientRect();
  const log = document.querySelector(".game-log").getBoundingClientRect();
  return bounds.width === bounds.height && bounds.top >= log.bottom &&
    log.top === map.bottom && log.left === map.left && log.width === map.width;
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
agent-browser eval 'JSON.stringify({viewport:innerWidth, pageWidth:document.documentElement.scrollWidth, canvas:document.querySelector("canvas")?.width})'
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
