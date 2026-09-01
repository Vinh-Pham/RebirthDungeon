import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:rebirth_dungeon/application/providers/shared_providers.dart';

/// Waits for the content set, then hands over to login (or home for an
/// existing session — the router guard decides). Renders loading and error
/// states while the asset bundle is parsed and validated.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _waitForContent();
  }

  Future<void> _waitForContent() async {
    // Give the splash a frame to render before jumping ahead.
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!mounted) {
      return;
    }
    final router = GoRouter.of(context);
    await ref.read(contentProvider.future);
    if (!mounted) {
      return;
    }
    router.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final content = ref.watch(contentProvider);
    return Scaffold(
      body: Center(
        child: content.when(
          loading: () => const Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading Rebirth Dungeon...'),
            ],
          ),
          error: (error, _) => Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48),
                const SizedBox(height: 16),
                Text('Failed to load game content:\n$error'),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(contentProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
          data: (_) => const CircularProgressIndicator(),
        ),
      ),
    );
  }
}
