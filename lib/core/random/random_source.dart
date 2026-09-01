/// The single abstraction through which all game randomness flows.
///
/// Engines never construct `Random()` directly; a `RandomSource` is injected
/// so tests can supply exact values (`FakeRandomSource`) and seeded runs stay
/// replayable (`SeededRandomSource`).
///
/// Combat and gacha must receive *separate* instances. Derive independent
/// streams from a single run seed with `deriveSeed` so consuming randomness
/// from one subsystem never shifts the others'.
abstract interface class RandomSource {
  /// Uniform integer in [0, max). [max] must be positive.
  int nextInt(int max);

  /// Uniform double in [0, 1).
  double nextDouble();
}

extension RandomSourceX on RandomSource {
  /// Uniform integer in [min, max], both inclusive.
  int nextIntInRange(int min, int max) {
    if (max < min) {
      throw ArgumentError(
        'max ($max) must be greater than or equal to min ($min).',
      );
    }
    return min + nextInt(max - min + 1);
  }

  /// Uniform element from a non-empty [values] list.
  T pick<T>(List<T> values) {
    if (values.isEmpty) {
      throw ArgumentError('Cannot pick from an empty list.');
    }
    return values[nextInt(values.length)];
  }

  /// Weighted pick from a non-empty [values] list. Weights must be
  /// non-negative with a positive total; a value's selection chance is its
  /// weight relative to the total.
  T pickWeighted<T>(List<T> values, int Function(T) weightOf) {
    if (values.isEmpty) {
      throw ArgumentError('Cannot pick from an empty list.');
    }
    var total = 0;
    for (final value in values) {
      final weight = weightOf(value);
      if (weight < 0) {
        throw ArgumentError('Weights must be non-negative.');
      }
      total += weight;
    }
    if (total <= 0) {
      throw ArgumentError('Total weight must be positive.');
    }
    var roll = nextInt(total);
    for (final value in values) {
      roll -= weightOf(value);
      if (roll < 0) {
        return value;
      }
    }
    return values.last;
  }
}
