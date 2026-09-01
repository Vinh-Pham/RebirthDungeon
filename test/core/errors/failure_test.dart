import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';

void main() {
  group('Failure', () {
    test('has freezed value equality', () {
      final first = Failure.validation(
        message: 'bad',
        details: {'field': 'hp'},
      );
      final second = Failure.validation(
        message: 'bad',
        details: {'field': 'hp'},
      );
      expect(first, second);
      expect(first.hashCode, second.hashCode);
      expect(first, isNot(Failure.validation(message: 'bad')));
    });

    test('variants copy their own fields', () {
      final failure = Failure.validation(message: 'bad');
      final copy = (failure as ValidationFailure).copyWith(message: 'worse');
      expect(copy.message, 'worse');
      expect(failure.message, 'bad');
    });

    test('supports exhaustive pattern matching', () {
      const Failure failure = Failure.notFound(
        entity: 'monster',
        id: 'goblin_01',
      );
      final String label = switch (failure) {
        NotFoundFailure(:final entity, :final id) => '$entity/$id',
        ValidationFailure(:final message) => message,
        InvalidOperationFailure(:final message) => message,
        UnexpectedFailure(:final message) => message,
      };
      expect(label, 'monster/goblin_01');
    });

    test('message getter describes every variant', () {
      expect(
        Failure.notFound(entity: 'hero', id: 'x').message,
        'hero "x" was not found.',
      );
      expect(Failure.validation(message: 'nope').message, 'nope');
      expect(Failure.invalidOperation(message: 'cannot').message, 'cannot');
      expect(Failure.unexpected(message: 'boom').message, 'boom');
    });
  });

  group('DomainException', () {
    test('carries its failure', () {
      const failure = Failure.invalidOperation(message: 'not your turn');
      expect(
        () => throw DomainException(failure),
        throwsA(
          isA<DomainException>()
              .having((e) => e.failure, 'failure', failure)
              .having(
                (e) => e.toString(),
                'toString',
                contains('not your turn'),
              ),
        ),
      );
    });
  });
}
