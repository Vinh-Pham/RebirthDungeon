import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import type { GameActions, GameView, Point } from "../app/contracts";
import "./game.css";
import { CharacterCreation } from "./CharacterCreation";
import { CharacterPanel } from "./CharacterPanel";
import { GameDialog } from "./GameDialog";
import { GameLog, type LogTab } from "./GameLog";
import { GameMenu } from "./GameMenu";
import { WorldDialogue } from "./WorldDialogue";
import { ActionBar, type SkillSelection } from "./ActionBar";
import { SkillsPanel } from "./SkillsPanel";
import { InventoryPanel } from "./InventoryPanel";
import { LootPanel } from "./LootPanel";
import { WorldMinimap } from "../render/WorldMinimap";
import type { MapView } from "../game/core/session";

const screenClasses = "game-ui min-h-dvh bg-background";
const welcomeClasses =
  "welcome mx-auto grid min-h-dvh max-w-[980px] grid-cols-2 items-center gap-20 p-12 max-[800px]:grid-cols-1 max-[800px]:gap-5 max-[800px]:p-7";
const welcomeTitle = "mt-3 mb-6 text-[clamp(30px,5vw,56px)] leading-tight";
const welcomeCopy = "font-[SourceCode,monospace] leading-[1.8] text-[#95aaa3]";
const welcomeActions = "mt-[30px] flex flex-col items-stretch gap-3";
const dialogActions = "flex flex-wrap gap-2 px-6 py-[18px] max-[800px]:px-3 max-[800px]:py-4";
const panelCopy = "font-[SourceCode,monospace] leading-[1.7] text-[#becbc4]";
const settingsRow = "flex items-center justify-between gap-5 py-3.5";
const panelClasses: Partial<Record<NonNullable<GameView["panel"]>, string>> = {
  character:
    "[--window-width:41rem] [--window-heading-gap:10px] px-5! py-4! max-[540px]:p-3! max-[540px]:[&>.window-dialog-body]:[scrollbar-width:thin]",
  inventory: "[--window-width:44rem] [--window-heading-gap:16px] p-[clamp(16px,3vw,28px)]!",
  log: "flex flex-col [--window-width:48rem] [--window-heading-gap:12px] [&>.window-dialog-body]:flex [&>.window-dialog-body]:flex-col [&>.window-dialog-body]:overflow-hidden",
};

export function GameUI({
  view,
  actions,
  logOpen,
  mapView,
  minimapView,
}: {
  view: GameView;
  actions: GameActions;
  logOpen: boolean;
  mapView?: ReactNode;
  minimapView?: MapView;
}) {
  const windowPositions = useRef(new Map<string, Point>());
  const [deleteId, setDeleteId] = useState<string>();
  const [selectedSkill, selectSkill] = useState<SkillSelection>();
  const [logCategory, setLogCategory] = useState<LogTab>("all");
  const [mapSurface, setMapSurface] = useState<HTMLElement | null>(null);
  const skillsOpen = view.screen === "world" && view.panel === "skills";
  useEffect(() => {
    if (!skillsOpen) selectSkill(undefined);
  }, [skillsOpen]);
  const skillEditor = skillsOpen ? { selected: selectedSkill, select: selectSkill } : undefined;
  const deleteTarget = view.characters.find((character) => character.id === deleteId);
  const action = (id: string) => actions.choose(id);
  const options = view.details.options.map((option) => (
    <Button
      key={option.id}
      variant="secondary"
      className={
        view.panel === "service"
          ? "h-auto min-h-9 max-w-full justify-start py-1.5 text-left whitespace-normal wrap-anywhere"
          : undefined
      }
      isDisabled={view.busy || option.disabled}
      onPress={() => action(option.id)}
    >
      {option.label}
    </Button>
  ));
  const error = view.error && (
    <div role="alert" className="error-banner bg-[#532d34] px-6 py-3 text-[#ffe1df]">
      {view.error}
    </div>
  );
  if (view.screen === "title")
    return (
      <main className={screenClasses}>
        {error}
        <div className={welcomeClasses}>
          <section>
            <div className="text-[#8da4a1]">Beyond the last light</div>
            <h1 className={welcomeTitle}>
              Rebirth
              <br />
              Dungeon
            </h1>
            <p className={welcomeCopy}>
              The world above is a memory. Follow the lanterns into the living depths, where forgotten gates still
              remember your name.
            </p>
            <div className={welcomeActions}>
              <Button isDisabled={view.busy} onPress={() => actions.navigate("characters")}>
                Continue Your Journey
              </Button>
              <Button
                variant="secondary"
                isDisabled={view.busy}
                onPress={() => actions.navigate("creation")}
              >
                Create Character
              </Button>
            </div>
          </section>
          <img
            className="welcome-art max-h-[420px] w-full object-contain [image-rendering:pixelated] max-[800px]:row-start-1 max-[800px]:max-h-[200px]"
            src={import.meta.env.BASE_URL + "assets/art/title_gate.png"}
            alt="An ancient Moon Gate in the dungeon"
          />
        </div>
      </main>
    );
  if (view.screen === "characters")
    return (
      <main className={screenClasses}>
        <div className={welcomeClasses}>
          <section>
            <h1 className={welcomeTitle}>Your Travelers</h1>
            <div className="character-list grid gap-3">
              {view.characters.map((character) => (
                <div
                  className="character-row flex items-center justify-between gap-5 bg-[#152a2c] p-4"
                  key={character.id}
                >
                  <div>
                    <strong>{character.name}</strong>
                    <p className={welcomeCopy}>{character.detail}</p>
                  </div>
                  <Button onPress={() => actions.load(character.id)}>
                    Enter
                  </Button>
                  <Button
                    variant="danger-soft"
                    onPress={() => setDeleteId(character.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
            {!view.characters.length && <p className={welcomeCopy}>No travelers have arrived yet.</p>}
            <div className={welcomeActions}>
              <Button onPress={() => actions.navigate("creation")}>Create Character</Button>
              <Button variant="ghost" onPress={() => actions.navigate("title")}>
                Back
              </Button>
            </div>
            {error}
          </section>
        </div>
        {deleteTarget && (
          <GameDialog
            id="delete-character"
            title={`Delete ${deleteTarget.name}?`}
            positions={windowPositions.current}
            onClose={() => setDeleteId(undefined)}
          >
            <p className={panelCopy}>This permanently deletes the character and their save.</p>
            <div className={dialogActions}>
              <Button variant="secondary" onPress={() => setDeleteId(undefined)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={() => {
                  setDeleteId(undefined);
                  actions.deleteCharacter(deleteTarget.id);
                }}
              >
                Delete Character
              </Button>
            </div>
          </GameDialog>
        )}
      </main>
    );
  if (view.screen === "creation") return <CharacterCreation actions={actions} busy={view.busy} error={view.error} />;
  if (view.screen === "arrival")
    return (
      <main className={screenClasses}>
        <div className={welcomeClasses}>
          <section>
            <div className="text-[#8da4a1]">The lantern keeper</div>
            <h1 className={welcomeTitle}>Ilex</h1>
            <p className={welcomeCopy}>{view.arrival.text}</p>
            <div className={welcomeActions}>
              {view.arrival.options.map((option) => (
                <Button key={option.id} onPress={() => action(option.id)}>
                  {option.label}
                </Button>
              ))}
            </div>
            {error}
          </section>
        </div>
      </main>
    );
  const player = view.player;
  const worldDialogueOpen = view.panel === "service";
  const logProps = {
    entries: view.log,
    category: logCategory,
    onCategoryChange: setLogCategory,
    showTimestamps: view.settings.showLogTimestamps,
    onShowTimestampsChange: (showLogTimestamps: boolean) => actions.updateSettings({ showLogTimestamps }),
  };
  return (
    <main
      className={`${screenClasses} game-ui--world flex h-dvh flex-col [&>.error-banner]:max-h-[20dvh] [&>.error-banner]:overflow-auto [&>.error-banner]:wrap-anywhere`}
    >
      {!worldDialogueOpen && view.panel !== "inventory" && view.panel !== "loot" && view.panel !== "skills" && error}
      <div className="game-layout grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)]">
        <div
          className={`world-column relative grid min-h-0 min-w-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] ${minimapView ? "[--minimap-size:clamp(64px,20vw,min(200px,24dvh))]" : ""} ${worldDialogueOpen ? "[@media(max-width:800px)_and_(max-height:700px)]:[&>.action-bar]:hidden" : ""}`}
        >
          <section
            ref={setMapSurface}
            className="map-surface relative col-start-1 row-span-2 row-start-1 min-h-0 overflow-hidden bg-[#152a2c]"
            aria-label="Dungeon map"
            aria-description={`${view.location}, ${view.locationDetail}`}
          >
            {mapView}
            {minimapView && <WorldMinimap view={minimapView} location={view.location} />}
            {logOpen && !worldDialogueOpen && <GameLog {...logProps} onExpand={() => actions.panel("log")} />}
            {view.nearby && !worldDialogueOpen && (
              <div className={`status-nearby pointer-events-none absolute right-3 bottom-3 z-1 border border-border bg-background/85 px-2 py-1 text-right text-[12px] wrap-anywhere ${logOpen ? "max-w-[calc(66%_-_12px)] max-[760px]:max-w-[calc(32%_-_12px)]" : "max-w-[calc(100%_-_24px)]"}`}>
                <span className="text-muted">Nearby</span>
                <p>{view.nearby}</p>
              </div>
            )}
            {worldDialogueOpen && mapSurface && (
              <WorldDialogue
                mapSurface={mapSurface}
                title={view.details.title}
                text={view.details.body}
                options={options}
                error={error}
                onClose={() => actions.panel()}
              />
            )}
          </section>
          <ActionBar view={view} actions={actions} editor={skillEditor} />
          {skillEditor && (
            <GameDialog
              id="skills"
              title="Skills"
              onClose={() => actions.panel()}
              positions={windowPositions.current}
              className="skills-dialog pointer-events-auto flex max-h-[calc(100%_-_8px)] flex-col [--window-width:40rem] [--window-gutter:8px] [--window-heading-gap:8px] px-3.5! py-3! max-[540px]:px-2! max-[540px]:py-[7px]! [&>.window-dialog-body]:flex [&>.window-dialog-body]:flex-col [&>.window-dialog-body]:overflow-hidden"
              nonModal
            >
              {error}
              <SkillsPanel view={view} actions={actions} editor={skillEditor} />
            </GameDialog>
          )}
        </div>
      </div>
      <GameMenu view={view} actions={actions} />
      {view.panel && view.panel !== "skills" && !worldDialogueOpen && (
        <GameDialog
          key={view.panel}
          id={view.panel}
          title={view.details.title || view.panel}
          onClose={() => actions.panel()}
          positions={windowPositions.current}
          className={`${view.panel}-dialog ${panelClasses[view.panel] ?? ""}`}
          escapeHandledByGame={view.panel !== "character" && view.panel !== "log"}
        >
          {view.panel === "character" && player && view.characterSheet ? (
            <CharacterPanel player={player} sheet={view.characterSheet} />
          ) : view.panel === "inventory" ? (
            <>
              {error}
              <InventoryPanel view={view} actions={actions} />
            </>
          ) : view.panel === "loot" ? (
            <>
              {error}
              <LootPanel items={view.loot} busy={view.busy} takeLoot={actions.takeLoot} />
            </>
          ) : view.panel === "log" ? (
            <GameLog {...logProps} />
          ) : (
            <p className={panelCopy}>{view.details.body}</p>
          )}
          {view.panel === "settings" && (
            <>
              <h3 className="text-[14px] text-[#b8cd98]">Keyboard Bindings</h3>
              <p className={panelCopy}>1–0 activate skill slots. F1–F4 use tonic quick slots.</p>
              {Object.entries(view.settings.bindings).map(([command, key]) => (
                <label className={settingsRow} key={command}>
                  {command}
                  <input
                    className="binding-input w-[110px] border border-[#49615d] bg-[#11272b] p-2 text-center text-[#d6ddd0]"
                    aria-label={"Key for " + command}
                    value={key}
                    readOnly
                    onKeyDown={(event) => {
                      if (event.key === "Tab" || event.key === "Escape") return;
                      event.preventDefault();
                      event.stopPropagation();
                      actions.updateSettings({
                        bindings: {
                          ...view.settings.bindings,
                          [command]: event.key,
                        },
                      });
                    }}
                  />
                </label>
              ))}
              <label className={settingsRow}>
                Reduced Motion
                <input
                  type="checkbox"
                  checked={view.settings.reducedMotion}
                  onChange={(e) =>
                    actions.updateSettings({
                      reducedMotion: e.target.checked,
                    })
                  }
                />
              </label>
              <Button
                className="mt-4"
                variant="secondary"
                isDisabled={view.busy}
                onPress={() => actions.navigate("title")}
              >
                Save &amp; Exit
              </Button>
            </>
          )}
          {options.length > 0 && <div className={dialogActions}>{options}</div>}
        </GameDialog>
      )}
    </main>
  );
}
