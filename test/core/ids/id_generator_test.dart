import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/ids/id_generator.dart';
import 'package:rebirth_dungeon/core/random/fake_random_source.dart';
import 'package:rebirth_dungeon/core/time/time_source.dart';

void main() {
  group('FakeIdGenerator', () {
    test('produces stable sequential ids', () {
      final generator = FakeIdGenerator(prefix: 'run');
      expect(generator.generate(), 'run-0001');
      expect(generator.generate(), 'run-0002');
      expect(generator.generate(), 'run-0003');
    });

    test('keeps counting past the padding width', () {
      final generator = FakeIdGenerator();
      for (var i = 1; i <= 9999; i++) {
        generator.generate();
      }
      expect(generator.generate(), 'id-10000');
    });
  });

  group('SystemIdGenerator', () {
    test('combines injected time and randomness deterministically', () {
      final time = FakeTimeSource.at(DateTime.utc(2026, 1, 1));
      final random = FakeRandomSource()..enqueueInts([7, 9]);
      final generator = SystemIdGenerator(
        timeSource: time,
        randomSource: random,
      );

      final first = generator.generate();
      expect(first, '${DateTime.utc(2026, 1, 1).millisecondsSinceEpoch}-7');

      time.advance(const Duration(milliseconds: 5));
      expect(generator.generate(), isNot(first));
    });

    test('produces many unique ids over time', () {
      final time = FakeTimeSource();
      final random = FakeRandomSource()
        ..enqueueInts(List.generate(200, (i) => i));
      final generator = SystemIdGenerator(
        timeSource: time,
        randomSource: random,
      );

      final ids = <String>{for (var i = 0; i < 100; i++) generator.generate()};
      expect(ids, hasLength(100));
    });
  });
}
