import 'failure.dart';

/// Exception form of a [Failure], thrown by engines to reject illegal
/// commands or by parsers to reject malformed input.
///
/// Domain code throws only this exception type; everything else is a bug.
class DomainException implements Exception {
  const DomainException(this.failure);

  final Failure failure;

  @override
  String toString() => 'DomainException: ${failure.message}';
}
