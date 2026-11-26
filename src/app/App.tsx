import { lazy, Suspense, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useStore } from "zustand";
import { GameSession } from "../game/core/session";
import { GameUI } from "../ui/GameUI";
import { useGameHotkeys } from "./useGameHotkeys";

const WorldCanvas = lazy(() =>
  import("../render/WorldCanvas").then((module) => ({
    default: module.WorldCanvas,
  })),
);
const game = new GameSession();
let initialization: Promise<void> | undefined;

function WorldMap({
  map,
  combatCue,
  encounter,
  reducedMotion,
}: {
  map: NonNullable<ReturnType<typeof game.store.getState>["mapView"]>;
  combatCue?: { id: string; outcome: "hit" | "victory" };
  encounter: ReturnType<typeof game.store.getState>["view"]["encounter"];
  reducedMotion: boolean;
}) {
  const townResidents = useStore(game.store, (state) => state.townResidents);
  return (
    <Suspense fallback={<p className="muted">Loading the map…</p>}>
      <WorldCanvas
        map={map.map}
        townResidents={townResidents}
        player={map.position}
        appearance={map.appearance}
        visible={map.visible}
        explored={map.explored}
        lighting={map.lighting}
        combatCue={combatCue}
        encounter={encounter}
        reducedMotion={reducedMotion}
        onTravel={game.travelTo}
        onTarget={game.actions.target}
      />
    </Suspense>
  );
}

export function App() {
  const view = useStore(game.store, (state) => state.view);
  const map = useStore(game.store, (state) => state.mapView);
  useGameHotkeys(game, view);

  useEffect(() => {
    initialization ??= game.initialize();
    let previous = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (previous && !document.hidden) game.tick(Math.min((now - previous) / 1000, 0.05));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    function pause() {
      previous = 0;
      game.pause();
    }
    frame = requestAnimationFrame(tick);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", pause);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);

  const lastLine = view.log.at(-1);
  const combatCue = lastLine?.includes("cleared. +")
    ? { id: `${view.log.length}:${lastLine}`, outcome: "victory" as const }
    : /deals .*damage|for .*damage/.test(lastLine ?? "")
      ? { id: `${view.log.length}:${lastLine}`, outcome: "hit" as const }
      : undefined;

  return (
    <DndProvider backend={HTML5Backend}>
      <GameUI
        view={view}
        actions={game.actions}
        minimapView={map}
        mapView={
          map && (
            <WorldMap
              map={map}
              combatCue={combatCue}
              encounter={view.encounter}
              reducedMotion={view.settings.reducedMotion}
            />
          )
        }
      />
    </DndProvider>
  );
}
