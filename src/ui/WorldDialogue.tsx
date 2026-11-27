import { Button, Modal, Tooltip } from "@heroui/react";
import { useId, type ReactNode } from "react";

export function WorldDialogue({
  mapSurface,
  title,
  text,
  options,
  error,
  onClose,
}: {
  mapSurface: HTMLElement;
  title: string;
  text: string;
  options: ReactNode[];
  error: ReactNode;
  onClose: () => void;
}) {
  const descriptionId = useId();

  return (
    <Modal.Backdrop
      UNSTABLE_portalContainer={mapSurface}
      className="world-dialogue-backdrop absolute h-full"
      isOpen
      variant="transparent"
      isKeyboardDismissDisabled
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container className="world-dialogue-container h-full w-full animate-none p-0" placement="bottom">
        <Modal.Dialog
          className="world-dialogue w-full max-h-[min(80%,24rem)] max-w-none border-t-2 border-border bg-surface p-0 text-left text-surface-foreground [--dialogue-inset:clamp(12px,2vw,24px)]"
          aria-describedby={text ? descriptionId : undefined}
        >
          <Modal.Header className="world-dialogue-header flex-none flex-row items-center justify-between gap-3 px-[var(--dialogue-inset)] pt-1">
            <Modal.Heading className="wrap-anywhere text-accent">{title}</Modal.Heading>
            <Tooltip>
              <Button size="sm" variant="ghost" isIconOnly aria-label="Close [Esc]" onPress={onClose}>
                ×
              </Button>
              <Tooltip.Content>Close [Esc]</Tooltip.Content>
            </Tooltip>
          </Modal.Header>
          <div
            className="world-dialogue-scroll min-h-0 overflow-auto overscroll-contain px-[var(--dialogue-inset)] pb-3.5 [scrollbar-color:var(--border)_transparent] focus-visible:outline-2 focus-visible:outline-focus focus-visible:-outline-offset-2"
            tabIndex={0}
            role="group"
            aria-label="Dialogue text and choices"
          >
            <div
              id={descriptionId}
              className="world-dialogue-text font-[SourceCode,monospace] text-[14px] leading-[1.6] whitespace-pre-wrap wrap-anywhere"
              aria-live="polite"
            >
              {text}
            </div>
            {error}
            {options.length > 0 && (
              <Modal.Footer className="world-dialogue-options mt-3 justify-start">{options}</Modal.Footer>
            )}
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
