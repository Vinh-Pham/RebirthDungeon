// Enforces the pure-Dart boundaries documented in ARCHITECTURE.md.
//
// `lib/core/` and `lib/domain/` hold the rules of the game and must stay
// importable from any Dart host: no Flutter, no Flame/Rive rendering, and no
// imports of upper layers (application, data, game, presentation, app).
//
// Run: dart run tool/check_architecture_boundaries.dart

import 'dart:io';

const _pureLayers = <String>['lib/core', 'lib/domain'];

final _forbiddenImport = RegExp(
  r'''^\s*(?:import|export)\s*['"]'''
  r'(?:dart:ui'
  r'|package:flutter'
  r'|package:flame'
  r'|package:rive'
  r'|package:rebirth_dungeon/(?:application|data|game|presentation|app)'
  r')',
);

final _selfImport = RegExp(
  r'''^\s*(?:import|export)\s*['"]package:rebirth_dungeon/(.+?)['"]''',
);

void main() {
  final violations = <String>[];
  var filesChecked = 0;

  for (final layer in _pureLayers) {
    final dir = Directory(layer);
    if (!dir.existsSync()) {
      continue;
    }
    final files = dir.listSync(recursive: true).whereType<File>().toList()
      ..sort((a, b) => a.path.compareTo(b.path));

    for (final file in files) {
      if (!file.path.endsWith('.dart')) {
        continue;
      }
      filesChecked++;
      final lines = file.readAsLinesSync();
      for (var i = 0; i < lines.length; i++) {
        final line = lines[i];
        if (_forbiddenImport.hasMatch(line)) {
          violations.add(
            '${file.path}:${i + 1}: forbidden import in pure-Dart layer: '
            '${line.trim()}',
          );
          continue;
        }
        final self = _selfImport.firstMatch(line);
        if (self != null) {
          final target = self.group(1)!;
          final allowed =
              target.startsWith('core/') || target.startsWith('domain/');
          if (!allowed) {
            violations.add(
              '${file.path}:${i + 1}: pure-Dart layers may not import upper '
              'layer "package:rebirth_dungeon/$target"',
            );
          }
        }
      }
    }
  }

  if (violations.isNotEmpty) {
    stderr.writeln(
      'Architecture boundary violations found '
      '(${violations.length} in $filesChecked files):',
    );
    for (final violation in violations) {
      stderr.writeln('  $violation');
    }
    stderr.writeln(
      'See ARCHITECTURE.md: lib/core and lib/domain must be pure Dart.',
    );
    exit(1);
  }

  stdout.writeln(
    'Architecture boundaries OK ($filesChecked files checked in '
    '${_pureLayers.join(', ')}).',
  );
}
