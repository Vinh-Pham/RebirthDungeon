import 'random_source.dart';

/// Test double that returns exactly the values a test queues, in order.
///
/// Lets tests pin exact dice rolls, gacha rolls, and loot picks without ever
/// constructing `Random()`. Running out of queued values throws, so a test
/// never silently receives unintended randomness.
class FakeRandomSource implements RandomSource {
  FakeRandomSource();

  /// A fake whose `nextInt` always returns [value].
  ///
  /// The value is still validated against the requested bound on every call.
  FakeRandomSource.constantInt(int value) : _constantInt = value;

  /// A fake whose `nextDouble` always returns [value].
  FakeRandomSource.constantDouble(double value) : _constantDouble = value;

  static const _unset = -1;

  int _constantInt = _unset;
  double? _constantDouble;
  final List<int> _queuedInts = [];
  final List<double> _queuedDoubles = [];

  void enqueueInts(Iterable<int> values) => _queuedInts.addAll(values);

  void enqueueDoubles(Iterable<double> values) => _queuedDoubles.addAll(values);

  @override
  int nextInt(int max) {
    if (max <= 0) {
      throw ArgumentError('max must be positive (got $max).');
    }
    final constant = _constantInt;
    if (constant != _unset) {
      _requireIntInRange(constant, max);
      return constant;
    }
    if (_queuedInts.isEmpty) {
      throw StateError(
        'FakeRandomSource ran out of queued nextInt values; '
        'enqueue what the test expects to be consumed.',
      );
    }
    final value = _queuedInts.removeAt(0);
    _requireIntInRange(value, max);
    return value;
  }

  @override
  double nextDouble() {
    final constant = _constantDouble;
    if (constant != null) {
      _requireDoubleInRange(constant);
      return constant;
    }
    if (_queuedDoubles.isEmpty) {
      throw StateError(
        'FakeRandomSource ran out of queued nextDouble values; '
        'enqueue what the test expects to be consumed.',
      );
    }
    final value = _queuedDoubles.removeAt(0);
    _requireDoubleInRange(value);
    return value;
  }

  void _requireIntInRange(int value, int max) {
    if (value < 0 || value >= max) {
      throw ArgumentError(
        'Queued nextInt value $value is outside the requested [0, $max).',
      );
    }
  }

  void _requireDoubleInRange(double value) {
    if (value < 0 || value >= 1) {
      throw ArgumentError('Queued nextDouble value $value is outside [0, 1).');
    }
  }
}
