import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  advanceDialogue,
  chooseDialogue,
  createDialogue,
  restoreDialogue,
  saveDialogue,
} from "../../src/game/content/ink";

describe("current settlement stories", () => {
  it("restores service dialogue choices from saved continuations", async () => {
    const { Compiler } = await import("inkjs/full");
    vi.stubGlobal("fetch", async (url: string) => {
      const sourcePath = url
        .replace("/assets/", "assets/")
        .replace(/\.json$/, ".ink");
      const story = new Compiler(await readFile(sourcePath, "utf8")).Compile();
      return new Response(story.ToJson() ?? "");
    });
    try {
      for (const id of [
        "bank",
        "blacksmith",
        "gate",
        "grocery",
        "healer",
        "shop",
      ] as const) {
        const session = await createDialogue(id);
        const opening = advanceDialogue(session);
        const saved = saveDialogue(session);
        const restored = await restoreDialogue(saved);
        const branch = chooseDialogue(restored, opening.choices[0].index);
        expect(opening.lines.concat(branch.lines).join(" ")).not.toMatch(
          /Alby|Elara|Aren|Petra|Nell|Bram/,
        );
        expect(branch.tags).toEqual([]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
