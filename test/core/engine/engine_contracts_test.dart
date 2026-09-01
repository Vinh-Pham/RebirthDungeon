import 'package:flutter_test/flutter_test.dart';
import 'package:rebirth_dungeon/core/engine/engine_contracts.dart';
import 'package:rebirth_dungeon/core/errors/domain_exception.dart';
import 'package:rebirth_dungeon/core/errors/failure.dart';

/// Minimal engine demonstrating the shared command/result/event conventions.
///
/// Kept in the test suite as living documentation of the pattern that combat
/// (Phase 3), dungeon runs (Phase 4), and gacha (Phase 10) will follow.
class CounterState {
  const CounterState(this.value);

  final int value;

  @override
  String toString() => 'CounterState($value)';
}

sealed class CounterCommand extends GameCommand {
  const CounterCommand();
}

class AddCommand extends CounterCommand {
  const AddCommand(this.amount);

  final int amount;
}

sealed class CounterEvent extends GameEvent {
  const CounterEvent();
}

class CounterChanged extends CounterEvent {
  const CounterChanged(this.newValue);

  final int newValue;
}

class CounterEngine
    implements DomainEngine<CounterState, CounterCommand, CounterEvent> {
  @override
  EngineResult<CounterState, CounterEvent> execute(
    CounterState state,
    CounterCommand command,
  ) {
    final int newValue = switch (command) {
      AddCommand(:final amount) => state.value + amount,
    };
    if (newValue < 0) {
      throw DomainException(
        Failure.invalidOperation(message: 'Counter cannot go negative.'),
      );
    }
    return EngineResult(
      state: CounterState(newValue),
      events: [CounterChanged(newValue)],
    );
  }
}

void main() {
  group('engine contracts', () {
    test('state + command produces new state plus events', () {
      final engine = CounterEngine();

      final result = engine.execute(const CounterState(2), const AddCommand(3));

      expect(result.state.value, 5);
      expect(result.events, hasLength(1));
      expect(result.events.single, isA<CounterChanged>());
    });

    test('illegal commands throw DomainException with a Failure', () {
      final engine = CounterEngine();

      expect(
        () => engine.execute(const CounterState(1), const AddCommand(-5)),
        throwsA(
          isA<DomainException>().having(
            (e) => e.failure.message,
            'failure.message',
            'Counter cannot go negative.',
          ),
        ),
      );
    });

    test('events default to empty when none occurred', () {
      const result = EngineResult<CounterState, CounterEvent>(
        state: CounterState(0),
      );
      expect(result.events, isEmpty);
    });
  });
}
