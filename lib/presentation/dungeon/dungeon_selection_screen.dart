import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:rebirth_dungeon/application/run/run_controller.dart';

/// Lists the dungeons available in the content set and starts a run.
class DungeonSelectionScreen extends ConsumerWidget {
  const DungeonSelectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final content = ref.watch(contentProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Choose a Dungeon')),
      body: content.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorView(
          message: '$error',
          onRetry: () => ref.invalidate(contentProvider),
        ),
        data: (content) {
          final dungeons = content.dungeons.values.toList();
          if (dungeons.isEmpty) {
            return const Center(
              child: Text('No dungeons available in this build.'),
            );
          }
          // Placeholder hero choice until the characters domain exists
          // (Phase 9); the first content hero is the default adventurer.
          final heroId = content.heroes.values.first.id;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final dungeon in dungeons)
                Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text(dungeon.name),
                    subtitle: Text(
                      '${dungeon.description}\n'
                      '${dungeon.floorCount} floors · '
                      'recommended level ${dungeon.recommendedLevel}',
                    ),
                    isThreeLine: true,
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      final runId = ref
                          .read(runControllerProvider.notifier)
                          .startRun(heroId: heroId, dungeonId: dungeon.id);
                      context.push('/game/$runId');
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
