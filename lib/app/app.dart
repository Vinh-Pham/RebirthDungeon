import 'package:flutter/material.dart';

import 'router.dart';

/// Root widget of the application shell.
///
/// Flutter owns navigation, menus, and meta-game UI. Flame only ever renders
/// the dungeon scene inside this shell (see ARCHITECTURE.md).
class RebirthDungeonApp extends StatelessWidget {
  const RebirthDungeonApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Rebirth Dungeon',
      theme: ThemeData(colorSchemeSeed: Colors.deepPurple, useMaterial3: true),
      routerConfig: appRouter,
    );
  }
}
