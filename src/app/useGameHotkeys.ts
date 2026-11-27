import { useHotkeys } from "react-hotkeys-hook";
import type { GameSession } from "../game/core/session";
import { skillSlotKeys, type GameView, type Panel } from "./contracts";

const directions: Record<string, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
const panels = ["character", "inventory", "skills", "journal", "gates"];

function ignoreShortcut(event: KeyboardEvent) {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    (event.target instanceof Element && Boolean(event.target.closest("[data-log-options]")))
  );
}

export function useGameHotkeys(game: GameSession, view: GameView, toggleLog: () => void) {
  const { actions } = game;
  useHotkeys("n", () => actions.navigate("creation"), {
    enabled: view.screen === "title" && !view.busy,
    useKey: true,
    ignoreModifiers: true,
    ignoreEventWhen: (event) => ignoreShortcut(event) || event.repeat,
  });

  useHotkeys(
    "escape",
    (event) => {
      if (
        event.target instanceof Element &&
        event.target
          .closest('[role="grid"]')
          ?.querySelector('[data-picked="true"]')
      ) {
        return;
      }
      event.preventDefault();
      actions.panel(view.panel ? undefined : "settings");
    },
    {
      enabled: view.screen === "world" && view.panel !== "character" && view.panel !== "log",
      enableOnFormTags: Boolean(view.panel),
      enableOnContentEditable: Boolean(view.panel),
      ignoreModifiers: true,
      ignoreEventWhen: (event) => ignoreShortcut(event) || event.repeat,
      eventListenerOptions: { capture: true },
    },
  );

  // Match saved KeyboardEvent.key values literally, including punctuation.
  useHotkeys(
    "*",
    (event) => {
      const key = event.key.toLowerCase();
      if (key === view.settings.bindings.log) {
        event.preventDefault();
        if (!event.repeat) toggleLog();
        return;
      }
      if (view.panel) return;
      const skillSlot = skillSlotKeys.findIndex((slotKey) => slotKey === key);
      if (skillSlot !== -1) {
        event.preventDefault();
        if (!event.repeat) actions.useSkillSlot(skillSlot);
        return;
      }
      if (/^f[1-4]$/.test(key)) {
        event.preventDefault();
        if (!event.repeat) actions.useQuickSlot(Number(key[1]) - 1);
        return;
      }
      const command = Object.keys(view.settings.bindings).find(
        (id) => view.settings.bindings[id] === key,
      );
      const direction = directions[command ?? key.replace(/^arrow/, "")];
      if (direction) {
        if (
          key.startsWith("arrow") &&
          event.target instanceof Element &&
          event.target.closest('[data-game-scroll], [role="tablist"]')
        ) return;
        event.preventDefault();
        game.step(...direction, event.repeat);
        return;
      }

      if (event.repeat) return;
      if (command === "interact" || key === "enter" || key === " ") {
        if (
          (key === "enter" || key === " ") &&
          event.target instanceof Element &&
          event.target.closest('button, a, [role="button"]')
        ) {
          return;
        }
        event.preventDefault();
        actions.interact();
      } else if (command && panels.includes(command)) {
        actions.panel(command as Panel);
      }
    },
    {
      enabled: view.screen === "world" && (!view.panel || view.panel === "skills"),
      ignoreEventWhen: ignoreShortcut,
    },
  );
}
