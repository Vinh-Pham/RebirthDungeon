import '../errors/domain_exception.dart';
import '../errors/failure.dart';

/// Shared convention for data-driven content identifiers ("goblin_01",
/// "heal_potion_v2"): lowercase snake_case, starting with a letter.
///
/// Content entities wrap their raw string in a zero-cost extension type so
/// mixed-up ids become compile-time errors:
///
/// ```dart
/// extension type const MonsterId(ContentId id) implements Object {}
/// ```
final RegExp _contentIdPattern = RegExp(r'^[a-z][a-z0-9_]*$');

/// Whether [value] follows the shared content-id convention.
bool isValidContentId(String value) => _contentIdPattern.hasMatch(value);

/// Zero-cost typed identifier for game content and entities.
extension type const ContentId(String value) {
  /// Whether this id follows the shared content-id convention.
  bool get isValid => isValidContentId(value);
}

/// Parses [value] into a [ContentId], throwing a [DomainException] when it
/// does not follow the convention.
ContentId parseContentId(String value) {
  if (!isValidContentId(value)) {
    throw DomainException(
      Failure.validation(
        message: '"$value" is not a valid content id.',
        details: {
          'value': value,
          'expected': 'lowercase snake_case starting with a letter',
        },
      ),
    );
  }
  return ContentId(value);
}

/// Like [parseContentId] but returns `null` instead of throwing.
ContentId? tryParseContentId(String value) =>
    isValidContentId(value) ? ContentId(value) : null;
