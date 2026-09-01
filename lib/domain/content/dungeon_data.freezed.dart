// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dungeon_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$DungeonData {

 String get id; String get name; String get description; int get floorCount; IntRange get roomsPerFloor; List<String> get monsterPool; String get bossId; String get lootTableId; int get recommendedLevel;
/// Create a copy of DungeonData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DungeonDataCopyWith<DungeonData> get copyWith => _$DungeonDataCopyWithImpl<DungeonData>(this as DungeonData, _$identity);

  /// Serializes this DungeonData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DungeonData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DungeonData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.floorCount, _this.floorCount) || other.floorCount == _this.floorCount)&&(identical(other.roomsPerFloor, _this.roomsPerFloor) || other.roomsPerFloor == _this.roomsPerFloor)&&const DeepCollectionEquality().equals(other.monsterPool, _this.monsterPool)&&(identical(other.bossId, _this.bossId) || other.bossId == _this.bossId)&&(identical(other.lootTableId, _this.lootTableId) || other.lootTableId == _this.lootTableId)&&(identical(other.recommendedLevel, _this.recommendedLevel) || other.recommendedLevel == _this.recommendedLevel));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DungeonData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.floorCount,_this.roomsPerFloor,const DeepCollectionEquality().hash(_this.monsterPool),_this.bossId,_this.lootTableId,_this.recommendedLevel);
}

@override
String toString() {
  final _this = this as DungeonData;
  return 'DungeonData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, floorCount: ${_this.floorCount}, roomsPerFloor: ${_this.roomsPerFloor}, monsterPool: ${_this.monsterPool}, bossId: ${_this.bossId}, lootTableId: ${_this.lootTableId}, recommendedLevel: ${_this.recommendedLevel})';
}


}

/// @nodoc
abstract mixin class $DungeonDataCopyWith<$Res>  {
  factory $DungeonDataCopyWith(DungeonData value, $Res Function(DungeonData) _then) = _$DungeonDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, int floorCount, IntRange roomsPerFloor, List<String> monsterPool, String bossId, String lootTableId, int recommendedLevel
});




}
/// @nodoc
class _$DungeonDataCopyWithImpl<$Res>
    implements $DungeonDataCopyWith<$Res> {
  _$DungeonDataCopyWithImpl(this._self, this._then);

  final DungeonData _self;
  final $Res Function(DungeonData) _then;

/// Create a copy of DungeonData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? floorCount = null,Object? roomsPerFloor = null,Object? monsterPool = null,Object? bossId = null,Object? lootTableId = null,Object? recommendedLevel = null,}) {
  return _then(DungeonData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,floorCount: null == floorCount ? _self.floorCount : floorCount // ignore: cast_nullable_to_non_nullable
as int,roomsPerFloor: null == roomsPerFloor ? _self.roomsPerFloor : roomsPerFloor // ignore: cast_nullable_to_non_nullable
as IntRange,monsterPool: null == monsterPool ? _self.monsterPool : monsterPool // ignore: cast_nullable_to_non_nullable
as List<String>,bossId: null == bossId ? _self.bossId : bossId // ignore: cast_nullable_to_non_nullable
as String,lootTableId: null == lootTableId ? _self.lootTableId : lootTableId // ignore: cast_nullable_to_non_nullable
as String,recommendedLevel: null == recommendedLevel ? _self.recommendedLevel : recommendedLevel // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [DungeonData].
extension DungeonDataPatterns on DungeonData {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DungeonData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DungeonData() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DungeonData value)  $default,){
final _that = this;
switch (_that) {
case _DungeonData():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DungeonData value)?  $default,){
final _that = this;
switch (_that) {
case _DungeonData() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int floorCount,  IntRange roomsPerFloor,  List<String> monsterPool,  String bossId,  String lootTableId,  int recommendedLevel)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DungeonData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.floorCount,_that.roomsPerFloor,_that.monsterPool,_that.bossId,_that.lootTableId,_that.recommendedLevel);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int floorCount,  IntRange roomsPerFloor,  List<String> monsterPool,  String bossId,  String lootTableId,  int recommendedLevel)  $default,) {final _that = this;
switch (_that) {
case _DungeonData():
return $default(_that.id,_that.name,_that.description,_that.floorCount,_that.roomsPerFloor,_that.monsterPool,_that.bossId,_that.lootTableId,_that.recommendedLevel);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  int floorCount,  IntRange roomsPerFloor,  List<String> monsterPool,  String bossId,  String lootTableId,  int recommendedLevel)?  $default,) {final _that = this;
switch (_that) {
case _DungeonData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.floorCount,_that.roomsPerFloor,_that.monsterPool,_that.bossId,_that.lootTableId,_that.recommendedLevel);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DungeonData implements DungeonData {
  const _DungeonData({required this.id, required this.name, this.description = '', required this.floorCount, required this.roomsPerFloor, required  List<String> monsterPool, required this.bossId, required this.lootTableId, this.recommendedLevel = 1}): _monsterPool = monsterPool;
  factory _DungeonData.fromJson(Map<String, dynamic> json) => _$DungeonDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  int floorCount;
@override final  IntRange roomsPerFloor;
 final  List<String> _monsterPool;
@override List<String> get monsterPool {
  if (_monsterPool is EqualUnmodifiableListView) return _monsterPool;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_monsterPool);
}

@override final  String bossId;
@override final  String lootTableId;
@override@JsonKey() final  int recommendedLevel;

/// Create a copy of DungeonData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DungeonDataCopyWith<_DungeonData> get copyWith => __$DungeonDataCopyWithImpl<_DungeonData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DungeonDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DungeonData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.floorCount, floorCount) || other.floorCount == floorCount)&&(identical(other.roomsPerFloor, roomsPerFloor) || other.roomsPerFloor == roomsPerFloor)&&const DeepCollectionEquality().equals(other.monsterPool, _monsterPool)&&(identical(other.bossId, bossId) || other.bossId == bossId)&&(identical(other.lootTableId, lootTableId) || other.lootTableId == lootTableId)&&(identical(other.recommendedLevel, recommendedLevel) || other.recommendedLevel == recommendedLevel));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,floorCount,roomsPerFloor,const DeepCollectionEquality().hash(_monsterPool),bossId,lootTableId,recommendedLevel);
}

@override
String toString() {
    return 'DungeonData(id: $id, name: $name, description: $description, floorCount: $floorCount, roomsPerFloor: $roomsPerFloor, monsterPool: $monsterPool, bossId: $bossId, lootTableId: $lootTableId, recommendedLevel: $recommendedLevel)';
}


}

/// @nodoc
abstract mixin class _$DungeonDataCopyWith<$Res> implements $DungeonDataCopyWith<$Res> {
  factory _$DungeonDataCopyWith(_DungeonData value, $Res Function(_DungeonData) _then) = __$DungeonDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, int floorCount, IntRange roomsPerFloor, List<String> monsterPool, String bossId, String lootTableId, int recommendedLevel
});




}
/// @nodoc
class __$DungeonDataCopyWithImpl<$Res>
    implements _$DungeonDataCopyWith<$Res> {
  __$DungeonDataCopyWithImpl(this._self, this._then);

  final _DungeonData _self;
  final $Res Function(_DungeonData) _then;

/// Create a copy of DungeonData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? floorCount = null,Object? roomsPerFloor = null,Object? monsterPool = null,Object? bossId = null,Object? lootTableId = null,Object? recommendedLevel = null,}) {
  return _then(_DungeonData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,floorCount: null == floorCount ? _self.floorCount : floorCount // ignore: cast_nullable_to_non_nullable
as int,roomsPerFloor: null == roomsPerFloor ? _self.roomsPerFloor : roomsPerFloor // ignore: cast_nullable_to_non_nullable
as IntRange,monsterPool: null == monsterPool ? _self._monsterPool : monsterPool // ignore: cast_nullable_to_non_nullable
as List<String>,bossId: null == bossId ? _self.bossId : bossId // ignore: cast_nullable_to_non_nullable
as String,lootTableId: null == lootTableId ? _self.lootTableId : lootTableId // ignore: cast_nullable_to_non_nullable
as String,recommendedLevel: null == recommendedLevel ? _self.recommendedLevel : recommendedLevel // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
