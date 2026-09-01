import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:rebirth_dungeon/application/account/account_controller.dart';

/// Hub screen linking every meta-game area.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final account = ref.watch(accountControllerProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rebirth Dungeon'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Welcome, ${account.playerId ?? 'traveler'}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 16),
          _NavCard(
            icon: Icons.sports_esports,
            title: 'Play',
            subtitle: 'Choose a dungeon and dive in',
            onTap: () => context.push('/dungeon'),
          ),
          _NavCard(
            icon: Icons.groups,
            title: 'Characters',
            subtitle: 'Your roster and loadouts',
            onTap: () => context.push('/characters'),
          ),
          _NavCard(
            icon: Icons.inventory_2,
            title: 'Inventory',
            subtitle: 'Items and equipment',
            onTap: () => context.push('/inventory'),
          ),
          _NavCard(
            icon: Icons.casino,
            title: 'Summon',
            subtitle: 'Recruit new heroes',
            onTap: () => context.push('/gacha'),
          ),
          _NavCard(
            icon: Icons.storefront,
            title: 'Shop',
            subtitle: 'Offers and bundles',
            onTap: () => context.push('/shop'),
          ),
        ],
      ),
    );
  }
}

class _NavCard extends StatelessWidget {
  const _NavCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(icon, size: 32),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
