import 'package:rebirth_dungeon/application/providers/shared_providers.dart';
import 'package:rebirth_dungeon/domain/content/banner_data.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'gacha_controller.g.dart';

/// Read-only banner listing sourced from content. Pulls, pity, and currency
/// spending arrive with the local gacha engine (Phase 10); production gacha
/// becomes server-authoritative in Phase 12.
class GachaState {
  const GachaState({this.banners = const <BannerData>[]});

  final List<BannerData> banners;
}

@Riverpod(keepAlive: true)
Future<GachaState> gachaController(Ref ref) async {
  final content = await ref.watch(contentProvider.future);
  return GachaState(banners: content.banners.values.toList());
}
