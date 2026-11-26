import type { Story } from "inkjs";

export type DialogueId =
  | "arrival"
  | "bank"
  | "blacksmith"
  | "gate"
  | "grocery"
  | "healer"
  | "shop";
export interface DialogueChoice {
  index: number;
  text: string;
  tags: string[];
}
export interface DialogueView {
  lines: string[];
  tags: string[];
  choices: DialogueChoice[];
  ended: boolean;
}
export interface DialogueSession {
  id: DialogueId;
  story: Story;
}
export interface SavedDialogue {
  id: DialogueId;
  state: string;
}

export async function createDialogue(id: DialogueId): Promise<DialogueSession> {
  const storyPath =
    id === "arrival" ? "arrival.json" : `web-services/${id}.json`;
  const [{ Story }, response] = await Promise.all([
    import("inkjs"),
    fetch(`${import.meta.env.BASE_URL}assets/dialogue/${storyPath}`),
  ]);
  if (!response.ok)
    throw new Error(`Could not load ${id} dialogue (${response.status})`);
  const source = (await response.text()).replace(/^\uFEFF/, "");
  return { id, story: new Story(JSON.parse(source)) };
}

export function advanceDialogue(session: DialogueSession): DialogueView {
  const lines: string[] = [];
  const tags: string[] = [];
  while (session.story.canContinue) {
    const line = session.story.Continue()?.trim();
    if (line) lines.push(line);
    tags.push(...(session.story.currentTags ?? []));
  }
  const choices = session.story.currentChoices.map((choice) => ({
    index: choice.index,
    text: choice.text,
    tags: choice.tags ?? [],
  }));
  return { lines, tags, choices, ended: choices.length === 0 };
}

export function chooseDialogue(
  session: DialogueSession,
  index: number,
): DialogueView {
  if (!session.story.currentChoices.some((choice) => choice.index === index)) {
    throw new Error(`Unknown dialogue choice ${index}`);
  }
  session.story.ChooseChoiceIndex(index);
  return advanceDialogue(session);
}

export function saveDialogue(session: DialogueSession): SavedDialogue {
  return {
    id: session.id,
    state: session.story.state.ToJson(),
  };
}

export async function restoreDialogue(
  saved: SavedDialogue,
): Promise<DialogueSession> {
  const session = await createDialogue(saved.id);
  session.story.state.LoadJson(saved.state);
  return session;
}
