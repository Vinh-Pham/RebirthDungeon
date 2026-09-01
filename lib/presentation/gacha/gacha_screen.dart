import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:rebirth_dungeon/application/gacha/gacha_controller.dart';

/// Banner listing. Pulls, pity, and rarity reveals arrive with the local
/// gacha engine (Phase 10).
class GachaScreen extends ConsumerWidget {
  const GachaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gacha = ref.watch(gachaControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Summon')),
      body: gacha.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('Failed to load: $error')),
        data: (state) {
          if (state.banners.isEmpty) {
            return const Center(
              child: Text('No banners are running right now.'),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final banner in state.banners)
                Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: const Icon(Icons.casino, size: 36),
                    title: Text(banner.name),
                    subtitle: Text(
                      '${banner.description}\n'
                      'version ${banner.version} · ${banner.costPerPull} '
                      '${banner.currencyId} per pull · hard pity '
                      '${banner.hardPity}',
                    ),
                    isThreeLine: true,
                  ),
                ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Summoning arrives with the gacha engine (Phase 10).',
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
