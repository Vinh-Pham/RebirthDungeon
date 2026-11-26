import { Button, Modal, Tooltip } from "@heroui/react";
import { attachDesktop, createWindowManager, type WindowManager } from "@surdeddd/wmkit";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import type { Point } from "../app/contracts";

const arrowMovement: Record<string, [number, number]> = {
  ArrowLeft: [-16, 0],
  ArrowRight: [16, 0],
  ArrowUp: [0, -16],
  ArrowDown: [0, 16],
};

interface GameDialogProps {
  id: string;
  title: string;
  onClose: () => void;
  positions: Map<string, Point>;
  className?: string;
  escapeHandledByGame?: boolean;
  nonModal?: boolean;
  children: ReactNode;
}

function WindowTitleBar({
  id,
  title,
  onClose,
  positions,
  nonModal,
}: Pick<GameDialogProps, "id" | "title" | "onClose" | "positions" | "nonModal">) {
  const titleId = useId();
  const handleRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<WindowManager | null>(null);

  useLayoutEffect(() => {
    const handle = handleRef.current;
    const frame = handle?.closest<HTMLElement>(".window-dialog");
    const host = frame?.closest<HTMLElement>(".window-desktop");
    if (!handle || !frame || !host) return;

    const wm = createWindowManager({
      keepInViewport: true,
      // The dialog fits inside the desktop, so keep its entire frame visible.
      minVisible: Number.MAX_SAFE_INTEGER,
      historyLimit: 0,
    });
    managerRef.current = wm;
    const desktop = attachDesktop(wm, host, {
      autoViewport: false,
      keyboard: false,
      announce: false,
      snap: false,
      grouping: false,
      magnetism: false,
      animation: false,
    });
    const viewport = () => ({ width: host.clientWidth, height: host.clientHeight });
    const size = () => ({ width: frame.offsetWidth, height: frame.offsetHeight });
    const screen = viewport();
    const bounds = size();
    const position = positions.get(id) ?? {
      x: (screen.width - bounds.width) / 2,
      y: (screen.height - bounds.height) / 2,
    };
    wm.setViewport(screen);
    wm.open({
      id,
      title: handle.textContent ?? "",
      ...bounds,
      ...position,
      minWidth: 1,
      minHeight: 1,
      resizable: false,
      minimizable: false,
      maximizable: false,
      snappable: false,
    });
    const detach = desktop.attachWindow(id, frame, { handle, resizeHandles: false });
    const resize = new ResizeObserver(() => {
      const current = wm.get(id)?.bounds;
      if (!current) return;
      wm.batch(() => {
        wm.setViewport(viewport());
        wm.resize(id, { x: current.x, y: current.y, ...size() });
      });
    });
    resize.observe(host);
    resize.observe(frame);

    return () => {
      resize.disconnect();
      detach();
      const bounds = wm.get(id)?.bounds;
      if (bounds) positions.set(id, { x: bounds.x, y: bounds.y });
      desktop.destroy();
      wm.destroy();
      managerRef.current = null;
    };
  }, [id, positions]);

  useLayoutEffect(() => {
    managerRef.current?.update(id, { title });
  }, [id, title]);

  return (
    <header className="panel-heading">
      <div
        ref={handleRef}
        className="window-titlebar"
        data-wm-drag=""
        role="group"
        aria-label="Move window"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
        tabIndex={0}
        onKeyDown={(event) => {
          const direction = arrowMovement[event.key];
          if (!direction || event.ctrlKey || event.metaKey || event.altKey) return;
          event.preventDefault();
          managerRef.current?.moveBy(id, ...direction);
        }}
      >
        {nonModal ? (
          <h2 id={titleId} data-wm-title="">
            {title}
          </h2>
        ) : (
          <Modal.Heading id={titleId} data-wm-title="">
            {title}
          </Modal.Heading>
        )}
      </div>
      <Tooltip>
        <Button isIconOnly variant="ghost" aria-label="Close [Esc]" onPress={onClose}>
          ×
        </Button>
        <Tooltip.Content>Close [Esc]</Tooltip.Content>
      </Tooltip>
    </header>
  );
}

export function GameDialog({
  id,
  title,
  onClose,
  positions,
  className = "",
  escapeHandledByGame = false,
  nonModal = false,
  children,
}: GameDialogProps) {
  const frameRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!nonModal) return;
    const frame = frameRef.current;
    const previous = document.activeElement;
    frame?.focus({ preventScroll: true });
    return () => {
      const active = document.activeElement;
      if (
        (active === document.body || frame?.contains(active)) &&
        previous instanceof HTMLElement &&
        previous.isConnected
      )
        previous.focus({ preventScroll: true });
    };
  }, [nonModal]);

  if (nonModal)
    return (
      <div className="window-desktop non-modal-desktop">
        <section
          ref={frameRef}
          role="dialog"
          aria-label={title}
          tabIndex={-1}
          className={`game-panel window-dialog ${className}`}
        >
          <WindowTitleBar id={id} title={title} onClose={onClose} positions={positions} nonModal />
          <div className="window-dialog-body">{children}</div>
        </section>
      </div>
    );
  return (
    <Modal.Backdrop
      isOpen
      variant="transparent"
      isKeyboardDismissDisabled={escapeHandledByGame}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container className="window-desktop" size="lg" scroll="inside">
        <Modal.Dialog className={`game-panel window-dialog ${className}`} aria-label={title}>
          <WindowTitleBar id={id} title={title} onClose={onClose} positions={positions} />
          <div className="window-dialog-body">{children}</div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
