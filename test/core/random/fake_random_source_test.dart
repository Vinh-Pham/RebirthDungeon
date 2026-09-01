import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/random/fake_random_source.dart';

void main() {
  group('FakeRandomSource', () {
    test('returns queued ints in order', () {
      final source = FakeRandomSource()..enqueueInts([6, 6, 2, 5]);
      expect(source.nextInt(8), 6);
      expect(source.nextInt(8), 6);
      expect(source.nextInt(8), 2);
      expect(source.nextInt(8), 5);
    });

    test('returns queued doubles in order', () {
      final source = FakeRandomSource()..enqueueDoubles([0.0, 0.999, 0.5]);
      expect(source.nextDouble(), 0.0);
      expect(source.nextDouble(), 0.999);
      expect(source.nextDouble(), 0.5);
    });

    test('throws when a queue runs dry', () {
      final source = FakeRandomSource()..enqueueInts([1]);
      source.nextInt(2);
      expect(() => source.nextInt(2), throwsStateError);
      expect(() => source.nextDouble(), throwsStateError);
    });

    test('rejects queued ints outside the requested bound', () {
      final tooBig = FakeRandomSource()..enqueueInts([7]);
      expect(() => tooBig.nextInt(6), throwsArgumentError);

      final negative = FakeRandomSource()..enqueueInts([-1]);
      expect(() => negative.nextInt(6), throwsArgumentError);
    });

    test('rejects queued doubles outside [0, 1)', () {
      final source = FakeRandomSource()..enqueueDoubles([1.0]);
      expect(() => source.nextDouble(), throwsArgumentError);
    });

    test('rejects a non-positive bound like Random', () {
      final source = FakeRandomSource()..enqueueInts([1]);
      expect(() => source.nextInt(0), throwsArgumentError);
    });

    test('constant int fake repeats its value and respects bounds', () {
      final source = FakeRandomSource.constantInt(5);
      expect(source.nextInt(6), 5);
      expect(source.nextInt(6), 5);
      expect(() => source.nextInt(5), throwsArgumentError);
    });

    test('constant double fake repeats its value', () {
      final source = FakeRandomSource.constantDouble(0.25);
      expect(source.nextDouble(), 0.25);
      expect(source.nextDouble(), 0.25);
    });
  });
}
