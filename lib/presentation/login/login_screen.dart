import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:rebirth_dungeon/application/account/account_controller.dart';

/// Guest entry point. Real identity providers arrive in Phase 12 behind
/// the same screen.
class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.shield_outlined, size: 72),
            const SizedBox(height: 12),
            Text(
              'Rebirth Dungeon',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              icon: const Icon(Icons.person_outline),
              label: const Text('Play as guest'),
              onPressed: () =>
                  ref.read(accountControllerProvider.notifier).signInAsGuest(),
            ),
            const SizedBox(height: 8),
            Text(
              'Account sync arrives with online services.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
