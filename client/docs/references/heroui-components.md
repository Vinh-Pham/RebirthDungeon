# button Documentation (@heroui/react)

**URL:** https://heroui.com/docs/react/components/button.mdx

---

<page url="/en/docs/react/components/button">
# Button

**Category**: react
**URL**: https://heroui.com/en/docs/react/components/button
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(buttons)/button.mdx

> A clickable button component with multiple variants and states

## Usage

```tsx
import { Button } from '@heroui/react';
```

```tsx
'use client';

import { Button } from '@heroui/react';

export function Basic() {
    return <Button onPress={() => console.log('Button pressed')}>Click me</Button>;
}
```

## Examples

### Variants

```tsx
import { Button } from '@heroui/react';

export function Variants() {
    return (
        <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="danger-soft">Danger Soft</Button>
        </div>
    );
}
```

### Sizes

```tsx
import { Button } from '@heroui/react';

export function Sizes() {
    return (
        <div className="flex items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
        </div>
    );
}
```

### With Icons

```tsx
import { Envelope, Globe, Plus, TrashBin } from '@gravity-ui/icons';
import { Button } from '@heroui/react';

export function WithIcons() {
    return (
        <div className="flex flex-wrap gap-3">
            <Button>
                <Globe />
                Search
            </Button>
            <Button variant="secondary">
                <Plus />
                Add Member
            </Button>
            <Button variant="tertiary">
                <Envelope />
                Email
            </Button>
            <Button variant="danger">
                <TrashBin />
                Delete
            </Button>
        </div>
    );
}
```

### Icon Only

```tsx
import { Ellipsis, Gear, TrashBin } from '@gravity-ui/icons';
import { Button } from '@heroui/react';

export function IconOnly() {
    return (
        <div className="flex gap-3">
            <Button isIconOnly aria-label="More options" variant="tertiary">
                <Ellipsis />
            </Button>
            <Button isIconOnly aria-label="Settings" variant="secondary">
                <Gear />
            </Button>
            <Button isIconOnly aria-label="Delete" variant="danger">
                <TrashBin />
            </Button>
        </div>
    );
}
```

### Loading

```tsx
'use client';

import { Button, Spinner } from '@heroui/react';
import React from 'react';

export function Loading() {
    return (
        <Button isPending>
            {({ isPending }) => (
                <>
                    {isPending ? <Spinner color="current" size="sm" /> : null}
                    Uploading...
                </>
            )}
        </Button>
    );
}
```

### Loading State

```tsx
'use client';

import { Paperclip } from '@gravity-ui/icons';
import { Button, Spinner } from '@heroui/react';
import React, { useState } from 'react';

export function LoadingState() {
    const [isLoading, setLoading] = useState(false);

    const handlePress = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 2000);
    };

    return (
        <Button isPending={isLoading} onPress={handlePress}>
            {({ isPending }) => (
                <>
                    {isPending ? <Spinner color="current" size="sm" /> : <Paperclip />}
                    {isPending ? 'Uploading...' : 'Upload File'}
                </>
            )}
        </Button>
    );
}
```

### Full Width

```tsx
import { Plus } from '@gravity-ui/icons';
import { Button } from '@heroui/react';

export function FullWidth() {
    return (
        <div className="w-[400px] space-y-3">
            <Button fullWidth>Primary Button</Button>
            <Button fullWidth>
                <Plus />
                With Icon
            </Button>
        </div>
    );
}
```

### Disabled State

```tsx
import { Button } from '@heroui/react';

export function Disabled() {
    return (
        <div className="flex flex-wrap gap-3">
            <Button isDisabled>Primary</Button>
            <Button isDisabled variant="secondary">
                Secondary
            </Button>
            <Button isDisabled variant="tertiary">
                Tertiary
            </Button>
            <Button isDisabled variant="outline">
                Outline
            </Button>
            <Button isDisabled variant="ghost">
                Ghost
            </Button>
            <Button isDisabled variant="danger">
                Danger
            </Button>
        </div>
    );
}
```

### Social Buttons

```tsx
import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';

export function Social() {
    return (
        <div className="flex w-full max-w-xs flex-col gap-3">
            <Button className="w-full" variant="tertiary">
                <Icon icon="devicon:google" />
                Sign in with Google
            </Button>
            <Button className="w-full" variant="tertiary">
                <Icon icon="mdi:github" />
                Sign in with GitHub
            </Button>
            <Button className="w-full" variant="tertiary">
                <Icon icon="ion:logo-apple" />
                Sign in with Apple
            </Button>
        </div>
    );
}
```

### Render Function

```tsx
'use client';

import { Button } from '@heroui/react';

export function RenderFunction() {
    return (
        <Button
            render={(props, { isPressed }) => (
                <button {...props} data-custom={isPressed ? 'pressed' : 'bar'} />
            )}
        >
            Press me
        </Button>
    );
}
```

### Adding custom variants

You can extend HeroUI components by wrapping them and adding your own custom variants.

```tsx
import type { ButtonProps } from '@heroui/react';
import type { VariantProps } from 'tailwind-variants';

import { Button, buttonVariants } from '@heroui/react';
import { tv } from 'tailwind-variants';

const myButtonVariants = tv({
    base: 'text-md font-semibold shadow-md text-shadow-lg data-[pending=true]:opacity-40',
    defaultVariants: {
        radius: 'full',
        variant: 'primary',
    },
    extend: buttonVariants,
    variants: {
        radius: {
            full: 'rounded-full',
            lg: 'rounded-lg',
            md: 'rounded-md',
            sm: 'rounded-sm',
        },
        size: {
            lg: 'h-12 px-8',
            md: 'h-11 px-6',
            sm: 'h-10 px-4',
            xl: 'h-13 px-10',
        },
        variant: {
            primary: 'text-white dark:bg-white/10 dark:text-white dark:hover:bg-white/15',
        },
    },
});

type MyButtonVariants = VariantProps<typeof myButtonVariants>;
export type MyButtonProps = Omit<ButtonProps, 'className'> &
    MyButtonVariants & { className?: string };

function CustomButton({ className, radius, variant, ...props }: MyButtonProps) {
    return <Button className={myButtonVariants({ className, radius, variant })} {...props} />;
}

export function CustomVariants() {
    return <CustomButton>Custom Button</CustomButton>;
}
```

### Adding Ripple Effect

The Button component supports ripple effects through composition, allowing you to nest ripple components as children. This example uses [m3-ripple](https://github.com/saltyaom/m3-ripple).

```tsx
'use client';

import { Button } from '@heroui/react';
import { Ripple } from 'm3-ripple';

import 'm3-ripple/ripple.css';

export function RippleEffect() {
    return (
        <Button variant="secondary">
            <Ripple />
            Click me
        </Button>
    );
}
```

## Customization

### Tailwind CSS

````tsx
'use client';

import { Button } from '@heroui/react';

/**
 * The `gradient-border` class below depends on a global utility.
 * Add this to your global CSS (e.g. `src/app/globals.css`) before using it:
 *
 * ```css
 * @utility gradient-border {
 *   &::before {
 *     content: "";
 *     position: absolute;
 *     inset: 0;
 *     z-index: 0;
 *     border-radius: inherit;
 *     padding: var(--gradient-border-width, 1px);
 *     background: var(--gradient-border);
 *     pointer-events: none;
 *     -webkit-mask:
 *       linear-gradient(#fff 0 0) content-box,
 *       linear-gradient(#fff 0 0);
 *     -webkit-mask-composite: xor;
 *     mask:
 *       linear-gradient(#fff 0 0) content-box,
 *       linear-gradient(#fff 0 0);
 *     mask-composite: exclude;
 *   }
 * }
 * ```

 *
 * On the component, set `--gradient-border` (gradient) and optionally
 * `--gradient-border-width` (default `1px`) via Tailwind arbitrary properties
 * or inline styles.
 */

export function CustomStyles() {
    return (
        <Button
            className="gradient-border relative z-0 rounded-full bg-linear-to-t from-neutral-100 to-white px-10 py-3 font-[450] text-neutral-800 shadow-none transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] [--gradient-border-width:1.5px] [--gradient-border:linear-gradient(315deg,#e5e5e5_0%,#fafafa_50%,#c4c4c4_100%)] hover:from-white hover:to-neutral-50 hover:brightness-105 active:scale-95 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-800/80 dark:text-neutral-100 dark:[--gradient-border:linear-gradient(315deg,#404040_0%,#262626_50%,#525252_100%)] dark:hover:from-neutral-800 dark:hover:via-neutral-800 dark:hover:to-neutral-900/90"
            variant="ghost"
            style={{
                boxShadow:
                    'rgba(0, 0, 0, 0.02) 0px 1px 6px, rgba(0, 0, 0, 0.02) 0px 3px 12px, rgba(0, 0, 0, 0.01) 0px 8px 24px, rgba(0, 0, 0, 0.02) 0px 18px 40px, rgba(0, 0, 0, 0.02) 0px 40px 80px',
            }}
        >
            Upgrade
        </Button>
    );
}
````

### Global CSS

To customize the Button component classes, you can use the `@layer components` directive.
[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
    .button {
        @apply bg-purple-500 text-white hover:bg-purple-600;
    }

    .button--icon-only {
        @apply rounded-lg bg-blue-500;
    }
}
```

## Styling Reference

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Button component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css)):

#### Base & Size Classes \[!toc]

- `.button` - Base button styles
- `.button--sm` - Small size variant
- `.button--md` - Medium size variant
- `.button--lg` - Large size variant

#### Variant Classes \[!toc]

- `.button--primary`
- `.button--secondary`
- `.button--tertiary`
- `.button--outline`
- `.button--ghost`
- `.button--danger`

#### Modifier Classes \[!toc]

- `.button--icon-only`
- `.button--icon-only.button--sm`
- `.button--icon-only.button--lg`

### Interactive States

The button supports both CSS pseudo-classes and data attributes for flexibility:

- **Hover**: `:hover` or `[data-hovered="true"]`
- **Active/Pressed**: `:active` or `[data-pressed="true"]` (includes scale transform)
- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` (shows focus ring)
- **Disabled**: `:disabled` or `[aria-disabled="true"]` (reduced opacity, no pointer events)
- **Pending**: `[data-pending]` (no pointer events during loading)

## API Reference

### Button

| Prop         | Type                                                                         | Default     | Description                                                      |
| ------------ | ---------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| `variant`    | `'primary' \| 'secondary' \| 'tertiary' \| 'outline' \| 'ghost' \| 'danger'` | `'primary'` | Visual style variant                                             |
| `size`       | `'sm' \| 'md' \| 'lg'`                                                       | `'md'`      | Size of the button                                               |
| `fullWidth`  | `boolean`                                                                    | `false`     | Whether the button should take full width of its container       |
| `isDisabled` | `boolean`                                                                    | `false`     | Whether the button is disabled                                   |
| `isPending`  | `boolean`                                                                    | `false`     | Whether the button is in a loading state                         |
| `isIconOnly` | `boolean`                                                                    | `false`     | Whether the button contains only an icon                         |
| `onPress`    | `(e: PressEvent) => void`                                                    | -           | Handler called when the button is pressed                        |
| `children`   | `React.ReactNode \| (values: ButtonRenderProps) => React.ReactNode`          | -           | Button content or render prop                                    |
| `render`     | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, ButtonRenderProps>`    | -           | Overrides the default DOM element with a custom render function. |

### Render Props

When using the render prop pattern, these values are provided:

| Prop             | Type      | Description                                    |
| ---------------- | --------- | ---------------------------------------------- |
| `isPending`      | `boolean` | Whether the button is in a loading state       |
| `isPressed`      | `boolean` | Whether the button is currently pressed        |
| `isHovered`      | `boolean` | Whether the button is hovered                  |
| `isFocused`      | `boolean` | Whether the button is focused                  |
| `isFocusVisible` | `boolean` | Whether the button should show focus indicator |
| `isDisabled`     | `boolean` | Whether the button is disabled                 |

## Related Showcases

## Related Components

## Related Components

- **Popover**: Displays content in context with a trigger
- **Tooltip**: Contextual information on hover or focus
- **Form**: Form validation and submission handling

</page>

---

# modal Documentation (@heroui/react)

**URL:** https://heroui.com/docs/react/components/modal.mdx

---

<page url="/en/docs/react/components/modal">
# Modal

**Category**: react
**URL**: https://heroui.com/en/docs/react/components/modal
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(overlays)/modal.mdx

> Dialog overlay for focused user interactions and important content

## Usage

```tsx
import { Modal } from '@heroui/react';
```

```tsx
'use client';

import { Rocket } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function Default() {
    return (
        <Modal>
            <Button variant="secondary">Open Modal</Button>
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog className="sm:max-w-[360px]">
                        <Modal.CloseTrigger />
                        <Modal.Header>
                            <Modal.Icon className="bg-default text-foreground">
                                <Rocket className="size-5" />
                            </Modal.Icon>
                            <Modal.Heading>Welcome to HeroUI</Modal.Heading>
                        </Modal.Header>
                        <Modal.Body>
                            <p>
                                A beautiful, fast, and modern React UI library for building
                                accessible and customizable web applications with ease.
                            </p>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button className="w-full" slot="close">
                                Continue
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}
```

## Anatomy

```tsx
import { Modal, Button } from '@heroui/react';

export default () => (
    <Modal>
        <Button>Open Modal</Button>
        <Modal.Backdrop>
            <Modal.Container>
                <Modal.Dialog>
                    <Modal.CloseTrigger /> {/* Optional: Close button */}
                    <Modal.Header>
                        <Modal.Icon /> {/* Optional: Icon */}
                        <Modal.Heading />
                    </Modal.Header>
                    <Modal.Body />
                    <Modal.Footer />
                </Modal.Dialog>
            </Modal.Container>
        </Modal.Backdrop>
    </Modal>
);
```

## Examples

### Sizes

```tsx
'use client';

import { Rocket } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function Sizes() {
    const sizes = ['xs', 'sm', 'md', 'lg', 'cover', 'full'] as const;

    return (
        <div className="flex flex-wrap gap-4">
            {sizes.map((size) => (
                <Modal key={size}>
                    <Button variant="secondary">
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Button>
                    <Modal.Backdrop>
                        <Modal.Container size={size}>
                            <Modal.Dialog>
                                <Modal.CloseTrigger />
                                <Modal.Header>
                                    <Modal.Icon className="bg-default text-foreground">
                                        <Rocket className="size-5" />
                                    </Modal.Icon>
                                    <Modal.Heading>
                                        Size: {size.charAt(0).toUpperCase() + size.slice(1)}
                                    </Modal.Heading>
                                </Modal.Header>
                                <Modal.Body>
                                    <p>
                                        {size === 'cover' ? (
                                            <>
                                                This modal uses the <code>cover</code> size variant.
                                                It spans the full screen with margins: 16px on
                                                mobile and 40px on desktop. Maintains rounded
                                                corners and standard padding. Perfect for
                                                cover-style content that needs maximum width while
                                                preserving modal aesthetics.
                                            </>
                                        ) : size === 'full' ? (
                                            <>
                                                This modal uses the <code>full</code> size variant.
                                                It occupies the entire viewport without any margins,
                                                rounded corners, or shadows, creating a true
                                                fullscreen experience. Ideal for immersive content
                                                or full-page interactions.
                                            </>
                                        ) : (
                                            <>
                                                This modal uses the <code>{size}</code> size
                                                variant. On mobile devices, all sizes adapt to near
                                                full-width for optimal viewing. On desktop, each
                                                size provides a different maximum width to suit
                                                various content needs.
                                            </>
                                        )}
                                    </p>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button slot="close" variant="secondary">
                                        Cancel
                                    </Button>
                                    <Button slot="close">Confirm</Button>
                                </Modal.Footer>
                            </Modal.Dialog>
                        </Modal.Container>
                    </Modal.Backdrop>
                </Modal>
            ))}
        </div>
    );
}
```

### Placement

```tsx
'use client';

import { Rocket } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function Placements() {
    const placements = ['auto', 'top', 'center', 'bottom'] as const;

    return (
        <div className="flex flex-wrap gap-4">
            {placements.map((placement) => (
                <Modal key={placement}>
                    <Button variant="secondary">
                        {placement.charAt(0).toUpperCase() + placement.slice(1)}
                    </Button>
                    <Modal.Backdrop>
                        <Modal.Container placement={placement}>
                            <Modal.Dialog className="sm:max-w-[360px]">
                                <Modal.CloseTrigger />
                                <Modal.Header>
                                    <Modal.Icon className="bg-default text-foreground">
                                        <Rocket className="size-5" />
                                    </Modal.Icon>
                                    <Modal.Heading>
                                        Placement:{' '}
                                        {placement.charAt(0).toUpperCase() + placement.slice(1)}
                                    </Modal.Heading>
                                </Modal.Header>
                                <Modal.Body>
                                    <p>
                                        This modal uses the <code>{placement}</code> placement
                                        option. Try different placements to see how the modal
                                        positions itself on the screen.
                                    </p>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button className="w-full" slot="close">
                                        Continue
                                    </Button>
                                </Modal.Footer>
                            </Modal.Dialog>
                        </Modal.Container>
                    </Modal.Backdrop>
                </Modal>
            ))}
        </div>
    );
}
```

### Scroll Behavior

```tsx
'use client';

import { Button, Modal, Radio, RadioGroup } from '@heroui/react';
import { useState } from 'react';

export function ScrollComparison() {
    const [scroll, setScroll] = useState<'inside' | 'outside'>('inside');

    return (
        <div className="flex flex-col gap-4">
            <RadioGroup
                orientation="horizontal"
                value={scroll}
                onChange={(value) => setScroll(value as 'inside' | 'outside')}
            >
                <Radio value="inside">
                    <Radio.Content>
                        <Radio.Control>
                            <Radio.Indicator />
                        </Radio.Control>
                        Inside
                    </Radio.Content>
                </Radio>
                <Radio value="outside">
                    <Radio.Content>
                        <Radio.Control>
                            <Radio.Indicator />
                        </Radio.Control>
                        Outside
                    </Radio.Content>
                </Radio>
            </RadioGroup>

            <Modal>
                <Button variant="secondary">
                    Open Modal ({scroll.charAt(0).toUpperCase() + scroll.slice(1)})
                </Button>
                <Modal.Backdrop>
                    <Modal.Container scroll={scroll}>
                        <Modal.Dialog className="sm:max-w-[360px]">
                            <Modal.Header>
                                <Modal.Heading>
                                    Scroll: {scroll.charAt(0).toUpperCase() + scroll.slice(1)}
                                </Modal.Heading>
                                <p className="text-sm leading-5 text-muted">
                                    Compare scroll behaviors - inside keeps content scrollable
                                    within the modal, outside allows page scrolling
                                </p>
                            </Modal.Header>
                            <Modal.Body>
                                {Array.from({ length: 30 }).map((_, i) => (
                                    <p key={i} className="mb-3">
                                        Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur
                                        adipiscing elit. Nullam pulvinar risus non risus hendrerit
                                        venenatis. Pellentesque sit amet hendrerit risus, sed
                                        porttitor quam.
                                    </p>
                                ))}
                            </Modal.Body>
                            <Modal.Footer>
                                <Button slot="close" variant="secondary">
                                    Cancel
                                </Button>
                                <Button slot="close">Confirm</Button>
                            </Modal.Footer>
                            <Modal.CloseTrigger />
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </Modal>
        </div>
    );
}
```

### Controlled State

```tsx
'use client';

import { CircleCheck } from '@gravity-ui/icons';
import { Button, Modal, useOverlayState } from '@heroui/react';
import React from 'react';

export function Controlled() {
    const [isOpen, setIsOpen] = React.useState(false);

    const state = useOverlayState();

    return (
        <div className="flex max-w-md flex-col gap-8">
            <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-foreground">With React.useState()</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted">
                    Control the modal using React's{' '}
                    <code className="text-foreground">useState</code> hook for simple state
                    management. Perfect for basic use cases.
                </p>
                <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm">
                    <div className="flex w-full items-center justify-between">
                        <p className="text-xs text-muted">
                            Status:{' '}
                            <span className="font-mono font-medium text-foreground">
                                {isOpen ? 'open' : 'closed'}
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onPress={() => setIsOpen(true)}>
                            Open Modal
                        </Button>
                        <Button size="sm" variant="tertiary" onPress={() => setIsOpen(!isOpen)}>
                            Toggle
                        </Button>
                    </div>
                </div>

                <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
                    <Modal.Container>
                        <Modal.Dialog className="sm:max-w-[360px]">
                            <Modal.CloseTrigger />
                            <Modal.Header>
                                <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                                    <CircleCheck className="size-5" />
                                </Modal.Icon>
                                <Modal.Heading>Controlled with useState()</Modal.Heading>
                            </Modal.Header>
                            <Modal.Body>
                                <p>
                                    This modal is controlled by React's <code>useState</code> hook.
                                    Pass <code>isOpen</code> and <code>onOpenChange</code> props to
                                    manage the modal state externally.
                                </p>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button slot="close" variant="secondary">
                                    Cancel
                                </Button>
                                <Button slot="close">Confirm</Button>
                            </Modal.Footer>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </div>

            <div className="flex flex-col gap-3">
                <h3 className="text-lg font-semibold text-foreground">With useOverlayState()</h3>
                <p className="text-sm leading-relaxed text-pretty text-muted">
                    Use the <code className="text-foreground">useOverlayState</code> hook for a
                    cleaner API with convenient methods like <code>open()</code>,{' '}
                    <code>close()</code>, and <code>toggle()</code>.
                </p>
                <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-4 shadow-sm">
                    <div className="flex w-full items-center justify-between">
                        <p className="text-xs text-muted">
                            Status:{' '}
                            <span className="font-mono font-medium text-foreground">
                                {state.isOpen ? 'open' : 'closed'}
                            </span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onPress={state.open}>
                            Open Modal
                        </Button>
                        <Button size="sm" variant="tertiary" onPress={state.toggle}>
                            Toggle
                        </Button>
                    </div>
                </div>

                <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
                    <Modal.Container>
                        <Modal.Dialog className="sm:max-w-[360px]">
                            <Modal.CloseTrigger />
                            <Modal.Header>
                                <Modal.Icon className="bg-success-soft text-success-soft-foreground">
                                    <CircleCheck className="size-5" />
                                </Modal.Icon>
                                <Modal.Heading>Controlled with useOverlayState()</Modal.Heading>
                            </Modal.Header>
                            <Modal.Body>
                                <p>
                                    The <code>useOverlayState</code> hook provides dedicated methods
                                    for common operations. No need to manually create callbacks—just
                                    use <code>state.open()</code>, <code>state.close()</code>, or{' '}
                                    <code>state.toggle()</code>.
                                </p>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button slot="close" variant="secondary">
                                    Cancel
                                </Button>
                                <Button slot="close">Confirm</Button>
                            </Modal.Footer>
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
            </div>
        </div>
    );
}
```

### With Form

```tsx
'use client';

import { Envelope } from '@gravity-ui/icons';
import { Button, Input, Label, Modal, Surface, TextField } from '@heroui/react';

export function WithForm() {
    return (
        <Modal>
            <Button variant="secondary">Open Contact Form</Button>
            <Modal.Backdrop>
                <Modal.Container placement="auto">
                    <Modal.Dialog className="sm:max-w-md">
                        <Modal.CloseTrigger />
                        <Modal.Header>
                            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                                <Envelope className="size-5" />
                            </Modal.Icon>
                            <Modal.Heading>Contact Us</Modal.Heading>
                            <p className="mt-1.5 text-sm leading-5 text-muted">
                                Fill out the form below and we'll get back to you. The modal adapts
                                automatically when the keyboard appears on mobile.
                            </p>
                        </Modal.Header>
                        <Modal.Body className="p-6">
                            <Surface variant="default">
                                <form className="flex flex-col gap-4">
                                    <TextField
                                        className="w-full"
                                        name="name"
                                        type="text"
                                        variant="secondary"
                                    >
                                        <Label>Name</Label>
                                        <Input placeholder="Enter your name" />
                                    </TextField>
                                    <TextField
                                        className="w-full"
                                        name="email"
                                        type="email"
                                        variant="secondary"
                                    >
                                        <Label>Email</Label>
                                        <Input placeholder="Enter your email" />
                                    </TextField>
                                    <TextField
                                        className="w-full"
                                        name="phone"
                                        type="tel"
                                        variant="secondary"
                                    >
                                        <Label>Phone</Label>
                                        <Input placeholder="Enter your phone number" />
                                    </TextField>
                                    <TextField
                                        className="w-full"
                                        name="company"
                                        variant="secondary"
                                    >
                                        <Label>Company</Label>
                                        <Input placeholder="Enter your company name" />
                                    </TextField>
                                    <TextField
                                        className="w-full"
                                        name="message"
                                        variant="secondary"
                                    >
                                        <Label>Message</Label>
                                        <Input placeholder="Enter your message" />
                                    </TextField>
                                </form>
                            </Surface>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button slot="close" variant="secondary">
                                Cancel
                            </Button>
                            <Button slot="close">Send Message</Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}
```

### Custom Trigger

```tsx
'use client';

import { Gear } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function CustomTrigger() {
    return (
        <Modal>
            <Modal.Trigger className="group flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-xs select-none hover:bg-surface-secondary">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <Gear className="size-6" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-sm font-semibold">Settings</p>
                    <p className="text-xs text-muted">Manage your preferences</p>
                </div>
            </Modal.Trigger>
            <Modal.Backdrop>
                <Modal.Container>
                    <Modal.Dialog className="sm:max-w-[360px]">
                        <Modal.CloseTrigger />
                        <Modal.Header>
                            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                                <Gear className="size-5" />
                            </Modal.Icon>
                            <Modal.Heading>Settings</Modal.Heading>
                        </Modal.Header>
                        <Modal.Body>
                            <p>
                                Use <code>Modal.Trigger</code> to create custom trigger elements
                                beyond standard buttons. This example shows a card-style trigger
                                with icons and descriptive text.
                            </p>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button slot="close" variant="secondary">
                                Cancel
                            </Button>
                            <Button slot="close">Save</Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}
```

### Backdrop Variants

```tsx
'use client';

import { Rocket } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function BackdropVariants() {
    const variants = ['opaque', 'blur', 'transparent'] as const;

    return (
        <div className="flex flex-wrap gap-4">
            {variants.map((variant) => (
                <Modal key={variant}>
                    <Button variant="secondary">
                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                    </Button>
                    <Modal.Backdrop variant={variant}>
                        <Modal.Container>
                            <Modal.Dialog className="sm:max-w-[360px]">
                                <Modal.CloseTrigger />
                                <Modal.Header>
                                    <Modal.Icon className="bg-default text-foreground">
                                        <Rocket className="size-5" />
                                    </Modal.Icon>
                                    <Modal.Heading>
                                        Backdrop:{' '}
                                        {variant.charAt(0).toUpperCase() + variant.slice(1)}
                                    </Modal.Heading>
                                </Modal.Header>
                                <Modal.Body>
                                    <p>
                                        This modal uses the <code>{variant}</code> backdrop variant.
                                        Compare the different visual effects: opaque provides full
                                        opacity, blur adds a backdrop filter, and transparent
                                        removes the background.
                                    </p>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button className="w-full" slot="close">
                                        Continue
                                    </Button>
                                </Modal.Footer>
                            </Modal.Dialog>
                        </Modal.Container>
                    </Modal.Backdrop>
                </Modal>
            ))}
        </div>
    );
}
```

### Custom Backdrop

```tsx
'use client';

import { Sparkles } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function CustomBackdrop() {
    return (
        <Modal>
            <Button variant="secondary">Custom Backdrop</Button>
            <Modal.Backdrop
                className="bg-linear-to-t from-black/80 via-black/40 to-transparent dark:from-zinc-800/80 dark:via-zinc-800/40"
                variant="blur"
            >
                <Modal.Container>
                    <Modal.Dialog className="sm:max-w-[360px]">
                        <Modal.Header className="items-center text-center">
                            <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                                <Sparkles className="size-5" />
                            </Modal.Icon>
                            <Modal.Heading>Premium Backdrop</Modal.Heading>
                        </Modal.Header>
                        <Modal.Body>
                            <p>
                                This backdrop features a sophisticated gradient that transitions
                                from a dark color at the bottom to complete transparency at the top,
                                combined with a smooth blur effect. The gradient automatically
                                adapts its intensity for optimal contrast in both light and dark
                                modes.
                            </p>
                        </Modal.Body>
                        <Modal.Footer className="flex-col-reverse">
                            <Button className="w-full" slot="close">
                                Amazing!
                            </Button>
                            <Button className="w-full" slot="close" variant="secondary">
                                Close
                            </Button>
                        </Modal.Footer>
                        <Modal.CloseTrigger />
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}
```

### Dismiss Behavior

```tsx
'use client';

import { CircleInfo } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function DismissBehavior() {
    return (
        <div className="flex max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">isDismissable</h3>
                <p className="text-sm text-muted">
                    Controls whether the modal can be dismissed by clicking the overlay backdrop.
                    Defaults to <code>true</code>. Set to <code>false</code> to require explicit
                    close action.
                </p>
                <Modal>
                    <Button variant="secondary">Open Modal</Button>
                    <Modal.Backdrop isDismissable={false}>
                        <Modal.Container>
                            <Modal.Dialog className="sm:max-w-[360px]">
                                <Modal.CloseTrigger />
                                <Modal.Header>
                                    <Modal.Icon className="bg-default text-foreground">
                                        <CircleInfo className="size-5" />
                                    </Modal.Icon>
                                    <Modal.Heading>isDismissable = false</Modal.Heading>
                                    <p className="text-sm leading-5 text-muted">
                                        Clicking the backdrop won't close this modal
                                    </p>
                                </Modal.Header>
                                <Modal.Body>
                                    <p>
                                        Try clicking outside this modal on the overlay - it won't
                                        close. You must use the close button or press ESC to dismiss
                                        it.
                                    </p>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button className="w-full" slot="close">
                                        Close
                                    </Button>
                                </Modal.Footer>
                            </Modal.Dialog>
                        </Modal.Container>
                    </Modal.Backdrop>
                </Modal>
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">isKeyboardDismissDisabled</h3>
                <p className="text-sm text-muted">
                    Controls whether the ESC key can dismiss the modal. When set to{' '}
                    <code>true</code>, the ESC key will be disabled and users must use explicit
                    close actions.
                </p>
                <Modal>
                    <Button variant="secondary">Open Modal</Button>
                    <Modal.Backdrop isKeyboardDismissDisabled>
                        <Modal.Container>
                            <Modal.Dialog className="sm:max-w-[360px]">
                                <Modal.CloseTrigger />
                                <Modal.Header>
                                    <Modal.Icon className="bg-default text-foreground">
                                        <CircleInfo className="size-5" />
                                    </Modal.Icon>
                                    <Modal.Heading>isKeyboardDismissDisabled = true</Modal.Heading>
                                    <p className="text-sm leading-5 text-muted">
                                        ESC key is disabled
                                    </p>
                                </Modal.Header>
                                <Modal.Body>
                                    <p>
                                        Press ESC - nothing happens. You must use the close button
                                        or click the overlay backdrop to dismiss this modal.
                                    </p>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button className="w-full" slot="close">
                                        Close
                                    </Button>
                                </Modal.Footer>
                            </Modal.Dialog>
                        </Modal.Container>
                    </Modal.Backdrop>
                </Modal>
            </div>
        </div>
    );
}
```

### Close Methods

```tsx
'use client';

import { CircleCheck, CircleInfo } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function CloseMethods() {
    return (
        <div className="flex max-w-2xl flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Using slot="close"</h3>
                <p className="text-sm text-muted">
                    The simplest way to close a modal. Add <code>slot="close"</code> to any Button
                    component within the modal. When clicked, it will automatically close the modal.
                </p>
                <Modal>
                    <Button variant="secondary">Open Modal</Button>
                    <Modal.Backdrop>
                        <Modal.Container>
                            <Modal.Dialog className="sm:max-w-[360px]">
                                <Modal.Header>
                                    <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">
                                        <CircleInfo className="size-5" />
                                    </Modal.Icon>
                                    <Modal.Heading>Using slot="close"</Modal.Heading>
                                </Modal.Header>
                                <Modal.Body>
                                    <p>
                                        Click either button below - both have{' '}
                                        <code>slot="close"</code> and will close the modal
                                        automatically.
                                    </p>
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button slot="close" variant="secondary">
                                        Cancel
                                    </Button>
                                    <Button slot="close">Confirm</Button>
                                </Modal.Footer>
                            </Modal.Dialog>
                        </Modal.Container>
                    </Modal.Backdrop>
                </Modal>
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">Using Dialog render props</h3>
                <p className="text-sm text-muted">
                    Access the <code>close</code> method from the Dialog's render props. This gives
                    you full control over when and how to close the modal, allowing you to add
                    custom logic before closing.
                </p>
                <Modal>
                    <Button variant="secondary">Open Modal</Button>
                    <Modal.Backdrop>
                        <Modal.Container>
                            <Modal.Dialog className="sm:max-w-[360px]">
                                {(renderProps) => (
                                    <>
                                        <Modal.Header>
                                            <Modal.Icon className="bg-success-soft text-success-soft-foreground">
                                                <CircleCheck className="size-5" />
                                            </Modal.Icon>
                                            <Modal.Heading>Using Dialog render props</Modal.Heading>
                                        </Modal.Header>
                                        <Modal.Body>
                                            <p>
                                                The buttons below use the <code>close</code> method
                                                from render props. You can add validation or other
                                                logic before calling{' '}
                                                <code>renderProps.close()</code>.
                                            </p>
                                        </Modal.Body>
                                        <Modal.Footer>
                                            <Button
                                                variant="secondary"
                                                onPress={() => renderProps.close()}
                                            >
                                                Cancel
                                            </Button>
                                            <Button onPress={() => renderProps.close()}>
                                                Confirm
                                            </Button>
                                        </Modal.Footer>
                                    </>
                                )}
                            </Modal.Dialog>
                        </Modal.Container>
                    </Modal.Backdrop>
                </Modal>
            </div>
        </div>
    );
}
```

### Custom Animations

```tsx
'use client';

import { ArrowUpFromLine, Sparkles } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';
import React from 'react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'gravity-ui:arrow-up-from-line': ArrowUpFromLine,
    'gravity-ui:sparkles': Sparkles,
};

export function CustomAnimations() {
    const animations = [
        {
            classNames: {
                backdrop: [
                    'data-[entering]:duration-400',
                    'data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)]',
                    'data-[exiting]:duration-200',
                    'data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]',
                ].join(' '),
                container: [
                    'data-[entering]:animate-in',
                    'data-[entering]:fade-in-0',
                    'data-[entering]:zoom-in-95',
                    'data-[entering]:duration-400',
                    'data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)]',
                    'data-[exiting]:animate-out',
                    'data-[exiting]:fade-out-0',
                    'data-[exiting]:zoom-out-95',
                    'data-[exiting]:duration-200',
                    'data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]',
                ].join(' '),
            },
            description:
                'Physics-based elastic scaling. Simulates a high-damping spring system with fast transient response and prolonged settling time. Ideal for Modals and Popovers.',
            icon: 'gravity-ui:sparkles',
            name: 'Kinematic Scale',
        },
        {
            classNames: {
                backdrop: [
                    'data-[entering]:duration-500',
                    'data-[entering]:ease-[cubic-bezier(0.25,1,0.5,1)]',
                    'data-[exiting]:duration-200',
                    'data-[exiting]:ease-[cubic-bezier(0.5,0,0.75,0)]',
                ].join(' '),
                container: [
                    'data-[entering]:animate-in',
                    'data-[entering]:fade-in-0',
                    'data-[entering]:slide-in-from-bottom-4',
                    'data-[entering]:duration-500',
                    'data-[entering]:ease-[cubic-bezier(0.25,1,0.5,1)]',
                    'data-[exiting]:animate-out',
                    'data-[exiting]:fade-out-0',
                    'data-[exiting]:slide-out-to-bottom-2',
                    'data-[exiting]:duration-200',
                    'data-[exiting]:ease-[cubic-bezier(0.5,0,0.75,0)]',
                ].join(' '),
            },
            description:
                'Simulates movement through a medium with fluid resistance. Eliminates mechanical linearity for a natural, grounded feel. Perfect for Bottom Sheets or Toasts.',
            icon: 'gravity-ui:arrow-up-from-line',
            name: 'Fluid Slide',
        },
    ];

    return (
        <div className="flex flex-wrap gap-4">
            {animations.map(({ classNames, description, icon, name }) => {
                const IconComponent = iconMap[icon];

                return (
                    <Modal key={name}>
                        <Button variant="secondary">{name}</Button>
                        <Modal.Backdrop className={classNames.backdrop}>
                            <Modal.Container className={classNames.container}>
                                <Modal.Dialog className="sm:max-w-[360px]">
                                    <Modal.CloseTrigger />
                                    <Modal.Header>
                                        <Modal.Icon className="bg-default text-foreground">
                                            {!!IconComponent && (
                                                <IconComponent className="size-5" />
                                            )}
                                        </Modal.Icon>
                                        <Modal.Heading>{name} Animation</Modal.Heading>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <p className="mt-1">{description}</p>
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button slot="close" variant="tertiary">
                                            Close
                                        </Button>
                                        <Button slot="close">Try Again</Button>
                                    </Modal.Footer>
                                </Modal.Dialog>
                            </Modal.Container>
                        </Modal.Backdrop>
                    </Modal>
                );
            })}
        </div>
    );
}
```

### Custom Portal

```tsx
'use client';

import { Button, Modal } from '@heroui/react';
import { useCallback, useRef, useState } from 'react';

export function CustomPortal() {
    const portalRef = useRef<HTMLDivElement>(null);
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    const setPortalRef = useCallback((node: HTMLDivElement | null) => {
        portalRef.current = node;
        setPortalContainer(node);
    }, []);

    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="text-sm">
                    Render modals inside a custom container instead of <code>document.body</code>
                </p>
                <p className="text-sm text-muted">
                    Apply{' '}
                    <code className="rounded px-1 py-0.5 text-xs">transform: translateZ(0)</code> to
                    the container to create a new stacking context.
                </p>
            </div>
            <div
                ref={setPortalRef}
                className="relative flex h-[380px] items-center justify-center overflow-hidden rounded bg-muted/20"
                // new stacking context
                style={{ transform: 'translate(0)' }}
            >
                {!!portalContainer && (
                    <Modal>
                        <Button>Open Modal</Button>
                        <Modal.Backdrop
                            className="h-full"
                            UNSTABLE_portalContainer={portalContainer}
                        >
                            <Modal.Container className="h-full max-h-full">
                                <Modal.Dialog className="h-full max-h-full sm:max-w-md">
                                    <Modal.CloseTrigger />
                                    <Modal.Header>
                                        <Modal.Heading>Custom Portal</Modal.Heading>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <p className="text-sm text-muted">
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                            Sed do eiusmod tempor incididunt ut labore et dolore
                                            magna aliqua. Ut enim ad minim veniam, quis nostrud
                                            exercitation ullamco laboris nisi ut aliquip ex ea
                                            commodo consequat.
                                        </p>
                                        <p className="text-sm text-muted">
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                            Sed do eiusmod tempor incididunt ut labore et dolore
                                            magna aliqua. Ut enim ad minim veniam, quis nostrud
                                            exercitation ullamco laboris nisi ut aliquip ex ea
                                            commodo consequat.
                                        </p>
                                        <p className="text-sm text-muted">
                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                                            Sed do eiusmod tempor incididunt ut labore et dolore
                                            magna aliqua. Ut enim ad minim veniam, quis nostrud
                                            exercitation ullamco laboris nisi ut aliquip ex ea
                                            commodo consequat.
                                        </p>
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button slot="close" variant="secondary">
                                            Close
                                        </Button>
                                    </Modal.Footer>
                                </Modal.Dialog>
                            </Modal.Container>
                        </Modal.Backdrop>
                    </Modal>
                )}
            </div>
        </div>
    );
}
```

## Customization

### Tailwind CSS

```tsx
'use client';

import { CircleCheck } from '@gravity-ui/icons';
import { Button, Modal } from '@heroui/react';

export function CustomStyles() {
    return (
        <Modal>
            <Button variant="secondary">Open</Button>
            <Modal.Backdrop className="bg-overlay/50 dark:bg-overlay/65" variant="blur">
                <Modal.Container>
                    <Modal.Dialog className="relative overflow-hidden border border-border/80 bg-surface/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl sm:max-w-[340px] dark:border-border/90 dark:bg-surface/85 dark:ring-white/10">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-neutral-500/8 to-transparent dark:from-neutral-400/10"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-neutral-400/40 to-transparent dark:via-neutral-500/35"
                        />
                        <Modal.CloseTrigger />
                        <Modal.Header className="relative">
                            <Modal.Icon className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                <CircleCheck className="size-5" />
                            </Modal.Icon>
                            <Modal.Heading>Changes saved</Modal.Heading>
                        </Modal.Header>
                        <Modal.Body className="relative">
                            <p className="text-sm text-muted">
                                Your draft is synced across devices.
                            </p>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button className="w-full" slot="close">
                                Done
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}
```

### Global CSS

To customize the Modal component classes, you can use the `@layer components` directive.

[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
    .modal__backdrop {
        @apply bg-gradient-to-br from-black/50 to-black/70;
    }

    .modal__dialog {
        @apply rounded-2xl border border-white/10 shadow-2xl;
    }

    .modal__header {
        @apply text-center;
    }

    .modal__close-trigger {
        @apply rounded-full bg-white/10 hover:bg-white/20;
    }
}
```

## Styling Reference

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Modal component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/modal.css)):

#### Base Classes \[!toc]

- `.modal__trigger` - Trigger element that opens the modal
- `.modal__backdrop` - Overlay backdrop behind the modal
- `.modal__container` - Positioning wrapper with placement support
- `.modal__dialog` - Modal content container
- `.modal__header` - Header section for titles and icons
- `.modal__body` - Main content area
- `.modal__footer` - Footer section for actions
- `.modal__close-trigger` - Close button element

#### Backdrop Variants \[!toc]

- `.modal__backdrop--opaque` - Opaque colored backdrop (default)
- `.modal__backdrop--blur` - Blurred backdrop with glass effect
- `.modal__backdrop--transparent` - Transparent backdrop (no overlay)

#### Scroll Variants \[!toc]

- `.modal__container--scroll-outside` - Enables scrolling the entire modal
- `.modal__dialog--scroll-inside` - Constrains modal height for body scrolling
- `.modal__body--scroll-inside` - Makes only the body scrollable
- `.modal__body--scroll-outside` - Allows full-page scrolling

### Interactive States

The component supports these interactive states:

- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` - Applied to trigger, dialog, and close button
- **Hover**: `:hover` or `[data-hovered="true"]` - Applied to close button on hover
- **Active**: `:active` or `[data-pressed="true"]` - Applied to close button when pressed
- **Entering**: `[data-entering]` - Applied during modal opening animation
- **Exiting**: `[data-exiting]` - Applied during modal closing animation
- **Placement**: `[data-placement="*"]` - Applied based on modal position (auto, top, center, bottom)

## API Reference

### Modal

| Prop       | Type        | Default | Description                    |
| ---------- | ----------- | ------- | ------------------------------ |
| `children` | `ReactNode` | -       | Trigger and container elements |

### Modal.Trigger

| Prop        | Type        | Default | Description            |
| ----------- | ----------- | ------- | ---------------------- |
| `children`  | `ReactNode` | -       | Custom trigger content |
| `className` | `string`    | -       | CSS classes            |

### Modal.Backdrop

| Prop                        | Type                                  | Default    | Description               |
| --------------------------- | ------------------------------------- | ---------- | ------------------------- |
| `variant`                   | `"opaque" \| "blur" \| "transparent"` | `"opaque"` | Backdrop overlay style    |
| `isDismissable`             | `boolean`                             | `true`     | Close on backdrop click   |
| `isKeyboardDismissDisabled` | `boolean`                             | `false`    | Disable ESC key to close  |
| `isOpen`                    | `boolean`                             | -          | Controlled open state     |
| `onOpenChange`              | `(isOpen: boolean) => void`           | -          | Open state change handler |
| `className`                 | `string \| (values) => string`        | -          | Backdrop CSS classes      |
| `UNSTABLE_portalContainer`  | `HTMLElement`                         | -          | Custom portal container   |

### Modal.Container

| Prop        | Type                                                | Default    | Description              |
| ----------- | --------------------------------------------------- | ---------- | ------------------------ |
| `placement` | `"auto" \| "center" \| "top" \| "bottom"`           | `"auto"`   | Modal position on screen |
| `scroll`    | `"inside" \| "outside"`                             | `"inside"` | Scroll behavior          |
| `size`      | `"xs" \| "sm" \| "md" \| "lg" \| "cover" \| "full"` | `"md"`     | Modal size variant       |
| `className` | `string \| (values) => string`                      | -          | Container CSS classes    |

### Modal.Dialog

| Prop               | Type                                  | Default    | Description                |
| ------------------ | ------------------------------------- | ---------- | -------------------------- |
| `children`         | `ReactNode \| ({close}) => ReactNode` | -          | Content or render function |
| `className`        | `string \| (values) => string`        | -          | CSS classes                |
| `role`             | `string`                              | `"dialog"` | ARIA role                  |
| `aria-label`       | `string`                              | -          | Accessibility label        |
| `aria-labelledby`  | `string`                              | -          | ID of label element        |
| `aria-describedby` | `string`                              | -          | ID of description element  |

### Modal.Header

| Prop        | Type        | Default | Description    |
| ----------- | ----------- | ------- | -------------- |
| `children`  | `ReactNode` | -       | Header content |
| `className` | `string`    | -       | CSS classes    |

### Modal.Body

| Prop        | Type        | Default | Description  |
| ----------- | ----------- | ------- | ------------ |
| `children`  | `ReactNode` | -       | Body content |
| `className` | `string`    | -       | CSS classes  |

### Modal.Footer

| Prop        | Type        | Default | Description    |
| ----------- | ----------- | ------- | -------------- |
| `children`  | `ReactNode` | -       | Footer content |
| `className` | `string`    | -       | CSS classes    |

### Modal.CloseTrigger

| Prop        | Type                           | Default | Description         |
| ----------- | ------------------------------ | ------- | ------------------- |
| `children`  | `ReactNode`                    | -       | Custom close button |
| `className` | `string \| (values) => string` | -       | CSS classes         |

### useOverlayState Hook

```tsx
import { useOverlayState } from '@heroui/react';

const state = useOverlayState({
    defaultOpen: false,
    onOpenChange: (isOpen) => console.log(isOpen),
});

state.isOpen; // Current state
state.open(); // Open modal
state.close(); // Close modal
state.toggle(); // Toggle state
state.setOpen(); // Set state directly
```

## Accessibility

Implements [WAI-ARIA Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):

- **Focus trap**: Focus locked within modal
- **Keyboard**: `ESC` closes (when enabled), `Tab` cycles elements
- **Screen readers**: Proper ARIA attributes
- **Scroll lock**: Body scroll disabled when open

## Related Components

## Related Components

- **Button**: Allows a user to perform an action
- **Tooltip**: Contextual information on hover or focus
- **Select**: Dropdown select control

</page>

---

# select Documentation (@heroui/react)

**URL:** https://heroui.com/docs/react/components/select.mdx

---

<page url="/en/docs/react/components/select">
# Select

**Category**: react
**URL**: https://heroui.com/en/docs/react/components/select
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(pickers)/select.mdx

> A select displays a collapsible list of options and allows a user to select one of them

## Usage

```tsx
import { Select } from '@heroui/react';
```

```tsx
import { Label, ListBox, Select } from '@heroui/react';

export function Default() {
    return (
        <Select className="w-[256px]" placeholder="Select one">
            <Label>State</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <ListBox.Item id="florida" textValue="Florida">
                        Florida
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="delaware" textValue="Delaware">
                        Delaware
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="california" textValue="California">
                        California
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="texas" textValue="Texas">
                        Texas
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="new-york" textValue="New York">
                        New York
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="washington" textValue="Washington">
                        Washington
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

## Anatomy

```tsx
import { Select, Label, Description, Header, ListBox, Separator } from '@heroui/react';

export default () => (
    <Select>
        <Label />
        <Select.Trigger>
            <Select.Value />
            <Select.ClearButton />
            <Select.Indicator />
        </Select.Trigger>
        <Description />
        <Select.Popover>
            <ListBox>
                <ListBox.Item>
                    <Label />
                    <Description />
                    <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Section>
                    <Header />
                    <ListBox.Item>
                        <Label />
                    </ListBox.Item>
                </ListBox.Section>
            </ListBox>
        </Select.Popover>
    </Select>
);
```

## Examples

### Variants

The Select component supports two visual variants:

- **`primary`** (default) - Standard styling with shadow, suitable for most use cases
- **`secondary`** - Lower emphasis variant without shadow, suitable for use in Surface components

```tsx
import { Label, ListBox, Select } from '@heroui/react';

export function Variants() {
    return (
        <div className="flex flex-col gap-4">
            <Select className="w-[256px]" placeholder="Select one" variant="primary">
                <Label>Primary variant</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="option1" textValue="Option 1">
                            Option 1
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="option2" textValue="Option 2">
                            Option 2
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
            </Select>
            <Select className="w-[256px]" placeholder="Select one" variant="secondary">
                <Label>Secondary variant</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="option1" textValue="Option 1">
                            Option 1
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="option2" textValue="Option 2">
                            Option 2
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
            </Select>
        </div>
    );
}
```

### Full Width

```tsx
import { Label, ListBox, Select } from '@heroui/react';

export function FullWidth() {
    return (
        <div className="w-[400px] space-y-4">
            <Select fullWidth placeholder="Select one">
                <Label>Favorite Animal</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="cat" textValue="Cat">
                            Cat
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="dog" textValue="Dog">
                            Dog
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="bird" textValue="Bird">
                            Bird
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
            </Select>
        </div>
    );
}
```

### With Description

```tsx
import { Description, Label, ListBox, Select } from '@heroui/react';

export function WithDescription() {
    return (
        <Select className="w-[256px]" placeholder="Select one">
            <Label>State</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <ListBox.Item id="florida" textValue="Florida">
                        Florida
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="delaware" textValue="Delaware">
                        Delaware
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="california" textValue="California">
                        California
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="texas" textValue="Texas">
                        Texas
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="new-york" textValue="New York">
                        New York
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="washington" textValue="Washington">
                        Washington
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
            <Description>Select your state of residence</Description>
        </Select>
    );
}
```

### Required

```tsx
'use client';

import { Button, FieldError, Form, Label, ListBox, Select } from '@heroui/react';

export function Required() {
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: Record<string, string> = {};

        // Convert FormData to plain object
        formData.forEach((value, key) => {
            data[key] = value.toString();
        });

        alert('Form submitted successfully!');
    };

    return (
        <Form className="flex w-[256px] flex-col gap-4" onSubmit={onSubmit}>
            <Select isRequired className="w-full" name="state" placeholder="Select one">
                <Label>State</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="florida" textValue="Florida">
                            Florida
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="delaware" textValue="Delaware">
                            Delaware
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="california" textValue="California">
                            California
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="texas" textValue="Texas">
                            Texas
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="new-york" textValue="New York">
                            New York
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="washington" textValue="Washington">
                            Washington
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
                <FieldError />
            </Select>
            <Select isRequired className="w-full" name="country" placeholder="Select a country">
                <Label>Country</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="usa" textValue="United States">
                            United States
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="canada" textValue="Canada">
                            Canada
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="mexico" textValue="Mexico">
                            Mexico
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="uk" textValue="United Kingdom">
                            United Kingdom
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="france" textValue="France">
                            France
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="germany" textValue="Germany">
                            Germany
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
                <FieldError />
            </Select>
            <Button type="submit">Submit</Button>
        </Form>
    );
}
```

### Disabled

```tsx
import { Label, ListBox, Select } from '@heroui/react';

export function Disabled() {
    return (
        <div className="flex flex-col gap-4">
            <Select
                isDisabled
                className="w-[256px]"
                defaultValue="california"
                placeholder="Select one"
            >
                <Label>State</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="florida" textValue="Florida">
                            Florida
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="delaware" textValue="Delaware">
                            Delaware
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="california" textValue="California">
                            California
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="texas" textValue="Texas">
                            Texas
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="new-york" textValue="New York">
                            New York
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="washington" textValue="Washington">
                            Washington
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
            </Select>
            <Select
                isDisabled
                className="w-[256px]"
                defaultValue={['argentina', 'japan', 'france']}
                placeholder="Select countries"
                selectionMode="multiple"
            >
                <Label>Countries to Visit</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="argentina" textValue="Argentina">
                            Argentina
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="venezuela" textValue="Venezuela">
                            Venezuela
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="japan" textValue="Japan">
                            Japan
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="france" textValue="France">
                            France
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="italy" textValue="Italy">
                            Italy
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="spain" textValue="Spain">
                            Spain
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
            </Select>
        </div>
    );
}
```

### With Disabled Options

```tsx
import { Label, ListBox, Select } from '@heroui/react';

export function WithDisabledOptions() {
    return (
        <Select
            className="w-[256px]"
            disabledKeys={['cat', 'kangaroo']}
            placeholder="Select an animal"
        >
            <Label>Animal</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <ListBox.Item id="dog" textValue="Dog">
                        Dog
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="cat" textValue="Cat">
                        Cat
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="bird" textValue="Bird">
                        Bird
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="kangaroo" textValue="Kangaroo">
                        Kangaroo
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="elephant" textValue="Elephant">
                        Elephant
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="tiger" textValue="Tiger">
                        Tiger
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### Multiple Select

```tsx
import { Label, ListBox, Select } from '@heroui/react';

export function MultipleSelect() {
    return (
        <Select className="w-[256px]" placeholder="Select countries" selectionMode="multiple">
            <Label>Countries to Visit</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox selectionMode="multiple">
                    <ListBox.Item id="argentina" textValue="Argentina">
                        Argentina
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="venezuela" textValue="Venezuela">
                        Venezuela
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="japan" textValue="Japan">
                        Japan
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="france" textValue="France">
                        France
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="italy" textValue="Italy">
                        Italy
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="spain" textValue="Spain">
                        Spain
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="thailand" textValue="Thailand">
                        Thailand
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="new-zealand" textValue="New Zealand">
                        New Zealand
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="iceland" textValue="Iceland">
                        Iceland
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### With Sections

```tsx
import { Header, Label, ListBox, Select, Separator } from '@heroui/react';

export function WithSections() {
    return (
        <Select className="w-[256px]" placeholder="Select a country">
            <Label>Country</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <ListBox.Section>
                        <Header>North America</Header>
                        <ListBox.Item id="usa" textValue="United States">
                            United States
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="canada" textValue="Canada">
                            Canada
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="mexico" textValue="Mexico">
                            Mexico
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox.Section>
                    <Separator />
                    <ListBox.Section>
                        <Header>Europe</Header>
                        <ListBox.Item id="uk" textValue="United Kingdom">
                            United Kingdom
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="france" textValue="France">
                            France
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="germany" textValue="Germany">
                            Germany
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="spain" textValue="Spain">
                            Spain
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="italy" textValue="Italy">
                            Italy
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox.Section>
                    <Separator />
                    <ListBox.Section>
                        <Header>Asia</Header>
                        <ListBox.Item id="japan" textValue="Japan">
                            Japan
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="china" textValue="China">
                            China
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="india" textValue="India">
                            India
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="south-korea" textValue="South Korea">
                            South Korea
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox.Section>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### Controlled

```tsx
'use client';

import type { Key } from '@heroui/react';

import { Label, ListBox, Select } from '@heroui/react';
import { useState } from 'react';

export function Controlled() {
    const states = [
        {
            id: 'california',
            name: 'California',
        },
        {
            id: 'texas',
            name: 'Texas',
        },
        {
            id: 'florida',
            name: 'Florida',
        },
        {
            id: 'new-york',
            name: 'New York',
        },
        {
            id: 'illinois',
            name: 'Illinois',
        },
        {
            id: 'pennsylvania',
            name: 'Pennsylvania',
        },
    ];

    const [state, setState] = useState<Key | null>('california');

    const selectedState = states.find((s) => s.id === state);

    return (
        <div className="space-y-2">
            <Select
                className="w-[256px]"
                placeholder="Select a state"
                value={state}
                onChange={(value) => setState(value)}
            >
                <Label>State (controlled)</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        {states.map((state) => (
                            <ListBox.Item key={state.id} id={state.id} textValue={state.name}>
                                {state.name}
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                        ))}
                    </ListBox>
                </Select.Popover>
            </Select>
            <p className="text-sm text-muted">Selected: {selectedState?.name || 'None'}</p>
        </div>
    );
}
```

### Controlled Multiple

```tsx
'use client';

import type { Key } from '@heroui/react';

import { Label, ListBox, Select } from '@heroui/react';
import React from 'react';

export function ControlledMultiple() {
    const [selected, setSelected] = React.useState<Key[]>(['california', 'texas']);

    return (
        <div className="space-y-4">
            <Select
                className="w-[256px]"
                placeholder="Select states"
                selectionMode="multiple"
                value={selected}
                onChange={(keys) => setSelected(keys as Key[])}
            >
                <Label>States (controlled multiple)</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox selectionMode="multiple">
                        <ListBox.Item id="california" textValue="California">
                            California
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="texas" textValue="Texas">
                            Texas
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="florida" textValue="Florida">
                            Florida
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="new-york" textValue="New York">
                            New York
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="illinois" textValue="Illinois">
                            Illinois
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="pennsylvania" textValue="Pennsylvania">
                            Pennsylvania
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
            </Select>
            <p className="text-sm text-muted">
                Selected: {selected.length > 0 ? selected.join(', ') : 'None'}
            </p>
        </div>
    );
}
```

### Controlled Open State

```tsx
'use client';

import { Button, Label, ListBox, Select } from '@heroui/react';
import { useState } from 'react';

export function ControlledOpenState() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-4">
            <Select
                className="w-[256px]"
                isOpen={isOpen}
                placeholder="Select one"
                onOpenChange={setIsOpen}
            >
                <Label>State</Label>
                <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                    <ListBox>
                        <ListBox.Item id="florida" textValue="Florida">
                            Florida
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="delaware" textValue="Delaware">
                            Delaware
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="california" textValue="California">
                            California
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="texas" textValue="Texas">
                            Texas
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="new-york" textValue="New York">
                            New York
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item id="washington" textValue="Washington">
                            Washington
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    </ListBox>
                </Select.Popover>
            </Select>
            <Button onPress={() => setIsOpen(!isOpen)}>{isOpen ? 'Close' : 'Open'} Select</Button>
            <p className="text-sm text-muted">Select is {isOpen ? 'open' : 'closed'}</p>
        </div>
    );
}
```

### Asynchronous Loading

```tsx
'use client';

import { Label, ListBox, Select, Spinner } from '@heroui/react';
import { useAsyncList } from '@react-stately/data';
import { Collection, ListBoxLoadMoreItem } from 'react-aria-components';

interface Pokemon {
    name: string;
}

export function AsynchronousLoading() {
    const list = useAsyncList<Pokemon>({
        async load({ cursor, signal }) {
            const res = await fetch(cursor || `https://pokeapi.co/api/v2/pokemon`, { signal });
            const json = await res.json();

            return {
                cursor: json.next,
                items: json.results,
            };
        },
    });

    return (
        <Select className="w-[256px]" placeholder="Select a Pokemon">
            <Label>Pick a Pokemon</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <Collection items={list.items}>
                        {(item: Pokemon) => (
                            <ListBox.Item id={item.name} textValue={item.name}>
                                {item.name}
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                        )}
                    </Collection>
                    <ListBoxLoadMoreItem
                        isLoading={list.loadingState === 'loadingMore'}
                        onLoadMore={list.loadMore}
                    >
                        <div className="flex items-center justify-center gap-2 py-2">
                            <Spinner size="sm" />
                            <span className="text-sm text-muted">Loading more...</span>
                        </div>
                    </ListBoxLoadMoreItem>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### Custom Indicator

```tsx
import { ChevronsExpandVertical } from '@gravity-ui/icons';
import { Label, ListBox, Select } from '@heroui/react';

export function CustomIndicator() {
    return (
        <Select className="w-[256px]" placeholder="Select one">
            <Label>State</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator className="size-3">
                    <ChevronsExpandVertical />
                </Select.Indicator>
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <ListBox.Item id="florida" textValue="Florida">
                        Florida
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="delaware" textValue="Delaware">
                        Delaware
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="california" textValue="California">
                        California
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="texas" textValue="Texas">
                        Texas
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="new-york" textValue="New York">
                        New York
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="washington" textValue="Washington">
                        Washington
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### With Clear Button

`Select.Trigger` is a button, so a nested `<button>` cannot be used for clear. Compose `Select.ClearButton` inside the trigger instead — it renders as a non-button control and does not open the menu.

```tsx
import { Label, ListBox, Select } from '@heroui/react';

export function WithClearButton() {
    return (
        <Select className="w-[256px]" defaultValue="california" placeholder="Select one">
            <Label>State</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.ClearButton />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <ListBox.Item id="florida" textValue="Florida">
                        Florida
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="delaware" textValue="Delaware">
                        Delaware
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="california" textValue="California">
                        California
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="texas" textValue="Texas">
                        Texas
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="new-york" textValue="New York">
                        New York
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="washington" textValue="Washington">
                        Washington
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

Because ARIA treats the children of a button as presentational, the clear control cannot take focus. It is therefore `aria-hidden` and acts as a pointer affordance only. When a `Select.ClearButton` is composed, the trigger also clears on `Backspace` or `Delete`, which is how keyboard and screen reader users clear the selection. Both paths call `onClear`.

### Custom Value

```tsx
'use client';

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Description,
    Label,
    ListBox,
    Select,
} from '@heroui/react';

export function CustomValue() {
    const users = [
        {
            avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg',
            email: 'bob@heroui.com',
            fallback: 'B',
            id: '1',
            name: 'Bob',
        },
        {
            avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg',
            email: 'fred@heroui.com',
            fallback: 'F',
            id: '2',
            name: 'Fred',
        },
        {
            avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg',
            email: 'martha@heroui.com',
            fallback: 'M',
            id: '3',
            name: 'Martha',
        },
        {
            avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg',
            email: 'john@heroui.com',
            fallback: 'J',
            id: '4',
            name: 'John',
        },
        {
            avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg',
            email: 'jane@heroui.com',
            fallback: 'J',
            id: '5',
            name: 'Jane',
        },
    ];

    return (
        <Select className="w-[256px]" placeholder="Select a user">
            <Label>User</Label>
            <Select.Trigger>
                <Select.Value>
                    {({ defaultChildren, isPlaceholder, state }) => {
                        if (isPlaceholder || state.selectedItems.length === 0) {
                            return defaultChildren;
                        }

                        const selectedItems = state.selectedItems;

                        if (selectedItems.length > 1) {
                            return `${selectedItems.length} users selected`;
                        }

                        const selectedItem = users.find(
                            (user) => user.id === selectedItems[0]?.key,
                        );

                        if (!selectedItem) {
                            return defaultChildren;
                        }

                        return (
                            <div className="flex items-center gap-2">
                                <Avatar className="size-4" size="sm">
                                    <AvatarImage src={selectedItem.avatarUrl} />
                                    <AvatarFallback>{selectedItem.fallback}</AvatarFallback>
                                </Avatar>
                                <span>{selectedItem.name}</span>
                            </div>
                        );
                    }}
                </Select.Value>
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    {users.map((user) => (
                        <ListBox.Item key={user.id} id={user.id} textValue={user.name}>
                            <Avatar size="sm">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback>{user.fallback}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <Label>{user.name}</Label>
                                <Description>{user.email}</Description>
                            </div>
                            <ListBox.ItemIndicator />
                        </ListBox.Item>
                    ))}
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### Render Function

```tsx
'use client';

import { Label, ListBox, Select } from '@heroui/react';

export function RenderFunction() {
    return (
        <Select
            className="w-[256px]"
            placeholder="Select one"
            render={(props) => <div {...props} data-custom="foo" />}
        >
            <Label>State</Label>
            <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
                <ListBox>
                    <ListBox.Item id="florida" textValue="Florida">
                        Florida
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="delaware" textValue="Delaware">
                        Delaware
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="california" textValue="California">
                        California
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="texas" textValue="Texas">
                        Texas
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="new-york" textValue="New York">
                        New York
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item id="washington" textValue="Washington">
                        Washington
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### In Surface

When used inside a [Surface](/docs/components/surface) component, use `variant="secondary"` to apply the lower emphasis variant suitable for surface backgrounds.

```tsx
'use client';

import { Button, FieldError, Form, Label, ListBox, Select, Surface } from '@heroui/react';

export function OnSurface() {
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data: Record<string, string> = {};

        // Convert FormData to plain object
        formData.forEach((value, key) => {
            data[key] = value.toString();
        });

        alert('Form submitted successfully!');
    };

    return (
        <Surface className="w-[320px] rounded-3xl p-6">
            <Form className="flex w-full flex-col gap-4" onSubmit={onSubmit}>
                <Select
                    isRequired
                    className="w-full"
                    name="state"
                    placeholder="Select one"
                    variant="secondary"
                >
                    <Label>State</Label>
                    <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                        <ListBox>
                            <ListBox.Item id="florida" textValue="Florida">
                                Florida
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="delaware" textValue="Delaware">
                                Delaware
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="california" textValue="California">
                                California
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="texas" textValue="Texas">
                                Texas
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="new-york" textValue="New York">
                                New York
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="washington" textValue="Washington">
                                Washington
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                        </ListBox>
                    </Select.Popover>
                    <FieldError />
                </Select>
                <Select
                    isRequired
                    className="w-full"
                    name="country"
                    placeholder="Select a country"
                    variant="secondary"
                >
                    <Label>Country</Label>
                    <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                        <ListBox>
                            <ListBox.Item id="usa" textValue="United States">
                                United States
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="canada" textValue="Canada">
                                Canada
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="mexico" textValue="Mexico">
                                Mexico
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="uk" textValue="United Kingdom">
                                United Kingdom
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="france" textValue="France">
                                France
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="germany" textValue="Germany">
                                Germany
                                <ListBox.ItemIndicator />
                            </ListBox.Item>
                        </ListBox>
                    </Select.Popover>
                    <FieldError />
                </Select>
                <Button type="submit">Submit</Button>
            </Form>
        </Surface>
    );
}
```

## Customization

### Tailwind CSS

```tsx
import { Label, ListBox, Select } from '@heroui/react';

const itemClass =
    'rounded-lg data-[focused=true]:bg-accent/10 data-[selected=true]:text-foreground';

export function CustomStyles() {
    return (
        <Select className="w-56" placeholder="Pick a plan" variant="secondary">
            <Label className="font-medium text-foreground">Plan</Label>
            <Select.Trigger className="rounded-xl bg-default">
                <Select.Value />
                <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="rounded-xl border border-border bg-surface p-1 shadow-lg">
                <ListBox>
                    <ListBox.Item className={itemClass} id="free" textValue="Free">
                        Free
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                    <ListBox.Item className={itemClass} id="pro" textValue="Pro">
                        Pro
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                </ListBox>
            </Select.Popover>
        </Select>
    );
}
```

### Global CSS

To customize the Select component classes, you can use the `@layer components` directive.

[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
    .select {
        @apply flex flex-col gap-1;
    }

    .select__trigger {
        @apply rounded-lg border border-border bg-surface p-2;
    }

    .select__value {
        @apply text-current;
    }

    .select__indicator {
        @apply text-muted;
    }

    .select__popover {
        @apply rounded-lg border border-border bg-surface p-2;
    }
}
```

## Styling Reference

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Select component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/select.css)):

#### Base Classes \[!toc]

- `.select` - Base select container
- `.select__trigger` - The button that triggers the select
- `.select__value` - The displayed value or placeholder
- `.select__clear-button` - The optional clear control inside the trigger
- `.select__indicator` - The dropdown indicator icon
- `.select__popover` - The popover container

#### Variant Classes \[!toc]

- `.select--primary` - Primary variant with shadow (default)
- `.select--secondary` - Secondary variant without shadow, suitable for use in surfaces

#### State Classes \[!toc]

- `.select[data-invalid="true"]` - Invalid state
- `.select__trigger[data-focus-visible="true"]` - Focused trigger state
- `.select__trigger[data-disabled="true"]` - Disabled trigger state
- `.select__value[data-placeholder="true"]` - Placeholder state
- `.select__clear-button[data-empty="true"]` - Clear button hidden when no selection
- `.select__indicator[data-open="true"]` - Open indicator state

### Interactive States

The component supports both CSS pseudo-classes and data attributes for flexibility:

- **Hover**: `:hover` or `[data-hovered="true"]` on trigger
- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` on trigger
- **Disabled**: `:disabled` or `[data-disabled="true"]` on select
- **Open**: `[data-open="true"]` on indicator

## API Reference

### Select

| Prop            | Type                                                                      | Default            | Description                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `placeholder`   | `string`                                                                  | `'Select an item'` | Temporary text that occupies the select when it is empty                                                                                                           |
| `selectionMode` | `"single" \| "multiple"`                                                  | `"single"`         | Whether single or multiple selection is enabled                                                                                                                    |
| `isOpen`        | `boolean`                                                                 | -                  | Sets the open state of the menu (controlled)                                                                                                                       |
| `defaultOpen`   | `boolean`                                                                 | -                  | Sets the default open state of the menu (uncontrolled)                                                                                                             |
| `onOpenChange`  | `(isOpen: boolean) => void`                                               | -                  | Handler called when the open state changes                                                                                                                         |
| `disabledKeys`  | `Iterable<Key>`                                                           | -                  | Keys of disabled items                                                                                                                                             |
| `isDisabled`    | `boolean`                                                                 | -                  | Whether the select is disabled                                                                                                                                     |
| `value`         | `Key \| Key[] \| null`                                                    | -                  | Current value (controlled)                                                                                                                                         |
| `defaultValue`  | `Key \| Key[] \| null`                                                    | -                  | Default value (uncontrolled)                                                                                                                                       |
| `onChange`      | `(value: Key \| Key[] \| null) => void`                                   | -                  | Handler called when the value changes                                                                                                                              |
| `onClear`       | `() => void`                                                              | -                  | Handler called when the selection is cleared                                                                                                                       |
| `isRequired`    | `boolean`                                                                 | -                  | Whether user input is required                                                                                                                                     |
| `isInvalid`     | `boolean`                                                                 | -                  | Whether the select value is invalid                                                                                                                                |
| `name`          | `string`                                                                  | -                  | The name of the input, used when submitting an HTML form                                                                                                           |
| `autoComplete`  | `string`                                                                  | -                  | Describes the type of autocomplete functionality                                                                                                                   |
| `fullWidth`     | `boolean`                                                                 | `false`            | Whether the select should take full width of its container                                                                                                         |
| `variant`       | `"primary" \| "secondary"`                                                | `"primary"`        | Visual variant of the component. `primary` is the default style with shadow. `secondary` is a lower emphasis variant without shadow, suitable for use in surfaces. |
| `className`     | `string`                                                                  | -                  | Additional CSS classes                                                                                                                                             |
| `children`      | `ReactNode \| RenderFunction`                                             | -                  | Select content or render function                                                                                                                                  |
| `render`        | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, SelectRenderProps>` | -                  | Overrides the default DOM element with a custom render function.                                                                                                   |

### Select.Trigger

| Prop        | Type                          | Default | Description                        |
| ----------- | ----------------------------- | ------- | ---------------------------------- |
| `className` | `string`                      | -       | Additional CSS classes             |
| `children`  | `ReactNode \| RenderFunction` | -       | Trigger content or render function |

### Select.Value

| Prop        | Type                                                                           | Default | Description                                                      |
| ----------- | ------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------- |
| `className` | `string`                                                                       | -       | Additional CSS classes                                           |
| `children`  | `ReactNode \| RenderFunction`                                                  | -       | Value content or render function                                 |
| `render`    | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, SelectValueRenderProps>` | -       | Overrides the default DOM element with a custom render function. |

### Select.Indicator

| Prop        | Type        | Default | Description              |
| ----------- | ----------- | ------- | ------------------------ |
| `className` | `string`    | -       | Additional CSS classes   |
| `children`  | `ReactNode` | -       | Custom indicator content |

### Select.ClearButton

| Prop        | Type                      | Default | Description                                |
| ----------- | ------------------------- | ------- | ------------------------------------------ |
| `className` | `string`                  | -       | Additional CSS classes                     |
| `children`  | `ReactNode`               | -       | Custom content, replacing the default icon |
| `onClick`   | `(e: MouseEvent) => void` | -       | Handler called when the control is clicked |

`Select.ClearButton` renders as a `span` so it can live inside `Select.Trigger` (a button) without nesting buttons. It is visually hidden when the selection is empty.

### Select.Popover

| Prop        | Type                                                                                                                                                                                                                                                                                                                     | Default    | Description                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------ |
| `placement` | `"bottom" \| "bottom left" \| "bottom right" \| "bottom start" \| "bottom end" \| "top" \| "top left" \| "top right" \| "top start" \| "top end" \| "left" \| "left top" \| "left bottom" \| "start" \| "start top" \| "start bottom" \| "right" \| "right top" \| "right bottom" \| "end" \| "end top" \| "end bottom"` | `"bottom"` | Placement of the popover relative to the trigger |
| `className` | `string`                                                                                                                                                                                                                                                                                                                 | -          | Additional CSS classes                           |
| `children`  | `ReactNode`                                                                                                                                                                                                                                                                                                              | -          | Content children                                 |

### Render Props

When using render functions with Select.Value, these values are provided:

| Prop              | Type          | Description                        |
| ----------------- | ------------- | ---------------------------------- |
| `defaultChildren` | `ReactNode`   | The default rendered value         |
| `isPlaceholder`   | `boolean`     | Whether the value is a placeholder |
| `state`           | `SelectState` | The state of the select            |
| `selectedItems`   | `Node[]`      | The currently selected items       |

## Accessibility

The Select component implements the ARIA listbox pattern and provides:

- Full keyboard navigation support
- Screen reader announcements for selection changes
- Proper focus management
- Support for disabled states
- Typeahead search functionality
- HTML form integration

For more information, see the [React Aria Select documentation](https://react-spectrum.adobe.com/react-aria/Select.html).

## Related Components

## Related Components

- **Listbox**: Scrollable list of selectable items
- **Popover**: Displays content in context with a trigger
- **Label**: Accessible label for form controls

</page>

---

# meter Documentation (@heroui/react)

**URL:** https://heroui.com/docs/react/components/meter.mdx

---

<page url="/en/docs/react/components/meter">
# Meter

**Category**: react
**URL**: https://heroui.com/en/docs/react/components/meter
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(feedback)/meter.mdx

> A meter represents a quantity within a known range, or a fractional value.

## Usage

```tsx
import { Meter, Label } from '@heroui/react';
```

```tsx
import { Label, Meter } from '@heroui/react';

export function Basic() {
    return (
        <Meter aria-label="Storage" className="w-64" value={60}>
            <Label>Storage</Label>
            <Meter.Output />
            <Meter.Track>
                <Meter.Fill />
            </Meter.Track>
        </Meter>
    );
}
```

## Anatomy

```tsx
import { Meter, Label } from '@heroui/react';

export default () => (
    <Meter value={60}>
        <Label>Storage</Label>
        <Meter.Output />
        <Meter.Track>
            <Meter.Fill />
        </Meter.Track>
    </Meter>
);
```

## Examples

### Sizes

```tsx
import { Label, Meter } from '@heroui/react';

export function Sizes() {
    return (
        <div className="flex w-64 flex-col gap-6">
            <Meter color="success" size="sm" value={40}>
                <Label>Small</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
            <Meter color="accent" size="md" value={60}>
                <Label>Medium</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
            <Meter color="warning" size="lg" value={80}>
                <Label>Large</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
        </div>
    );
}
```

### Colors

```tsx
import { Label, Meter } from '@heroui/react';

export function Colors() {
    return (
        <div className="flex w-64 flex-col gap-6">
            <Meter color="default" value={50}>
                <Label>Default</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
            <Meter color="accent" value={50}>
                <Label>Accent</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
            <Meter color="success" value={50}>
                <Label>Success</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
            <Meter color="warning" value={50}>
                <Label>Warning</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
            <Meter color="danger" value={50}>
                <Label>Danger</Label>
                <Meter.Output />
                <Meter.Track>
                    <Meter.Fill />
                </Meter.Track>
            </Meter>
        </div>
    );
}
```

### Without Label

When no visible label is needed, use `aria-label` for accessibility.

```tsx
import { Meter } from '@heroui/react';

export function WithoutLabel() {
    return (
        <Meter aria-label="Storage usage" className="w-64" value={45}>
            <Meter.Track>
                <Meter.Fill />
            </Meter.Track>
        </Meter>
    );
}
```

### Custom Value Scale

Use `minValue`, `maxValue`, and `formatOptions` to customize the value range and display format.

```tsx
import { Label, Meter } from '@heroui/react';

export function CustomValue() {
    return (
        <Meter
            className="w-64"
            formatOptions={{ currency: 'USD', style: 'currency' }}
            maxValue={1000}
            minValue={0}
            value={750}
        >
            <Label>Revenue</Label>
            <Meter.Output />
            <Meter.Track>
                <Meter.Fill />
            </Meter.Track>
        </Meter>
    );
}
```

## Customization

### Tailwind CSS

```tsx
import { Label, Meter } from '@heroui/react';

export function CustomStyles() {
    return (
        <Meter aria-label="Storage used" className="w-64" value={68}>
            <Label className="font-medium text-foreground">Storage used</Label>
            <Meter.Output className="text-muted tabular-nums" />
            <Meter.Track className="rounded-full bg-default">
                <Meter.Fill className="rounded-full bg-warning" />
            </Meter.Track>
        </Meter>
    );
}
```

### Global CSS

To customize the Meter component classes, you can use the `@layer components` directive.
[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
    .meter {
        @apply w-full gap-2;
    }

    .meter__track {
        @apply h-3 rounded-full;
    }

    .meter__fill {
        @apply rounded-full;
    }
}
```

## Styling Reference

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Meter component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/meter.css)):

#### Base & Element Classes \[!toc]

- `.meter` - Base container (grid layout)
- `.meter__output` - Value text display
- `.meter__track` - Track background
- `.meter__fill` - Filled portion of the track

#### Size Classes \[!toc]

- `.meter--sm` - Small size variant (thinner track)
- `.meter--md` - Medium size variant (default)
- `.meter--lg` - Large size variant (thicker track)

#### Color Classes \[!toc]

- `.meter--default` - Default color variant
- `.meter--accent` - Accent color variant
- `.meter--success` - Success color variant
- `.meter--warning` - Warning color variant
- `.meter--danger` - Danger color variant

## API Reference

### Meter

Inherits from [React Aria Meter](https://react-spectrum.adobe.com/react-aria/Meter.html).

| Prop            | Type                                                          | Default              | Description                         |
| --------------- | ------------------------------------------------------------- | -------------------- | ----------------------------------- |
| `value`         | `number`                                                      | `0`                  | The current value                   |
| `minValue`      | `number`                                                      | `0`                  | The minimum value                   |
| `maxValue`      | `number`                                                      | `100`                | The maximum value                   |
| `size`          | `"sm" \| "md" \| "lg"`                                        | `"md"`               | Size of the meter track             |
| `color`         | `"default" \| "accent" \| "success" \| "warning" \| "danger"` | `"accent"`           | Color of the fill bar               |
| `formatOptions` | `Intl.NumberFormatOptions`                                    | `{style: 'percent'}` | Number format for the value display |
| `valueLabel`    | `ReactNode`                                                   | -                    | Custom value label content          |
| `children`      | `ReactNode \| (values: MeterRenderProps) => ReactNode`        | -                    | Content or render prop              |

### Render Props

When using the render prop pattern, these values are provided:

| Prop         | Type     | Description                         |
| ------------ | -------- | ----------------------------------- |
| `percentage` | `number` | The percentage of the meter (0-100) |
| `valueText`  | `string` | The formatted value text            |

## Related Components

</page>

---

# text-field Documentation (@heroui/react)

**URL:** https://heroui.com/docs/react/components/text-field.mdx

---

<page url="/en/docs/react/components/text-field">
# TextField

**Category**: react
**URL**: https://heroui.com/en/docs/react/components/text-field
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(forms)/text-field.mdx

> Composition-friendly text fields with labels, descriptions, and inline validation

## Usage

```tsx
import { TextField } from '@heroui/react';
```

```tsx
import { Input, Label, TextField } from '@heroui/react';

export function Basic() {
    return (
        <TextField className="w-full max-w-64" name="email" type="email">
            <Label>Email</Label>
            <Input placeholder="Enter your email" />
        </TextField>
    );
}
```

## Anatomy

```tsx
import { TextField, Label, Input, Description, FieldError } from '@heroui/react';

export default () => (
    <TextField>
        <Label />
        <Input />
        <Description />
        <FieldError />
    </TextField>
);
```

> **TextField** combines label, input, description, and error into a single accessible component.
> For standalone inputs, use **[Input](/docs/components/input)** or **[TextArea](/docs/components/textarea)**.

## Examples

### In Surface

When used inside a [Surface](/docs/components/surface) component, use `variant="secondary"` on Input or TextArea components to apply the lower emphasis variant suitable for surface backgrounds.

```tsx
import { Description, Input, Label, Surface, TextArea, TextField } from '@heroui/react';

export function OnSurface() {
    return (
        <Surface className="flex w-full min-w-[340px] flex-col gap-4 rounded-3xl p-6">
            <TextField name="name" variant="secondary">
                <Label>Your name</Label>
                <Input className="w-full" placeholder="John" />
                <Description>We'll never share this with anyone else</Description>
            </TextField>
            <TextField name="email" type="email" variant="secondary">
                <Label>Email</Label>
                <Input className="w-full" placeholder="john@example.com" />
            </TextField>
            <TextField name="bio" variant="secondary">
                <Label>Bio</Label>
                <TextArea className="w-full" placeholder="Tell us about yourself..." rows={4} />
                <Description>Minimum 4 rows</Description>
            </TextField>
        </Surface>
    );
}
```

### With Description

```tsx
import { Description, Input, Label, TextField } from '@heroui/react';

export function WithDescription() {
    return (
        <TextField className="w-full max-w-64" name="username">
            <Label>Username</Label>
            <Input placeholder="Enter username" />
            <Description>Choose a unique username for your account</Description>
        </TextField>
    );
}
```

### Required Field

```tsx
import { Description, Input, Label, TextField } from '@heroui/react';

export function Required() {
    return (
        <TextField isRequired className="w-full max-w-64" name="fullName">
            <Label>Full Name</Label>
            <Input placeholder="John Doe" />
            <Description>This field is required</Description>
        </TextField>
    );
}
```

### Disabled State

```tsx
import { Description, Input, Label, TextField } from '@heroui/react';

export function Disabled() {
    return (
        <TextField isDisabled className="w-full max-w-64" name="accountId" value="USR-12345">
            <Label>Account ID</Label>
            <Input placeholder="Auto-generated" />
            <Description>This field cannot be edited</Description>
        </TextField>
    );
}
```

### Full Width

```tsx
import { FieldError, Input, Label, TextField } from '@heroui/react';

export function FullWidth() {
    return (
        <div className="w-[400px] space-y-4">
            <TextField fullWidth name="name">
                <Label>Your name</Label>
                <Input placeholder="John" />
            </TextField>
            <TextField fullWidth isInvalid isRequired name="password" type="password">
                <Label>Password</Label>
                <Input />
                <FieldError>Password must be longer than 8 characters</FieldError>
            </TextField>
        </div>
    );
}
```

### Validation

Use `isInvalid` together with `FieldError` to surface validation messages.

```tsx
'use client';

import { Description, FieldError, Input, Label, TextArea, TextField } from '@heroui/react';
import React from 'react';

export function Validation() {
    const [username, setUsername] = React.useState('');
    const [bio, setBio] = React.useState('');

    const isUsernameInvalid = username.length > 0 && username.length < 3;
    const isBioInvalid = bio.length > 0 && bio.length < 20;

    return (
        <div className="flex w-full max-w-64 flex-col gap-4">
            <TextField
                isRequired
                isInvalid={isUsernameInvalid}
                name="username"
                value={username}
                onChange={setUsername}
            >
                <Label>Username</Label>
                <Input placeholder="jane_doe" />
                {isUsernameInvalid ? (
                    <FieldError>Username must be at least 3 characters.</FieldError>
                ) : (
                    <Description>Choose a unique username for your profile.</Description>
                )}
            </TextField>

            <TextField isRequired isInvalid={isBioInvalid} name="bio" value={bio} onChange={setBio}>
                <Label>Bio</Label>
                <TextArea placeholder="Tell us about yourself..." />
                {isBioInvalid ? (
                    <FieldError>Bio must contain at least 20 characters.</FieldError>
                ) : (
                    <Description>Minimum 20 characters ({bio.length}/20).</Description>
                )}
            </TextField>
        </div>
    );
}
```

### Controlled

Control the value to synchronize counters, previews, or formatting.

```tsx
'use client';

import { Description, Input, Label, TextArea, TextField } from '@heroui/react';
import React from 'react';

export function Controlled() {
    const [name, setName] = React.useState('');
    const [bio, setBio] = React.useState('');

    return (
        <div className="flex w-full max-w-64 flex-col gap-4">
            <TextField name="name" value={name} onChange={setName}>
                <Label>Display name</Label>
                <Input placeholder="Jane" />
                <Description>Characters: {name.length}</Description>
            </TextField>
            <TextField name="bio" value={bio} onChange={setBio}>
                <Label>Bio</Label>
                <TextArea placeholder="Tell us about yourself..." />
                <Description>Characters: {bio.length} / 200</Description>
            </TextField>
        </div>
    );
}
```

### Error Message

```tsx
import { FieldError, Input, Label, TextField } from '@heroui/react';

export function WithError() {
    return (
        <TextField isInvalid className="w-full max-w-64" name="email" type="email">
            <Label>Email</Label>
            <Input placeholder="user@example.com" />
            <FieldError>Please enter a valid email address</FieldError>
        </TextField>
    );
}
```

### TextArea

Use [TextArea](/docs/components/textarea) instead of [Input](/docs/components/input) for multiline content.

```tsx
import { Description, Label, TextArea, TextField } from '@heroui/react';

export function TextAreaExample() {
    return (
        <TextField className="w-full max-w-64" name="message">
            <Label>Message</Label>
            <TextArea placeholder="Write your message here..." rows={4} />
            <Description>Maximum 500 characters</Description>
        </TextField>
    );
}
```

### Input Types

```tsx
import { Input, Label, TextField } from '@heroui/react';

export function InputTypes() {
    return (
        <div className="flex w-full max-w-64 flex-col gap-4">
            <TextField name="password" type="password">
                <Label>Password</Label>
                <Input placeholder="••••••••" />
            </TextField>

            <TextField name="age" type="number">
                <Label>Age</Label>
                <Input max="150" min="0" placeholder="21" />
            </TextField>

            <TextField name="email" type="email">
                <Label>Email</Label>
                <Input placeholder="user@example.com" />
            </TextField>

            <TextField name="website" type="url">
                <Label>Website</Label>
                <Input placeholder="https://example.com" />
            </TextField>

            <TextField name="phone" type="tel">
                <Label>Phone</Label>
                <Input placeholder="+1 (555) 000-0000" />
            </TextField>
        </div>
    );
}
```

### Render Function

```tsx
'use client';

import { Input, Label, TextField } from '@heroui/react';

export function RenderFunction() {
    return (
        <TextField
            className="w-full max-w-64"
            name="email"
            render={(props) => <div {...props} data-custom="foo" />}
            type="email"
        >
            <Label>Email</Label>
            <Input placeholder="Enter your email" />
        </TextField>
    );
}
```

## Customization

### Tailwind CSS

```tsx
import { Input, Label, TextField } from '@heroui/react';

const fieldClass =
    'rounded-xl border border-border/80 bg-surface shadow-sm ring-1 ring-black/5 transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-neutral-400/25 dark:ring-white/10 dark:focus-visible:ring-neutral-500/30';

export function CustomStyles() {
    return (
        <TextField className="w-full max-w-64 gap-1.5" name="email" type="email">
            <Label className="font-medium text-neutral-800 dark:text-neutral-100">Email</Label>
            <Input
                className={`text-sm text-neutral-800 placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500 ${fieldClass}`}
                placeholder="you@email.com"
            />
        </TextField>
    );
}
```

### Global CSS

TextField has minimal default styling. Override the `.textfield` class to customize the container styling.

```css
@layer components {
    .textfield {
        @apply flex flex-col gap-1;
    }

    /* When invalid, the description is hidden automatically */
    .textfield[data-invalid='true'] [data-slot='description'],
    .textfield[aria-invalid='true'] [data-slot='description'] {
        @apply hidden;
    }

    /* Description has default padding */
    .textfield [data-slot='description'] {
        @apply px-1;
    }
}
```

## Styling Reference

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

- `.textfield` – Root container with minimal styling (`flex flex-col gap-1`)

> **Note:** Child components ([Label](/docs/components/label), [Input](/docs/components/input), [TextArea](/docs/components/textarea), [Description](/docs/components/description), [FieldError](/docs/components/field-error)) have their own CSS classes and styling. See their respective documentation for customization options.

### Interactive States

TextField automatically manages these data attributes based on its state:

- **Invalid**: `[data-invalid="true"]` or `[aria-invalid="true"]` - Automatically hides the description slot when invalid
- **Disabled**: `[data-disabled="true"]` - Applied when `isDisabled` is true
- **Focus Within**: `[data-focus-within="true"]` - Applied when any child input is focused
- **Focus Visible**: `[data-focus-visible="true"]` - Applied when focus is visible (keyboard navigation)

Additional attributes are available through render props (see TextFieldRenderProps below).

## API Reference

### TextField

TextField inherits all props from React Aria's [TextField](https://react-spectrum.adobe.com/react-aria/TextField.html) component.

#### Base Props

| Prop        | Type                                                                           | Default | Description                                                      |
| ----------- | ------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------- |
| `children`  | `React.ReactNode \| (values: TextFieldRenderProps) => React.ReactNode`         | -       | Child components (Label, Input, etc.) or render function.        |
| `className` | `string \| (values: TextFieldRenderProps) => string`                           | -       | CSS classes for styling, supports render props.                  |
| `style`     | `React.CSSProperties \| (values: TextFieldRenderProps) => React.CSSProperties` | -       | Inline styles, supports render props.                            |
| `fullWidth` | `boolean`                                                                      | `false` | Whether the text field should take full width of its container   |
| `id`        | `string`                                                                       | -       | The element's unique identifier.                                 |
| `render`    | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, TextFieldRenderProps>`   | -       | Overrides the default DOM element with a custom render function. |

#### Validation Props

| Prop                 | Type                                                              | Default    | Description                                                    |
| -------------------- | ----------------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| `isRequired`         | `boolean`                                                         | `false`    | Whether user input is required before form submission.         |
| `isInvalid`          | `boolean`                                                         | -          | Whether the value is invalid.                                  |
| `validate`           | `(value: string) => ValidationError \| true \| null \| undefined` | -          | Custom validation function.                                    |
| `validationBehavior` | `'native' \| 'aria'`                                              | `'native'` | Whether to use native HTML form validation or ARIA attributes. |
| `validationErrors`   | `string[]`                                                        | -          | Server-side validation errors.                                 |

#### Value Props

| Prop           | Type                      | Default | Description                            |
| -------------- | ------------------------- | ------- | -------------------------------------- |
| `value`        | `string`                  | -       | Current value (controlled).            |
| `defaultValue` | `string`                  | -       | Default value (uncontrolled).          |
| `onChange`     | `(value: string) => void` | -       | Handler called when the value changes. |

#### State Props

| Prop         | Type      | Default | Description                                        |
| ------------ | --------- | ------- | -------------------------------------------------- |
| `isDisabled` | `boolean` | -       | Whether the input is disabled.                     |
| `isReadOnly` | `boolean` | -       | Whether the input can be selected but not changed. |

#### Form Props

| Prop        | Type      | Default | Description                                          |
| ----------- | --------- | ------- | ---------------------------------------------------- |
| `name`      | `string`  | -       | Name of the input element, for HTML form submission. |
| `autoFocus` | `boolean` | -       | Whether the element should receive focus on render.  |

#### Accessibility Props

| Prop               | Type     | Default | Description                                           |
| ------------------ | -------- | ------- | ----------------------------------------------------- |
| `aria-label`       | `string` | -       | Accessibility label when no visible label is present. |
| `aria-labelledby`  | `string` | -       | ID of elements that label this field.                 |
| `aria-describedby` | `string` | -       | ID of elements that describe this field.              |
| `aria-details`     | `string` | -       | ID of elements with additional details.               |

### Composition Components

TextField works with these separate components that should be imported and used directly:

- **Label** - Field label component from `@heroui/react`
- **Input** - Single-line text input from `@heroui/react`
- **TextArea** - Multi-line text input from `@heroui/react`
- **Description** - Helper text component from `@heroui/react`
- **FieldError** - Validation error message from `@heroui/react`

Each of these components has its own props API. Use them directly within TextField for composition:

```tsx
<TextField isRequired isInvalid={hasError}>
    <Label>Email Address</Label>
    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
    <Description>We'll never share your email.</Description>
    <FieldError>Please enter a valid email address.</FieldError>
</TextField>
```

### Render Props

When using render props with `className`, `style`, or `children`, these values are available:

| Prop             | Type      | Description                                                                |
| ---------------- | --------- | -------------------------------------------------------------------------- |
| `isDisabled`     | `boolean` | Whether the field is disabled.                                             |
| `isInvalid`      | `boolean` | Whether the field is currently invalid.                                    |
| `isReadOnly`     | `boolean` | Whether the field is read-only.                                            |
| `isRequired`     | `boolean` | Whether the field is required.                                             |
| `isFocused`      | `boolean` | Whether the field is currently focused (DEPRECATED - use `isFocusWithin`). |
| `isFocusWithin`  | `boolean` | Whether any child element is focused.                                      |
| `isFocusVisible` | `boolean` | Whether focus is visible (keyboard navigation).                            |

## Related Showcases

## Related Components

## Related Components

- **Input**: Single-line text input built on React Aria
- **TextArea**: Multiline text input with focus management
- **Fieldset**: Group related form controls with legends

</page>

---

# checkbox Documentation (@heroui/react)

**URL:** https://heroui.com/docs/react/components/checkbox.mdx

---

<page url="/en/docs/react/components/checkbox">
# Checkbox

**Category**: react
**URL**: https://heroui.com/en/docs/react/components/checkbox
**Source**: https://raw.githubusercontent.com/heroui-inc/heroui/refs/heads/v3/apps/docs/content/docs/en/react/components/(forms)/checkbox.mdx

> Checkboxes allow users to select multiple items from a list of individual items, or to mark one individual item as selected.

## Usage

```tsx
import { Checkbox } from '@heroui/react';
```

```tsx
import { Checkbox } from '@heroui/react';

export function Basic() {
    return (
        <Checkbox name="basic-terms">
            <Checkbox.Content>
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                Accept terms and conditions
            </Checkbox.Content>
        </Checkbox>
    );
}
```

## Anatomy

```tsx
import { Checkbox, Description, FieldError } from '@heroui/react';

export default () => (
    <Checkbox>
        <Checkbox.Content>
            <Checkbox.Control>
                <Checkbox.Indicator />
            </Checkbox.Control>
            Label {/* plain text — the clickable label + accessible name */}
        </Checkbox.Content>
        <Description /> {/* Optional — field-level help text */}
        <FieldError /> {/* Optional — validation message */}
    </Checkbox>
);
```

## Examples

### Variants

The Checkbox component supports two visual variants:

- **`primary`** (default) - Standard styling with default background, suitable for most use cases
- **`secondary`** - Lower emphasis variant, suitable for use in Surface components

```tsx
import { Checkbox, Description } from '@heroui/react';

export function Variants() {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted">Primary variant</p>
                <Checkbox id="primary" name="primary" variant="primary">
                    <Checkbox.Content>
                        <Checkbox.Control>
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Primary checkbox
                    </Checkbox.Content>
                    <Description>Standard styling with default background</Description>
                </Checkbox>
            </div>
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted">Secondary variant</p>
                <Checkbox id="secondary" name="secondary" variant="secondary">
                    <Checkbox.Content>
                        <Checkbox.Control>
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Secondary checkbox
                    </Checkbox.Content>
                    <Description>Lower emphasis variant for use in surfaces</Description>
                </Checkbox>
            </div>
        </div>
    );
}
```

### Full Rounded

```tsx
import { Checkbox, Label } from '@heroui/react';

export function FullRounded() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
                <Label className="text-muted">Rounded checkboxes</Label>
                <Checkbox
                    className="[&_[data-slot='checkbox-default-indicator--checkmark']]:size-2"
                    name="small-rounded"
                >
                    <Checkbox.Content>
                        <Checkbox.Control className="size-3 rounded-full before:rounded-full">
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Small size
                    </Checkbox.Content>
                </Checkbox>
            </div>
            <div className="flex flex-col gap-3">
                <Checkbox name="default-rounded">
                    <Checkbox.Content>
                        <Checkbox.Control className="size-4 rounded-full before:rounded-full">
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Default size
                    </Checkbox.Content>
                </Checkbox>
            </div>
            <div className="flex flex-col gap-3">
                <Checkbox name="large-rounded">
                    <Checkbox.Content>
                        <Checkbox.Control className="size-5 rounded-full before:rounded-full">
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Large size
                    </Checkbox.Content>
                </Checkbox>
            </div>
            <div className="flex flex-col gap-3">
                <Checkbox
                    className="[&_[data-slot='checkbox-default-indicator--checkmark']]:size-4"
                    name="xl-rounded"
                >
                    <Checkbox.Content>
                        <Checkbox.Control className="size-6 rounded-full before:rounded-full">
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Extra large size
                    </Checkbox.Content>
                </Checkbox>
            </div>
        </div>
    );
}
```

### Disabled

```tsx
import { Checkbox, Description } from '@heroui/react';

export function Disabled() {
    return (
        <Checkbox isDisabled id="feature">
            <Checkbox.Content>
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                Premium Feature
            </Checkbox.Content>
            <Description>This feature is coming soon</Description>
        </Checkbox>
    );
}
```

### External Label

```tsx
import { Checkbox, Label } from '@heroui/react';

export function ExternalLabel() {
    return (
        <div className="flex items-center gap-3">
            <Checkbox id="label-marketing">
                <Checkbox.Content>
                    <Checkbox.Control>
                        <Checkbox.Indicator />
                    </Checkbox.Control>
                </Checkbox.Content>
            </Checkbox>
            <Label htmlFor="label-marketing">Send me marketing emails</Label>
        </div>
    );
}
```

### With Description

```tsx
import { Checkbox, Description } from '@heroui/react';

export function WithDescription() {
    return (
        <Checkbox name="description-notifications">
            <Checkbox.Content>
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                Email notifications
            </Checkbox.Content>
            <Description>Get notified when someone mentions you in a comment</Description>
        </Checkbox>
    );
}
```

### Default Selected

```tsx
import { Checkbox } from '@heroui/react';

export function DefaultSelected() {
    return (
        <Checkbox defaultSelected id="default-notifications">
            <Checkbox.Content>
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                Enable email notifications
            </Checkbox.Content>
        </Checkbox>
    );
}
```

### Invalid

```tsx
import { Checkbox, FieldError } from '@heroui/react';

export function Invalid() {
    return (
        <Checkbox isInvalid isRequired name="agreement">
            <Checkbox.Content>
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                I agree to the terms
            </Checkbox.Content>
            <FieldError>You must accept the terms to continue</FieldError>
        </Checkbox>
    );
}
```

### Controlled

```tsx
'use client';

import { Checkbox } from '@heroui/react';
import { useState } from 'react';

export function Controlled() {
    const [isSelected, setIsSelected] = useState(true);

    return (
        <div className="flex flex-col gap-3">
            <Checkbox id="email-notifications" isSelected={isSelected} onChange={setIsSelected}>
                <Checkbox.Content>
                    <Checkbox.Control>
                        <Checkbox.Indicator />
                    </Checkbox.Control>
                    Email notifications
                </Checkbox.Content>
            </Checkbox>
            <p className="text-sm text-muted">
                Status: <span className="font-medium">{isSelected ? 'Enabled' : 'Disabled'}</span>
            </p>
        </div>
    );
}
```

### Indeterminate

```tsx
'use client';

import { Checkbox, Description } from '@heroui/react';
import { useState } from 'react';

export function Indeterminate() {
    const [isIndeterminate, setIsIndeterminate] = useState(true);
    const [isSelected, setIsSelected] = useState(false);

    return (
        <Checkbox
            id="select-all"
            isIndeterminate={isIndeterminate}
            isSelected={isSelected}
            onChange={(selected: boolean) => {
                setIsSelected(selected);
                setIsIndeterminate(false);
            }}
        >
            <Checkbox.Content>
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                Select all
            </Checkbox.Content>
            <Description>Shows indeterminate state (dash icon)</Description>
        </Checkbox>
    );
}
```

### Form Integration

```tsx
'use client';

import { Button, Checkbox } from '@heroui/react';
import React from 'react';

export function Form() {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);

        alert(
            `Form submitted with:\n${Array.from(formData.entries())
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')}`,
        );
    };

    return (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3">
                <Checkbox name="notifications" value="on">
                    <Checkbox.Content>
                        <Checkbox.Control>
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Enable notifications
                    </Checkbox.Content>
                </Checkbox>
                <Checkbox defaultSelected name="newsletter" value="on">
                    <Checkbox.Content>
                        <Checkbox.Control>
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Subscribe to newsletter
                    </Checkbox.Content>
                </Checkbox>
                <Checkbox name="marketing" value="on">
                    <Checkbox.Content>
                        <Checkbox.Control>
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        Receive marketing updates
                    </Checkbox.Content>
                </Checkbox>
            </div>
            <Button className="mt-4" size="sm" type="submit" variant="primary">
                Submit
            </Button>
        </form>
    );
}
```

### Render Props

```tsx
'use client';

import { Checkbox, Description } from '@heroui/react';

export function RenderProps() {
    return (
        <Checkbox id="render-props-terms">
            {({ isSelected }) => (
                <>
                    <Checkbox.Content>
                        <Checkbox.Control>
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                        {isSelected ? 'Terms accepted' : 'Accept terms'}
                    </Checkbox.Content>
                    <Description>
                        {isSelected
                            ? 'Thank you for accepting'
                            : 'Please read and accept the terms'}
                    </Description>
                </>
            )}
        </Checkbox>
    );
}
```

### Render Function

```tsx
'use client';

import { Checkbox } from '@heroui/react';

export function RenderFunction() {
    return (
        <Checkbox render={(props) => <div {...props} data-custom="bar" />}>
            <Checkbox.Content>
                <Checkbox.Control>
                    <Checkbox.Indicator />
                </Checkbox.Control>
                Accept terms and conditions
            </Checkbox.Content>
        </Checkbox>
    );
}
```

### Custom Indicator

```tsx
'use client';

import { Checkbox } from '@heroui/react';

export function CustomIndicator() {
    return (
        <div className="flex gap-4">
            <Checkbox defaultSelected name="heart">
                <Checkbox.Content>
                    <Checkbox.Control>
                        <Checkbox.Indicator>
                            {({ isSelected }) =>
                                isSelected ? (
                                    <svg fill="currentColor" viewBox="0 0 24 24">
                                        <path
                                            d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24a5.53 5.53 0 0 1 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                ) : null
                            }
                        </Checkbox.Indicator>
                    </Checkbox.Control>
                    Heart
                </Checkbox.Content>
            </Checkbox>
            <Checkbox defaultSelected name="plus">
                <Checkbox.Content>
                    <Checkbox.Control>
                        <Checkbox.Indicator>
                            {({ isSelected }) =>
                                isSelected ? (
                                    <svg fill="none" viewBox="0 0 24 24">
                                        <path
                                            d="M6 12H18"
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="3"
                                        />
                                        <path
                                            d="M12 18V6"
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="3"
                                        />
                                    </svg>
                                ) : null
                            }
                        </Checkbox.Indicator>
                    </Checkbox.Control>
                    Plus
                </Checkbox.Content>
            </Checkbox>
            <Checkbox isIndeterminate name="indeterminate">
                <Checkbox.Content>
                    <Checkbox.Control>
                        <Checkbox.Indicator>
                            {({ isIndeterminate }) =>
                                isIndeterminate ? (
                                    <svg stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                        <line x1="21" x2="3" y1="12" y2="12" />
                                    </svg>
                                ) : null
                            }
                        </Checkbox.Indicator>
                    </Checkbox.Control>
                    Indeterminate
                </Checkbox.Content>
            </Checkbox>
        </div>
    );
}
```

## Customization

### Tailwind CSS

```tsx
import { Checkbox } from '@heroui/react';

export function CustomStyles() {
    return (
        <Checkbox id="custom">
            <Checkbox.Content>
                <Checkbox.Control className="bg-success-soft before:bg-success">
                    <Checkbox.Indicator className="**:data-[slot=checkbox-default-indicator--checkmark]:text-success-foreground" />
                </Checkbox.Control>
                Custom styled checkbox
            </Checkbox.Content>
        </Checkbox>
    );
}
```

### Global CSS

To customize the Checkbox component classes, you can use the `@layer components` directive.
[Learn more](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

```css
@layer components {
    .checkbox {
        @apply inline-flex gap-3 items-center;
    }

    .checkbox__control {
        @apply size-5 border-2 border-gray-400 rounded data-[selected=true]:bg-blue-500 data-[selected=true]:border-blue-500;

        /* Animated background indicator */
        &::before {
            @apply bg-accent pointer-events-none absolute inset-0 z-0 origin-center scale-50 rounded-md opacity-0 content-[''];

            transition:
                scale 200ms linear,
                opacity 200ms linear,
                background-color 200ms ease-out;
        }

        /* Show indicator when selected */
        &[data-selected='true']::before {
            @apply scale-100 opacity-100;
        }
    }

    .checkbox__indicator {
        @apply text-white;
    }

    .checkbox__content {
        @apply items-center gap-3;
    }
}
```

## Styling Reference

HeroUI follows the [BEM](https://getbem.com/) methodology to ensure component variants and states are reusable and easy to customize.

### CSS Classes

The Checkbox component uses these CSS classes ([View source styles](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/checkbox.css)):

#### Base Classes \[!toc]

- `.checkbox` - Base checkbox container (the field)
- `.checkbox__content` - Clickable label wrapping the control and label text
- `.checkbox__control` - Checkbox control box
- `.checkbox__indicator` - Checkbox checkmark indicator

### Interactive States

The checkbox supports both CSS pseudo-classes and data attributes for flexibility:

- **Selected**: `[data-selected="true"]` or `[aria-checked="true"]` (shows checkmark and background color change)
- **Indeterminate**: `[data-indeterminate="true"]` (shows indeterminate state with dash)
- **Invalid**: `[data-invalid="true"]` or `[aria-invalid="true"]` (shows error state with danger colors)
- **Hover**: `:hover` or `[data-hovered="true"]` on `Checkbox.Control` (button)
- **Focus**: `:focus-visible` or `[data-focus-visible="true"]` on the button (shows focus ring on control)
- **Disabled**: `[data-disabled="true"]` on the field (reduced opacity, including help text)
- **Pressed**: `:active` or `[data-pressed="true"]`

## API Reference

### Checkbox

Inherits from [React Aria CheckboxField](https://react-spectrum.adobe.com/react-aria/Checkbox.html).

| Prop                 | Type                                                                             | Default     | Description                                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isSelected`         | `boolean`                                                                        | `false`     | Whether the checkbox is checked                                                                                                                                    |
| `defaultSelected`    | `boolean`                                                                        | `false`     | Whether the checkbox is checked by default (uncontrolled)                                                                                                          |
| `isIndeterminate`    | `boolean`                                                                        | `false`     | Whether the checkbox is in an indeterminate state                                                                                                                  |
| `isDisabled`         | `boolean`                                                                        | `false`     | Whether the checkbox is disabled                                                                                                                                   |
| `isInvalid`          | `boolean`                                                                        | `false`     | Whether the checkbox is invalid                                                                                                                                    |
| `isReadOnly`         | `boolean`                                                                        | `false`     | Whether the checkbox is read only                                                                                                                                  |
| `isRequired`         | `boolean`                                                                        | `false`     | Whether the checkbox must be selected                                                                                                                              |
| `validate`           | `(value: boolean) => ValidationError \| true \| null \| undefined`               | -           | Custom validation function                                                                                                                                         |
| `validationBehavior` | `'native' \| 'aria'`                                                             | `'native'`  | Whether to use native HTML form validation or ARIA                                                                                                                 |
| `variant`            | `"primary" \| "secondary"`                                                       | `"primary"` | Visual variant of the component. `primary` is the default style with shadow. `secondary` is a lower emphasis variant without shadow, suitable for use in surfaces. |
| `name`               | `string`                                                                         | -           | The name of the input element, used when submitting an HTML form                                                                                                   |
| `value`              | `string`                                                                         | -           | The value of the input element, used when submitting an HTML form                                                                                                  |
| `onChange`           | `(isSelected: boolean) => void`                                                  | -           | Handler called when the checkbox value changes                                                                                                                     |
| `children`           | `React.ReactNode \| (values: CheckboxFieldRenderProps) => React.ReactNode`       | -           | Checkbox content or field render prop                                                                                                                              |
| `render`             | `DOMRenderFunction<keyof React.JSX.IntrinsicElements, CheckboxFieldRenderProps>` | -           | Overrides the default DOM element with a custom render function.                                                                                                   |

### Checkbox.Content

The clickable `<label>` that wraps the control and label text. Put `Checkbox.Control` and the `Label` inside it; keep `Description`/`FieldError` as siblings of `Checkbox.Content`. For a checkbox with no label, omit the `Label` and pass an `aria-label` on `Checkbox`.

| Prop        | Type                                                                        | Default | Description                                               |
| ----------- | --------------------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| `children`  | `React.ReactNode \| (values: CheckboxButtonRenderProps) => React.ReactNode` | -       | Button content (control + label), or a button render prop |
| `className` | `string \| (values: CheckboxButtonRenderProps) => string`                   | -       | Classes applied to the clickable label                    |

### CheckboxFieldRenderProps

When using a render prop on the root `Checkbox`, these field-level values are provided:

| Prop              | Type      | Description                                       |
| ----------------- | --------- | ------------------------------------------------- |
| `isSelected`      | `boolean` | Whether the checkbox is currently checked         |
| `isIndeterminate` | `boolean` | Whether the checkbox is in an indeterminate state |
| `isDisabled`      | `boolean` | Whether the checkbox is disabled                  |
| `isReadOnly`      | `boolean` | Whether the checkbox is read only                 |
| `isInvalid`       | `boolean` | Whether the checkbox is invalid                   |
| `isRequired`      | `boolean` | Whether the checkbox is required                  |

### CheckboxButtonRenderProps

`Checkbox.Control` and `Checkbox.Indicator` use button-level render props (`isHovered`, `isPressed`, `isFocusVisible`, etc.). Pass a function as `Checkbox.Control` children or to `Checkbox.Indicator` to access them.

## Related Components

## Related Components

- **Label**: Accessible label for form controls
- **CheckboxGroup**: Group of checkboxes with shared state
- **Description**: Helper text for form fields

</page>