import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';
import 'package:rebirth_dungeon/core/ids/content_id.dart';

void main() {
  group('content id convention', () {
    test('accepts lowercase snake_case identifiers', () {
      expect(isValidContentId('goblin_01'), isTrue);
      expect(isValidContentId('a'), isTrue);
      expect(isValidContentId('heal_potion_v2'), isTrue);
      expect(isValidContentId('x9y'), isTrue);
    });

    test('rejects malformed identifiers', () {
      expect(isValidContentId(''), isFalse);
      expect(isValidContentId('Goblin'), isFalse);
      expect(isValidContentId('1goblin'), isFalse);
      expect(isValidContentId('_goblin'), isFalse);
      expect(isValidContentId('gob-lin'), isFalse);
      expect(isValidContentId('gob lin'), isFalse);
    });

    test('parseContentId returns a valid ContentId', () {
      final id = parseContentId('goblin_01');
      expect(id.value, 'goblin_01');
      expect(id.isValid, isTrue);
    });

    test('parseContentId throws a validation failure', () {
      expect(
        () => parseContentId('Not-Valid'),
        throwsA(
          isA<DomainException>().having(
            (e) => e.failure,
            'failure',
            isA<ValidationFailure>(),
          ),
        ),
      );
    });

    test('tryParseContentId returns null instead of throwing', () {
      expect(tryParseContentId('goblin_01')?.value, 'goblin_01');
      expect(tryParseContentId('NOPE'), isNull);
    });

    test('ContentId equality follows the wrapped string', () {
      expect(ContentId('a') == ContentId('a'), isTrue);
      expect(ContentId('a') == ContentId('b'), isFalse);
    });
  });
}
