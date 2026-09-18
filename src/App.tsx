import { Character } from './ui/Character';
import { GameModal } from './ui/GameModal';
import { SkillJournal } from './ui/SkillJournal';
import {
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type ComponentProps,
    type Key,
} from 'react';
import { Button, Input, Label, TextField, Checkbox } from '@heroui/react';
import { PhaserGame } from './PhaserGame';
import {
    actor,
    dialogue,
    subscribe,
    getCharacter,
    send,
    startRuntime,
    readOnly,
    busy,
} from './runtime/game';
import { setBlockingOverlay } from './game/inputState';
import { items } from './domain/catalog';
import { races, talents, type CreateInput } from './domain/model';
import { MenuBar } from './ui/MenuBar';
import { rebirthCooldown } from './domain/progression';
import { GameWindow } from './ui/windows/GameWindow';
import { WindowProvider } from './ui/windows/WindowProvider';
import { useWindows, type WindowId } from './ui/windows/context';
import { MenuContent } from './ui/MenuContent';
import { SettingsContent } from './ui/SettingsContent';
import { ServiceContent } from './ui/ServiceContent';
import { InventoryList } from './ui/InventoryList';
import './style.css';

type PanelId = 'character' | 'skills' | 'inventory' | 'menu' | 'settings';
type Confirmation = 'rebirth' | 'abandon' | 'leaveLoot';

const SERVICE_TITLES: Record<string, string> = {
    Healer: 'Healer House',
    Grocery: 'Grocery Store',
    General: 'General Shop',
    Blacksmith: 'Blacksmith',
    Bank: 'Bank',
    Trainer: 'Combat instructor',
};

const CLOSED_PANELS: Record<PanelId, boolean> = {
    character: false,
    skills: false,
    inventory: false,
    menu: false,
    settings: false,
};

function App() {
    // One React-owned window provider hosts every browsing window above the canvas.
    return (
        <WindowProvider>
            <Game />
        </WindowProvider>
    );
}

function Game() {
    const snapshot = useSyncExternalStore(subscribe, () => actor.getSnapshot());
    const { closeAllWindows } = useWindows();
    const save = snapshot.context.save,
        c = getCharacter(),
        screen = save.checkpoint.screen,
        phase = save.checkpoint.phase;
    const [panels, setPanels] = useState(CLOSED_PANELS);
    const [confirm, setConfirm] = useState<Confirmation | ''>('');
    const [rebirthId, setRebirthId] = useState('');
    const [service, setService] = useState('');
    const [input, setInput] = useState<CreateInput>({
        name: '',
        race: 'Human',
        age: 17,
        talent: 'Close Combat',
    });
    const [selected, setSelected] = useState<string[]>([]);
    const [gold, setGold] = useState(true);
    const openers = useRef<Partial<Record<WindowId, HTMLElement | null>>>({});
    useEffect(() => {
        startRuntime();
        const sub = dialogue.subscribe((s) =>
            setService(s.matches('closed') ? '' : s.context.service),
        );
        return () => sub.unsubscribe();
    }, []);
    useEffect(() => {
        window.dispatchEvent(new Event('resize'));
    }, [save.data.settings.hudScale]);
    useEffect(() => {
        // Retained confirmations and reward collection block windows and the game;
        // plain window browsing keeps uncovered canvas playable.
        setBlockingOverlay(!!confirm || phase === 'reward');
        return () => setBlockingOverlay(false);
    }, [confirm, phase]);
    const characterId = c?.id;
    useEffect(() => {
        // Scene or active-character changes close every window; session geometry
        // survives so reopening in the new scene restores size and position.
        closeAllWindows();
        setPanels(CLOSED_PANELS);
        setConfirm('');
        dialogue.send({ type: 'CLOSE' });
    }, [screen, characterId, closeAllWindows]);
    useEffect(() => {
        setSelected(
            c?.reward?.items.filter((i) => !c.reward!.claimed.includes(i.id)).map((i) => i.id) ||
                [],
        );
        setGold(true);
        // Initialize once per reward; claims must not reset the player's remaining loot choices.
        // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [c?.reward?.id]);
    const disabled = readOnly || busy();
    const action = (
        label: string,
        onPress: () => void,
        extra: ComponentProps<typeof Button> & { key?: Key } = {},
    ) => {
        const { key, ...props } = extra;
        return (
            <Button key={key} isDisabled={disabled} onPress={onPress} {...props}>
                {label}
            </Button>
        );
    };
    const rebirthCharacter = save.data.characters.find((ch) => ch.id === rebirthId);
    const openPanel = (panel: PanelId, opener?: EventTarget | null) => {
        openers.current[panel] = (opener as HTMLElement) ?? null;
        setPanels((previous) => ({ ...previous, [panel]: true }));
    };
    const closePanel = (panel: PanelId) =>
        setPanels((previous) => ({ ...previous, [panel]: false }));
    const getOpener = (panel: PanelId) => () => openers.current[panel] ?? null;
    const apFooter = c ? (
        <div className="flex w-full items-center justify-between gap-4 text-sm">
            <span className="text-muted">Available AP</span>
            <strong className="text-foreground tabular-nums">{c.ap} AP</strong>
        </div>
    ) : undefined;
    return (
        <main
            className="h-dvh overflow-hidden"
            style={{ '--hudscale': save.data.settings.hudScale } as CSSProperties}
        >
            <PhaserGame />
            <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[calc(108px*var(--hudscale,1))] shadow-[inset_0_0_180px_#081b2866]" />
            {snapshot.matches('loading') ? (
                <div className="center panel">
                    <h1>Opening the world…</h1>
                </div>
            ) : null}
            {readOnly && (
                <div className="notice">
                    This world is open in another tab. Close that tab and reload to play here.
                </div>
            )}
            {snapshot.context.error && (
                <div role="alert" className="notice bg-[#5c3037]">
                    {snapshot.context.error}
                    <Button
                        className="ml-[15px]"
                        onPress={() =>
                            actor.send({ type: snapshot.matches('failure') ? 'RETRY' : 'DISMISS' })
                        }
                    >
                        {snapshot.matches('failure') ? 'Retry loading save' : 'Dismiss'}
                    </Button>
                </div>
            )}
            {screen === 'Title' && (
                <section className="absolute top-[17%] left-[11%] [text-shadow:0_2px_20px_#112e26] narrow:top-[20%] narrow:left-[8%]">
                    <div className="eyebrow">A NEW LIFE. A NEW ADVENTURE.</div>
                    <h1 className="text-[clamp(60px,7vw,108px)] tracking-[-5px] text-[#faf6d9]">
                        Rebirth
                        <br />
                        <em className="font-normal text-[#d7e4b4]">Dungeon</em>
                    </h1>
                    <p className="mt-[25px] mb-8 text-[#e4e8d2]">
                        Beyond a quiet town, a thousand stories await.
                        <br />
                        Your next one begins with a roll of the dice.
                    </p>
                    {action(
                        'Begin your journey',
                        () => send({ type: 'NAV', screen: 'CharacterSelect' }),
                        { className: 'primary px-[38px] py-[17px] text-[15px]' },
                    )}
                    <span className="mt-[25px] block text-[12px] tracking-[4px] text-[#9eb7ad]">
                        EXPLORE · ROLL · REBIRTH
                    </span>
                </section>
            )}
            {screen === 'CharacterSelect' && (
                <section className="center panel">
                    <div className="eyebrow">YOUR ADVENTURERS</div>
                    <h1>Choose a life</h1>
                    <p>{save.data.characters.length} / 20 character slots · Saved on this device</p>
                    <div className="my-5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
                        {save.data.characters.map((ch) => (
                            <article
                                key={ch.id}
                                className="rounded-[9px] border border-[#63796766] bg-[#284035] p-[18px]"
                            >
                                <img
                                    className="m-auto h-[90px]"
                                    src={`assets/game/${ch.race.toLowerCase()}.svg`}
                                />
                                <h3>{ch.name}</h3>
                                <p className="my-[7px] text-[12px]">
                                    Lv. {ch.level} {ch.race} · {ch.talent}
                                </p>
                                <p className="my-[7px] text-[12px]">
                                    Age {ch.age} · Total level {ch.totalLevel}
                                </p>
                                {action(ch.run ? 'Resume adventure' : 'Enter Town1', () =>
                                    send({ type: 'PLAY', id: ch.id, now: Date.now() }),
                                )}
                                {action(
                                    'Rebirth',
                                    () => {
                                        setRebirthId(ch.id);
                                        setInput({
                                            name: ch.name,
                                            race: ch.race,
                                            talent: ch.talent,
                                            age: Math.min(ch.age, 17),
                                        });
                                        setConfirm('rebirth');
                                    },
                                    { className: 'subtle' },
                                )}
                            </article>
                        ))}
                    </div>
                    {action(
                        '＋ Create a character',
                        () => send({ type: 'NAV', screen: 'NewCharacter' }),
                        {
                            isDisabled: disabled || save.data.characters.length >= 20,
                            className: 'primary',
                        },
                    )}
                    {action('Back', () => send({ type: 'NAV', screen: 'Title' }), {
                        className: 'subtle',
                    })}
                </section>
            )}
            {screen === 'NewCharacter' && (
                <section className="center panel grid grid-cols-2 gap-[35px] compact:gap-5 narrow:grid-cols-1">
                    <div className="narrow:hidden">
                        <div className="eyebrow">THE FIRST CHAPTER</div>
                        <h1 className="text-[34px] compact:text-[28px]">
                            Someone new.
                            <br />
                            Something extraordinary.
                        </h1>
                        <img
                            className="mx-auto my-5 h-[190px] [image-rendering:auto]"
                            src={`assets/game/${input.race.toLowerCase()}.svg`}
                        />
                        <p>
                            Your race is permanent. Rebirth lets you
                            <br />
                            begin again with a new age and talent.
                        </p>
                    </div>
                    <form
                        className="flex flex-col gap-[13px]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            send({
                                type: 'CREATE',
                                input,
                                id: crypto.randomUUID(),
                                now: Date.now(),
                            });
                        }}
                    >
                        <h2>Create your adventurer</h2>
                        <TextField aria-label="Character name">
                            <Label>Name</Label>
                            <Input
                                placeholder="What will they call you?"
                                value={input.name}
                                onChange={(e) => setInput({ ...input, name: e.target.value })}
                                minLength={2}
                                maxLength={24}
                                required
                            />
                        </TextField>
                        <Label>Race</Label>
                        <div className="choices">
                            {races.map((r) =>
                                action(
                                    r,
                                    () =>
                                        setInput({
                                            ...input,
                                            race: r,
                                            talent:
                                                r === 'Giant' && input.talent === 'Archery'
                                                    ? 'Close Combat'
                                                    : input.talent,
                                        }),
                                    { className: input.race === r ? 'selected' : '', key: r },
                                ),
                            )}
                        </div>
                        <Label>Starting age · {input.age}</Label>
                        <div className="choices">
                            {Array.from({ length: 8 }, (_, i) => i + 10).map((age) =>
                                action(String(age), () => setInput({ ...input, age }), {
                                    key: age,
                                    className: age === input.age ? 'selected' : '',
                                }),
                            )}
                        </div>
                        <Label>Talent</Label>
                        <div className="choices">
                            {talents.map((t) =>
                                action(t, () => setInput({ ...input, talent: t }), {
                                    key: t,
                                    className: input.talent === t ? 'selected' : '',
                                    isDisabled:
                                        disabled || (input.race === 'Giant' && t === 'Archery'),
                                }),
                            )}
                        </div>
                        <p className="text-[12px] text-[#9eb7ad]">
                            Every talent begins with a weapon, Normal Attack,
                            <br />
                            and one special skill. Giants cannot use Archery.
                        </p>
                        <Button type="submit" className="primary" isDisabled={disabled}>
                            Start a new life
                        </Button>
                        {action('Back', () => send({ type: 'NAV', screen: 'CharacterSelect' }), {
                            className: 'subtle',
                        })}
                    </form>
                </section>
            )}
            {c && ['Town1', 'Alby', 'Battle', 'TreasureRoom'].includes(screen) && (
                <>
                    <header className="pointer-events-none absolute top-[30px] left-8 [text-shadow:0_2px_5px_#112927]">
                        <div className="eyebrow">
                            {screen === 'Town1'
                                ? 'ULADH · A QUIET BEGINNING'
                                : screen === 'Alby'
                                  ? 'BEGINNER DUNGEON · FLOOR 1'
                                  : 'ALBY DUNGEON'}
                        </div>
                        <h2>
                            {screen === 'Town1'
                                ? 'Town1'
                                : screen === 'Battle'
                                  ? 'A tangled encounter'
                                  : screen === 'TreasureRoom'
                                    ? 'The treasure chamber'
                                    : 'Alby'}
                        </h2>
                        <p className="text-[12px]">
                            {screen === 'Town1'
                                ? 'Walk with WASD or click · E to interact'
                                : screen === 'Alby'
                                  ? `${c.run?.cleared.filter((id) => c.run?.rooms.find((r) => r.id === id)?.required).length} / 3 seals broken · E to investigate`
                                  : screen === 'Battle'
                                    ? `Turn ${c.battle?.turn} · Choose your moment`
                                    : 'Five possibilities. One reward.'}
                        </p>
                    </header>
                    <aside className="absolute top-[30px] right-7 w-[230px] rounded-r-[8px] border-l-2 border-[#abc58e] bg-[#162c2cdd] p-5 compact:right-[15px] compact:w-[180px] narrow:hidden">
                        <span className="eyebrow">FIRST STEPS</span>
                        <h3>
                            {c.tutorial === 0
                                ? 'Beneath the village'
                                : c.tutorial < 3
                                  ? 'Unravel the web'
                                  : 'A well-earned reward'}
                        </h3>
                        <p className="text-[12px]">
                            {c.tutorial === 0
                                ? 'Find Alby Dungeon at the north gate.'
                                : c.tutorial < 3
                                  ? 'Explore the chambers, break three seals, and defeat the Giant Spider.'
                                  : 'Open one treasure chest and return home.'}
                        </p>
                        <span className="text-[13px] text-[#ebce7c]">
                            ◈ {c.gold.toLocaleString()} gold
                        </span>
                        {c.run &&
                            action('Return to town', () => setConfirm('abandon'), {
                                className: 'subtle',
                            })}
                    </aside>
                </>
            )}
            {phase === 'reward' && c?.reward && (
                <section className="center panel z-40 w-[460px]">
                    <div className="eyebrow">
                        {c.reward.boss ? 'VICTORY IS YOURS' : 'SPOILS OF ADVENTURE'}
                    </div>
                    <h1>A little richer.</h1>
                    <p>Choose what to carry with you.</p>
                    <Checkbox
                        className="my-4"
                        isSelected={gold}
                        onChange={setGold}
                        isDisabled={c.reward.claimed.includes('gold')}
                    >
                        <Checkbox.Content className="reward-option">
                            <Checkbox.Control>
                                <Checkbox.Indicator />
                            </Checkbox.Control>
                            ◈ {c.reward.gold} gold{' '}
                            {c.reward.claimed.includes('gold') ? '· Collected' : ''}
                        </Checkbox.Content>
                    </Checkbox>
                    {c.reward.items.map((i) => (
                        <Checkbox
                            className="my-4"
                            key={i.id}
                            isDisabled={c.reward!.claimed.includes(i.id)}
                            isSelected={selected.includes(i.id)}
                            onChange={(checked) =>
                                setSelected(
                                    checked
                                        ? [...selected, i.id]
                                        : selected.filter((id) => id !== i.id),
                                )
                            }
                        >
                            <Checkbox.Content className="reward-option">
                                <Checkbox.Control>
                                    <Checkbox.Indicator />
                                </Checkbox.Control>
                                {items[i.kind].icon} {items[i.kind].name} × {i.count}{' '}
                                {c.reward!.claimed.includes(i.id) ? '· Collected' : ''}
                            </Checkbox.Content>
                        </Checkbox>
                    ))}
                    <div className="choices">
                        {action('Take selected', () =>
                            send({ type: 'CLAIM', ids: selected, gold }),
                        )}
                        {action(
                            'Take all',
                            () =>
                                send({
                                    type: 'CLAIM',
                                    ids: c.reward!.items.map((i) => i.id),
                                    gold: true,
                                }),
                            { className: 'primary' },
                        )}
                    </div>
                    {action(screen === 'TreasureRoom' ? 'Return to town' : 'Continue', () => {
                        if (c.reward!.claimed.length < c.reward!.items.length + 1)
                            setConfirm('leaveLoot');
                        else
                            send({ type: screen === 'TreasureRoom' ? 'CONTINUE' : 'LEAVE_REWARD' });
                    })}
                </section>
            )}
            {c && (
                <>
                    <GameWindow
                        id="character"
                        title="Character Info"
                        open={panels.character}
                        onClose={() => closePanel('character')}
                        getOpener={getOpener('character')}
                    >
                        <Character c={c} />
                    </GameWindow>
                    <GameWindow
                        id="skills"
                        title="Skill catalog"
                        open={panels.skills}
                        onClose={() => closePanel('skills')}
                        getOpener={getOpener('skills')}
                        footer={apFooter}
                    >
                        <SkillJournal character={c} disabled={disabled} send={send} />
                    </GameWindow>
                    <GameWindow
                        id="inventory"
                        title="Your belongings"
                        open={panels.inventory}
                        onClose={() => closePanel('inventory')}
                        getOpener={getOpener('inventory')}
                    >
                        <InventoryList character={c} disabled={disabled} send={send} />
                    </GameWindow>
                    <GameWindow
                        id="menu"
                        title="Adventure menu"
                        open={panels.menu}
                        onClose={() => closePanel('menu')}
                        getOpener={getOpener('menu')}
                    >
                        <MenuContent
                            disabled={disabled}
                            send={send}
                            onOpenSettings={() => openPanel('settings')}
                        />
                    </GameWindow>
                    <GameWindow
                        id="settings"
                        title="Settings"
                        open={panels.settings}
                        onClose={() => closePanel('settings')}
                        getOpener={getOpener('settings')}
                    >
                        <SettingsContent save={save} disabled={disabled} send={send} />
                    </GameWindow>
                </>
            )}
            {!!service && c && (
                <GameWindow
                    id="service"
                    title={SERVICE_TITLES[service] ?? service}
                    open
                    onClose={() => dialogue.send({ type: 'CLOSE' })}
                    footer={service === 'Trainer' ? apFooter : undefined}
                >
                    {service === 'Trainer' ? (
                        <SkillJournal character={c} disabled={disabled} trainer send={send} />
                    ) : (
                        <ServiceContent
                            service={service}
                            character={c}
                            disabled={disabled}
                            send={send}
                        />
                    )}
                </GameWindow>
            )}
            {confirm === 'rebirth' && rebirthCharacter && (
                <GameModal onClose={() => setConfirm('')} title="Begin another life">
                    <div className="stack">
                        <p>
                            {rebirthCharacter.name} · {rebirthCharacter.race}
                            <br />
                            Retain possessions, learned skills, cumulative levels and AP. Reset
                            current level and growth.
                        </p>
                        <Label>New age</Label>
                        <div className="choices">
                            {Array.from({ length: 8 }, (_, i) => i + 10)
                                .filter((age) => age <= rebirthCharacter.age)
                                .map((age) =>
                                    action(String(age), () => setInput({ ...input, age }), {
                                        key: age,
                                        className: input.age === age ? 'selected' : '',
                                    }),
                                )}
                        </div>
                        <Label>New talent</Label>
                        <div className="choices">
                            {talents
                                .filter((t) => rebirthCharacter.race !== 'Giant' || t !== 'Archery')
                                .map((t) =>
                                    action(t, () => setInput({ ...input, talent: t }), {
                                        key: t,
                                        className: input.talent === t ? 'selected' : '',
                                    }),
                                )}
                        </div>
                        <p>
                            Next available:{' '}
                            {new Date(
                                rebirthCharacter.rebornAt +
                                    rebirthCooldown(rebirthCharacter.totalLevel),
                            ).toLocaleString()}
                        </p>
                        {action(
                            `Rebirth as age ${input.age} · ${input.talent}`,
                            () =>
                                send({
                                    type: 'REBIRTH',
                                    id: rebirthId,
                                    talent: input.talent,
                                    age: input.age,
                                    now: Date.now(),
                                }),
                            {
                                className: 'primary',
                                isDisabled:
                                    disabled ||
                                    !!rebirthCharacter.run ||
                                    Date.now() <
                                        rebirthCharacter.rebornAt +
                                            rebirthCooldown(rebirthCharacter.totalLevel),
                            },
                        )}
                    </div>
                </GameModal>
            )}
            {(confirm === 'abandon' || confirm === 'leaveLoot') && (
                <GameModal onClose={() => setConfirm('')} title="Leave this chapter?">
                    <div className="stack">
                        <p>
                            {confirm === 'abandon'
                                ? 'Leave this dungeon run? Claimed loot and experience are kept.'
                                : 'Leave the unclaimed rewards behind?'}
                        </p>
                        {action(
                            'Leave',
                            () => {
                                send({
                                    type:
                                        confirm === 'abandon'
                                            ? 'ABANDON'
                                            : screen === 'TreasureRoom'
                                              ? 'CONTINUE'
                                              : 'LEAVE_REWARD',
                                });
                                setConfirm('');
                            },
                            { className: 'primary' },
                        )}
                    </div>
                </GameModal>
            )}
            {save.migrationNotice && (
                <div
                    role="status"
                    className="absolute top-4 left-1/2 z-50 w-[min(90vw,600px)] -translate-x-1/2 rounded border bg-[#203638] p-4 text-sm"
                >
                    Your skills are now Rank F. Saved dice and possessions were preserved; pending
                    attacks use the revised combat rules.
                    <Button
                        className="ml-3"
                        isDisabled={disabled}
                        onPress={() => send({ type: 'DISMISS_MIGRATION' })}
                    >
                        Got it
                    </Button>
                </div>
            )}
            <MenuBar character={c} onOpen={openPanel} />
        </main>
    );
}
export default App;
