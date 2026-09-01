/// Builds a complete, valid content set as decoded-JSON maps for tests.
///
/// Tests mutate the returned maps to produce malformed data; nested maps are
/// reachable via [entriesOf].
library;

import 'package:rebirth_dungeon/domain/content/game_content.dart';

Map<String, Object?> validContentSet() {
  return {
    ContentFiles.heroes: file([
      heroJson(),
      heroJson(
        id: 'hero_mage',
        name: 'Mage',
        baseHp: 20,
        dieCount: 4,
        abilityIds: const ['fireball', 'heal'],
      ),
    ]),
    ContentFiles.monsters: file([
      monsterJson(),
      monsterJson(
        id: 'slime',
        name: 'Slime',
        hp: 10,
        attack: 1,
        defense: 0,
        xpReward: const {'min': 1, 'max': 2},
      ),
      monsterJson(
        id: 'skeleton_01',
        name: 'Skeleton',
        hp: 22,
        attack: 3,
        defense: 2,
        abilityIds: const ['poison_strike'],
        xpReward: const {'min': 5, 'max': 8},
      ),
      monsterJson(
        id: 'bone_king',
        name: 'Bone King',
        hp: 60,
        attack: 5,
        defense: 3,
        abilityIds: const ['slash', 'power_strike'],
        xpReward: const {'min': 20, 'max': 30},
        lootTableId: 'loot_basic',
      ),
    ]),
    ContentFiles.dice: file([dieJson()]),
    ContentFiles.abilities: file([
      abilityJson(),
      abilityJson(
        id: 'fireball',
        effect: 'damage',
        power: const {'min': 4, 'max': 9},
        dieCost: 2,
      ),
      abilityJson(
        id: 'heal',
        effect: 'heal',
        power: const {'min': 3, 'max': 7},
      ),
      abilityJson(
        id: 'shield_wall',
        effect: 'shield',
        power: const {'min': 2, 'max': 5},
        dieCost: 2,
      ),
      abilityJson(
        id: 'poison_strike',
        effect: 'damage',
        power: const {'min': 1, 'max': 3},
        statusId: 'poison',
      ),
      abilityJson(
        id: 'power_strike',
        effect: 'damage',
        power: const {'min': 6, 'max': 12},
        dieCost: 3,
      ),
    ]),
    ContentFiles.statusEffects: file([statusEffectJson()]),
    ContentFiles.items: file([
      itemJson(),
      itemJson(
        id: 'ancient_coin',
        category: 'treasure',
        rarityId: 'rarity_epic',
        baseValue: 250,
      ),
    ]),
    ContentFiles.lootTables: file([lootTableJson()]),
    ContentFiles.dungeons: file([
      dungeonJson(bossId: 'bone_king'),
      dungeonJson(
        id: 'dungeon_cellar',
        floorCount: 2,
        roomsPerFloor: const {'min': 2, 'max': 3},
        monsterPool: const ['slime'],
        bossId: 'slime',
      ),
    ]),
    ContentFiles.banners: file([bannerJson()]),
    ContentFiles.rarityTables: file([rarityTableJson()]),
    ContentFiles.experienceCurves: file([xpCurveJson()]),
  };
}

/// The `entries` list of one file, for targeted mutation in tests.
List<Map<String, Object?>> entriesOf(
  Map<String, Object?> set,
  String fileName,
) => ((set[fileName] as Map<String, Object?>)['entries'] as List)
    .cast<Map<String, Object?>>();

Map<String, Object?> file(List<Object?> entries) => <String, Object?>{
  'schemaVersion': 1,
  'entries': entries,
};

Map<String, Object?> heroJson({
  String id = 'hero_knight',
  String name = 'Knight',
  int baseHp = 30,
  int baseAttack = 2,
  int baseDefense = 1,
  int dieCount = 3,
  String dieId = 'die_standard',
  List<Object?> abilityIds = const ['slash', 'shield_wall', 'poison_strike'],
}) => <String, Object?>{
  'id': id,
  'name': name,
  'baseHp': baseHp,
  'baseAttack': baseAttack,
  'baseDefense': baseDefense,
  'dieCount': dieCount,
  'dieId': dieId,
  'abilityIds': abilityIds,
};

Map<String, Object?> monsterJson({
  String id = 'goblin_01',
  String name = 'Goblin',
  int hp = 18,
  int attack = 2,
  int defense = 1,
  List<Object?> abilityIds = const [],
  Object? xpReward = const {'min': 2, 'max': 4},
  String? lootTableId = 'loot_basic',
}) => <String, Object?>{
  'id': id,
  'name': name,
  'hp': hp,
  'attack': attack,
  'defense': defense,
  'abilityIds': abilityIds,
  'xpReward': xpReward,
  'lootTableId': lootTableId,
};

Map<String, Object?> dieJson({
  String id = 'die_standard',
  int sides = 6,
  List<Object?>? faces,
}) => <String, Object?>{
  'id': id,
  'name': 'Standard Die',
  'sides': sides,
  'faces': ?faces,
};

Map<String, Object?> abilityJson({
  String id = 'slash',
  String effect = 'damage',
  Object? power = const {'min': 2, 'max': 6},
  int dieCost = 1,
  String? statusId,
}) => <String, Object?>{
  'id': id,
  'name': 'Slash',
  'effect': effect,
  'power': power,
  'dieCost': dieCost,
  'statusId': ?statusId,
};

Map<String, Object?> statusEffectJson({
  String id = 'poison',
  String kind = 'debuff',
  Object? potency = const {'min': 1, 'max': 3},
  Object? durationTurns = const {'min': 2, 'max': 4},
}) => <String, Object?>{
  'id': id,
  'name': 'Poison',
  'kind': kind,
  'potency': potency,
  'durationTurns': durationTurns,
};

Map<String, Object?> itemJson({
  String id = 'health_potion',
  String category = 'consumable',
  String rarityId = 'rarity_common',
  int baseValue = 25,
}) => <String, Object?>{
  'id': id,
  'name': 'Health Potion',
  'category': category,
  'rarityId': rarityId,
  'baseValue': baseValue,
};

Map<String, Object?> lootTableJson({String id = 'loot_basic'}) =>
    <String, Object?>{
      'id': id,
      'name': 'Basic Loot',
      'entries': [
        {
          'itemId': 'health_potion',
          'weight': 50,
          'quantity': {'min': 1, 'max': 1},
        },
      ],
    };

Map<String, Object?> dungeonJson({
  String id = 'dungeon_halls',
  int floorCount = 3,
  Object? roomsPerFloor = const {'min': 3, 'max': 5},
  List<Object?> monsterPool = const ['goblin_01'],
  String bossId = 'bone_king',
  String lootTableId = 'loot_basic',
}) => <String, Object?>{
  'id': id,
  'name': 'Halls',
  'floorCount': floorCount,
  'roomsPerFloor': roomsPerFloor,
  'monsterPool': monsterPool,
  'bossId': bossId,
  'lootTableId': lootTableId,
  'recommendedLevel': 1,
};

Map<String, Object?> bannerJson({
  String id = 'banner_main',
  String? startsAt,
  String? endsAt,
}) => <String, Object?>{
  'id': id,
  'name': 'Main Banner',
  'version': 1,
  'costPerPull': 100,
  'rarityTableId': 'rarity_standard',
  'featuredHeroIds': const ['hero_knight'],
  'hardPity': 80,
  'startsAt': ?startsAt,
  'endsAt': ?endsAt,
};

Map<String, Object?> rarityTableJson({String id = 'rarity_standard'}) =>
    <String, Object?>{
      'id': id,
      'name': 'Standard Rarity',
      'tiers': [
        {'id': 'rarity_common', 'name': 'Common', 'weight': 600},
        {'id': 'rarity_uncommon', 'name': 'Uncommon', 'weight': 300},
        {'id': 'rarity_epic', 'name': 'Epic', 'weight': 18},
      ],
    };

Map<String, Object?> xpCurveJson({String id = 'curve_standard'}) =>
    <String, Object?>{
      'id': id,
      'name': 'Standard Curve',
      'xpToLevel': const [10, 25, 45],
    };
