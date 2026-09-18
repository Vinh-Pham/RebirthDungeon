import Phaser from 'phaser';
import Button from 'phaser4-rex-plugins/plugins/button.js';
import Anchor from 'phaser4-rex-plugins/plugins/anchor.js';
import type { Immutable } from 'immer';
import type { Character } from '../domain/model';
import { skills, skillRank } from '../domain/skillCatalog';
import { learned, usableReason } from '../domain/skillSystem';
import { attackDamage, combination } from '../domain/dice';
import { send, getSave, busy, workflowPhase } from '../runtime/game';
export interface ControlBounds {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export function battleView(
    scene: Phaser.Scene,
    c: Immutable<Character>,
    selected: string,
    select: (id: string) => void,
): ControlBounds[] {
    const w = scene.scale.width,
        h = scene.scale.height,
        b = c.battle!,
        phase = getSave().checkpoint.phase;
    const bounds: ControlBounds[] = [];
    function button(
        name: string,
        x: number,
        y: number,
        width: number,
        label: string,
        callback: () => void,
        enabled = true,
        highlight = false,
    ) {
        const container = scene.add.container(x, y).setDepth(10000);
        const box = scene.add
            .rectangle(0, 0, width, 44, highlight ? 0xb9d79a : 0x29463f)
            .setStrokeStyle(1, highlight ? 0xd1e8af : 0x638578)
            .setOrigin(0.5);
        const text = scene.add
            .text(0, 0, label, {
                fontFamily: 'Arial',
                fontSize: '12px',
                wordWrap: { width: width - 10 },
                color: highlight ? '#203a2b' : '#e1ece2',
                align: 'center',
            })
            .setOrigin(0.5);
        container
            .add([box, text])
            .setSize(width, 44)
            .setAlpha(enabled && !busy() ? 1 : 0.5);
        new Button(container, { mode: 'release', threshold: 8 }).on('click', () => {
            if (enabled && !busy()) callback();
        });
        bounds.push({ name, x, y, width, height: 44 });
        return container;
    }
    const target =
        b.enemies.find(
            (e) => e.id === (phase === 'choosingDice' ? b.target : selected) && e.hp > 0,
        ) || b.enemies.find((e) => e.hp > 0);
    if (phase === 'reward') return bounds;
    b.enemies.forEach((e, i) => {
        const x = (w * (i + 1)) / (b.enemies.length + 1);
        button(
            `target-${e.id}`,
            x,
            h * 0.49,
            Math.min(200, w / 4),
            `${e.name} · ${e.hp}/${e.maxHp}`,
            () => select(e.id),
            !!e.hp && phase === 'selecting',
            target?.id === e.id,
        );
    });
    const panelWidth = Math.min(880, w - 32),
        panelHeight = 340,
        top = h - panelHeight - 20;
    const panel = scene.add
        .rectangle(w / 2, top + panelHeight / 2, panelWidth, panelHeight, 0x172c2b, 0.97)
        .setStrokeStyle(1, 0x7b9c75, 0.6)
        .setDepth(9000);
    new Anchor(panel, { centerX: '50%', bottom: '100%-20' });
    const workflow = workflowPhase();
    const status =
        workflow === 'rolling'
            ? 'Rolling the dice…'
            : workflow === 'resolvingPlayer'
              ? 'Your attack…'
              : workflow === 'resolvingEnemies'
                ? 'Enemy response…'
                : null;
    const title =
        status ||
        (phase === 'choosingDice'
            ? `${combination(b.dice).name} · ×${combination(b.dice).multiplier}`
            : 'Choose a skill');
    scene.add
        .text(w / 2, top + 20, title, { fontFamily: 'Georgia', fontSize: '23px', color: '#e9eedb' })
        .setOrigin(0.5, 0)
        .setDepth(10000);
    if (phase === 'selecting') {
        const list = [
            ...Object.keys(learned(c)).filter((id) => skills[id].type === 'active'),
            'recover',
            'pass',
        ];
        const columns = w < 650 ? 3 : 4,
            width = (panelWidth - 40) / columns - 8;
        list.forEach((id, i) => {
            const rank = skills[id] && skillRank(id, learned(c)[id]);
            const reason = skills[id] ? usableReason(c, id) : '';
            button(
                id,
                w / 2 - panelWidth / 2 + 24 + width / 2 + (i % columns) * (width + 8),
                top + 100 + Math.floor(i / columns) * 52,
                width,
                id === 'recover'
                    ? 'Recover +10 MP / +20 SP'
                    : id === 'pass'
                      ? 'Pass'
                      : `${skills[id].name} ${id === 'normal' ? '' : rank.rank} · ${rank.costs[skills[id].resource]} ${skills[id].resource === 'mana' ? 'MP' : 'SP'}${reason ? '\n' + reason : ''}`,
                () =>
                    id === 'recover'
                        ? send({ type: 'RECOVER' })
                        : id === 'pass'
                          ? send({ type: 'PASS', actionId: b.action?.id })
                          : send({ type: 'ROLL', skill: id, target: target!.id }),
                !reason,
                id !== 'recover' && id !== 'pass',
            );
        });
        scene.add
            .text(
                w / 2,
                top + 60,
                'Select a target and skill. Five dice, two rerolls, one action.',
                { fontSize: '12px', color: '#b9c9be' },
            )
            .setOrigin(0.5)
            .setDepth(10000);
    } else {
        b.dice.forEach((die, i) => {
            const x = w / 2 + (i - 2) * Math.min(88, (panelWidth - 40) / 5);
            const container = button(
                `die-${i}`,
                x,
                top + 91,
                64,
                ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][die],
                () => send({ type: 'HOLD', index: i, actionId: b.action?.id }),
                true,
                b.held[i],
            );
            (container.list[1] as Phaser.GameObjects.Text).setFontSize(48);
            scene.add
                .text(x, top + 118, b.held[i] ? 'HELD' : 'HOLD', {
                    fontSize: '9px',
                    color: '#a3c3ae',
                })
                .setOrigin(0.5)
                .setDepth(10000);
        });
        button(
            'reroll',
            w / 2 - 120,
            top + 156,
            210,
            `Reroll · ${b.rerolls} remaining`,
            () => send({ type: 'REROLL', actionId: b.action?.id }),
            b.rerolls > 0 && !b.held.every(Boolean),
        );
        button(
            'attack',
            w / 2 + 120,
            top + 156,
            210,
            skills[b.skill].effect === 'attack'
                ? `Attack · ${target ? attackDamage(c, target, b.skill, b.dice) : 0} damage`
                : `Use ${skills[b.skill].name}`,
            () => send({ type: 'ATTACK', actionId: b.action?.id }),
            true,
            true,
        );
    }
    if (phase === 'choosingDice') {
        const a = b.action!;
        button('pass', w / 2, top + 220, 210, 'Pass · spend reserved cost', () =>
            send({ type: 'PASS', actionId: b.action?.id }),
        );
        const preview =
            skills[b.skill].effect === 'attack' && target
                ? ` · Critical ${a.criticalChance / 100}%: ${attackDamage(c, target, b.skill, b.dice, true)} damage`
                : '';
        scene.add
            .text(
                w / 2,
                top + 185,
                `Reserved: ${a.costs.stamina} SP / ${a.costs.mana} MP${preview}`,
                { fontSize: '12px', color: '#b9c9be' },
            )
            .setOrigin(0.5)
            .setDepth(10000);
        scene.add
            .text(
                w / 2,
                top + 254,
                `Rank ${a.rank.rank} · Faces 1–6: ${a.rank.weights.map((n) => ((100 * n) / a.rank.weights.reduce((x, y) => x + y, 0)).toFixed(1) + '%').join(' / ')}`,
                { fontSize: '11px', color: '#b9c9be' },
            )
            .setOrigin(0.5)
            .setDepth(10000);
    }
    scene.add
        .text(
            w / 2,
            top + 282,
            [
                c.effects.counter ? 'Counterattack: 1 charge' : '',
                c.effects.final
                    ? `Final Hit +${c.effects.final.magnitude} · ${c.effects.final.remaining} activations`
                    : '',
            ]
                .filter(Boolean)
                .join(' · '),
            { fontSize: '12px', color: '#d1e8af' },
        )
        .setOrigin(0.5)
        .setDepth(10000);
    scene.add
        .text(w / 2, top + 313, b.log.slice(-2).join('  ·  '), {
            fontSize: '11px',
            color: '#a6bfb2',
            wordWrap: { width: panelWidth - 40 },
            align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(10000);
    return bounds;
}
export function treasureView(scene: Phaser.Scene): ControlBounds[] {
    const w = scene.scale.width,
        h = scene.scale.height;
    return Array.from({ length: 5 }, (_, i) => {
        const x = (w * (i + 1)) / 6,
            y = h * 0.56;
        const text = scene.add
            .text(x, y, `OPEN CHEST ${i + 1}`, {
                fontFamily: 'Arial',
                fontSize: '13px',
                color: '#e8eecf',
                backgroundColor: '#28453e',
                padding: { x: 12, y: 14 },
            })
            .setOrigin(0.5);
        new Button(text, { mode: 'release', threshold: 8 }).on('click', () => {
            if (!busy()) send({ type: 'CHEST', index: i });
        });
        return { name: `chest-${i}`, x, y, width: text.width, height: text.height };
    });
}
