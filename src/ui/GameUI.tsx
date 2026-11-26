import { useRef, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import type { GameActions, GameView, Point } from "../app/contracts";
import "./game.css";
import { CharacterCreation } from "./CharacterCreation";
import { GameDialog } from "./GameDialog";
import { ActionBar } from "./ActionBar";
import { SkillsPanel } from "./SkillsPanel";
import { InventoryPanel } from "./InventoryPanel";
import { LootPanel } from "./LootPanel";
import { WorldMinimap } from "../render/WorldMinimap";
import type { MapView } from "../game/core/session";

export function GameUI({
  view,
  actions,
  mapView,
  minimapView,
}: {
  view: GameView;
  actions: GameActions;
  mapView?: ReactNode;
  minimapView?: MapView;
}) {
  const windowPositions = useRef(new Map<string, Point>());
  const [deleteId, setDeleteId] = useState<string>();
  const deleteTarget = view.characters.find((character) => character.id === deleteId);
  const action = (id: string) => actions.choose(id);
  const options = view.details.options.map((option) => (
    <Button
      key={option.id}
      variant="secondary"
      isDisabled={view.busy || option.disabled}
      onPress={() => action(option.id)}
    >
      {option.label}
    </Button>
  ));
  const error = view.error && (
    <div role="alert" className="error-banner">
      {view.error}
    </div>
  );
  if (view.screen === "title")
    return (
      <main className="game-ui">
        {error}
        <div className="welcome">
          <section>
            <div className="muted">Beyond the last light</div>
            <h1>
              Rebirth
              <br />
              Dungeon
            </h1>
            <p>
              The world above is a memory. Follow the lanterns into the living
              depths, where forgotten gates still remember your name.
            </p>
            <div className="welcome-actions">
              <Button
                isDisabled={view.busy}
                onPress={() => actions.navigate("characters")}
              >
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
            className="welcome-art"
            src={import.meta.env.BASE_URL + "assets/art/title_gate.png"}
            alt="An ancient Moon Gate in the dungeon"
          />
        </div>
      </main>
    );
  if (view.screen === "characters")
    return (
      <main className="game-ui">
        <div className="welcome">
          <section>
            <h1>Your Travelers</h1>
            <div className="character-list">
              {view.characters.map((character) => (
                <div className="character-row" key={character.id}>
                  <div>
                    <strong>{character.name}</strong>
                    <p>{character.detail}</p>
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
            {!view.characters.length && <p>No travelers have arrived yet.</p>}
            <div className="welcome-actions">
              <Button onPress={() => actions.navigate("creation")}>
                Create Character
              </Button>
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
            <p className="panel-copy">This permanently deletes the character and their save.</p>
            <div className="game-actions">
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
  if (view.screen === "creation")
    return (
      <CharacterCreation
        actions={actions}
        busy={view.busy}
        error={view.error}
      />
    );
  if (view.screen === "arrival")
    return (
      <main className="game-ui">
        <div className="welcome">
          <section>
            <div className="muted">The lantern keeper</div>
            <h1>Ilex</h1>
            <p>{view.arrival.text}</p>
            <div className="welcome-actions">
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
  return (
    <main className="game-ui game-ui--world">
      {view.panel !== "inventory" && view.panel !== "loot" && view.panel !== "skills" && error}
      <div className="game-layout">
        <div className="world-column">
          <section
            className="map-surface"
            aria-label="Dungeon map"
            aria-description={`${view.location}, ${view.locationDetail}`}
          >
            {mapView}
          </section>
          <section className="game-log" aria-labelledby="game-log-heading">
            <div className="game-log-heading">
              <h2 id="game-log-heading">Log</h2>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Expand Log"
                aria-haspopup="dialog"
                onPress={() => actions.panel("log")}
              >
                Expand
              </Button>
            </div>
            <div
              className="log-messages"
              role="log"
              aria-labelledby="game-log-heading"
              tabIndex={0}
              data-game-scroll
            >
              <div className="game-log-entries">
                {view.log.slice(-8).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </section>
          <ActionBar view={view} actions={actions} />
        </div>
        <aside className="game-sidebar" aria-label="Minimap and character status" tabIndex={0} data-game-scroll>
          {minimapView && (
            <WorldMinimap view={minimapView} location={view.location} />
          )}
          <div className="status-rail">
            {player && (
              <>
                <div className="status-identity">
                  <h2>{player.name}</h2>
                  <span className="muted">Level {player.level}</span>
                </div>
                {(
                  [
                    ["hp", "HP", player.hp, player.maxHp],
                    ["mana", "Mana", player.mp, player.maxMp],
                    ["stamina", "Stamina", player.stamina, player.maxStamina],
                    ["xp", "XP", player.xpInLevel, player.xpToAdvance],
                  ] as const
                ).map(([resource, label, value, max]) => (
                  <div className={`resource resource-${resource}`} key={resource}>
                    <div className="resource-label">
                      <span>
                        {label}
                        {resource === "hp" && (player.deadly ? " · Deadly" : player.wounds ? " · Wounded" : "")}
                      </span>
                      <span>{resource === "xp" && max === 0 ? "Max level" : `${Math.floor(value)} / ${max}`}</span>
                    </div>
                    {max > 0 && <meter aria-label={label} value={Math.max(0, value)} max={max} />}
                  </div>
                ))}
              </>
            )}
            <div className="status-nearby">
              <div>
                <h3>Nearby</h3>
                <p className="muted">{view.nearby || "Quiet passage"}</p>
              </div>
              <Button variant="secondary" onPress={actions.interact}>
                Interact [{view.settings.bindings.interact?.toUpperCase()}]
              </Button>
            </div>
          </div>
        </aside>
      </div>
      <nav className="game-actions" aria-label="Game panels">
        {(
          [
            "character",
            "inventory",
            "skills",
            "journal",
            "gates",
            "settings",
          ] as const
        ).map((panel) => (
          <Button
            variant="ghost"
            key={panel}
            onPress={() => actions.panel(panel)}
          >
            {panel[0].toUpperCase() + panel.slice(1)} [
            {view.settings.bindings[panel]?.toUpperCase() || "Esc"}]
          </Button>
        ))}
      </nav>
      {view.panel && (
        <GameDialog
          key={view.panel}
          id={view.panel}
          title={view.details.title || view.panel}
          onClose={() => actions.panel()}
          positions={windowPositions.current}
          className={`${view.panel}-dialog`}
          escapeHandledByGame
        >
          {view.panel === "inventory" ? (
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
            <div className="log-messages">
              {view.log.length ? view.log.map((line, i) => (
                <p key={i}>{line}</p>
              )) : <p className="muted">No messages yet.</p>}
            </div>
          ) : view.panel === "skills" ? (
            <>
              {error}
              <SkillsPanel view={view} actions={actions} />
            </>
          ) : (
            <p className="panel-copy">{view.details.body}</p>
          )}
          {view.panel === "character" && view.characterStats && (
            <div className="character-stat-groups">
              {view.characterStats.map((group) => (
                <section className="character-stat-group" key={group.title}>
                  <h3>{group.title}</h3>
                  <dl>
                    {group.stats.map((stat) => (
                      <div className="character-stat-row" key={stat.label}>
                        <dt>{stat.label}</dt>
                        <dd>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          )}
          {view.panel === "settings" && (
            <>
              <h3>Keyboard Bindings</h3>
              <p className="panel-copy">1–0 activate skill slots. F1–F4 use tonic quick slots.</p>
              {Object.entries(view.settings.bindings).map(
                ([command, key]) => (
                  <label className="option-row" key={command}>
                    {command}
                    <input
                      className="binding-input"
                      aria-label={"Key for " + command}
                      value={key}
                      readOnly
                      onKeyDown={(event) => {
                        if (event.key === "Tab" || event.key === "Escape")
                          return;
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
                ),
              )}
              <label className="option-row">
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
                className="settings-exit"
                variant="secondary"
                isDisabled={view.busy}
                onPress={() => actions.navigate("title")}
              >
                Save &amp; Exit
              </Button>
            </>
          )}
          {options.length > 0 && <div className="game-actions">{options}</div>}
        </GameDialog>
      )}
    </main>
  );
}
