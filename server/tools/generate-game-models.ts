/** Regenerate closed typed storage descriptors after updating the domain Zod schemas. Review the SQL migration separately. */
import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { ContentSchema } from '@rebirth/game-core/data/schemas/content';
import { BattleActorSchema } from '@rebirth/game-core/game/BattlePersistence';
import { fileURLToPath, URL as NodeURL } from 'node:url';
const out = fileURLToPath(
  new NodeURL('../src/db/schema/game/', import.meta.url),
);
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
function generate(file: string, roots: any[], header: string) {
  const tables: any[] = [];
  const models: any = {};
  function table(name: string, keys: any[], parent?: any) {
    const t: any = {
      name,
      keys,
      columns: [
        ...keys,
        ...(file === 'actors'
          ? [{ name: 'content_version', type: 'text', optional: false }]
          : []),
      ],
      parent,
      fields: [],
    };
    tables.push(t);
    return t;
  }
  function field(
    name: string,
    raw: any,
    t: any,
    prefix: string,
    context: any[],
  ): any {
    let s = raw,
      optional = false;
    while (
      ['optional', 'default', 'prefault', 'nullable'].includes(s._zod.def.type)
    ) {
      optional ||= ['optional', 'nullable', 'default'].includes(
        s._zod.def.type,
      );
      s = s._zod.def.innerType;
    }
    const def = s._zod.def;
    const column = prefix || snake(name);
    const base: any = { name, optional };
    if (
      ([
        'tiles',
        'config',
        'reference',
        'prerequisites',
        'hint',
        'award',
        'unlock',
      ].includes(name) &&
        !['string', 'number', 'enum', 'literal'].includes(def.type)) ||
      def.type === 'lazy'
    ) {
      t.columns.push({
        name: column,
        type: 'text',
        optional: optional || t.nullable,
        json: true,
      });
      return { ...base, kind: 'json', column };
    }
    let shape = def.type === 'object' ? s.shape : undefined;
    if (['union', 'discriminatedUnion'].includes(def.type)) {
      const opts = def.options;
      if (opts.every((v: any) => v._zod.def.type === 'object')) {
        shape = {};
        const keys = new Set<string>(
          opts.flatMap((o: any) => Object.keys(o.shape)),
        );
        for (const k of keys) {
          const schemas = opts.map((o: any) => o.shape[k]).filter(Boolean);
          shape[k] = (
            schemas.length === 1 ? schemas[0] : z.union(schemas)
          ).optional();
        }
      } else {
        const types = opts.map((v: any) => {
          while (v._zod.def.innerType) v = v._zod.def.innerType;
          return v._zod.def.type === 'literal'
            ? typeof v._zod.def.values[0]
            : v._zod.def.type === 'enum'
              ? 'string'
              : v._zod.def.type;
        });
        if (
          types.every((v: any) =>
            ['string', 'number', 'boolean'].includes(v),
          ) &&
          new Set(types).size === 1
        ) {
          const boolean = types[0] === 'boolean';
          t.columns.push({
            name: column,
            type: types[0] === 'string' ? 'text' : boolean ? 'integer' : 'real',
            optional: optional || t.nullable,
            boolean,
          });
          return { ...base, kind: 'scalar', column, boolean };
        }
        throw Error('Unmapped union ' + t.name + ':' + name);
      }
    }
    if (shape) {
      const presence = optional ? column + '_present' : undefined;
      if (presence)
        t.columns.push({
          name: presence,
          type: 'integer',
          optional: false,
          boolean: true,
        });
      const prior = t.nullable;
      t.nullable ||= optional;
      const fields = Object.entries(shape).map(([k, v]) =>
        field(k, v, t, column + '_' + snake(k), context),
      );
      t.nullable = prior;
      return { ...base, kind: 'object', presence, fields };
    }
    if (['array', 'record'].includes(def.type)) {
      const presence = optional ? column + '_present' : undefined;
      if (presence)
        t.columns.push({
          name: presence,
          type: 'integer',
          optional: false,
          boolean: true,
        });
      const key = column + (def.type === 'array' ? '_position' : '_key');
      const next = [
        ...context,
        {
          name: key,
          type: def.type === 'array' ? 'integer' : 'text',
          optional: false,
        },
      ];
      const child = table(t.name + '_' + column, next, {
        name: t.name,
        keys: context.map((k) => k.name),
      });
      const element = field(
        'value',
        def.type === 'array' ? def.element : def.valueType,
        child,
        '',
        next,
      );
      child.fields = [element];
      return {
        ...base,
        kind: def.type,
        presence,
        table: child.name,
        key,
        element,
      };
    }
    const boolean =
      def.type === 'boolean' ||
      (def.type === 'literal' &&
        def.values.every((v: any) => typeof v === 'boolean'));
    const numeric =
      def.type === 'number' ||
      (def.type === 'literal' &&
        def.values.every((v: any) => typeof v === 'number'));
    if (
      !boolean &&
      !numeric &&
      !['string', 'enum', 'literal'].includes(def.type)
    )
      throw Error('Unmapped ' + def.type + ' ' + t.name + ':' + name);
    let json: any;
    try {
      json = z.toJSONSchema(s);
    } catch {}
    const type = boolean
      ? 'integer'
      : numeric
        ? json?.type === 'integer'
          ? 'integer'
          : 'real'
        : 'text';
    const enumeration =
      def.type === 'enum'
        ? Object.values(def.entries)
        : def.type === 'literal'
          ? def.values
          : undefined;
    t.columns.push({
      name: column,
      type,
      optional: optional || t.nullable,
      boolean,
      enum: enumeration,
      min: json?.minimum,
      max: json?.maximum,
    });
    return { ...base, kind: 'scalar', column, boolean };
  }
  for (const root of roots) {
    const t = table(root.name, root.keys, root.parent);
    t.fields = Object.entries(root.schema.shape).map(([k, v]) =>
      field(k, v, t, '', root.keys),
    );
    models[root.collection] = {
      table: t.name,
      keys: root.keys.map((k: any) => k.name),
      fields: t.fields,
    };
  }
  let code =
    header +
    "\nimport {sql} from 'drizzle-orm';\nimport {sqliteTable, text, integer, real, primaryKey, foreignKey, check, uniqueIndex, type SQLiteTableExtraConfigValue} from 'drizzle-orm/sqlite-core';\nimport type {RelationalModel} from '../../relational-model.js';\n";
  const sym = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  for (const t of tables) {
    const checks: string[] = [];
    code += `\nexport const ${sym(t.name)} = sqliteTable('${t.name}', {\n`;
    for (const c of t.columns) {
      code += `  ${c.name}: ${c.type}('${c.name}')${c.optional ? '' : '.notNull()'},\n`;
      if (c.json) checks.push(`(${c.name} IS NULL OR json_valid(${c.name}))`);
      if (c.boolean) checks.push(`(${c.name} IS NULL OR ${c.name} IN (0,1))`);
      if (c.enum)
        checks.push(
          `(${c.name} IS NULL OR ${c.name} IN (${c.enum.map((x: any) => (typeof x === 'string' ? "'" + x.replaceAll("'", "''") + "'" : typeof x === 'boolean' ? +x : x)).join(',')}))`,
        );
      if (c.min !== undefined)
        checks.push(`(${c.name} IS NULL OR ${c.name} >= ${c.min})`);
      if (c.max !== undefined)
        checks.push(`(${c.name} IS NULL OR ${c.name} <= ${c.max})`);
    }
    code += '}, (t): SQLiteTableExtraConfigValue[] => [\n';
    code += `  primaryKey({columns:[${t.keys.map((k: any) => 't.' + k.name).join(',')}]}),\n`;
    if (file === 'catalog' && t.parent?.name === 'game_content_releases')
      code += `  uniqueIndex('${t.name}_definition_idx').on(t.content_version,t.definition_id),\n`;
    if (t.parent)
      code += `  foreignKey({columns:[${t.parent.keys.map((k: string) => 't.' + k).join(',')}], foreignColumns:[${t.parent.keys.map((k: string) => sym(t.parent.name) + '.' + k).join(',')}]}).onDelete('cascade'),\n`;
    if (file === 'actors')
      code += `  foreignKey({columns:[t.character_id,t.content_version],foreignColumns:[gameCharacters.id,gameCharacters.content_version]}).onDelete('cascade'),\n`;
    if (file === 'catalog' || file === 'actors') {
      const references: Record<string, string> = {
        skill_id: 'skills',
        item_id: 'items',
        status_id: 'status_effects',
        quest_id: 'quests',
        title_id: 'titles',
        enchant_id: 'enchants',
        recipe_id: 'skill_book_recipes',
        world_id: 'worlds',
        shop_id: 'shops',
        dungeon_id: 'dungeons',
        map_id: 'maps',
        enemy_id: 'enemies',
        atlas: 'atlases',
        encounter_map: 'maps',
      };
      for (const c of t.columns) {
        let target = Object.entries(references).find(
          ([suffix]) => c.name === suffix || c.name.endsWith('_' + suffix),
        )?.[1];
        if (
          c.name === 'value' &&
          (t.name.endsWith('_skills') || t.name.endsWith('_item_hotbar'))
        )
          target = t.name.endsWith('_skills') ? 'skills' : 'items';
        if (file === 'actors') {
          if (c.name === 'value_id' && t.name.endsWith('_statuses'))
            target = 'status_effects';
          if (c.name === 'inventory_key') target = 'items';
          if (
            c.name === 'cooldowns_key' ||
            c.name.endsWith('learned_skills_key')
          )
            target = 'skills';
          if (c.name.endsWith('_class_id')) target = 'classes';
        }
        if (
          target &&
          c.name !== 'content_version' &&
          c.name !== 'definition_id'
        )
          code += `  foreignKey({columns:[t.content_version,t.${c.name}],foreignColumns:[gameContent${target
            .split('_')
            .map((p) => p[0].toUpperCase() + p.slice(1))
            .join('')}.content_version,gameContent${target
            .split('_')
            .map((p) => p[0].toUpperCase() + p.slice(1))
            .join('')}.definition_id]}),\n`;
      }
    }
    for (let i = 0; i < checks.length; i++)
      code += `  check('${t.name}_check_${i}',sql\`${checks[i]}\`),\n`;
    code += ']);\n';
  }
  code += `\nexport const ${file}Models = ${JSON.stringify(models, null, 2)} as const satisfies Record<string, RelationalModel>;\n`;
  code += `export const ${file}Tables = [${tables.map((t) => sym(t.name)).join(',')}];\n`;
  if (file === 'actors') code = code.replace(', uniqueIndex,', ',');
  writeFileSync(out + file + '.ts', code);
  console.log(file, tables.length, 'tables');
}
generate(
  'catalog',
  Object.entries(ContentSchema.shape).map(([collection, raw]: any) => {
    let schema = raw;
    while (['optional', 'default'].includes(schema._zod.def.type))
      schema = schema._zod.def.innerType;
    if (schema._zod.def.type === 'array') schema = schema._zod.def.element;
    if (collection === 'enchantingRules' || schema._zod.def.type !== 'object')
      schema = z.object({ value: schema });
    return {
      collection,
      name: 'game_content_' + snake(collection),
      schema,
      keys: [
        { name: 'content_version', type: 'text', optional: false },
        { name: 'definition_id', type: 'text', optional: false },
        { name: 'position', type: 'integer', optional: false },
      ],
      parent: { name: 'game_content_releases', keys: ['content_version'] },
    };
  }),
  "// Generated typed catalog tables. Domain validation remains owned by ContentSchema.\nimport {gameContentReleases} from './releases.js';",
);
generate(
  'actors',
  [
    {
      collection: 'actor',
      name: 'game_encounter_actor_state',
      schema: BattleActorSchema,
      keys: [
        { name: 'character_id', type: 'text', optional: false },
        { name: 'actor_id', type: 'text', optional: false },
      ],
      parent: {
        name: 'game_encounter_actors',
        keys: ['character_id', 'actor_id'],
      },
    },
  ],
  "// Typed encounter snapshots; no generic property/value storage.\nimport {gameEncounterActors} from './encounters.js';\nimport {gameCharacters} from './characters.js';\nimport {gameContentItems,gameContentSkills,gameContentStatusEffects,gameContentEnchants,gameContentClasses,gameContentAtlases} from './catalog.js';",
);
