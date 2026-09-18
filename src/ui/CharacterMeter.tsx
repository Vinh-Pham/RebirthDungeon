import { ProgressBar } from '@heroui/react';

export function CharacterMeter({
    label,
    value,
    maximum,
    output,
    reserved = 0,
}: {
    label: string;
    value: number;
    maximum: number;
    output?: string;
    reserved?: number;
}) {
    return (
        <ProgressBar
            data-resource={label === 'Stamina' ? 'SP' : label}
            aria-label={label}
            value={value}
            maxValue={maximum || 1}
            size="sm"
            valueLabel={output ?? `${value} of ${maximum}, ${reserved} reserved`}
        >
            <span className="text-xs text-muted">{label}</span>
            <ProgressBar.Output className="text-xs text-foreground tabular-nums">
                {output ?? `${Math.ceil(value)} / ${maximum}`}
            </ProgressBar.Output>
            <ProgressBar.Track>
                <ProgressBar.Fill />
            </ProgressBar.Track>
        </ProgressBar>
    );
}
