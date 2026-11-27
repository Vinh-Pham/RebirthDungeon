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
    <header className="panel-heading mb-[var(--window-heading-gap,24px)] flex shrink-0 items-center justify-between gap-5">
      <div
        ref={handleRef}
        className="window-titlebar flex min-w-0 flex-1 cursor-grab touch-none items-center self-stretch select-none focus-visible:outline-2 focus-visible:outline-[#66c4ce] focus-visible:outline-offset-2 [[data-wm-dragging]_&]:cursor-grabbing"
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
          <h2 className="m-0 text-xl wrap-anywhere" id={titleId} data-wm-title="">
            {title}
          </h2>
        ) : (
          <Modal.Heading className="m-0 text-xl wrap-anywhere" id={titleId} data-wm-title="">
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

const dialogClasses =
  "game-panel window-dialog m-0 h-auto! w-[min(var(--window-width,32rem),calc(100%_-_var(--window-gutter,32px)))]! max-w-none max-h-[calc(100%_-_var(--window-gutter,32px))] overflow-hidden bg-[#1b3034] p-7 text-[#d6ddd0] shadow-[0_24px_100px_#0008] font-[Departure,monospace] max-[800px]:p-5 [&_.button]:shrink-0";
const bodyClasses = "window-dialog-body -m-1 min-h-0 overflow-auto overscroll-contain p-1";

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
      <div className="window-desktop non-modal-desktop pointer-events-none absolute inset-0 z-4 [grid-area:2/1/3/2]">
        <section
          ref={frameRef}
          role="dialog"
          aria-label={title}
          tabIndex={-1}
          className={`${dialogClasses} ${className}`}
        >
          <WindowTitleBar id={id} title={title} onClose={onClose} positions={positions} nonModal />
          <div className={bodyClasses}>{children}</div>
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
      <Modal.Container
        className="window-desktop relative h-[var(--visual-viewport-height,100dvh)] min-h-0 w-full! flex-none p-0! animate-none!"
        size="lg"
        scroll="inside"
      >
        <Modal.Dialog className={`${dialogClasses} ${className}`} aria-label={title}>
          <WindowTitleBar id={id} title={title} onClose={onClose} positions={positions} />
          <div className={bodyClasses}>{children}</div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
