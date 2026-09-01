import 'package:freezed_annotation/freezed_annotation.dart';

part 'failure.freezed.dart';

/// Immutable, structured description of something going wrong.
///
/// Used both as a returned value (repositories, application layer) and inside
/// a thrown [DomainException] (engines rejecting illegal commands).
@freezed
sealed class Failure with _$Failure {
  const factory Failure.notFound({required String entity, required String id}) =
      NotFoundFailure;

  const factory Failure.validation({
    required String message,
    @Default(<String, Object>{}) Map<String, Object> details,
  }) = ValidationFailure;

  const factory Failure.invalidOperation({required String message}) =
      InvalidOperationFailure;

  const factory Failure.unexpected({required String message, Object? cause}) =
      UnexpectedFailure;
}

extension FailureX on Failure {
  /// Human-readable description of this failure.
  String get message => switch (this) {
    NotFoundFailure(:final entity, :final id) => '$entity "$id" was not found.',
    ValidationFailure(:final message) => message,
    InvalidOperationFailure(:final message) => message,
    UnexpectedFailure(:final message) => message,
  };
}
