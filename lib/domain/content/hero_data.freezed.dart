// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'hero_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$HeroData {

 String get id; String get name; String get description; int get baseHp; int get baseAttack; int get baseDefense; int get dieCount; String get dieId; List<String> get abilityIds;
/// Create a copy of HeroData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HeroDataCopyWith<HeroData> get copyWith => _$HeroDataCopyWithImpl<HeroData>(this as HeroData, _$identity);

  /// Serializes this HeroData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HeroData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HeroData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.baseHp, _this.baseHp) || other.baseHp == _this.baseHp)&&(identical(other.baseAttack, _this.baseAttack) || other.baseAttack == _this.baseAttack)&&(identical(other.baseDefense, _this.baseDefense) || other.baseDefense == _this.baseDefense)&&(identical(other.dieCount, _this.dieCount) || other.dieCount == _this.dieCount)&&(identical(other.dieId, _this.dieId) || other.dieId == _this.dieId)&&const DeepCollectionEquality().equals(other.abilityIds, _this.abilityIds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HeroData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.baseHp,_this.baseAttack,_this.baseDefense,_this.dieCount,_this.dieId,const DeepCollectionEquality().hash(_this.abilityIds));
}

@override
String toString() {
  final _this = this as HeroData;
  return 'HeroData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, baseHp: ${_this.baseHp}, baseAttack: ${_this.baseAttack}, baseDefense: ${_this.baseDefense}, dieCount: ${_this.dieCount}, dieId: ${_this.dieId}, abilityIds: ${_this.abilityIds})';
}


}

/// @nodoc
abstract mixin class $HeroDataCopyWith<$Res>  {
  factory $HeroDataCopyWith(HeroData value, $Res Function(HeroData) _then) = _$HeroDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, int baseHp, int baseAttack, int baseDefense, int dieCount, String dieId, List<String> abilityIds
});




}
/// @nodoc
class _$HeroDataCopyWithImpl<$Res>
    implements $HeroDataCopyWith<$Res> {
  _$HeroDataCopyWithImpl(this._self, this._then);

  final HeroData _self;
  final $Res Function(HeroData) _then;

/// Create a copy of HeroData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? baseHp = null,Object? baseAttack = null,Object? baseDefense = null,Object? dieCount = null,Object? dieId = null,Object? abilityIds = null,}) {
  return _then(HeroData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,baseHp: null == baseHp ? _self.baseHp : baseHp // ignore: cast_nullable_to_non_nullable
as int,baseAttack: null == baseAttack ? _self.baseAttack : baseAttack // ignore: cast_nullable_to_non_nullable
as int,baseDefense: null == baseDefense ? _self.baseDefense : baseDefense // ignore: cast_nullable_to_non_nullable
as int,dieCount: null == dieCount ? _self.dieCount : dieCount // ignore: cast_nullable_to_non_nullable
as int,dieId: null == dieId ? _self.dieId : dieId // ignore: cast_nullable_to_non_nullable
as String,abilityIds: null == abilityIds ? _self.abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [HeroData].
extension HeroDataPatterns on HeroData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HeroData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HeroData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HeroData value)  $default,){
final _that = this;
switch (_that) {
case _HeroData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HeroData value)?  $default,){
final _that = this;
switch (_that) {
case _HeroData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int baseHp,  int baseAttack,  int baseDefense,  int dieCount,  String dieId,  List<String> abilityIds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HeroData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.baseHp,_that.baseAttack,_that.baseDefense,_that.dieCount,_that.dieId,_that.abilityIds);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int baseHp,  int baseAttack,  int baseDefense,  int dieCount,  String dieId,  List<String> abilityIds)  $default,) {final _that = this;
switch (_that) {
case _HeroData():
return $default(_that.id,_that.name,_that.description,_that.baseHp,_that.baseAttack,_that.baseDefense,_that.dieCount,_that.dieId,_that.abilityIds);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  int baseHp,  int baseAttack,  int baseDefense,  int dieCount,  String dieId,  List<String> abilityIds)?  $default,) {final _that = this;
switch (_that) {
case _HeroData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.baseHp,_that.baseAttack,_that.baseDefense,_that.dieCount,_that.dieId,_that.abilityIds);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HeroData implements HeroData {
  const _HeroData({required this.id, required this.name, this.description = '', required this.baseHp, required this.baseAttack, required this.baseDefense, required this.dieCount, this.dieId = 'die_standard',  List<String> abilityIds = const []}): _abilityIds = abilityIds;
  factory _HeroData.fromJson(Map<String, dynamic> json) => _$HeroDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  int baseHp;
@override final  int baseAttack;
@override final  int baseDefense;
@override final  int dieCount;
@override@JsonKey() final  String dieId;
 final  List<String> _abilityIds;
@override@JsonKey() List<String> get abilityIds {
  if (_abilityIds is EqualUnmodifiableListView) return _abilityIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_abilityIds);
}


/// Create a copy of HeroData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HeroDataCopyWith<_HeroData> get copyWith => __$HeroDataCopyWithImpl<_HeroData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HeroDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HeroData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.baseHp, baseHp) || other.baseHp == baseHp)&&(identical(other.baseAttack, baseAttack) || other.baseAttack == baseAttack)&&(identical(other.baseDefense, baseDefense) || other.baseDefense == baseDefense)&&(identical(other.dieCount, dieCount) || other.dieCount == dieCount)&&(identical(other.dieId, dieId) || other.dieId == dieId)&&const DeepCollectionEquality().equals(other.abilityIds, _abilityIds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,baseHp,baseAttack,baseDefense,dieCount,dieId,const DeepCollectionEquality().hash(_abilityIds));
}

@override
String toString() {
    return 'HeroData(id: $id, name: $name, description: $description, baseHp: $baseHp, baseAttack: $baseAttack, baseDefense: $baseDefense, dieCount: $dieCount, dieId: $dieId, abilityIds: $abilityIds)';
}


}

/// @nodoc
abstract mixin class _$HeroDataCopyWith<$Res> implements $HeroDataCopyWith<$Res> {
  factory _$HeroDataCopyWith(_HeroData value, $Res Function(_HeroData) _then) = __$HeroDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, int baseHp, int baseAttack, int baseDefense, int dieCount, String dieId, List<String> abilityIds
});




}
/// @nodoc
class __$HeroDataCopyWithImpl<$Res>
    implements _$HeroDataCopyWith<$Res> {
  __$HeroDataCopyWithImpl(this._self, this._then);

  final _HeroData _self;
  final $Res Function(_HeroData) _then;

/// Create a copy of HeroData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? baseHp = null,Object? baseAttack = null,Object? baseDefense = null,Object? dieCount = null,Object? dieId = null,Object? abilityIds = null,}) {
  return _then(_HeroData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,baseHp: null == baseHp ? _self.baseHp : baseHp // ignore: cast_nullable_to_non_nullable
as int,baseAttack: null == baseAttack ? _self.baseAttack : baseAttack // ignore: cast_nullable_to_non_nullable
as int,baseDefense: null == baseDefense ? _self.baseDefense : baseDefense // ignore: cast_nullable_to_non_nullable
as int,dieCount: null == dieCount ? _self.dieCount : dieCount // ignore: cast_nullable_to_non_nullable
as int,dieId: null == dieId ? _self.dieId : dieId // ignore: cast_nullable_to_non_nullable
as String,abilityIds: null == abilityIds ? _self._abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}

// dart format on
