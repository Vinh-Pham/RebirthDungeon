import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/random/fake_random_source.dart';
import 'package:rebirth_dungeon/core/value_objects/int_range.dart';

void main() {
  group('IntRange', () {
    test('rejects min > max with a validation failure', () {
      expect(
        () => IntRange(min: 6, max: 1),
        throwsA(
          isA<DomainException>().having(
            (e) => e.failure,
            'failure',
            isA<ValidationFailure>(),
          ),
        ),
      );
    });

    test('allows single-value ranges', () {
      final range = IntRange(min: 3, max: 3);
      expect(range.width, 1);
      expect(range.contains(3), isTrue);
    });

    test('contains is inclusive on both ends', () {
      final range = IntRange(min: 1, max: 6);
      expect(range.contains(0), isFalse);
      expect(range.contains(1), isTrue);
      expect(range.contains(6), isTrue);
      expect(range.contains(7), isFalse);
    });

    test('clamps into the range', () {
      final range = IntRange(min: 2, max: 5);
      expect(range.clamp(0), 2);
      expect(range.clamp(3), 3);
      expect(range.clamp(99), 5);
    });

    test('samples using injected randomness', () {
      final range = IntRange(min: 1, max: 6);
      final random = FakeRandomSource()..enqueueInts([4, 0, 5]);
      expect(range.sample(random), 5);
      expect(range.sample(random), 1);
      expect(range.sample(random), 6);
    });

    test('stays inside bounds across a seeded run', () {
      final range = IntRange(min: -3, max: 3);
      final random = FakeRandomSource.constantInt(2);
      expect(range.sample(random), -1);
    });

    test('round trips through JSON', () {
      final range = IntRange(min: 2, max: 9);
      expect(range.toJson(), {'min': 2, 'max': 9});
      expect(IntRange.fromJson(range.toJson()), range);
    });

    test('has value equality', () {
      expect(IntRange(min: 1, max: 6), IntRange(min: 1, max: 6));
      expect(
        IntRange(min: 1, max: 6).hashCode,
        IntRange(min: 1, max: 6).hashCode,
      );
      expect(IntRange(min: 1, max: 6), isNot(IntRange(min: 1, max: 7)));
    });
  });
}
