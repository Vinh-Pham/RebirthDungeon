import { SkillJournal } from './ui/SkillJournal';
import {
    useEffect,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type ComponentProps,
    type Key,
} from 'react';
import { Button, Input, Label, TextField, Checkbox, Modal, Tooltip } from '@heroui/react';
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
import { blockWorld } from './game/inputState';
import { items, shops } from './domain/catalog';
import { races, talents, type CreateInput } from './domain/model';
import { ResourceMeter } from './ui/ResourceMeter';
import { xpNeeded, rebirthCooldown } from './domain/progression';
import './style.css';
function App() {
    const snapshot = useSyncExternalStore(subscribe, () => actor.getSnapshot());
    const save = snapshot.context.save,
        c = getCharacter(),
        screen = save.checkpoint.screen,
        phase = save.checkpoint.phase;
    const [panel, setPanel] = useState('');
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
    const [amount, setAmount] = useState('10');
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
        blockWorld(!!panel || !!service || phase === 'reward');
        return () => blockWorld(false);
    }, [panel, service, phase]);
    useEffect(() => {
        setPanel('');
        setService('');
        dialogue.send({ type: 'CLOSE' });
    }, [screen]);
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
    useEffect(() => {
        if (!panel && !service) return;
        const escape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setPanel('');
                dialogue.send({ type: 'CLOSE' });
            }
        };
        window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [panel, service]);
    const rebirthCharacter = save.data.characters.find((ch) => ch.id === rebirthId);
    const close = () => {
        setPanel('');
        dialogue.send({ type: 'CLOSE' });
    };
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
                                        setPanel('rebirth');
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
                            action('Return to town', () => setPanel('abandon'), {
                                className: 'subtle',
                            })}
                    </aside>
                </>
            )}
            {phase === 'reward' && c?.reward && (
                <section className="center panel z-10 w-[460px]">
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
                            setPanel('leaveLoot');
                        else
                            send({ type: screen === 'TreasureRoom' ? 'CONTINUE' : 'LEAVE_REWARD' });
                    })}
                </section>
            )}
            {(panel || service) && (
                <Modal.Backdrop
                    isOpen
                    onOpenChange={(open) => {
                        if (!open) close();
                    }}
                    className="fixed inset-0 z-20 grid place-items-center bg-[#061817b0]"
                >
                    <Modal.Container className="grid h-full place-items-center">
                        <Modal.Dialog
                            className="panel max-h-[85dvh] w-[90vw] max-w-[720px] overflow-auto"
                            aria-label={panel || service}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2>
                                    {service
                                        ? {
                                              Healer: 'Healer House',
                                              Grocery: 'Grocery Store',
                                              General: 'General Shop',
                                              Blacksmith: 'Blacksmith',
                                              Bank: 'Bank',
                                              Trainer: 'Combat instructor',
                                          }[service] || service
                                        : panel === 'menu'
                                          ? 'Adventure menu'
                                          : panel === 'skills'
                                            ? 'Skill catalog'
                                            : panel === 'inventory'
                                              ? 'Your belongings'
                                              : panel === 'settings'
                                                ? 'Settings'
                                                : panel === 'rebirth'
                                                  ? 'Begin another life'
                                                  : 'Leave this chapter?'}
                                </h2>
                                {action('Close', close, { className: 'subtle' })}
                            </div>
                            {(panel === 'skills' || service === 'Trainer') && c && (
                                <SkillJournal
                                    character={c}
                                    disabled={disabled}
                                    trainer={service === 'Trainer'}
                                    send={send}
                                />
                            )}
                            {panel === 'menu' && (
                                <div className="stack">
                                    {action('Settings', () => setPanel('settings'))}
                                    {action('Title Screen', () => {
                                        close();
                                        send({ type: 'NAV', screen: 'Title' });
                                    })}
                                </div>
                            )}
                            {panel === 'rebirth' && rebirthCharacter && (
                                <div className="stack">
                                    <p>
                                        {rebirthCharacter.name} · {rebirthCharacter.race}
                                        <br />
                                        Retain possessions, learned skills, cumulative levels and
                                        AP. Reset current level and growth.
                                    </p>
                                    <Label>New age</Label>
                                    <div className="choices">
                                        {Array.from({ length: 8 }, (_, i) => i + 10)
                                            .filter((age) => age <= rebirthCharacter.age)
                                            .map((age) =>
                                                action(
                                                    String(age),
                                                    () => setInput({ ...input, age }),
                                                    {
                                                        key: age,
                                                        className:
                                                            input.age === age ? 'selected' : '',
                                                    },
                                                ),
                                            )}
                                    </div>
                                    <Label>New talent</Label>
                                    <div className="choices">
                                        {talents
                                            .filter(
                                                (t) =>
                                                    rebirthCharacter.race !== 'Giant' ||
                                                    t !== 'Archery',
                                            )
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
                                                        rebirthCooldown(
                                                            rebirthCharacter.totalLevel,
                                                        ),
                                        },
                                    )}
                                </div>
                            )}
                            {panel === 'settings' && (
                                <div className="stack">
                                    {(['music', 'effects'] as const).map((key) => (
                                        <TextField key={key}>
                                            <Label>
                                                {key === 'music'
                                                    ? 'Music volume'
                                                    : 'Effects volume'}{' '}
                                                (0–100)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={String(
                                                    Math.round(save.data.settings[key] * 100),
                                                )}
                                                onChange={(e) =>
                                                    send({
                                                        type: 'SETTINGS',
                                                        settings: {
                                                            [key]: Number(e.target.value) / 100,
                                                        },
                                                    })
                                                }
                                            />
                                        </TextField>
                                    ))}
                                    <TextField>
                                        <Label>HUD scale (80–130%)</Label>
                                        <Input
                                            type="number"
                                            min="80"
                                            max="130"
                                            step="10"
                                            value={String(
                                                Math.round(save.data.settings.hudScale * 100),
                                            )}
                                            onChange={(e) =>
                                                send({
                                                    type: 'SETTINGS',
                                                    settings: {
                                                        hudScale: Number(e.target.value) / 100,
                                                    },
                                                })
                                            }
                                        />
                                    </TextField>
                                    <p>
                                        WASD / arrows: walk · Click: move or select
                                        <br />
                                        E: interact · Hold dice, then reroll up to twice.
                                    </p>
                                    {action(
                                        `Reduced motion: ${save.data.settings.reducedMotion ? 'On' : 'Off'}`,
                                        () =>
                                            send({
                                                type: 'SETTINGS',
                                                settings: {
                                                    reducedMotion:
                                                        !save.data.settings.reducedMotion,
                                                },
                                            }),
                                    )}
                                </div>
                            )}
                            {(panel === 'abandon' || panel === 'leaveLoot') && (
                                <>
                                    <p>
                                        {panel === 'abandon'
                                            ? 'Leave this dungeon run? Claimed loot and experience are kept.'
                                            : 'Leave the unclaimed rewards behind?'}
                                    </p>
                                    {action(
                                        'Leave',
                                        () => {
                                            send({
                                                type:
                                                    panel === 'abandon'
                                                        ? 'ABANDON'
                                                        : screen === 'TreasureRoom'
                                                          ? 'CONTINUE'
                                                          : 'LEAVE_REWARD',
                                            });
                                            close();
                                        },
                                        { className: 'primary' },
                                    )}
                                </>
                            )}
                            {service === 'Healer' && (
                                <>
                                    <p>
                                        Elara smiles. “Rest a moment, traveler. The road can wait.”
                                    </p>
                                    {action('Restore HP, mana & stamina · 10 gold', () =>
                                        send({ type: 'HEAL' }),
                                    )}
                                </>
                            )}
                            {shops[service] && (
                                <>
                                    <p>
                                        {service === 'Blacksmith'
                                            ? 'Bram checks the edge of your weapon. “A good blade deserves care.”'
                                            : 'Supplies for the road ahead.'}
                                    </p>
                                    <div className="grid gap-[7px]" data-testid="shop-catalog">
                                        {shops[service].map((kind) => (
                                            <article
                                                key={kind}
                                                className="flex items-center gap-[15px] border-b border-[#819e7c44] p-[10px]"
                                            >
                                                <span className="text-[25px]">
                                                    {items[kind].icon}
                                                </span>
                                                <div className="flex-1">
                                                    <h3 className="text-[16px]">
                                                        {items[kind].name}
                                                    </h3>
                                                    <small>
                                                        {items[kind].power
                                                            ? `${items[kind].power} power`
                                                            : items[kind].restore
                                                              ? `Restores ${items[kind].restore} ${items[kind].resource}`
                                                              : `${items[kind].defense} defense`}
                                                    </small>
                                                </div>
                                                {action(`Buy · ${items[kind].price}g`, () =>
                                                    send({ type: 'BUY', shop: service, kind }),
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                </>
                            )}
                            {service === 'Bank' && c && (
                                <>
                                    <p>
                                        Stored gold: {c.bankGold} · Bank slots: {c.bank.length}/60
                                    </p>
                                    <TextField>
                                        <Label>Gold amount</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                        />
                                    </TextField>
                                    <div className="choices">
                                        {action('Deposit gold', () =>
                                            send({
                                                type: 'BANK_GOLD',
                                                amount: Number(amount),
                                                deposit: true,
                                            }),
                                        )}
                                        {action('Withdraw gold', () =>
                                            send({
                                                type: 'BANK_GOLD',
                                                amount: Number(amount),
                                                deposit: false,
                                            }),
                                        )}
                                    </div>
                                    {c.bank.map((i) => (
                                        <div className="item" key={i.id}>
                                            {items[i.kind].name} ×{i.count}
                                            {action('Withdraw', () =>
                                                send({
                                                    type: 'BANK_ITEM',
                                                    id: i.id,
                                                    deposit: false,
                                                }),
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                            {(panel === 'inventory' ||
                                (service && service !== 'Healer' && service !== 'Trainer')) &&
                                c && (
                                    <>
                                        <h3>Inventory · {c.inventory.length}/30</h3>
                                        <div className="mt-[15px] flex flex-col gap-[6px]">
                                            {c.inventory.map((i) => (
                                                <div className="item" key={i.id}>
                                                    <span className="text-[26px]">
                                                        {items[i.kind].icon}
                                                    </span>
                                                    <div className="flex-1">
                                                        <strong>
                                                            {items[i.kind].name} ×{i.count}
                                                        </strong>
                                                        <small className="mt-[5px] block text-[10px]">
                                                            {c.weapon === i.id ||
                                                            c.offhand === i.id ||
                                                            c.armor === i.id
                                                                ? 'Equipped · '
                                                                : ''}
                                                            {i.durability !== undefined
                                                                ? `${i.durability}/20 durability`
                                                                : items[i.kind].type}
                                                        </small>
                                                    </div>
                                                    <div className="choices">
                                                        {items[i.kind].resource &&
                                                            action('Use', () =>
                                                                send({ type: 'USE', id: i.id }),
                                                            )}
                                                        {['weapon', 'armor', 'shield'].includes(
                                                            items[i.kind].type,
                                                        ) &&
                                                            action(
                                                                c.weapon === i.id ||
                                                                    c.offhand === i.id ||
                                                                    c.armor === i.id
                                                                    ? 'Unequip'
                                                                    : 'Equip',
                                                                () =>
                                                                    send({
                                                                        type: 'EQUIP',
                                                                        id: i.id,
                                                                        ...(c.offhand === i.id
                                                                            ? {
                                                                                  slot: 'offhand' as const,
                                                                              }
                                                                            : {}),
                                                                    }),
                                                                { isDisabled: disabled || !!c.run },
                                                            )}
                                                        {['sword', 'steel'].includes(i.kind) &&
                                                            c.weapon !== i.id &&
                                                            action(
                                                                c.offhand === i.id
                                                                    ? 'Unequip off-hand'
                                                                    : 'Equip off-hand',
                                                                () =>
                                                                    send({
                                                                        type: 'EQUIP',
                                                                        id: i.id,
                                                                        slot: 'offhand',
                                                                    }),
                                                                { isDisabled: disabled || !!c.run },
                                                            )}
                                                        {items[i.kind].type === 'book' &&
                                                            action(
                                                                'Read',
                                                                () =>
                                                                    send({
                                                                        type: 'READ',
                                                                        id: i.id,
                                                                    }),
                                                                { isDisabled: disabled || !!c.run },
                                                            )}
                                                        {items[i.kind].type === 'page' &&
                                                            action(
                                                                'Insert page',
                                                                () =>
                                                                    send({
                                                                        type: 'INSERT_PAGE',
                                                                        id: i.id,
                                                                    }),
                                                                { isDisabled: disabled || !!c.run },
                                                            )}
                                                        {service === 'Blacksmith' &&
                                                            i.durability !== undefined &&
                                                            action(
                                                                `Repair · ${20 - i.durability}g`,
                                                                () =>
                                                                    send({
                                                                        type: 'REPAIR',
                                                                        id: i.id,
                                                                    }),
                                                            )}
                                                        {shops[service] &&
                                                            action(
                                                                `Sell · ${Math.floor(items[i.kind].price / 4)}g`,
                                                                () =>
                                                                    send({
                                                                        type: 'SELL',
                                                                        id: i.id,
                                                                    }),
                                                            )}
                                                        {service === 'Bank' &&
                                                            action('Deposit', () =>
                                                                send({
                                                                    type: 'BANK_ITEM',
                                                                    id: i.id,
                                                                    deposit: true,
                                                                }),
                                                            )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                        </Modal.Dialog>
                    </Modal.Container>
                </Modal.Backdrop>
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
            <footer className="absolute bottom-0 left-0 flex h-[108px] w-[calc(100%/var(--hudscale,1))] origin-bottom-left scale-[var(--hudscale,1)] items-center gap-5 border-t border-[#8db6a169] bg-[linear-gradient(#203638,#101e25)] px-[25px] py-[10px] shadow-[0_-10px_40px_#13242144] compact:gap-[10px] compact:p-2 narrow:h-[100px]">
                <Tooltip>
                    <Button
                        aria-label="MENU"
                        className="flex h-[73px] w-14 p-[5px]! text-[30px]! text-[#5cc8c1] narrow:w-9"
                        onPress={() => setPanel('menu')}
                    >
                        <span aria-hidden="true">♧</span>
                    </Button>
                    <Tooltip.Content>Menu</Tooltip.Content>
                </Tooltip>
                <div className="flex w-[180px] shrink-0 flex-col gap-1 compact:w-[120px] narrow:w-[90px]">
                    {(['hp', 'mana', 'stamina'] as const).map((key) => (
                        <ResourceMeter
                            key={key}
                            label={key === 'hp' ? 'HP' : key === 'mana' ? 'MP' : 'SP'}
                            value={c?.[key] ?? 0}
                            max={c?.stats[key] ?? 0}
                            kind={key}
                            empty={!c}
                        />
                    ))}
                </div>
                <div className="m-auto max-w-[650px] flex-1 narrow:min-w-0">
                    <nav className="flex justify-center gap-[5px]">
                        {[
                            ['♙', 'Character'],
                            ['✧', 'Skills'],
                            ['⚒', 'Talent'],
                            ['▤', 'Quests'],
                            ['▣', 'Inventory'],
                            ['♧', 'Pets'],
                        ].map(([icon, name]) => (
                            <Tooltip key={name}>
                                <Button
                                    aria-label={name}
                                    className="hud-button"
                                    onPress={() => {
                                        if (name === 'Inventory' && c) setPanel('inventory');
                                        if (name === 'Skills' && c) setPanel('skills');
                                    }}
                                >
                                    <span aria-hidden="true" className="text-[25px] leading-[27px]">
                                        {icon}
                                    </span>
                                </Button>
                                <Tooltip.Content>
                                    {name === 'Skills'
                                        ? 'Open skill journal'
                                        : name === 'Inventory'
                                          ? 'Open inventory'
                                          : `${name} · coming later`}
                                </Tooltip.Content>
                            </Tooltip>
                        ))}
                    </nav>
                    <div className="mt-[7px] flex items-center gap-[10px] text-[12px]">
                        <span>lv {c?.level || 1}</span>
                        <div className="bar h-[9px] flex-1 after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(90deg,transparent_0,transparent_calc(10%_-_2px),#183732_10%)] after:content-['']">
                            <i
                                className="absolute inset-y-0 left-0 bg-[linear-gradient(#76debf,#318a82)] transition-[width] duration-[250ms] ease-[ease]"
                                style={{
                                    width: `${c ? Math.min(100, (c.xp / xpNeeded(c.level)) * 100) : 0}%`,
                                }}
                            />
                        </div>
                        <small>{c?.xp || 0} EXP</small>
                    </div>
                </div>
                <div className="flex flex-col gap-[5px] font-[Georgia] compact:hidden">
                    <strong className="text-[15px]">{c?.name || 'A story unwritten'}</strong>
                    <small className="text-[11px]">
                        {c ? `${c.race} · ${c.talent}` : 'Rebirth Dungeon'}
                    </small>
                </div>
            </footer>
        </main>
    );
}
export default App;
