import { eyes, hairs, outfits, skins } from "../game/content/appearance";
import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import type { CharacterForm, GameActions } from "../app/contracts";

const talents = [
  "Close Combat",
  "Magic",
  "Adventure",
  "Archery",
  "Battle Alchemy",
  "Battle Astrology",
  "Carpentry",
  "Chain Slash",
  "Cooking",
  "Fate Astrology",
  "Glyphwrighting",
  "Gunslinger",
  "Holy Arts",
  "Lance Combat",
  "Martial Arts",
  "Medicine",
  "Mercantile",
  "Music",
  "Ninja",
  "Pet Training",
  "Puppetry",
  "Smithing",
  "Tailoring",
  "Transmutation",
];
const choices = {
  race: ["Human", "Elf", "Giant"],
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
  hairColor: [
    "Ash",
    "Plum",
    "Copper",
    "Gold",
    "Ink",
    "Chestnut",
    "Crimson",
    "Silver",
    "Glacier",
    "Wheat",
  ],
  eyes: ["Steady", "Narrow", "Wide"],
  eyeColor: [
    "Slate",
    "Teal",
    "Violet",
    "Amber",
    "Ice",
    "Steel Blue",
    "Sage",
    "Hazel",
    "Rose",
    "Silver",
  ],
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
const appearance = [
  "body",
  "skin",
  "hair",
  "hairColor",
  "eyes",
  "eyeColor",
  "face",
] as const;
const ageOptions = Array.from({ length: 8 }, (_, index) => ({
  id: index + 10,
  label: String(index + 10),
}));
const indexed = (labels: string[]) =>
  labels.map((label, id) => ({ id, label }));
const talentOptions = indexed(talents);
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

export function CharacterCreation({
  actions,
  busy,
  error,
}: {
  actions: GameActions;
  busy: boolean;
  error: string;
}) {
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
      className="portrait-layer"
      style={{
        backgroundColor: color,
        maskImage: "url(" + file + ")",
        WebkitMaskImage: "url(" + file + ")",
      }}
    />
  );
  return (
    <main className="game-ui">
      <div className="creation-layout">
        <header>
          <h1>Create Your Traveler</h1>
        </header>
        <Form
          className="creation-form"
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
          <div className="creation-fields">
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
              options={talentOptions.filter(({ id }) =>
                talentAllowed(form.race, id),
              )}
              value={form.talent}
              onChange={(value) => set("talent", value)}
            />
          </div>
          <fieldset className="creation-appearance">
            <legend>Appearance</legend>
            <div className="creation-fields">
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
          <div className="creation-actions">
            <Button type="submit" isDisabled={busy || !form.name.trim()}>
              Enter the Dungeon
            </Button>
            <Button variant="ghost" onPress={() => actions.navigate("title")}>
              Back
            </Button>
          </div>
        </Form>
        <Card className="creation-preview">
          <div
            className="portrait"
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
            {layer(
              import.meta.env.BASE_URL +
                "assets/frames/hair_mask_" +
                form.hair +
                ".png",
              hairs[form.hairColor],
            )}
          </div>
          <Card.Header>
            <Card.Title render={(props) => <h2 {...props} />}>
              {form.name || "Your Traveler"}
            </Card.Title>
            <Card.Description>
              {choices.race[form.race]} · {talents[form.talent]}
            </Card.Description>
          </Card.Header>
          <Card.Content className="creation-preview-copy">
            You can learn skills from other talents as you explore.
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}
