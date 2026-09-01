import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/random/random_source.dart';
import 'package:rebirth_dungeon/core/random/seeded_random_source.dart';

void main() {
  group('SeededRandomSource', () {
    test('same seed produces identical sequences', () {
      List<int> intSequence(RandomSource source) =>
          List.generate(500, (_) => source.nextInt(1 << 20));
      List<double> doubleSequence(RandomSource source) =>
          List.generate(500, (_) => source.nextDouble());

      final first = SeededRandomSource(42);
      final second = SeededRandomSource(42);

      expect(intSequence(first), intSequence(second));
      expect(doubleSequence(first), doubleSequence(second));
    });

    test('different seeds produce different sequences', () {
      int checksum(RandomSource source) => List.generate(
        100,
        (_) => source.nextInt(1 << 30),
      ).reduce((a, b) => a + b);

      expect(
        checksum(SeededRandomSource(1)),
        isNot(checksum(SeededRandomSource(2))),
      );
    });

    test('nextInt stays in [0, max) and nextDouble in [0, 1)', () {
      final source = SeededRandomSource(7);
      for (var i = 0; i < 1000; i++) {
        expect(source.nextInt(13), inInclusiveRange(0, 12));
        expect(source.nextDouble(), inExclusiveRange(0, 1));
      }
    });

    test('a bound of 1 always yields zero', () {
      final source = SeededRandomSource(123);
      expect(List.generate(50, (_) => source.nextInt(1)), everyElement(0));
    });

    test('next rejects a non-positive bound like Random', () {
      final source = SeededRandomSource(1);
      expect(() => source.nextInt(0), throwsArgumentError);
    });

    test('dice distribution is roughly uniform (deterministic seed)', () {
      final source = SeededRandomSource(7);
      final counts = List.filled(6, 0);
      for (var i = 0; i < 60000; i++) {
        counts[source.nextInt(6)]++;
      }
      for (final count in counts) {
        expect(count, inInclusiveRange(9000, 11000), reason: 'counts: $counts');
      }
    });

    group('RandomSourceX', () {
      test('nextIntInRange is inclusive on both ends', () {
        final source = SeededRandomSource(9);
        for (var i = 0; i < 500; i++) {
          expect(source.nextIntInRange(2, 5), inInclusiveRange(2, 5));
        }
      });

      test('nextIntInRange rejects an inverted range', () {
        final source = SeededRandomSource(1);
        expect(() => source.nextIntInRange(5, 2), throwsArgumentError);
      });

      test('pick returns elements of the list', () {
        final source = SeededRandomSource(3);
        const values = ['a', 'b', 'c'];
        for (var i = 0; i < 100; i++) {
          expect(values.contains(source.pick(values)), isTrue);
        }
      });

      test('pick rejects an empty list', () {
        final source = SeededRandomSource(1);
        expect(() => source.pick<int>([]), throwsArgumentError);
      });
    });
  });

  group('deriveSeed', () {
    test('is stable for the same root seed and channel', () {
      expect(deriveSeed(1234, 'combat'), deriveSeed(1234, 'combat'));
    });

    test('negative root seeds are stable too', () {
      expect(deriveSeed(-5, 'gacha'), deriveSeed(-5, 'gacha'));
    });

    test('channels split one root seed into independent streams', () {
      final combatSeed = deriveSeed(777, 'combat');
      final gachaSeed = deriveSeed(777, 'gacha');

      expect(combatSeed, isNot(gachaSeed));

      List<int> stream(int seed) {
        final source = SeededRandomSource(seed);
        return List.generate(100, (_) => source.nextInt(1 << 30));
      }

      expect(stream(combatSeed), isNot(stream(gachaSeed)));
      expect(stream(combatSeed), stream(combatSeed));
      expect(stream(gachaSeed), stream(gachaSeed));
    });

    test('channels keep different root seeds apart', () {
      final seeds = <int>{
        for (var root = 0; root < 50; root++) ...[
          deriveSeed(root, 'combat'),
          deriveSeed(root, 'gacha'),
          deriveSeed(root, 'dungeon'),
        ],
      };
      expect(seeds, hasLength(150));
    });
  });
}
