import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'shop_controller.g.dart';

/// Placeholder shop state — purchasable offers arrive with the purchase
/// repository (Phase 12); no client-authoritative currency grants before
/// server verification.
class ShopState {
  const ShopState({this.featuredOffers = const <String>[]});

  final List<String> featuredOffers;
}

@Riverpod(keepAlive: true)
class ShopController extends _$ShopController {
  @override
  ShopState build() {
    return const ShopState();
  }
}
