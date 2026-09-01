// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'monster_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$MonsterData {

 String get id; String get name; String get description; int get hp; int get attack; int get defense; List<String> get abilityIds; IntRange get xpReward; String? get lootTableId;
/// Create a copy of MonsterData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MonsterDataCopyWith<MonsterData> get copyWith => _$MonsterDataCopyWithImpl<MonsterData>(this as MonsterData, _$identity);

  /// Serializes this MonsterData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as MonsterData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MonsterData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.hp, _this.hp) || other.hp == _this.hp)&&(identical(other.attack, _this.attack) || other.attack == _this.attack)&&(identical(other.defense, _this.defense) || other.defense == _this.defense)&&const DeepCollectionEquality().equals(other.abilityIds, _this.abilityIds)&&(identical(other.xpReward, _this.xpReward) || other.xpReward == _this.xpReward)&&(identical(other.lootTableId, _this.lootTableId) || other.lootTableId == _this.lootTableId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as MonsterData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.hp,_this.attack,_this.defense,const DeepCollectionEquality().hash(_this.abilityIds),_this.xpReward,_this.lootTableId);
}

@override
String toString() {
  final _this = this as MonsterData;
  return 'MonsterData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, hp: ${_this.hp}, attack: ${_this.attack}, defense: ${_this.defense}, abilityIds: ${_this.abilityIds}, xpReward: ${_this.xpReward}, lootTableId: ${_this.lootTableId})';
}


}

/// @nodoc
abstract mixin class $MonsterDataCopyWith<$Res>  {
  factory $MonsterDataCopyWith(MonsterData value, $Res Function(MonsterData) _then) = _$MonsterDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, int hp, int attack, int defense, List<String> abilityIds, IntRange xpReward, String? lootTableId
});




}
/// @nodoc
class _$MonsterDataCopyWithImpl<$Res>
    implements $MonsterDataCopyWith<$Res> {
  _$MonsterDataCopyWithImpl(this._self, this._then);

  final MonsterData _self;
  final $Res Function(MonsterData) _then;

/// Create a copy of MonsterData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? hp = null,Object? attack = null,Object? defense = null,Object? abilityIds = null,Object? xpReward = null,Object? lootTableId = freezed,}) {
  return _then(MonsterData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,hp: null == hp ? _self.hp : hp // ignore: cast_nullable_to_non_nullable
as int,attack: null == attack ? _self.attack : attack // ignore: cast_nullable_to_non_nullable
as int,defense: null == defense ? _self.defense : defense // ignore: cast_nullable_to_non_nullable
as int,abilityIds: null == abilityIds ? _self.abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,xpReward: null == xpReward ? _self.xpReward : xpReward // ignore: cast_nullable_to_non_nullable
as IntRange,lootTableId: freezed == lootTableId ? _self.lootTableId : lootTableId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [MonsterData].
extension MonsterDataPatterns on MonsterData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MonsterData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MonsterData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MonsterData value)  $default,){
final _that = this;
switch (_that) {
case _MonsterData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MonsterData value)?  $default,){
final _that = this;
switch (_that) {
case _MonsterData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int hp,  int attack,  int defense,  List<String> abilityIds,  IntRange xpReward,  String? lootTableId)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MonsterData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.hp,_that.attack,_that.defense,_that.abilityIds,_that.xpReward,_that.lootTableId);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int hp,  int attack,  int defense,  List<String> abilityIds,  IntRange xpReward,  String? lootTableId)  $default,) {final _that = this;
switch (_that) {
case _MonsterData():
return $default(_that.id,_that.name,_that.description,_that.hp,_that.attack,_that.defense,_that.abilityIds,_that.xpReward,_that.lootTableId);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  int hp,  int attack,  int defense,  List<String> abilityIds,  IntRange xpReward,  String? lootTableId)?  $default,) {final _that = this;
switch (_that) {
case _MonsterData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.hp,_that.attack,_that.defense,_that.abilityIds,_that.xpReward,_that.lootTableId);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MonsterData implements MonsterData {
  const _MonsterData({required this.id, required this.name, this.description = '', required this.hp, required this.attack, required this.defense,  List<String> abilityIds = const [], required this.xpReward, this.lootTableId}): _abilityIds = abilityIds;
  factory _MonsterData.fromJson(Map<String, dynamic> json) => _$MonsterDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  int hp;
@override final  int attack;
@override final  int defense;
 final  List<String> _abilityIds;
@override@JsonKey() List<String> get abilityIds {
  if (_abilityIds is EqualUnmodifiableListView) return _abilityIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_abilityIds);
}

@override final  IntRange xpReward;
@override final  String? lootTableId;

/// Create a copy of MonsterData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MonsterDataCopyWith<_MonsterData> get copyWith => __$MonsterDataCopyWithImpl<_MonsterData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MonsterDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _MonsterData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.hp, hp) || other.hp == hp)&&(identical(other.attack, attack) || other.attack == attack)&&(identical(other.defense, defense) || other.defense == defense)&&const DeepCollectionEquality().equals(other.abilityIds, _abilityIds)&&(identical(other.xpReward, xpReward) || other.xpReward == xpReward)&&(identical(other.lootTableId, lootTableId) || other.lootTableId == lootTableId));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,hp,attack,defense,const DeepCollectionEquality().hash(_abilityIds),xpReward,lootTableId);
}

@override
String toString() {
    return 'MonsterData(id: $id, name: $name, description: $description, hp: $hp, attack: $attack, defense: $defense, abilityIds: $abilityIds, xpReward: $xpReward, lootTableId: $lootTableId)';
}


}

/// @nodoc
abstract mixin class _$MonsterDataCopyWith<$Res> implements $MonsterDataCopyWith<$Res> {
  factory _$MonsterDataCopyWith(_MonsterData value, $Res Function(_MonsterData) _then) = __$MonsterDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, int hp, int attack, int defense, List<String> abilityIds, IntRange xpReward, String? lootTableId
});




}
/// @nodoc
class __$MonsterDataCopyWithImpl<$Res>
    implements _$MonsterDataCopyWith<$Res> {
  __$MonsterDataCopyWithImpl(this._self, this._then);

  final _MonsterData _self;
  final $Res Function(_MonsterData) _then;

/// Create a copy of MonsterData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? hp = null,Object? attack = null,Object? defense = null,Object? abilityIds = null,Object? xpReward = null,Object? lootTableId = freezed,}) {
  return _then(_MonsterData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,hp: null == hp ? _self.hp : hp // ignore: cast_nullable_to_non_nullable
as int,attack: null == attack ? _self.attack : attack // ignore: cast_nullable_to_non_nullable
as int,defense: null == defense ? _self.defense : defense // ignore: cast_nullable_to_non_nullable
as int,abilityIds: null == abilityIds ? _self._abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,xpReward: null == xpReward ? _self.xpReward : xpReward // ignore: cast_nullable_to_non_nullable
as IntRange,lootTableId: freezed == lootTableId ? _self.lootTableId : lootTableId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
