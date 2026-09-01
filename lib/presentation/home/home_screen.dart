import 'package:flutter/material.dart';

/// Temporary placeholder until the real home screen is built in Phase 5.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rebirth Dungeon')),
      body: const Center(
        child: Text('Bootstrap complete. Gameplay arrives with Phase 7.'),
      ),
    );
  }
}
