import Phaser from 'phaser';
import { battleView, treasureView, type ControlBounds } from './battleView';
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
} from '../runtime/game';
import { locations, townGrid } from './world';
import { findPath } from '../domain/dungeon';
import { modalOpen } from './inputState';
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
    movement?: EightDirection;
    grid: number[][] = [];
    path: { x: number; y: number }[] = [];
    keys!: Record<string, Phaser.Input.Keyboard.Key>;
    lastEnemyHealth = 0;
    controls: ControlBounds[] = [];
    selectedEnemy = 'enemy-0';
    screen = '';
    signature = '';
    unsubscribe?: () => void;
    lastSave = 0;
    markers: Phaser.GameObjects.GameObject[] = [];
    constructor(key: string) {
        super(key);
    }

    create() {
        this.screen = '';
        this.keys = this.input.keyboard!.addKeys(
            'W,A,S,D,UP,DOWN,LEFT,RIGHT,E',
            false,
        ) as typeof this.keys;
        this.input.keyboard!.on('keydown-E', () => this.interact());
        this.unsubscribe = subscribe(() => this.sync());
        this.events.once('shutdown', () => {
            this.unsubscribe?.();
            this.input.removeAllListeners();
            this.input.keyboard?.removeAllListeners();
        });
        this.sync();
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (modalOpen || busy() || !['Town1', 'Alby'].includes(this.screen)) return;
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
        const wasHit = enemyHealth < this.lastEnemyHealth && screen === 'Battle';
        this.lastEnemyHealth = enemyHealth;
        if (wasHit && this.cache.audio.exists('hit'))
            this.sound.play('hit', { volume: save.data.settings.effects });
        this.children.removeAll(true);
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
                        !modalOpen &&
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
            this.grid = c.run.tiles.map((r) => [...r]);
            const g = this.add.graphics();
            for (let y = 0; y < this.grid.length; y++)
                for (let x = 0; x < this.grid[y].length; x++) {
                    g.fillStyle(this.grid[y][x] ? ((x + y) % 2 ? 0x333d43 : 0x39454b) : 0x131d24);
                    g.fillRect(x * 32, y * 32, 31, 31);
                }
            for (const r of c.run.rooms) {
                const cleared = c.run.cleared.includes(r.id);
                this.add
                    .text(
                        r.x * 32,
                        r.y * 32 - 75,
                        r.kind === 'entry'
                            ? 'ALBY • ENTRANCE'
                            : r.kind === 'boss'
                              ? 'THE BROODMOTHER'
                              : r.kind === 'supplies'
                                ? 'FORGOTTEN CACHE'
                                : `CHAMBER ${r.id}${cleared ? ' · CLEARED' : r.trigger === 'switch' ? ' · ACTIVATE SWITCH' : r.trigger === 'chest' ? ' · OPEN CHEST' : ' · SPIDERS'}`,
                        { fontSize: '13px', color: '#b3c6be' },
                    )
                    .setOrigin(0.5);
                if (r.kind !== 'entry' && !cleared) {
                    const icon = this.add
                        .image(
                            r.x * 32,
                            r.y * 32,
                            r.kind === 'boss'
                                ? 'boss'
                                : r.trigger === 'chest' || r.kind === 'supplies'
                                  ? 'chest'
                                  : 'spider',
                        )
                        .setDisplaySize(64, 52);
                    new Button(icon).on('click', () => {
                        if (
                            !modalOpen &&
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
            this.player = this.add
                .image(
                    previousPosition?.x ?? c.run.x,
                    previousPosition?.y ?? c.run.y,
                    c.race.toLowerCase(),
                )
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
                c.battle.enemies.forEach((e, i) => {
                    const img = this.add
                        .image(
                            (w * (i + 1)) / (c.battle!.enemies.length + 1),
                            h * 0.32,
                            e.boss ? 'boss' : e.name === 'Red Spider' ? 'redspider' : 'spider',
                        )
                        .setDisplaySize(e.boss ? 220 : 130, e.boss ? 170 : 100);
                    if (wasHit && !save.data.settings.reducedMotion)
                        new ShakePosition(img, { duration: 200, magnitude: 3 }).shake();
                    if (e.hp === 0) FadeOutDestroy(img, save.data.settings.reducedMotion ? 0 : 250);
                });
            }
            if (screen === 'TreasureRoom')
                for (let i = 0; i < 5; i++)
                    this.add.image((w * (i + 1)) / 6, h * 0.4, 'chest').setDisplaySize(110, 92);
        }
        if (screen === 'Battle' && c?.battle)
            this.controls = battleView(this, c, this.selectedEnemy, (id) => {
                this.selectedEnemy = id;
                this.sync(true);
            });
        if (screen === 'TreasureRoom' && save.checkpoint.phase === 'treasure')
            this.controls = treasureView(this);
        if (['Town1', 'Alby'].includes(screen)) {
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
                            return !modalOpen && (scene.keys[a].isDown || scene.keys[b].isDown);
                        },
                    },
                ]),
            ) as unknown as Phaser.Types.Input.Keyboard.CursorKeys;
            const scene = this;
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
    interact() {
        if (modalOpen || busy() || !this.player?.active) return;
        if (this.screen === 'Town1') {
            const l = locations.find(
                (l) => Phaser.Math.Distance.Between(l.x, l.y, this.player.x, this.player.y) < 170,
            );
            if (l)
                l.id === 'Alby'
                    ? send({ type: 'ENTER', seed: Date.now() >>> 0 })
                    : openService(l.id);
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
            modalOpen ||
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
