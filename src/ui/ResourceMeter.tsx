import { ProgressBar } from '@heroui/react';
export function ResourceMeter({
    label,
    value,
    max,
    empty = false,
    reserved = 0,
}: {
    label: string;
    value: number;
    max: number;
    empty?: boolean;
    reserved?: number;
}) {
    return (
        <ProgressBar
            data-resource={label}
            aria-label={`${label}${reserved ? `, ${reserved} reserved` : ''}`}
            value={value}
            minValue={0}
            maxValue={max || 1}
            size="sm"
            className="grid [grid-template-areas:'label_track_output'] grid-cols-[18px_minmax(0,1fr)_60px] items-center gap-2 text-[10px] leading-none tabular-nums narrow:grid-cols-[1fr_auto] narrow:[grid-template-areas:'label_output'_'track_track'] narrow:gap-x-1 narrow:gap-y-0.5"
            valueLabel={
                empty
                    ? 'No character selected'
                    : `${Math.ceil(value)} of ${max}${reserved ? `, ${reserved} held` : ''}`
            }
        >
            <span className="text-muted [grid-area:label]">{label}</span>
            <ProgressBar.Track>
                <ProgressBar.Fill />
            </ProgressBar.Track>
            <ProgressBar.Output className="text-right text-[10px] leading-none text-muted">
                {empty ? '—' : `${Math.ceil(value)} / ${max}`}
            </ProgressBar.Output>
        </ProgressBar>
    );
}
