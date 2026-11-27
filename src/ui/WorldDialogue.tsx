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
      className="world-dialogue-backdrop"
      isOpen
      variant="transparent"
      isKeyboardDismissDisabled
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container className="world-dialogue-container" placement="bottom">
        <Modal.Dialog className="world-dialogue" aria-describedby={text ? descriptionId : undefined}>
          <Modal.Header className="world-dialogue-header">
            <Modal.Heading>{title}</Modal.Heading>
            <Tooltip>
              <Button size="sm" variant="ghost" isIconOnly aria-label="Close [Esc]" onPress={onClose}>
                ×
              </Button>
              <Tooltip.Content>Close [Esc]</Tooltip.Content>
            </Tooltip>
          </Modal.Header>
          <div className="world-dialogue-scroll" tabIndex={0} role="group" aria-label="Dialogue text and choices">
            <div id={descriptionId} className="world-dialogue-text" aria-live="polite">
              {text}
            </div>
            {error}
            {options.length > 0 && <Modal.Footer className="world-dialogue-options">{options}</Modal.Footer>}
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
