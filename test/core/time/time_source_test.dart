import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/time/time_source.dart';

void main() {
  group('FakeTimeSource', () {
    test('defaults to a fixed instant', () {
      final time = FakeTimeSource();
      expect(time.now(), FakeTimeSource().now());
    });

    test('can be constructed at an exact instant', () {
      final instant = DateTime.utc(2026, 6, 15, 12, 30);
      final time = FakeTimeSource.at(instant);
      expect(time.now(), instant);
    });

    test('set jumps the clock', () {
      final time = FakeTimeSource();
      final target = DateTime.utc(2030, 3, 3);
      time.set(target);
      expect(time.now(), target);
    });

    test('advance moves the clock forward', () {
      final start = DateTime.utc(2026, 1, 1, 0, 0);
      final time = FakeTimeSource.at(start);
      time.advance(const Duration(hours: 5, minutes: 30));
      expect(time.now(), start.add(const Duration(hours: 5, minutes: 30)));
    });
  });

  group('SystemTimeSource', () {
    test('returns the current wall-clock time', () {
      final before = DateTime.now().subtract(const Duration(seconds: 5));
      final now = const SystemTimeSource().now();
      final after = DateTime.now().add(const Duration(seconds: 5));
      expect(now.isAfter(before), isTrue);
      expect(now.isBefore(after), isTrue);
    });
  });
}
