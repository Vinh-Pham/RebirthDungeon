import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/domain/content/game_content.dart';

import 'content_fixtures.dart';

/// Extracts the aggregated issue strings from a failing [GameContent.parse].
/// Extracts the aggregated issue strings from a failing [GameContent.parse],
/// optionally filtered to those whose path starts with [prefix].
List<String> issuesOf(Map<String, Object?> files, {String prefix = ''}) {
  try {
    GameContent.parse(files);
  } on DomainException catch (error) {
    final failure = error.failure as ValidationFailure;
    final issues = (failure.details['issues']! as List).cast<String>();
    return prefix.isEmpty
        ? issues
        : issues.where((issue) => issue.startsWith(prefix)).toList();
  }
  fail('Expected GameContent.parse to throw a DomainException.');
}

void main() {
  group('GameContent.parse — valid content', () {
    test('parses a complete set and exposes entities by id', () {
      final content = GameContent.parse(validContentSet());

      expect(content.heroes, hasLength(2));
      expect(content.monsters, hasLength(2));
      expect(content.hero('hero_knight').name, 'Knight');
      expect(content.monster('goblin_01').hp, 18);
      expect(content.ability('slash').power.max, 6);
      expect(content.die('die_standard').sides, 6);
      expect(content.item('health_potion').baseValue, 25);
      expect(content.lootTable('loot_basic').entries, hasLength(1));
      expect(content.dungeon('dungeon_halls').bossId, 'bone_king');
      expect(content.banner('banner_main').hardPity, 80);
      expect(content.rarityTable('rarity_standard').tiers, hasLength(3));
      expect(content.experienceCurve('curve_standard').xpToLevel.first, 10);
    });

    test('gameplay entities come from data, not code', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.monsters)[0]['hp'] = 99;

      expect(GameContent.parse(files).monster('goblin_01').hp, 99);
    });

    test('views are unmodifiable', () {
      final content = GameContent.parse(validContentSet());
      expect(
        () => content.heroes['hero_knight'] = content.hero('hero_knight'),
        throwsUnsupportedError,
      );
    });

    test('unknown lookups throw notFound failures', () {
      final content = GameContent.parse(validContentSet());
      expect(
        () => content.hero('nobody'),
        throwsA(
          isA<DomainException>().having(
            (e) => e.failure,
            'failure',
            isA<NotFoundFailure>(),
          ),
        ),
      );
    });
  });

  group('GameContent.parse — file structure and versioning', () {
    test('missing file is reported', () {
      final files = validContentSet()..remove(ContentFiles.items);
      expect(issuesOf(files), contains('items.json: Missing content file.'));
    });

    test('non-object file root is reported', () {
      final files = validContentSet();
      files[ContentFiles.heroes] = [1, 2, 3];
      expect(
        issuesOf(files),
        contains('heroes.json: Content file root must be a JSON object.'),
      );
    });

    test('missing schemaVersion is reported', () {
      final files = validContentSet();
      (files[ContentFiles.heroes]! as Map<String, Object?>).remove(
        'schemaVersion',
      );
      expect(
        issuesOf(files),
        contains(
          'heroes.json.schemaVersion: schemaVersion must be an integer '
          '(found: null).',
        ),
      );
    });

    test('unsupported schemaVersion fails with an actionable message', () {
      final files = validContentSet();
      (files[ContentFiles.heroes]! as Map<String, Object?>)['schemaVersion'] =
          2;
      expect(
        issuesOf(files),
        contains(
          'heroes.json.schemaVersion: Unsupported schemaVersion 2; this '
          'build reads version 1.',
        ),
      );
    });

    test('non-list entries are reported', () {
      final files = validContentSet();
      files[ContentFiles.heroes] = <String, Object?>{
        'schemaVersion': 1,
        'entries': 42,
      };
      expect(
        issuesOf(files),
        contains('heroes.json.entries: entries must be a JSON array.'),
      );
    });

    test('non-object entries are reported with their index', () {
      final files = validContentSet();
      files[ContentFiles.dice] = <String, Object?>{
        'schemaVersion': 1,
        'entries': ['a die'],
      };
      expect(
        issuesOf(files),
        contains('dice.json[0]: die entry must be a JSON object.'),
      );
    });
  });

  group('GameContent.parse — malformed entries', () {
    test('wrong field type is reported with a path', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.monsters)[0]['hp'] = 'many';
      final issues = issuesOf(files, prefix: 'monsters.json[0]');
      expect(issues, hasLength(1));
      expect(issues.single, contains('Invalid monster entry'));
      expect(issues.single, contains('String'));
    });

    test('invalid nested IntRange is reported with its message', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.monsters)[0]['xpReward'] = {
        'min': 9,
        'max': 1,
      };
      final issues = issuesOf(files, prefix: 'monsters.json[0]');
      expect(issues.single, startsWith('monsters.json[0]'));
      expect(issues.single, contains('IntRange requires min <= max.'));
    });

    test('unknown enum value is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.abilities)[0]['effect'] = 'explode';
      final issues = issuesOf(files, prefix: 'abilities.json[0]');
      expect(issues.single, startsWith('abilities.json[0]'));
      expect(issues.single, contains('Invalid ability entry'));
    });

    test('missing required field is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.items)[0].remove('baseValue');
      final issues = issuesOf(files, prefix: 'items.json[0]');
      expect(issues.single, startsWith('items.json[0]'));
      expect(issues.single, contains('Invalid item entry'));
    });
  });

  group('GameContent.parse — ids, duplicates, references', () {
    test('invalid content id format is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.heroes)[0]['id'] = 'Hero Knight';
      final issues = issuesOf(files);
      expect(
        issues,
        contains(
          'heroes.json[0].id: "Hero Knight" is not a valid content id '
          '(expected lowercase snake_case starting with a letter).',
        ),
      );
    });

    test('duplicate ids are reported with both indices', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.heroes).add(heroJson());
      final issues = issuesOf(files);
      expect(
        issues,
        contains(
          'heroes.json[2]: duplicate hero id "hero_knight" (first defined '
          'at index 0).',
        ),
      );
    });

    test('broken ability reference is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.heroes)[0]['abilityIds'] = [
        'slash',
        'meteor_swarm',
      ];
      expect(
        issuesOf(files),
        contains(
          'heroes.json[0].abilityIds[1]: unknown ability "meteor_swarm".',
        ),
      );
    });

    test('broken loot item reference is reported', () {
      final files = validContentSet();
      (entriesOf(files, ContentFiles.lootTables)[0]['entries']! as List)
              .first['itemId'] =
          'phoenix_feather';
      expect(
        issuesOf(files),
        contains(
          'loot_tables.json[0].entries[0].itemId: unknown item '
          '"phoenix_feather".',
        ),
      );
    });

    test('broken dungeon boss reference is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.dungeons)[0]['bossId'] = 'octopus_king';
      expect(
        issuesOf(files),
        contains('dungeons.json[0].bossId: unknown monster "octopus_king".'),
      );
    });

    test('broken banner featured hero reference is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.banners)[0]['featuredHeroIds'] = [
        'hero_knight',
        'hero_archmage',
      ];
      expect(
        issuesOf(files),
        contains(
          'banners.json[0].featuredHeroIds[1]: unknown hero '
          '"hero_archmage".',
        ),
      );
    });

    test('unknown rarity tier on an item is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.items)[1]['rarityId'] = 'rarity_mythic';
      expect(
        issuesOf(files),
        contains(
          'items.json[1].rarityId: unknown rarity tier "rarity_mythic".',
        ),
      );
    });

    test('rarity tier ids are unique across tables', () {
      final files = validContentSet();
      final tables = entriesOf(files, ContentFiles.rarityTables);
      tables.add(rarityTableJson(id: 'rarity_event'));
      expect(
        issuesOf(files).where((issue) => issue.contains('duplicate tier id')),
        hasLength(3),
      );
    });
  });

  group('GameContent.parse — rates and ranges', () {
    test('zero loot weights are rejected', () {
      final files = validContentSet();
      (entriesOf(files, ContentFiles.lootTables)[0]['entries']! as List)
              .first['weight'] =
          0;
      expect(
        issuesOf(files),
        contains(
          'loot_tables.json[0].entries[0].weight: weight must be > 0 '
          '(found 0).',
        ),
      );
    });

    test('zero rarity weights are rejected', () {
      final files = validContentSet();
      (entriesOf(files, ContentFiles.rarityTables)[0]['tiers']!
              as List<Map<String, Object?>>)[0]['weight'] =
          0;
      expect(
        issuesOf(files),
        contains(
          'rarity_tables.json[0].tiers[0].weight: weight must be > 0 '
          '(found 0).',
        ),
      );
    });

    test('out-of-range numeric fields are rejected', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.heroes)[0]['baseHp'] = 0;
      entriesOf(files, ContentFiles.heroes)[0]['dieCount'] = 99;
      entriesOf(files, ContentFiles.dice)[0]['sides'] = 1;
      entriesOf(files, ContentFiles.abilities)[0]['dieCost'] = 9;
      entriesOf(files, ContentFiles.dungeons)[0]['floorCount'] = 0;
      entriesOf(files, ContentFiles.banners)[0]['hardPity'] = 0;

      final issues = issuesOf(files);
      expect(
        issues,
        contains(
          'heroes.json[0].baseHp: baseHp must be within [1, 999] '
          '(found 0).',
        ),
      );
      expect(
        issues,
        contains(
          'heroes.json[0].dieCount: dieCount must be within [1, 8] '
          '(found 99).',
        ),
      );
      expect(
        issues,
        contains(
          'dice.json[0].sides: sides must be within [2, 20] '
          '(found 1).',
        ),
      );
      expect(
        issues,
        contains(
          'abilities.json[0].dieCost: dieCost must be within [1, 5] '
          '(found 9).',
        ),
      );
      expect(
        issues,
        contains(
          'dungeons.json[0].floorCount: floorCount must be within '
          '[1, 10] (found 0).',
        ),
      );
      expect(
        issues,
        contains('banners.json[0].hardPity: hardPity must be > 0 (found 0).'),
      );
    });

    test('die faces must match the side count', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.dice)[0]['faces'] = [
        {'value': 1, 'tags': <String>[]},
        {'value': 2, 'tags': <String>[]},
      ];
      expect(
        issuesOf(files),
        contains(
          'dice.json[0].faces: faces must list exactly sides (6) entries, '
          'found 2.',
        ),
      );
    });

    test('experience curves must be strictly increasing', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.experienceCurves)[0]['xpToLevel'] = [
        50,
        25,
        25,
      ];
      final issues = issuesOf(files);
      expect(
        issues,
        contains(
          'experience_curves.json[0].xpToLevel[1]: xpToLevel must be '
          'strictly increasing (25 must be > 50).',
        ),
      );
      expect(
        issues,
        contains(
          'experience_curves.json[0].xpToLevel[2]: xpToLevel must be '
          'strictly increasing (25 must be > 25).',
        ),
      );
    });
  });

  group('GameContent.parse — banner dates', () {
    test('unparseable dates are reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.banners)[0]['startsAt'] = 'not-a-date';
      expect(
        issuesOf(files),
        contains(
          'banners.json[0].startsAt: "not-a-date" is not a valid ISO-8601 '
          'timestamp.',
        ),
      );
    });

    test('endsAt before startsAt is reported', () {
      final files = validContentSet();
      entriesOf(files, ContentFiles.banners)[0]['startsAt'] =
          '2026-09-01T00:00:00Z';
      entriesOf(files, ContentFiles.banners)[0]['endsAt'] =
          '2026-08-01T00:00:00Z';
      expect(
        issuesOf(files),
        contains('banners.json[0].endsAt: endsAt must not be before startsAt.'),
      );
    });
  });

  group('GameContent.parse — multiple issues', () {
    test('collects every problem in one failure', () {
      final files = validContentSet()
        ..remove(ContentFiles.items)
        ..remove(ContentFiles.banners);
      entriesOf(files, ContentFiles.heroes)[0]['baseHp'] = -5;
      entriesOf(files, ContentFiles.heroes)[0]['abilityIds'] = ['nope'];

      final issues = issuesOf(files);
      expect(issues, hasLength(5), reason: 'issues: $issues');
      expect(issues.where((i) => i.startsWith('items.json')), hasLength(1));
      expect(issues.where((i) => i.startsWith('banners.json')), hasLength(1));
      expect(
        issues.where((i) => i.startsWith('loot_tables.json')),
        hasLength(1),
        reason: 'the missing items file also breaks the loot item reference',
      );
      expect(issues.where((i) => i.startsWith('heroes.json[0]')), hasLength(2));
    });
  });
}
