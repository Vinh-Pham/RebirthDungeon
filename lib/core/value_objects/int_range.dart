import 'package:json_annotation/json_annotation.dart';

import '../errors/domain_exception.dart';
import '../errors/failure.dart';
import '../random/random_source.dart';

part 'int_range.g.dart';

/// Inclusive integer range `[min, max]` — a shared value object for damage
/// rolls, loot quantities, effect durations, and similar content data.
@JsonSerializable()
class IntRange {
  const IntRange._(this.min, this.max);

  /// Creates a validated range; [min] must not exceed [max].
  factory IntRange({required int min, required int max}) {
    if (min > max) {
      throw DomainException(
        Failure.validation(
          message: 'IntRange requires min <= max.',
          details: {'min': min, 'max': max},
        ),
      );
    }
    return IntRange._(min, max);
  }

  factory IntRange.fromJson(Map<String, dynamic> json) =>
      _$IntRangeFromJson(json);

  /// Smallest allowed value (inclusive).
  final int min;

  /// Largest allowed value (inclusive).
  final int max;

  /// Number of distinct values in the range.
  int get width => max - min + 1;

  /// Whether [value] lies within the range.
  bool contains(int value) => value >= min && value <= max;

  /// The closest value to [value] that lies within the range.
  int clamp(int value) {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }

  /// Uniformly samples a value from the range using the injected
  /// [RandomSource].
  int sample(RandomSource random) => min + random.nextInt(width);

  Map<String, dynamic> toJson() => _$IntRangeToJson(this);

  @override
  bool operator ==(Object other) =>
      other is IntRange && other.min == min && other.max == max;

  @override
  int get hashCode => Object.hash(min, max);

  @override
  String toString() => 'IntRange($min..$max)';
}
