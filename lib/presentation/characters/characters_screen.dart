import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:rebirth_dungeon/application/progression/progression_controller.dart';
import 'package:rebirth_dungeon/application/providers/shared_providers.dart';

/// Roster screen. Content heroes are shown as unowned until the
/// progression/persistence domains arrive (Phase 8/9).
class CharactersScreen extends ConsumerWidget {
  const CharactersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final content = ref.watch(contentProvider);
    final progression = ref.watch(progressionControllerProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Characters')),
      body: content.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Failed to load: $error')),
        data: (content) {
          final heroes = content.heroes.values.toList();
          if (heroes.isEmpty) {
            return const Center(child: Text('No characters exist yet.'));
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final hero in heroes)
                Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: const Icon(Icons.person_outline, size: 36),
                    title: Text(hero.name),
                    subtitle: Text(
                      '${hero.description}\n'
                      'HP ${hero.baseHp} · ATK ${hero.baseAttack} · '
                      'DEF ${hero.baseDefense} · ${hero.dieCount} dice',
                    ),
                    isThreeLine: true,
                    trailing: progression.isOwned(hero.id)
                        ? const Chip(label: Text('Owned'))
                        : const Chip(label: Text('Not recruited')),
                  ),
                ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Recruitment and ownership arrive with the gacha (Phase 10).',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
