import { Meter } from '@heroui/react';

const resourceFills: Record<string, string> = {
    hp: 'bg-[linear-gradient(#ce6198,#943f72)]',
    mana: 'bg-[linear-gradient(#7882c9,#465caa)]',
    stamina: 'bg-[linear-gradient(#dfc066,#af8d32)]',
};
export function ResourceMeter({
    label,
    value,
    max,
    kind,
    empty = false,
}: {
    label: string;
    value: number;
    max: number;
    kind: string;
    empty?: boolean;
}) {
    return (
        <Meter
            aria-label={label}
            value={value}
            minValue={0}
            maxValue={max || 1}
            className="resource-meter"
        >
            <Meter.Track className="bar">
                <Meter.Fill
                    className={`absolute inset-y-0 rounded-none ${resourceFills[kind] ?? ''}`}
                />
                <span>
                    {label} {empty ? '—' : `${Math.ceil(value)} / ${max}`}
                </span>
            </Meter.Track>
        </Meter>
    );
}
