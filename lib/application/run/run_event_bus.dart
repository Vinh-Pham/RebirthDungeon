import 'dart:async';

import 'package:rebirth_dungeon/domain/dungeon/run_event.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'run_event_bus.g.dart';

/// One-way broadcast channel from the application layer to the presentation
/// layer: domain events go in, the Flame game consumes them for animation.
/// The bus never influences gameplay — dropping every listener changes
/// nothing but the visuals.
class RunEventBus {
  final _controller = StreamController<RunEvent>.broadcast();

  Stream<RunEvent> get stream => _controller.stream;

  void publish(Iterable<RunEvent> events) {
    for (final event in events) {
      _controller.add(event);
    }
  }

  Future<void> dispose() => _controller.close();
}

@Riverpod(keepAlive: true)
RunEventBus runEventBus(Ref ref) {
  final bus = RunEventBus();
  ref.onDispose(bus.dispose);
  return bus;
}
