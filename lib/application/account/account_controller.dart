import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'account_controller.g.dart';

/// Session-scoped account state. Real authentication (providers, tokens,
/// secure storage) arrives in Phase 12 — until then the only identity is a
/// local guest session that never persists.
class AccountState {
  const AccountState({this.playerId});

  /// Non-null once a guest session exists.
  final String? playerId;

  bool get isSignedIn => playerId != null;
}

@Riverpod(keepAlive: true)
class AccountController extends _$AccountController {
  @override
  AccountState build() {
    return const AccountState();
  }

  /// Creates a throwaway guest identity for this app session.
  void signInAsGuest() {
    if (state.isSignedIn) {
      return;
    }
    state = AccountState(
      playerId: 'guest-${DateTime.now().microsecondsSinceEpoch}',
    );
  }
}
