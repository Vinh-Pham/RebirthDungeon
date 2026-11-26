import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Compiler } from "inkjs/full";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const output = path.join(root, "public/assets");
const assetRoot = path.join(root, "assets");
const audioRoot = path.join(assetRoot, "audio");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(assetRoot, output, {
  recursive: true,
  filter: (source) => source !== audioRoot,
});
await cp(path.join(root, "palette"), path.join(output, "palette"), {
  recursive: true,
});
const dialogueRoot = path.join(root, "assets/dialogue");
const serviceStories = (await readdir(path.join(dialogueRoot, "web-services")))
  .filter((file) => file.endsWith(".ink"))
  .sort()
  .map((file) => `web-services/${file}`);
for (const file of ["arrival.ink", ...serviceStories]) {
  const compiler = new Compiler(
    await readFile(path.join(dialogueRoot, file), "utf8"),
  );
  const story = compiler.Compile();
  const json = story.ToJson();
  if (compiler.errors.length || typeof json !== "string")
    throw new Error(`Invalid Ink story ${file}: ${compiler.errors.join("\n")}`);
  await writeFile(
    path.join(output, "dialogue", file.replace(/\.ink$/, ".json")),
    json,
  );
}

const frameRoot = path.join(root, "assets/frames");
const files = (await readdir(frameRoot))
  .filter((name) => name.endsWith(".png"))
  .sort();
const frames = {};
const composites = [];
const width = 1024;
let x = 0;
let y = 0;
let rowHeight = 0;
for (const file of files) {
  const input = path.join(frameRoot, file);
  const metadata = await sharp(input).metadata();
  const w = metadata.width;
  const h = metadata.height;
  if (!w || !h || w + 4 > width)
    throw new Error(`Unsupported frame dimensions: ${file}`);
  if (x + w + 4 > width) {
    x = 0;
    y += rowHeight;
    rowHeight = 0;
  }
  // Two transparent pixels separate frames, preventing sampling from neighbors.
  const left = x + 2;
  const top = y + 2;
  composites.push({ input, left, top });
  frames[path.basename(file, ".png")] = {
    frame: { x: left, y: top, w, h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w, h },
    sourceSize: { w, h },
  };
  x += w + 4;
  rowHeight = Math.max(rowHeight, h + 4);
}
const height = y + rowHeight;
await sharp({ create: { width, height, channels: 4, background: "#00000000" } })
  .composite(composites)
  .png()
  .toFile(path.join(output, "game-atlas.png"));
await writeFile(
  path.join(output, "game-atlas.json"),
  JSON.stringify(
    {
      frames,
      meta: {
        app: "Rebirth Dungeon asset pack",
        image: "game-atlas.png",
        format: "RGBA8888",
        size: { w: width, h: height },
        scale: "1",
      },
    },
    null,
    2,
  ) + "\n",
);

async function inventory(directory, prefix = "") {
  const entries = [];
  for (const item of (await readdir(directory, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const relative = prefix + item.name;
    const full = path.join(directory, item.name);
    if (full === audioRoot) continue;
    if (item.isDirectory())
      entries.push(...(await inventory(full, relative + "/")));
    else {
      const bytes = await readFile(full);
      entries.push({
        path: relative,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  return entries;
}
await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    {
      version: 1,
      frames: files.length,
      files: await inventory(assetRoot),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Packed ${files.length} pixel-art frames into ${width}×${height}; preserved all asset sources.`,
);
