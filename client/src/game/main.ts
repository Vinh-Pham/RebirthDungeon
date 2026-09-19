import { getBattleTarget, onBattleTarget } from './battleTarget';
import Phaser from 'phaser';
import { treasureView, type ControlBounds } from './battleView';
import Button from 'phaser4-rex-plugins/plugins/button.js';
import Anchor from 'phaser4-rex-plugins/plugins/anchor.js';
import FadeOutDestroy from 'phaser4-rex-plugins/plugins/fade-out-destroy.js';
import SoundFade from 'phaser4-rex-plugins/plugins/soundfade.js';
import EightDirection from 'phaser4-rex-plugins/plugins/eightdirection.js';
import ShakePosition from 'phaser4-rex-plugins/plugins/shakeposition.js';
import {
    getSave,
    getCharacter,
    subscribe,
    send,
    openService,
    busy,
    workflowPhase,
    requestDungeonExit,
} from '../runtime/game';
import { locations, townGrid } from './world';
import { skills } from '../domain/Skills';
import {
    findPath,
    dungeonGrid,
    dungeonGates,
    pendingEncounter,
    bossUnlocked,
} from '../domain/dungeon';
import { canvasBlocked, worldKeysBlocked, onOwnershipChange } from './inputState';
class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }
    create() {
        this.scene.start('Preloader');
    }
}
class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }
    preload() {
        this.load.svg('goddess-statue', 'assets/game/goddess-statue.svg');
        for (const [id, skill] of Object.entries(skills))
            if (skill.type === 'active' && skill.icon.startsWith('/'))
                this.load.image(`skill:${id}`, skill.icon);
        for (const key of ['town', 'human', 'elf', 'giant', 'spider', 'redspider', 'boss', 'chest'])
            this.load.svg(key, `assets/game/${key}.svg`);
        for (const key of ['town', 'dungeon', 'battle', 'hit'])
            this.load.audio(key, `assets/game/${key}.wav`);
    }
    create() {
        this.scene.start(getSave().checkpoint.screen);
    }
}
class World extends Phaser.Scene {
    player!: Phaser.GameObjects.Image;
    statue?: Phaser.GameObjects.Image;
    movement?: EightDirection;
    grid: number[][] = [];
    path: { x: number; y: number }[] = [];
    keys!: Record<string, Phaser.Input.Keyboard.Key>;
    lastEnemyHealth = 0;
    lastEvent = 0;
    controls: ControlBounds[] = [];
    screen = '';
    signature = '';
    unsubscribe?: () => void;
    unsubscribeOwnership?: () => void;
    lastSave = 0;
    markers: Phaser.GameObjects.GameObject[] = [];
    constructor(key: string) {
        super(key);
    }

    create() {
        this.screen = '';
        this.lastEvent = getCharacter()?.battle?.eventSequence ?? 0;
        this.keys = this.input.keyboard!.addKeys(
            'W,A,S,D,UP,DOWN,LEFT,RIGHT,E',
            false,
        ) as typeof this.keys;
        this.input.keyboard!.on('keydown-E', () => this.interact());
        this.unsubscribe = subscribe(() => this.sync());
        const unsubscribeTarget = onBattleTarget(() => this.sync(true));
        this.unsubscribeOwnership = onOwnershipChange(() => {
            // Input ownership moved between the game, windows, the HUD, or a gesture:
            // drop held keys and any click path so nothing keeps walking underneath.
            this.input.keyboard?.resetKeys();
            this.path = [];
        });
        this.events.once('shutdown', () => {
            this.unsubscribe?.();
            unsubscribeTarget();
            this.unsubscribeOwnership?.();
            this.input.removeAllListeners();
            this.input.keyboard?.removeAllListeners();
        });
        this.sync();
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (canvasBlocked() || busy() || !['Town1', 'Alby'].includes(this.screen)) return;
            this.path = findPath(
                this.grid,
                { x: Math.floor(this.player.x / 32), y: Math.floor(this.player.y / 32) },
                { x: Math.floor(p.worldX / 32), y: Math.floor(p.worldY / 32) },
            ).map((v) => ({ x: v.x * 32 + 16, y: v.y * 32 + 16 }));
        });
        const resize = () => this.sync(true);
        this.scale.on('resize', resize);
        this.events.once('shutdown', () => this.scale.off('resize', resize));
        if (import.meta.env.MODE === 'e2e')
            Object.defineProperty(window, '__GAME__', {
                configurable: true,
                get: () => ({
                    save: JSON.parse(JSON.stringify(getSave())),
                    position: { x: this.player?.x, y: this.player?.y },
                    camera: { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY },
                    controls: this.controls,
                    gates: getCharacter() ? dungeonGates(getCharacter()!) : [],
                    locations,
                }),
            });
    }
    sync(force = false) {
        const save = getSave(),
            c = getCharacter(),
            screen = save.checkpoint.screen;
        if (screen !== this.sys.settings.key) {
            this.scene.start(screen);
            return;
        }
        for (const key of ['town', 'dungeon', 'battle'])
            for (const sound of this.sound.getAll(key))
                (sound as Phaser.Sound.WebAudioSound).setVolume(save.data.settings.music);
        const signature = JSON.stringify([
            c?.battle,
            save.checkpoint.phase,
            screen === 'Battle' ? workflowPhase() : null,
            c?.run?.cleared,
        ]);
        if (screen === this.screen && !force && signature === this.signature) return;
        const previousPosition =
            screen === this.screen && this.player?.active
                ? { x: this.player.x, y: this.player.y }
                : null;
        this.signature = signature;
        this.screen = screen;
        const enemyHealth = c?.battle?.enemies.reduce((sum, e) => sum + e.hp, 0) || 0;
        const hits =
            c?.battle?.events.filter(
                (e) => e.sequence > this.lastEvent && (e.type === 'damage' || e.type === 'counter'),
            ) ?? [];
        const wasHit = hits.length > 0 && screen === 'Battle';
        this.lastEvent = c?.battle?.eventSequence ?? 0;
        this.lastEnemyHealth = enemyHealth;
        if (wasHit && this.cache.audio.exists('hit'))
            this.sound.play('hit', { volume: save.data.settings.effects });
        this.children.removeAll(true);
        this.statue = undefined;
        this.path = [];
        this.markers = [];
        this.controls = [];
        this.cameras.main.stopFollow();
        this.cameras.main.setScroll(0, 0);
        const w = this.scale.width,
            h = this.scale.height;
        if (['Title', 'CharacterSelect', 'NewCharacter', 'Town1'].includes(screen)) {
            this.add.image(800, 500, 'town');
            this.grid = townGrid();
            this.cameras.main.setBounds(0, 0, 1600, 1024);
            for (const l of locations) {
                const label = this.add
                    .text(l.x, l.y, l.name, {
                        fontFamily: 'Georgia',
                        fontSize: '16px',
                        color: '#fff5ce',
                        backgroundColor: '#24392cd9',
                        padding: { x: 10, y: 6 },
                    })
                    .setOrigin(0.5);
                new Button(label).on('click', () => {
                    if (
                        this.screen === 'Town1' &&
                        !canvasBlocked() &&
                        Phaser.Math.Distance.Between(this.player.x, this.player.y, l.x, l.y) < 170
                    ) {
                        if (l.id === 'Alby')
                            send({
                                type: 'ENTER',
                                seed: crypto.getRandomValues(new Uint32Array(1))[0],
                            });
                        else openService(l.id);
                    }
                });
            }
            this.cameras.main.setZoom(1);
            this.player = this.add
                .image(760, 600, c?.race.toLowerCase() || 'human')
                .setDisplaySize(40, 50);
            if (screen === 'Town1') this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            else this.cameras.main.setZoom(Math.max(w / 1600, h / 1000));
        } else if (screen === 'Alby' && c?.run) {
            this.cameras.main.setZoom(1);
            this.grid = dungeonGrid(c);
            const g = this.add.graphics();
            for (let y = 0; y < this.grid.length; y++)
                for (let x = 0; x < this.grid[y].length; x++) {
                    g.fillStyle(c.run.tiles[y][x] ? ((x + y) % 2 ? 0x333d43 : 0x39454b) : 0x131d24);
                    g.fillRect(x * 32, y * 32, 31, 31);
                }
            for (const gate of dungeonGates(c)) {
                const x = gate.x * 32,
                    y = gate.y * 32;
                g.lineStyle(gate.closed ? 4 : 2, gate.closed ? 0xd9a565 : 0x86b795, 1);
                if (gate.closed) {
                    for (const offset of [5, 16, 27])
                        g.lineBetween(
                            x + (gate.vertical ? 8 : offset),
                            y + (gate.vertical ? offset : 8),
                            x + (gate.vertical ? 24 : offset),
                            y + (gate.vertical ? offset : 24),
                        );
                } else {
                    g.lineBetween(x + 3, y + 3, x + 8, y + 8);
                    g.lineBetween(x + 24, y + 24, x + 29, y + 29);
                }
            }
            for (const r of c.run.rooms) {
                if (r.kind === 'entry') {
                    this.statue = this.add
                        .image(r.x * 32 - 64, r.y * 32 + 16, 'goddess-statue')
                        .setDisplaySize(64, 90)
                        .setInteractive({ useHandCursor: true });
                    new Button(this.statue).on('click', () => {
                        if (!canvasBlocked() && !busy()) this.useStatue();
                    });
                    this.add
                        .text(this.statue.x, this.statue.y + 52, 'Goddess · Exit (E)', {
                            fontSize: '12px',
                            color: '#e5d69d',
                            backgroundColor: '#172c2b',
                            padding: { x: 5, y: 3 },
                        })
                        .setOrigin(0.5);
                }
                const cleared = c.run.cleared.includes(r.id);
                this.add
                    .text(
                        r.x * 32,
                        r.y * 32 - 75,
                        r.kind === 'exit'
                            ? 'MEMORY • EXIT'
                            : r.kind === 'entry'
                              ? c.role
                                  ? 'AREN’S MEMORY • ENTRANCE'
                                  : 'ALBY • ENTRANCE'
                              : r.kind === 'boss'
                                ? bossUnlocked(c.run)
                                    ? 'THE BROODMOTHER · GATE OPEN'
                                    : 'BOSS GATE LOCKED · CLEAR ALL ENEMIES'
                                : r.kind === 'supplies'
                                  ? 'FORGOTTEN CACHE'
                                  : `CHAMBER ${r.id}${cleared ? ' · GATES OPEN' : ' · ENEMIES'}`,
                        { fontSize: '13px', color: '#b3c6be' },
                    )
                    .setOrigin(0.5);
                if (r.kind !== 'entry' && !cleared) {
                    const icon = this.add
                        .image(
                            r.x * 32,
                            r.y * 32,
                            r.kind === 'exit'
                                ? 'chest'
                                : r.kind === 'boss'
                                  ? 'boss'
                                  : r.kind === 'supplies'
                                    ? 'chest'
                                    : 'spider',
                        )
                        .setDisplaySize(64, 52);
                    new Button(icon).on('click', () => {
                        if (
                            !canvasBlocked() &&
                            Phaser.Math.Distance.Between(
                                this.player.x,
                                this.player.y,
                                icon.x,
                                icon.y,
                            ) < 150
                        )
                            send({
                                type: 'ENCOUNTER',
                                room: r.id,
                                x: this.player.x,
                                y: this.player.y,
                            });
                    });
                }
            }
            let position = previousPosition ?? { x: c.run.x, y: c.run.y };
            // A legacy checkpoint may be inside the newly locked boss room.
            if (!this.grid[Math.floor(position.y / 32)]?.[Math.floor(position.x / 32)])
                position = { x: c.run.rooms[0].x * 32 + 16, y: c.run.rooms[0].y * 32 + 16 };
            this.player = this.add
                .image(position.x, position.y, c.race.toLowerCase())
                .setDisplaySize(40, 50);
            this.cameras.main
                .setBounds(0, 0, this.grid[0].length * 32, this.grid.length * 32)
                .startFollow(this.player, true, 0.12, 0.12);
        } else {
            this.cameras.main.setZoom(1);
            const g = this.add.graphics();
            g.fillGradientStyle(0x142930, 0x142930, 0x38423b, 0x38423b);
            g.fillRect(0, 0, w, h);
            for (let i = 0; i < 12; i++) {
                g.lineStyle(1, 0x78978a, 0.15);
                g.strokeEllipse(w / 2, h * 0.5, 200 + i * 110, 80 + i * 45);
            }
            if (screen === 'Battle' && c?.battle) {
                const closed = c.battle.enemies.some((enemy) => enemy.hp > 0);
                const gateX = w / 2 - 65,
                    gateY = h * 0.14;
                g.lineStyle(5, closed ? 0xd9a565 : 0x86b795);
                g.strokeRect(gateX, gateY, 130, 70);
                if (closed)
                    for (let x = gateX + 13; x < gateX + 130; x += 13)
                        g.lineBetween(x, gateY, x, gateY + 70);
                this.add
                    .text(
                        w / 2,
                        gateY - 22,
                        closed ? 'GATES CLOSED · DEFEAT ALL ENEMIES' : 'GATES OPEN',
                        { fontSize: '12px', color: closed ? '#d9a565' : '#86b795' },
                    )
                    .setOrigin(0.5);

                c.battle.enemies.forEach((e, i) => {
                    const img = this.add
                        .image(
                            (w * (i + 1)) / (c.battle!.enemies.length + 1),
                            h * 0.32,
                            e.boss ? 'boss' : e.name === 'Red Spider' ? 'redspider' : 'spider',
                        )
                        .setDisplaySize(e.boss ? 220 : 130, e.boss ? 170 : 100);
                    if (getBattleTarget() === e.id && e.hp > 0) img.setTint(0xd5efb2);
                    if (
                        hits.some((event) => event.targetId === e.id) &&
                        !save.data.settings.reducedMotion
                    )
                        new ShakePosition(img, { duration: 200, magnitude: 3 }).shake();
                    if (e.hp === 0) FadeOutDestroy(img, save.data.settings.reducedMotion ? 0 : 250);
                });
            }
            if (screen === 'TreasureRoom')
                for (let i = 0; i < 5; i++)
                    this.add.image((w * (i + 1)) / 6, h * 0.4, 'chest').setDisplaySize(110, 92);
        }
        if (screen === 'TreasureRoom' && save.checkpoint.phase === 'treasure')
            this.controls = treasureView(this);
        if (['Town1', 'Alby'].includes(screen)) {
            const { keys } = this;
            const cursorKeys = Object.fromEntries(
                [
                    ['up', 'W', 'UP'],
                    ['down', 'S', 'DOWN'],
                    ['left', 'A', 'LEFT'],
                    ['right', 'D', 'RIGHT'],
                ].map(([dir, a, b]) => [
                    dir,
                    {
                        get isDown() {
                            return !worldKeysBlocked() && (keys[a].isDown || keys[b].isDown);
                        },
                    },
                ]),
            ) as unknown as Phaser.Types.Input.Keyboard.CursorKeys;
            this.movement = new EightDirection(this.player, {
                speed: 180,
                dir: '8dir',
                cursorKeys,
            });
            (this.player.body as Phaser.Physics.Arcade.Body).moves = false;
        }
        if (screen === 'Alby' && c?.run) {
            const map = this.add.graphics().setScrollFactor(0).setDepth(10000);
            map.fillStyle(0x14262b, 0.9).fillRoundedRect(0, 0, 156, 156, 8);
            for (let y = 0; y < this.grid.length; y++)
                for (let x = 0; x < this.grid[y].length; x++)
                    if (this.grid[y][x]) {
                        map.fillStyle(0x698575, 0.8);
                        map.fillRect(x * 2 + 13, y * 2 + 13, 2, 2);
                    }
            for (const r of c.run.rooms) {
                map.fillStyle(
                    c.run.cleared.includes(r.id)
                        ? 0x86b795
                        : r.kind === 'boss'
                          ? 0xd97d87
                          : r.kind === 'entry'
                            ? 0x75c8d0
                            : 0xddc77e,
                );
                map.fillCircle(r.x * 2 + 13, r.y * 2 + 13, 4);
            }
            new Anchor(map, { left: '24', bottom: '100%-24' });
        }
        const track =
            screen === 'Battle'
                ? 'battle'
                : screen === 'Alby' || screen === 'TreasureRoom'
                  ? 'dungeon'
                  : 'town';
        if (!this.sound.get(track)) {
            this.sound.stopAll();
            this.sound.removeAll();
            const sound = this.sound.add(track, { loop: true, volume: 0 });
            SoundFade.fadeIn(sound, 500, save.data.settings.music, 0);
        }
    }
    useStatue() {
        if (
            !this.statue ||
            Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.statue.x,
                this.statue.y,
            ) >= 150
        )
            return false;
        this.path = [];
        requestDungeonExit();
        return true;
    }
    interact() {
        if (worldKeysBlocked() || busy() || !this.player?.active) return;
        if (this.screen === 'Alby' && this.useStatue()) return;
        if (this.screen === 'Town1') {
            const l = [...locations]
                .sort(
                    (a, b) =>
                        Phaser.Math.Distance.Between(a.x, a.y, this.player.x, this.player.y) -
                        Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y),
                )
                .find(
                    (l) =>
                        Phaser.Math.Distance.Between(l.x, l.y, this.player.x, this.player.y) < 170,
                );
            if (l) {
                if (l.id === 'Alby') send({ type: 'ENTER', seed: Date.now() >>> 0 });
                else openService(l.id);
            }
        } else {
            const c = getCharacter(),
                r = c?.run?.rooms.find(
                    (r) =>
                        r.kind !== 'entry' &&
                        !c.run!.cleared.includes(r.id) &&
                        Phaser.Math.Distance.Between(
                            r.x * 32,
                            r.y * 32,
                            this.player.x,
                            this.player.y,
                        ) < 150,
                );
            if (r) send({ type: 'ENCOUNTER', room: r.id, x: this.player.x, y: this.player.y });
        }
    }

    update(time: number, delta: number) {
        if (
            !this.player?.active ||
            worldKeysBlocked() ||
            busy() ||
            ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') ||
            !['Town1', 'Alby'].includes(this.screen)
        )
            return;
        let dx = Number(this.movement?.isRight) - Number(this.movement?.isLeft),
            dy = Number(this.movement?.isDown) - Number(this.movement?.isUp);
        if (dx || dy) this.path = [];
        else if (this.path.length) {
            const p = this.path[0];
            dx = p.x - this.player.x;
            dy = p.y - this.player.y;
            if (Math.hypot(dx, dy) < 5) {
                this.path.shift();
                dx = 0;
                dy = 0;
            }
        }
        const length = Math.hypot(dx, dy),
            speed = (180 * Math.min(delta, 40)) / 1000;
        if (length) {
            const x = this.player.x + (dx / length) * speed,
                y = this.player.y + (dy / length) * speed;
            if (this.grid[Math.floor(this.player.y / 32)]?.[Math.floor(x / 32)]) this.player.x = x;
            if (this.grid[Math.floor(y / 32)]?.[Math.floor(this.player.x / 32)]) this.player.y = y;
            this.player.setDepth(this.player.y);
            if (!getSave().data.settings.reducedMotion)
                this.player.setAngle(Math.sin(time / 85) * 3);
        }

        const run = getCharacter()?.run;
        if (this.screen === 'Alby' && run && pendingEncounter(run, this.player.x, this.player.y)) {
            this.path = [];
            send({ type: 'POSITION', x: this.player.x, y: this.player.y });
            return;
        }
        if (this.screen === 'Alby' && time - this.lastSave > 1200 && length) {
            this.lastSave = time;
            send({ type: 'POSITION', x: this.player.x, y: this.player.y });
        }
    }
}
export default function StartGame(parent: HTMLElement) {
    return new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: '#142930',
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        physics: { default: 'arcade', arcade: { debug: false } },
        scene: [
            new Boot(),
            new Preloader(),
            ...[
                'Title',
                'CharacterSelect',
                'NewCharacter',
                'Town1',
                'Alby',
                'Battle',
                'TreasureRoom',
            ].map((key) => new World(key)),
        ],
        audio: { disableWebAudio: false },
        render: { antialias: true },
    });
}