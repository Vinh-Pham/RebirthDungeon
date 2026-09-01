/// Injectable clock so domain logic can be time-deterministic in tests.
///
/// Engines and services never call `DateTime.now()` directly; they receive a
/// `TimeSource` instead.
abstract interface class TimeSource {
  DateTime now();
}

/// Production clock backed by `DateTime.now()`.
class SystemTimeSource implements TimeSource {
  const SystemTimeSource();

  @override
  DateTime now() => DateTime.now();
}

/// Test clock the test controls explicitly.
class FakeTimeSource implements TimeSource {
  FakeTimeSource({DateTime? initial})
    : _now = initial ?? DateTime.utc(2026, 1, 1);

  FakeTimeSource.at(DateTime dateTime) : _now = dateTime;

  DateTime _now;

  @override
  DateTime now() => _now;

  /// Jumps the clock to [dateTime].
  void set(DateTime dateTime) => _now = dateTime;

  /// Moves the clock forward by [duration].
  void advance(Duration duration) => _now = _now.add(duration);
}
