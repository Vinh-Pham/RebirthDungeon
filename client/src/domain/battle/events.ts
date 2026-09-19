import type { Battle } from '../model';
export type BattleEventType =
    | 'action'
    | 'item'
    | 'damage'
    | 'healed'
    | 'resource'
    | 'statusApplied'
    | 'statusExpired'
    | 'counter'
    | 'defeated'
    | 'turnStart'
    | 'turnEnd'
    | 'battleEnd';
export interface BattleEvent {
    id: string;
    battleId: string;
    turnId: string;
    operationId: string;
    sequence: number;
    type: BattleEventType;
    actorId: string;
    text: string;
    targetId?: string;
    amount?: number;
    critical?: boolean;
    hitIndex?: number;
}
export function emit(
    b: Battle,
    operationId: string,
    event: Omit<BattleEvent, 'id' | 'battleId' | 'turnId' | 'operationId' | 'sequence'>,
    turnId = b.turnId,
) {
    const sequence = ++b.eventSequence;
    b.events.push({
        ...event,
        id: `${b.id}:${sequence}`,
        battleId: b.id,
        turnId,
        operationId,
        sequence,
    });
    b.events = b.events.slice(-100);
    b.log.push(event.text);
    b.log = b.log.slice(-20);
}