import { eyes, hairs, outfits, skins } from "../game/content/appearance";
import { characterRaces, characterTalents } from "../game/content/character-growth";
import { useState } from "react";
import { Alert, Button, Card, Form, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import type { CharacterForm, GameActions } from "../app/contracts";

const choices = {
  race: characterRaces,
  gender: ["Male", "Female", "Nonbinary"],
  body: ["Compact", "Balanced", "Broad"],
  skin: ["Pale", "Sand", "Umber", "Deep"],
  hair: [
    "Shorn",
    "Sweep",
    "Crest",
    "Long",
    "Cropped",
    "Side Part",
    "Mohawk",
    "Slicked Back",
    "Bob",
    "Bun",
    "Braids",
    "Ponytail",
  ],
  hairColor: ["Ash", "Plum", "Copper", "Gold", "Ink", "Chestnut", "Crimson", "Silver", "Glacier", "Wheat"],
  eyes: ["Steady", "Narrow", "Wide"],
  eyeColor: ["Slate", "Teal", "Violet", "Amber", "Ice", "Steel Blue", "Sage", "Hazel", "Rose", "Silver"],
  face: ["Soft", "Angular", "Square"],
};
const labels = {
  race: "Race",
  gender: "Gender",
  body: "Build",
  skin: "Skin Tone",
  hair: "Hair",
  hairColor: "Hair Color",
  eyes: "Eyes",
  eyeColor: "Eye Color",
  face: "Face",
};
const appearance = ["body", "skin", "hair", "hairColor", "eyes", "eyeColor", "face"] as const;
const ageOptions = Array.from({ length: 8 }, (_, index) => ({
  id: index + 10,
  label: String(index + 10),
}));
const indexed = (labels: string[]) =>
  labels.map((label, id) => ({ id, label }));
const talentOptions = indexed(characterTalents);
const talentAllowed = (race: number, talent: number) =>
  talent !== 2 &&
  !(race === 1 && talent === 13) &&
  !(race === 2 && talent === 3);

function CharacterSelect({
  field,
  label,
  options,
  value,
  onChange,
}: {
  field: Exclude<keyof CharacterForm, "name">;
  label: string;
  options: { id: number; label: string }[];
  value: number;
  onChange: (id: number) => void;
}) {
  return (
    <Select
      name={field}
      value={String(value)}
      onChange={(key) => {
        const option = options.find(({ id }) => String(id) === key);
        if (option) onChange(option.id);
      }}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map(({ id, label }) => (
            <ListBox.Item id={String(id)} key={id} textValue={label}>
              {label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function CharacterCreation({ actions, busy, error }: { actions: GameActions; busy: boolean; error: string }) {
  const [form, setForm] = useState<CharacterForm>({
    name: "",
    race: 0,
    gender: 0,
    age: 17,
    talent: 0,
    body: 1,
    skin: 1,
    hair: 0,
    hairColor: 0,
    eyes: 0,
    eyeColor: 0,
    face: 0,
  });
  const set = (key: Exclude<keyof CharacterForm, "name">, value: number) =>
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "race" && !talentAllowed(value, current.talent)
        ? { talent: 0 }
        : {}),
    }));
  const prefix =
    import.meta.env.BASE_URL +
    "assets/frames/body_" +
    form.body +
    "_" +
    form.face +
    "_" +
    form.eyes +
    "_";
  const layer = (file: string, color: string) => (
    <span
      key={file}
      className="portrait-layer absolute inset-0 size-full [image-rendering:pixelated] [mask-size:100%_100%] [mask-repeat:no-repeat]"
      style={{
        backgroundColor: color,
        maskImage: "url(" + file + ")",
        WebkitMaskImage: "url(" + file + ")",
      }}
    />
  );
  return (
    <main className="game-ui min-h-dvh bg-background">
      <div className="creation-layout mx-auto grid max-w-[1080px] grid-cols-[minmax(0,1fr)_280px] gap-x-12 gap-y-6 px-7 py-10 max-[700px]:grid-cols-1 max-[700px]:gap-5 max-[700px]:px-[18px] max-[700px]:py-6 [&>header]:col-span-full [&_h1]:m-0 [&_h1]:text-[clamp(24px,4vw,32px)]">
        <header>
          <h1>Create Your Traveler</h1>
        </header>
        <Form
          className="creation-form min-w-0 grid gap-6 [--field-background:var(--surface)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && form.name.trim()) actions.create(form);
          }}
        >
          <TextField
            name="name"
            isRequired
            value={form.name}
            onChange={(name) => setForm((current) => ({ ...current, name }))}
          >
            <Label>Name</Label>
            <Input autoFocus maxLength={24} placeholder="Your name" />
          </TextField>
          <div className="creation-fields grid grid-cols-2 gap-4 max-[700px]:gap-3">
            {(["race", "gender"] as const).map((field) => (
              <CharacterSelect
                key={field}
                field={field}
                label={labels[field]}
                options={indexed(choices[field])}
                value={form[field]}
                onChange={(value) => set(field, value)}
              />
            ))}
            <CharacterSelect
              field="age"
              label="Age"
              options={ageOptions}
              value={form.age}
              onChange={(value) => set("age", value)}
            />
            <CharacterSelect
              field="talent"
              label="Talent"
              options={talentOptions.filter(({ id }) => talentAllowed(form.race, id))}
              value={form.talent}
              onChange={(value) => set("talent", value)}
            />
          </div>
          <fieldset className="creation-appearance min-w-0 m-0 border-0 p-0 [&_legend]:mb-3">
            <legend>Appearance</legend>
            <div className="creation-fields grid grid-cols-2 gap-4 max-[700px]:gap-3">
              {appearance.map((field) => (
                <CharacterSelect
                  key={field}
                  field={field}
                  label={labels[field]}
                  options={indexed(choices[field])}
                  value={form[field]}
                  onChange={(value) => set(field, value)}
                />
              ))}
            </div>
          </fieldset>
          {error && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
          <div className="creation-actions flex flex-wrap items-center gap-3">
            <Button type="submit" isDisabled={busy || !form.name.trim()}>
              Enter the Dungeon
            </Button>
            <Button variant="ghost" onPress={() => actions.navigate("title")}>
              Back
            </Button>
          </div>
        </Form>
        <Card className="creation-preview sticky! top-8 self-start p-6! text-center max-[700px]:static! max-[700px]:row-start-2 max-[700px]:grid! max-[700px]:grid-cols-[auto_minmax(0,1fr)] max-[700px]:gap-x-4 max-[700px]:gap-y-1 max-[700px]:p-4! max-[700px]:text-start [&_.card__header]:items-center max-[700px]:[&_.card__header]:items-start max-[700px]:[&_.card__header]:self-end [&_.card__title]:text-[18px] [&_.card__title]:[overflow-wrap:anywhere]">
          <div
            className="portrait relative mx-auto h-48 w-32 [image-rendering:pixelated] max-[700px]:row-span-2 max-[700px]:h-24 max-[700px]:w-16 [&_img]:absolute [&_img]:inset-0 [&_img]:size-full [&_img]:[image-rendering:pixelated]"
            role="img"
            aria-label={
              choices.race[form.race] +
              " traveler with " +
              choices.hair[form.hair] +
              " hair"
            }
          >
            <img src={prefix + "base.png"} alt="" />
            {layer(prefix + "outfit.png", outfits[form.race])}
            {layer(prefix + "skin.png", skins[form.skin])}
            {layer(prefix + "eyes.png", eyes[form.eyeColor])}
            {layer(import.meta.env.BASE_URL + "assets/frames/hair_mask_" + form.hair + ".png", hairs[form.hairColor])}
          </div>
          <Card.Header>
            <Card.Title render={(props) => <h2 {...props} />}>
              {form.name || "Your Traveler"}
            </Card.Title>
            <Card.Description>
              {choices.race[form.race]} · {characterTalents[form.talent]}
            </Card.Description>
          </Card.Header>
          <Card.Content className="creation-preview-copy font-[SourceCode,monospace] text-muted text-xs leading-[1.6] max-[700px]:justify-start">
            You can learn skills from other talents as you explore.
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}
