import { useEffect, useId, type ReactNode } from 'react';
import { Modal, Tooltip } from '@heroui/react';

/** Shared dialog shell; HeroUI owns focus, dismissal, and nested overlay behavior. */
export function GameModal({
    title,
    label,
    onClose,
    children,
    footer,
}: {
    title: ReactNode;
    label?: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const dialogId = useId();
    useEffect(() => {
        // A saving transaction can disable the focused button and move focus to the body.
        // Keep Escape available there, while letting focused overlays handle it first.
        const dismiss = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            const dialogs = document.querySelectorAll('.game-modal');
            if (dialogs[dialogs.length - 1]?.id !== dialogId) return;
            event.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', dismiss);
        return () => window.removeEventListener('keydown', dismiss);
    }, [dialogId, onClose]);
    return (
        <Modal.Backdrop
            isOpen
            onOpenChange={(open) => !open && onClose()}
            variant="blur"
            className="dark z-[70]"
        >
            <Modal.Container placement="center" scroll="inside" size="lg">
                <Modal.Dialog
                    id={dialogId}
                    aria-label={label}
                    className="game-modal max-h-[90dvh] sm:max-w-[680px]"
                >
                    <Tooltip>
                        <Modal.CloseTrigger aria-label="Close" className="size-10" />
                        <Tooltip.Content>Close</Tooltip.Content>
                    </Tooltip>
                    <Modal.Header className="pr-12">
                        <Modal.Heading>{title}</Modal.Heading>
                    </Modal.Header>
                    <Modal.Body>{children}</Modal.Body>
                    {footer && <Modal.Footer>{footer}</Modal.Footer>}
                </Modal.Dialog>
            </Modal.Container>
        </Modal.Backdrop>
    );
}