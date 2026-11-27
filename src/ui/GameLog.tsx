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

  const buttonClasses = `px-1.5 text-[12px] focus-visible:-outline-offset-2 ${onExpand ? "max-[800px]:px-[5px]" : ""}`;

  return (
    <Tabs
      className={`log-tabs flex min-h-0 flex-col gap-1 ${onExpand ? "game-log absolute bottom-0 left-0 z-2 w-1/3 bg-black/35 p-2 max-[760px]:w-[min(19rem,68%)]" : ""}`}
      selectedKey={category}
      onSelectionChange={(key) => onCategoryChange(key as LogTab)}
      variant="secondary"
    >
      <div className="log-toolbar flex flex-wrap items-center gap-x-2 gap-y-1">
        {onExpand && <h2 className="log-heading mr-1 text-[12px] text-accent max-[800px]:hidden">Log</h2>}
        <Tabs.ListContainer className="max-w-full rounded-none bg-transparent">
          <Tabs.List className="p-0" aria-label="Log category">
            {tabs.map((id) => (
              <Tabs.Tab
                key={id}
                id={id}
                className="min-h-8 rounded-none border-b-2 border-transparent px-2 py-1 font-[Departure,monospace] text-[12px] leading-[normal] data-[selected]:border-accent data-[selected]:text-foreground data-[focus-visible]:outline-2 data-[focus-visible]:outline-focus data-[focus-visible]:-outline-offset-2 max-[800px]:px-[5px]"
              >
                {categories[id]}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <div className="log-actions ml-auto flex items-center">
          <Popover>
            <Button className={buttonClasses} size="sm" variant="ghost" aria-label="Log options">
              Options
            </Button>
            <Popover.Content
              placement="top end"
              className="log-options z-60 font-[Departure,monospace] text-foreground"
            >
              <Popover.Dialog className="p-3" aria-label="Log options" data-log-options>
                <Switch className="gap-3" size="sm" isSelected={showTimestamps} onChange={onShowTimestampsChange}>
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
            <Button
              className={buttonClasses}
              size="sm"
              variant="ghost"
              aria-label="Expand Log"
              aria-haspopup="dialog"
              onPress={onExpand}
            >
              Expand
            </Button>
          )}
        </div>
      </div>
      <Tabs.Panel
        key={category}
        id={category}
        className={`log-tab-panel m-0 flex min-h-0 flex-col-reverse overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2 ${onExpand ? "max-h-[clamp(34px,12dvh,160px)] max-[800px]:max-h-[clamp(26px,8dvh,72px)]" : ""}`}
        data-game-scroll
      >
        <div
          className="log-messages flex-none font-[SourceCode,monospace] text-[13px] leading-[1.7]"
          role="log"
          aria-label={`${categories[category]} messages`}
        >
          {messages.length ? (
            messages.map(({ id, message, timestamp }) => (
              <p className="my-0.5 flex items-baseline gap-2.5 wrap-anywhere" key={id}>
                {showTimestamps && timestamp !== undefined && (
                  <time
                    className="flex-none text-muted tabular-nums"
                    dateTime={new Date(timestamp).toISOString()}
                    title={new Date(timestamp).toLocaleString()}
                  >
                    {logTime.format(timestamp)}
                  </time>
                )}
                <span>{message}</span>
              </p>
            ))
          ) : (
            <p className="my-0.5 text-[#8da4a1] wrap-anywhere">
              {category === "all" ? "No messages yet." : `No ${category} messages yet.`}
            </p>
          )}
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}
