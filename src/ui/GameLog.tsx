import { Button, Label, Popover, Switch, Tabs } from "@heroui/react";
import type { LogCategory, LogEntry } from "../game/core/profile";

export type LogTab = "all" | LogCategory;

const categories = {
  all: "All",
  general: "General",
  combat: "Combat",
  character: "Character",
} satisfies Record<LogTab, string>;
const tabs = Object.keys(categories) as LogTab[];
const logTime = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function GameLog({
  entries,
  category,
  onCategoryChange,
  showTimestamps,
  onShowTimestampsChange,
  onExpand,
}: {
  entries: LogEntry[];
  category: LogTab;
  onCategoryChange: (category: LogTab) => void;
  showTimestamps: boolean;
  onShowTimestampsChange: (visible: boolean) => void;
  onExpand?: () => void;
}) {
  const matching = category === "all" ? entries : entries.filter((entry) => entry.category === category);
  const messages = onExpand ? matching.slice(-8) : matching;

  return (
    <Tabs
      className={onExpand ? "log-tabs game-log" : "log-tabs"}
      selectedKey={category}
      onSelectionChange={(key) => onCategoryChange(key as LogTab)}
      variant="secondary"
    >
      <div className="log-toolbar">
        {onExpand && <h2 className="log-heading">Log</h2>}
        <Tabs.ListContainer>
          <Tabs.List aria-label="Log category">
            {tabs.map((id) => (
              <Tabs.Tab key={id} id={id}>
                {categories[id]}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <div className="log-actions">
          <Popover>
            <Button size="sm" variant="ghost" aria-label="Log options">
              Options
            </Button>
            <Popover.Content placement="top end" className="log-options">
              <Popover.Dialog aria-label="Log options" data-log-options>
                <Switch size="sm" isSelected={showTimestamps} onChange={onShowTimestampsChange}>
                  <Switch.Content>
                    <Label>Show timestamps</Label>
                  </Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
          {onExpand && (
            <Button size="sm" variant="ghost" aria-label="Expand Log" aria-haspopup="dialog" onPress={onExpand}>
              Expand
            </Button>
          )}
        </div>
      </div>
      <Tabs.Panel key={category} id={category} className="log-tab-panel" data-game-scroll>
        <div className="log-messages" role="log" aria-label={`${categories[category]} messages`}>
          {messages.length ? (
            messages.map(({ id, message, timestamp }) => (
              <p key={id}>
                {showTimestamps && timestamp !== undefined && (
                  <time dateTime={new Date(timestamp).toISOString()} title={new Date(timestamp).toLocaleString()}>
                    {logTime.format(timestamp)}
                  </time>
                )}
                <span>{message}</span>
              </p>
            ))
          ) : (
            <p className="muted">{category === "all" ? "No messages yet." : `No ${category} messages yet.`}</p>
          )}
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}
