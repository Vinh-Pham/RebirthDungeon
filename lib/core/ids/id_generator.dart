import '../random/random_source.dart';
import '../time/time_source.dart';

/// Injectable ID creation so tests get predictable identifiers.
abstract interface class IdGenerator {
  /// Returns a fresh id that is unique among all ids this generator made.
  String generate();
}

/// Production ids built from wall time plus injected randomness.
class SystemIdGenerator implements IdGenerator {
  SystemIdGenerator({required this.timeSource, required this.randomSource});

  final TimeSource timeSource;
  final RandomSource randomSource;

  @override
  String generate() {
    final millis = timeSource.now().millisecondsSinceEpoch;
    final salt = randomSource.nextInt(0x7FFFFFFF);
    return '$millis-$salt';
  }
}

/// Test fake producing readable sequential ids: `run-0001`, `run-0002`, ...
class FakeIdGenerator implements IdGenerator {
  FakeIdGenerator({this.prefix = 'id'});

  final String prefix;

  int _next = 1;

  @override
  String generate() {
    final id = '$prefix-${_next.toString().padLeft(4, '0')}';
    _next++;
    return id;
  }
}
