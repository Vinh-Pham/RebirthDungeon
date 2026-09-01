// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'ability_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$AbilityData {

 String get id; String get name; String get description; AbilityEffect get effect; IntRange get power; int get dieCost;
/// Create a copy of AbilityData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AbilityDataCopyWith<AbilityData> get copyWith => _$AbilityDataCopyWithImpl<AbilityData>(this as AbilityData, _$identity);

  /// Serializes this AbilityData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AbilityData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AbilityData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.effect, _this.effect) || other.effect == _this.effect)&&(identical(other.power, _this.power) || other.power == _this.power)&&(identical(other.dieCost, _this.dieCost) || other.dieCost == _this.dieCost));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AbilityData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.effect,_this.power,_this.dieCost);
}

@override
String toString() {
  final _this = this as AbilityData;
  return 'AbilityData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, effect: ${_this.effect}, power: ${_this.power}, dieCost: ${_this.dieCost})';
}


}

/// @nodoc
abstract mixin class $AbilityDataCopyWith<$Res>  {
  factory $AbilityDataCopyWith(AbilityData value, $Res Function(AbilityData) _then) = _$AbilityDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, AbilityEffect effect, IntRange power, int dieCost
});




}
/// @nodoc
class _$AbilityDataCopyWithImpl<$Res>
    implements $AbilityDataCopyWith<$Res> {
  _$AbilityDataCopyWithImpl(this._self, this._then);

  final AbilityData _self;
  final $Res Function(AbilityData) _then;

/// Create a copy of AbilityData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? effect = null,Object? power = null,Object? dieCost = null,}) {
  return _then(AbilityData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,effect: null == effect ? _self.effect : effect // ignore: cast_nullable_to_non_nullable
as AbilityEffect,power: null == power ? _self.power : power // ignore: cast_nullable_to_non_nullable
as IntRange,dieCost: null == dieCost ? _self.dieCost : dieCost // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [AbilityData].
extension AbilityDataPatterns on AbilityData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AbilityData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AbilityData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AbilityData value)  $default,){
final _that = this;
switch (_that) {
case _AbilityData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AbilityData value)?  $default,){
final _that = this;
switch (_that) {
case _AbilityData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  AbilityEffect effect,  IntRange power,  int dieCost)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AbilityData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.effect,_that.power,_that.dieCost);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  AbilityEffect effect,  IntRange power,  int dieCost)  $default,) {final _that = this;
switch (_that) {
case _AbilityData():
return $default(_that.id,_that.name,_that.description,_that.effect,_that.power,_that.dieCost);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  AbilityEffect effect,  IntRange power,  int dieCost)?  $default,) {final _that = this;
switch (_that) {
case _AbilityData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.effect,_that.power,_that.dieCost);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AbilityData implements AbilityData {
  const _AbilityData({required this.id, required this.name, this.description = '', required this.effect, required this.power, this.dieCost = 1});
  factory _AbilityData.fromJson(Map<String, dynamic> json) => _$AbilityDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  AbilityEffect effect;
@override final  IntRange power;
@override@JsonKey() final  int dieCost;

/// Create a copy of AbilityData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AbilityDataCopyWith<_AbilityData> get copyWith => __$AbilityDataCopyWithImpl<_AbilityData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AbilityDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AbilityData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.effect, effect) || other.effect == effect)&&(identical(other.power, power) || other.power == power)&&(identical(other.dieCost, dieCost) || other.dieCost == dieCost));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,effect,power,dieCost);
}

@override
String toString() {
    return 'AbilityData(id: $id, name: $name, description: $description, effect: $effect, power: $power, dieCost: $dieCost)';
}


}

/// @nodoc
abstract mixin class _$AbilityDataCopyWith<$Res> implements $AbilityDataCopyWith<$Res> {
  factory _$AbilityDataCopyWith(_AbilityData value, $Res Function(_AbilityData) _then) = __$AbilityDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, AbilityEffect effect, IntRange power, int dieCost
});




}
/// @nodoc
class __$AbilityDataCopyWithImpl<$Res>
    implements _$AbilityDataCopyWith<$Res> {
  __$AbilityDataCopyWithImpl(this._self, this._then);

  final _AbilityData _self;
  final $Res Function(_AbilityData) _then;

/// Create a copy of AbilityData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? effect = null,Object? power = null,Object? dieCost = null,}) {
  return _then(_AbilityData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,effect: null == effect ? _self.effect : effect // ignore: cast_nullable_to_non_nullable
as AbilityEffect,power: null == power ? _self.power : power // ignore: cast_nullable_to_non_nullable
as IntRange,dieCost: null == dieCost ? _self.dieCost : dieCost // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
