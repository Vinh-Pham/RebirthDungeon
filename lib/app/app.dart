import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';

/// Root widget of the application shell.
///
/// Flutter owns navigation, menus, and meta-game UI. Flame only ever renders
/// the dungeon scene inside this shell (see ARCHITECTURE.md).
class RebirthDungeonApp extends ConsumerWidget {
  const RebirthDungeonApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Rebirth Dungeon',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
