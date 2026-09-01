import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/domain/content/ability_data.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';

/// End-to-end check that the JSON actually shipped under `assets/data/`
/// parses and validates as a complete content set.
///
/// This is the only content test that touches Flutter's asset bundle; every
/// other content test stays pure Dart.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bundled starter content parses and validates', () async {
    final files = <String, Object?>{
      for (final fileName in ContentFiles.all)
        fileName: jsonDecode(
          await rootBundle.loadString('assets/data/$fileName'),
        ) as Map<String, dynamic>,
    };

    final content = GameContent.parse(files);

    expect(content.heroes, hasLength(2));
    expect(content.monsters, hasLength(4));
    expect(content.dice, hasLength(2));
    expect(content.abilities, hasLength(6));
    expect(content.statusEffects, hasLength(2));
    expect(content.items, hasLength(4));
    expect(content.lootTables, hasLength(2));
    expect(content.dungeons, hasLength(1));
    expect(content.banners, hasLength(1));
    expect(content.rarityTables, hasLength(1));
    expect(content.experienceCurves, hasLength(1));

    // Spot checks: entities really come from the shipped data.
    expect(content.monster('goblin_01').name, 'Goblin Scrapper');
    expect(content.monster('goblin_01').xpReward, isNotNull);
    expect(content.die('die_cursed').faces, hasLength(8));
    expect(content.ability('fireball').effect, AbilityEffect.damage);
  });

  test('all starter cross-file references resolve', () async {
    final files = <String, Object?>{
      for (final fileName in ContentFiles.all)
        fileName: jsonDecode(
          await rootBundle.loadString('assets/data/$fileName'),
        ) as Map<String, dynamic>,
    };
    final content = GameContent.parse(files);

    for (final hero in content.heroes.values) {
      for (final abilityId in hero.abilityIds) {
        expect(
          content.abilities[abilityId],
          isNotNull,
          reason: 'hero "${hero.id}" references ability "$abilityId"',
        );
      }
    }
    for (final monster in content.monsters.values) {
      for (final abilityId in monster.abilityIds) {
        expect(content.abilities[abilityId], isNotNull);
      }
      if (monster.lootTableId != null) {
        expect(content.lootTables[monster.lootTableId], isNotNull);
      }
    }
    for (final table in content.lootTables.values) {
      for (final entry in table.entries) {
        expect(content.items[entry.itemId], isNotNull);
      }
    }
    for (final dungeon in content.dungeons.values) {
      expect(content.monsters[dungeon.bossId], isNotNull);
      expect(content.lootTables[dungeon.lootTableId], isNotNull);
    }
    for (final banner in content.banners.values) {
      expect(content.rarityTables[banner.rarityTableId], isNotNull);
      for (final heroId in banner.featuredHeroIds) {
        expect(content.heroes[heroId], isNotNull);
      }
    }
    for (final item in content.items.values) {
      final tierIds = content.rarityTables.values
          .expand((table) => table.tiers.map((tier) => tier.id))
          .toSet();
      expect(
        tierIds,
        contains(item.rarityId),
        reason: 'item "${item.id}" references rarity "${item.rarityId}"',
      );
    }
  });
}
