/// A single content-validation problem, located by file, entry index, and
/// field path.
///
/// Paths look like `heroes.json[2].abilityIds` so authors can find the exact
/// spot that failed.
class ContentIssue {
  const ContentIssue({required this.path, required this.message});

  /// Location of the problem, e.g. `monsters.json[1].lootTableId`.
  final String path;

  /// Human-readable explanation of what is wrong and what is expected.
  final String message;

  @override
  String toString() => '$path: $message';
}
