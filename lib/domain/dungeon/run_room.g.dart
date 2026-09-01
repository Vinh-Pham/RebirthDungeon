// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'run_room.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_RunLoot _$RunLootFromJson(Map<String, dynamic> json) => _RunLoot(
  itemId: json['itemId'] as String,
  quantity: (json['quantity'] as num).toInt(),
);

Map<String, dynamic> _$RunLootToJson(_RunLoot instance) => <String, dynamic>{
  'itemId': instance.itemId,
  'quantity': instance.quantity,
};

_RunRoom _$RunRoomFromJson(Map<String, dynamic> json) => _RunRoom(
  index: (json['index'] as num).toInt(),
  kind: $enumDecode(_$RoomKindEnumMap, json['kind']),
  doors:
      (json['doors'] as List<dynamic>?)
          ?.map((e) => (e as num).toInt())
          .toList() ??
      const [],
  monsterIds:
      (json['monsterIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const [],
  loot:
      (json['loot'] as List<dynamic>?)
          ?.map((e) => RunLoot.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  cleared: json['cleared'] as bool? ?? false,
);

Map<String, dynamic> _$RunRoomToJson(_RunRoom instance) => <String, dynamic>{
  'index': instance.index,
  'kind': _$RoomKindEnumMap[instance.kind]!,
  'doors': instance.doors,
  'monsterIds': instance.monsterIds,
  'loot': instance.loot,
  'cleared': instance.cleared,
};

const _$RoomKindEnumMap = {
  RoomKind.entry: 'entry',
  RoomKind.combat: 'combat',
  RoomKind.treasure: 'treasure',
  RoomKind.event: 'event',
  RoomKind.boss: 'boss',
};
