import 'dart:collection';

import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/ids/content_id.dart';

import 'ability_data.dart';
import 'banner_data.dart';
import 'content_issue.dart';
import 'die_data.dart';
import 'dungeon_data.dart';
import 'experience_curve_data.dart';
import 'hero_data.dart';
import 'item_data.dart';
import 'loot_table_data.dart';
import 'monster_data.dart';
import 'rarity_table_data.dart';
import 'status_effect_data.dart';

/// Canonical content file names and the schema version they speak.
class ContentFiles {
  const ContentFiles._();

  static const String heroes = 'heroes.json';
  static const String monsters = 'monsters.json';
  static const String dice = 'dice.json';
  static const String abilities = 'abilities.json';
  static const String statusEffects = 'status_effects.json';
  static const String items = 'items.json';
  static const String lootTables = 'loot_tables.json';
  static const String dungeons = 'dungeons.json';
  static const String banners = 'banners.json';
  static const String rarityTables = 'rarity_tables.json';
  static const String experienceCurves = 'experience_curves.json';

  /// Every file a complete content set must contain.
  static const List<String> all = [
    heroes,
    monsters,
    dice,
    abilities,
    statusEffects,
    items,
    lootTables,
    dungeons,
    banners,
    rarityTables,
    experienceCurves,
  ];
}

/// The parsed, fully validated content set of the game.
///
/// [parse] receives already-decoded JSON per file (reading and decoding the
/// asset bundle or a remote payload is the data layer's job) and either
/// returns a resolved [GameContent] or throws a single [DomainException]
/// whose `Failure.details['issues']` lists every problem with a
/// `file[index].field` path.
///
/// Content formats are versioned per file via `schemaVersion`
/// ([currentSchemaVersion]); bump that constant and add a migration path
/// when a format change becomes necessary after saves exist.
class GameContent {
  GameContent._(
    this._heroes,
    this._monsters,
    this._dice,
    this._abilities,
    this._statusEffects,
    this._items,
    this._lootTables,
    this._dungeons,
    this._banners,
    this._rarityTables,
    this._experienceCurves,
  );

  /// The schema version this build knows how to read.
  static const int currentSchemaVersion = 1;

  final Map<String, HeroData> _heroes;
  final Map<String, MonsterData> _monsters;
  final Map<String, DieData> _dice;
  final Map<String, AbilityData> _abilities;
  final Map<String, StatusEffectData> _statusEffects;
  final Map<String, ItemData> _items;
  final Map<String, LootTableData> _lootTables;
  final Map<String, DungeonData> _dungeons;
  final Map<String, BannerData> _banners;
  final Map<String, RarityTableData> _rarityTables;
  final Map<String, ExperienceCurveData> _experienceCurves;

  UnmodifiableMapView<String, HeroData> get heroes =>
      UnmodifiableMapView(_heroes);
  UnmodifiableMapView<String, MonsterData> get monsters =>
      UnmodifiableMapView(_monsters);
  UnmodifiableMapView<String, DieData> get dice => UnmodifiableMapView(_dice);
  UnmodifiableMapView<String, AbilityData> get abilities =>
      UnmodifiableMapView(_abilities);
  UnmodifiableMapView<String, StatusEffectData> get statusEffects =>
      UnmodifiableMapView(_statusEffects);
  UnmodifiableMapView<String, ItemData> get items =>
      UnmodifiableMapView(_items);
  UnmodifiableMapView<String, LootTableData> get lootTables =>
      UnmodifiableMapView(_lootTables);
  UnmodifiableMapView<String, DungeonData> get dungeons =>
      UnmodifiableMapView(_dungeons);
  UnmodifiableMapView<String, BannerData> get banners =>
      UnmodifiableMapView(_banners);
  UnmodifiableMapView<String, RarityTableData> get rarityTables =>
      UnmodifiableMapView(_rarityTables);
  UnmodifiableMapView<String, ExperienceCurveData> get experienceCurves =>
      UnmodifiableMapView(_experienceCurves);

  /// Throwing lookups — entities must exist for the game to run, so a miss
  /// is always a [Failure.notFound].
  HeroData hero(String id) => _heroes[id] ?? (throw _notFound('hero', id));
  MonsterData monster(String id) =>
      _monsters[id] ?? (throw _notFound('monster', id));
  DieData die(String id) => _dice[id] ?? (throw _notFound('die', id));
  AbilityData ability(String id) =>
      _abilities[id] ?? (throw _notFound('ability', id));
  StatusEffectData statusEffect(String id) =>
      _statusEffects[id] ?? (throw _notFound('status effect', id));
  ItemData item(String id) => _items[id] ?? (throw _notFound('item', id));
  LootTableData lootTable(String id) =>
      _lootTables[id] ?? (throw _notFound('loot table', id));
  DungeonData dungeon(String id) =>
      _dungeons[id] ?? (throw _notFound('dungeon', id));
  BannerData banner(String id) =>
      _banners[id] ?? (throw _notFound('banner', id));
  RarityTableData rarityTable(String id) =>
      _rarityTables[id] ?? (throw _notFound('rarity table', id));
  ExperienceCurveData experienceCurve(String id) =>
      _experienceCurves[id] ?? (throw _notFound('experience curve', id));

  static DomainException _notFound(String entity, String id) =>
      DomainException(Failure.notFound(entity: entity, id: id));

  /// Parses and validates a whole content set.
  ///
  /// [files] maps [ContentFiles] names to their decoded JSON root object.
  static GameContent parse(Map<String, Object?> files) {
    final ctx = _ValidationContext();

    final heroes = _parseEntries(
      files,
      ContentFiles.heroes,
      'hero',
      HeroData.fromJson,
      ctx,
    );
    final monsters = _parseEntries(
      files,
      ContentFiles.monsters,
      'monster',
      MonsterData.fromJson,
      ctx,
    );
    final dice = _parseEntries(
      files,
      ContentFiles.dice,
      'die',
      DieData.fromJson,
      ctx,
    );
    final abilities = _parseEntries(
      files,
      ContentFiles.abilities,
      'ability',
      AbilityData.fromJson,
      ctx,
    );
    final statusEffects = _parseEntries(
      files,
      ContentFiles.statusEffects,
      'status effect',
      StatusEffectData.fromJson,
      ctx,
    );
    final items = _parseEntries(
      files,
      ContentFiles.items,
      'item',
      ItemData.fromJson,
      ctx,
    );
    final lootTables = _parseEntries(
      files,
      ContentFiles.lootTables,
      'loot table',
      LootTableData.fromJson,
      ctx,
    );
    final dungeons = _parseEntries(
      files,
      ContentFiles.dungeons,
      'dungeon',
      DungeonData.fromJson,
      ctx,
    );
    final banners = _parseEntries(
      files,
      ContentFiles.banners,
      'banner',
      BannerData.fromJson,
      ctx,
    );
    final rarityTables = _parseEntries(
      files,
      ContentFiles.rarityTables,
      'rarity table',
      RarityTableData.fromJson,
      ctx,
    );
    final experienceCurves = _parseEntries(
      files,
      ContentFiles.experienceCurves,
      'experience curve',
      ExperienceCurveData.fromJson,
      ctx,
    );

    _validateAll(
      ctx: ctx,
      heroes: heroes,
      monsters: monsters,
      dice: dice,
      abilities: abilities,
      statusEffects: statusEffects,
      items: items,
      lootTables: lootTables,
      dungeons: dungeons,
      banners: banners,
      rarityTables: rarityTables,
      experienceCurves: experienceCurves,
    );

    if (ctx.issues.isNotEmpty) {
      throw DomainException(
        Failure.validation(
          message:
              'Content validation failed with ${ctx.issues.length} issue(s).',
          details: {
            'issues': ctx.issues.map((issue) => issue.toString()).toList(),
          },
        ),
      );
    }

    Map<String, T> byId<T extends Object>(
      List<T> list,
      String Function(T) idOf,
    ) => {for (final entry in list) idOf(entry): entry};

    return GameContent._(
      byId(heroes, (h) => h.id),
      byId(monsters, (m) => m.id),
      byId(dice, (d) => d.id),
      byId(abilities, (a) => a.id),
      byId(statusEffects, (s) => s.id),
      byId(items, (i) => i.id),
      byId(lootTables, (l) => l.id),
      byId(dungeons, (d) => d.id),
      byId(banners, (b) => b.id),
      byId(rarityTables, (r) => r.id),
      byId(experienceCurves, (c) => c.id),
    );
  }

  // ---------------------------------------------------------------------------
  // Parsing
  // ---------------------------------------------------------------------------

  static List<T> _parseEntries<T>(
    Map<String, Object?> files,
    String fileName,
    String typeLabel,
    T Function(Map<String, dynamic> json) fromJson,
    _ValidationContext ctx,
  ) {
    final decoded = files[fileName];
    if (decoded == null) {
      ctx.add(fileName, 'Missing content file.');
      return const [];
    }

    final Map<String, dynamic> root;
    try {
      root = Map<String, dynamic>.from(decoded as Map);
    } catch (_) {
      ctx.add(fileName, 'Content file root must be a JSON object.');
      return const [];
    }

    final version = root['schemaVersion'];
    if (version is! int) {
      ctx.add(
        '$fileName.schemaVersion',
        'schemaVersion must be an integer (found: $version).',
      );
      return const [];
    }
    if (version != currentSchemaVersion) {
      ctx.add(
        '$fileName.schemaVersion',
        'Unsupported schemaVersion $version; this build reads version '
            '$currentSchemaVersion.',
      );
      return const [];
    }

    final entries = root['entries'];
    if (entries is! List) {
      ctx.add('$fileName.entries', 'entries must be a JSON array.');
      return const [];
    }

    final parsed = <T>[];
    for (var i = 0; i < entries.length; i++) {
      final path = '$fileName[$i]';
      final entry = entries[i];
      if (entry is! Map) {
        ctx.add(path, '$typeLabel entry must be a JSON object.');
        continue;
      }
      try {
        parsed.add(fromJson(Map<String, dynamic>.from(entry)));
      } catch (error) {
        ctx.add(path, 'Invalid $typeLabel entry: ${_describeError(error)}');
      }
    }
    return parsed;
  }

  static String _describeError(Object error) {
    if (error is DomainException) {
      return error.failure.message;
    }
    return error.toString();
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  static void _validateAll({
    required _ValidationContext ctx,
    required List<HeroData> heroes,
    required List<MonsterData> monsters,
    required List<DieData> dice,
    required List<AbilityData> abilities,
    required List<StatusEffectData> statusEffects,
    required List<ItemData> items,
    required List<LootTableData> lootTables,
    required List<DungeonData> dungeons,
    required List<BannerData> banners,
    required List<RarityTableData> rarityTables,
    required List<ExperienceCurveData> experienceCurves,
  }) {
    ctx.checkIds('heroes.json', heroes, (h) => h.id, 'hero');
    ctx.checkIds('monsters.json', monsters, (m) => m.id, 'monster');
    ctx.checkIds('dice.json', dice, (d) => d.id, 'die');
    ctx.checkIds('abilities.json', abilities, (a) => a.id, 'ability');
    ctx.checkIds(
      'status_effects.json',
      statusEffects,
      (s) => s.id,
      'status effect',
    );
    ctx.checkIds('items.json', items, (i) => i.id, 'item');
    ctx.checkIds('loot_tables.json', lootTables, (l) => l.id, 'loot table');
    ctx.checkIds('dungeons.json', dungeons, (d) => d.id, 'dungeon');
    ctx.checkIds('banners.json', banners, (b) => b.id, 'banner');
    ctx.checkIds(
      'rarity_tables.json',
      rarityTables,
      (r) => r.id,
      'rarity table',
    );
    ctx.checkIds(
      'experience_curves.json',
      experienceCurves,
      (c) => c.id,
      'curve',
    );

    final abilityIds = abilities.map((a) => a.id).toSet();
    final monsterIds = monsters.map((m) => m.id).toSet();
    final itemIds = items.map((i) => i.id).toSet();
    final lootTableIds = lootTables.map((l) => l.id).toSet();
    final heroIds = heroes.map((h) => h.id).toSet();
    final dieIds = dice.map((d) => d.id).toSet();
    final statusEffectIds = statusEffects.map((s) => s.id).toSet();
    final rarityTableIds = rarityTables.map((r) => r.id).toSet();
    final rarityTierIds = <String>{
      for (final table in rarityTables)
        for (final tier in table.tiers) tier.id,
    };
    ctx.checkUniqueValues(
      'rarity_tables.json',
      rarityTables,
      'tier id',
      (r) => r.tiers.map((t) => t.id),
    );

    for (var i = 0; i < heroes.length; i++) {
      final hero = heroes[i];
      final base = 'heroes.json[$i]';
      ctx.nonEmpty(hero.name, '$base.name', 'hero name');
      ctx.inclusiveRange(hero.baseHp, 1, 999, '$base.baseHp', 'baseHp');
      ctx.nonNegative(hero.baseAttack, '$base.baseAttack', 'baseAttack');
      ctx.nonNegative(hero.baseDefense, '$base.baseDefense', 'baseDefense');
      ctx.inclusiveRange(hero.dieCount, 1, 8, '$base.dieCount', 'dieCount');
      ctx.reference(
        refId: hero.dieId,
        path: '$base.dieId',
        refKind: 'die',
        known: dieIds,
      );
      ctx.nonEmptyList(hero.abilityIds, '$base.abilityIds', 'abilityIds');
      for (var j = 0; j < hero.abilityIds.length; j++) {
        ctx.reference(
          refId: hero.abilityIds[j],
          path: '$base.abilityIds[$j]',
          refKind: 'ability',
          known: abilityIds,
        );
      }
    }

    for (var i = 0; i < monsters.length; i++) {
      final monster = monsters[i];
      final base = 'monsters.json[$i]';
      ctx.nonEmpty(monster.name, '$base.name', 'monster name');
      ctx.inclusiveRange(monster.hp, 1, 9999, '$base.hp', 'hp');
      ctx.nonNegative(monster.attack, '$base.attack', 'attack');
      ctx.nonNegative(monster.defense, '$base.defense', 'defense');
      for (var j = 0; j < monster.abilityIds.length; j++) {
        ctx.reference(
          refId: monster.abilityIds[j],
          path: '$base.abilityIds[$j]',
          refKind: 'ability',
          known: abilityIds,
        );
      }
      ctx.reference(
        refId: monster.lootTableId,
        path: '$base.lootTableId',
        refKind: 'loot table',
        known: lootTableIds,
      );
    }

    for (var i = 0; i < dice.length; i++) {
      final die = dice[i];
      final base = 'dice.json[$i]';
      ctx.nonEmpty(die.name, '$base.name', 'die name');
      ctx.inclusiveRange(die.sides, 2, 20, '$base.sides', 'sides');
      final faces = die.faces;
      if (faces != null) {
        if (faces.length != die.sides) {
          ctx.add(
            '$base.faces',
            'faces must list exactly sides (${die.sides}) entries, found ${faces.length}.',
          );
        }
        for (var j = 0; j < faces.length; j++) {
          for (var k = 0; k < faces[j].tags.length; k++) {
            ctx.nonEmpty(faces[j].tags[k], '$base.faces[$j].tags[$k]', 'tag');
          }
        }
      }
    }

    for (var i = 0; i < abilities.length; i++) {
      final ability = abilities[i];
      final base = 'abilities.json[$i]';
      ctx.nonEmpty(ability.name, '$base.name', 'ability name');
      ctx.nonNegative(ability.power.min, '$base.power.min', 'power.min');
      ctx.inclusiveRange(ability.dieCost, 1, 5, '$base.dieCost', 'dieCost');
      ctx.reference(
        refId: ability.statusId,
        path: '$base.statusId',
        refKind: 'status effect',
        known: statusEffectIds,
      );
    }

    for (var i = 0; i < statusEffects.length; i++) {
      final effect = statusEffects[i];
      final base = 'status_effects.json[$i]';
      ctx.nonEmpty(effect.name, '$base.name', 'status effect name');
      ctx.nonNegative(effect.potency.min, '$base.potency.min', 'potency.min');
      ctx.inclusiveRange(
        effect.durationTurns.min,
        1,
        99,
        '$base.durationTurns.min',
        'durationTurns.min',
      );
    }

    for (var i = 0; i < items.length; i++) {
      final item = items[i];
      final base = 'items.json[$i]';
      ctx.nonEmpty(item.name, '$base.name', 'item name');
      ctx.nonNegative(item.baseValue, '$base.baseValue', 'baseValue');
      ctx.reference(
        refId: item.rarityId,
        path: '$base.rarityId',
        refKind: 'rarity tier',
        known: rarityTierIds,
      );
    }

    for (var i = 0; i < lootTables.length; i++) {
      final table = lootTables[i];
      final base = 'loot_tables.json[$i]';
      ctx.nonEmpty(table.name, '$base.name', 'loot table name');
      ctx.nonEmptyList(table.entries, '$base.entries', 'entries');
      var totalWeight = 0;
      for (var j = 0; j < table.entries.length; j++) {
        final entry = table.entries[j];
        final entryPath = '$base.entries[$j]';
        ctx.reference(
          refId: entry.itemId,
          path: '$entryPath.itemId',
          refKind: 'item',
          known: itemIds,
        );
        ctx.positive(entry.weight, '$entryPath.weight', 'weight');
        totalWeight += entry.weight;
      }
      if (table.entries.isNotEmpty && totalWeight <= 0) {
        ctx.add('$base.entries', 'weights must sum to a positive total.');
      }
    }

    for (var i = 0; i < dungeons.length; i++) {
      final dungeon = dungeons[i];
      final base = 'dungeons.json[$i]';
      ctx.nonEmpty(dungeon.name, '$base.name', 'dungeon name');
      ctx.inclusiveRange(
        dungeon.floorCount,
        1,
        10,
        '$base.floorCount',
        'floorCount',
      );
      ctx.positive(
        dungeon.roomsPerFloor.min,
        '$base.roomsPerFloor.min',
        'roomsPerFloor.min',
      );
      ctx.nonEmptyList(dungeon.monsterPool, '$base.monsterPool', 'monsterPool');
      for (var j = 0; j < dungeon.monsterPool.length; j++) {
        ctx.reference(
          refId: dungeon.monsterPool[j],
          path: '$base.monsterPool[$j]',
          refKind: 'monster',
          known: monsterIds,
        );
      }
      ctx.reference(
        refId: dungeon.bossId,
        path: '$base.bossId',
        refKind: 'monster',
        known: monsterIds,
      );
      ctx.reference(
        refId: dungeon.lootTableId,
        path: '$base.lootTableId',
        refKind: 'loot table',
        known: lootTableIds,
      );
      ctx.positive(
        dungeon.recommendedLevel,
        '$base.recommendedLevel',
        'recommendedLevel',
      );
    }

    for (var i = 0; i < banners.length; i++) {
      final banner = banners[i];
      final base = 'banners.json[$i]';
      ctx.nonEmpty(banner.name, '$base.name', 'banner name');
      ctx.positive(banner.version, '$base.version', 'version');
      ctx.positive(banner.costPerPull, '$base.costPerPull', 'costPerPull');
      ctx.positive(banner.hardPity, '$base.hardPity', 'hardPity');
      ctx.reference(
        refId: banner.rarityTableId,
        path: '$base.rarityTableId',
        refKind: 'rarity table',
        known: rarityTableIds,
      );
      ctx.nonEmptyList(
        banner.featuredHeroIds,
        '$base.featuredHeroIds',
        'featuredHeroIds',
      );
      for (var j = 0; j < banner.featuredHeroIds.length; j++) {
        ctx.reference(
          refId: banner.featuredHeroIds[j],
          path: '$base.featuredHeroIds[$j]',
          refKind: 'hero',
          known: heroIds,
        );
      }
      final startsAt = _parseDate(banner.startsAt, '$base.startsAt', ctx);
      final endsAt = _parseDate(banner.endsAt, '$base.endsAt', ctx);
      if (startsAt != null && endsAt != null && endsAt.isBefore(startsAt)) {
        ctx.add('$base.endsAt', 'endsAt must not be before startsAt.');
      }
    }

    for (var i = 0; i < rarityTables.length; i++) {
      final table = rarityTables[i];
      final base = 'rarity_tables.json[$i]';
      ctx.nonEmpty(table.name, '$base.name', 'rarity table name');
      ctx.nonEmptyList(table.tiers, '$base.tiers', 'tiers');
      for (var j = 0; j < table.tiers.length; j++) {
        final tier = table.tiers[j];
        final tierPath = '$base.tiers[$j]';
        ctx.idFormat(tier.id, '$tierPath.id');
        ctx.nonEmpty(tier.name, '$tierPath.name', 'tier name');
        ctx.positive(tier.weight, '$tierPath.weight', 'weight');
      }
    }

    for (var i = 0; i < experienceCurves.length; i++) {
      final curve = experienceCurves[i];
      final base = 'experience_curves.json[$i]';
      ctx.nonEmpty(curve.name, '$base.name', 'curve name');
      ctx.nonEmptyList(curve.xpToLevel, '$base.xpToLevel', 'xpToLevel');
      for (var j = 0; j < curve.xpToLevel.length; j++) {
        ctx.nonNegative(
          curve.xpToLevel[j],
          '$base.xpToLevel[$j]',
          'xpToLevel entry',
        );
        if (j > 0 && curve.xpToLevel[j] <= curve.xpToLevel[j - 1]) {
          ctx.add(
            '$base.xpToLevel[$j]',
            'xpToLevel must be strictly increasing (${curve.xpToLevel[j]} must be > ${curve.xpToLevel[j - 1]}).',
          );
        }
      }
    }
  }

  static DateTime? _parseDate(
    String? raw,
    String path,
    _ValidationContext ctx,
  ) {
    if (raw == null) {
      return null;
    }
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) {
      ctx.add(path, '"$raw" is not a valid ISO-8601 timestamp.');
    }
    return parsed;
  }
}

class _ValidationContext {
  final List<ContentIssue> issues = <ContentIssue>[];

  void add(String path, String message) =>
      issues.add(ContentIssue(path: path, message: message));

  void nonEmpty(String? value, String path, String label) {
    if (value == null || value.trim().isEmpty) {
      add(path, '$label must not be empty.');
    }
  }

  void nonNegative(int value, String path, String label) {
    if (value < 0) {
      add(path, '$label must be >= 0 (found $value).');
    }
  }

  void positive(int value, String path, String label) {
    if (value <= 0) {
      add(path, '$label must be > 0 (found $value).');
    }
  }

  void inclusiveRange(int value, int min, int max, String path, String label) {
    if (value < min || value > max) {
      add(path, '$label must be within [$min, $max] (found $value).');
    }
  }

  void nonEmptyList(List<Object?> values, String path, String label) {
    if (values.isEmpty) {
      add(path, '$label must not be empty.');
    }
  }

  void idFormat(String? id, String path) {
    if (id != null && !isValidContentId(id)) {
      add(
        path,
        '"$id" is not a valid content id (expected lowercase '
        'snake_case starting with a letter).',
      );
    }
  }

  void reference({
    required String? refId,
    required String path,
    required String refKind,
    required Set<String> known,
  }) {
    if (refId == null) {
      return;
    }
    idFormat(refId, path);
    if (!known.contains(refId)) {
      add(path, 'unknown $refKind "$refId".');
    }
  }

  /// Uniqueness within one table plus content-id format checks.
  void checkIds<T>(
    String fileName,
    List<T> entries,
    String Function(T) idOf,
    String typeLabel,
  ) {
    final firstIndexById = <String, int>{};
    for (var i = 0; i < entries.length; i++) {
      final id = idOf(entries[i]);
      final path = '$fileName[$i]';
      idFormat(id, '$path.id');
      final first = firstIndexById[id];
      if (first != null) {
        add(
          path,
          'duplicate $typeLabel id "$id" (first defined at index $first).',
        );
      } else {
        firstIndexById[id] = i;
      }
    }
  }

  /// Uniqueness of derived values (e.g. rarity tier ids across tables).
  void checkUniqueValues<T>(
    String fileName,
    List<T> entries,
    String valueLabel,
    Iterable<String> Function(T) valuesOf,
  ) {
    final firstPathByValue = <String, String>{};
    for (var i = 0; i < entries.length; i++) {
      for (final value in valuesOf(entries[i])) {
        final path = '$fileName[$i]';
        final existing = firstPathByValue[value];
        if (existing != null) {
          add(
            path,
            'duplicate $valueLabel "$value" (first defined in $existing).',
          );
        } else {
          firstPathByValue[value] = path;
        }
      }
    }
  }
}
