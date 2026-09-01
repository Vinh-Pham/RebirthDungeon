import 'dart:math';

import 'random_source.dart';

/// Deterministic [RandomSource] backed by `Random(seed)`.
///
/// The same seed always produces the same sequence on the Dart VM — the
/// target for mobile and desktop builds. Note that `dart:math` does not
/// guarantee identical sequences for a given seed in dart2js/dart4web;
/// revisit this implementation if a web target is ever added.
class SeededRandomSource implements RandomSource {
  SeededRandomSource(int seed) : _random = Random(seed);

  final Random _random;

  @override
  int nextInt(int max) => _random.nextInt(max);

  @override
  double nextDouble() => _random.nextDouble();
}

/// Derives a stable, channel-specific seed from a run's [rootSeed].
///
/// A run stores a single root seed; each subsystem derives its own stream so
/// the streams stay independent and replayable:
///
/// ```dart
/// final combatRng = SeededRandomSource(deriveSeed(runSeed, 'combat'));
/// final gachaRng = SeededRandomSource(deriveSeed(runSeed, 'gacha'));
/// ```
///
/// The same (rootSeed, channel) pair always yields the same seed.
int deriveSeed(int rootSeed, String channel) {
  // FNV-1a over the channel name, seeded with the root seed.
  var hash = rootSeed;
  for (final codeUnit in channel.codeUnits) {
    hash = (hash ^ codeUnit) * 0x100000001b3;
  }
  // SplitMix64 finalizer to avalanche the bits.
  hash = (hash ^ (hash >>> 33)) * 0xff51afd7ed558ccd;
  hash = (hash ^ (hash >>> 33)) * 0xc4ceb9fe1a85ec53;
  return hash ^ (hash >>> 33);
}
