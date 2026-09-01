// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'status_effect_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$StatusEffectData {

 String get id; String get name; String get description; StatusEffectKind get kind; IntRange get potency; IntRange get durationTurns;
/// Create a copy of StatusEffectData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StatusEffectDataCopyWith<StatusEffectData> get copyWith => _$StatusEffectDataCopyWithImpl<StatusEffectData>(this as StatusEffectData, _$identity);

  /// Serializes this StatusEffectData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as StatusEffectData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StatusEffectData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.kind, _this.kind) || other.kind == _this.kind)&&(identical(other.potency, _this.potency) || other.potency == _this.potency)&&(identical(other.durationTurns, _this.durationTurns) || other.durationTurns == _this.durationTurns));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as StatusEffectData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.kind,_this.potency,_this.durationTurns);
}

@override
String toString() {
  final _this = this as StatusEffectData;
  return 'StatusEffectData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, kind: ${_this.kind}, potency: ${_this.potency}, durationTurns: ${_this.durationTurns})';
}


}

/// @nodoc
abstract mixin class $StatusEffectDataCopyWith<$Res>  {
  factory $StatusEffectDataCopyWith(StatusEffectData value, $Res Function(StatusEffectData) _then) = _$StatusEffectDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, StatusEffectKind kind, IntRange potency, IntRange durationTurns
});




}
/// @nodoc
class _$StatusEffectDataCopyWithImpl<$Res>
    implements $StatusEffectDataCopyWith<$Res> {
  _$StatusEffectDataCopyWithImpl(this._self, this._then);

  final StatusEffectData _self;
  final $Res Function(StatusEffectData) _then;

/// Create a copy of StatusEffectData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? kind = null,Object? potency = null,Object? durationTurns = null,}) {
  return _then(StatusEffectData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as StatusEffectKind,potency: null == potency ? _self.potency : potency // ignore: cast_nullable_to_non_nullable
as IntRange,durationTurns: null == durationTurns ? _self.durationTurns : durationTurns // ignore: cast_nullable_to_non_nullable
as IntRange,
  ));
}

}


/// Adds pattern-matching-related methods to [StatusEffectData].
extension StatusEffectDataPatterns on StatusEffectData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StatusEffectData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StatusEffectData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StatusEffectData value)  $default,){
final _that = this;
switch (_that) {
case _StatusEffectData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StatusEffectData value)?  $default,){
final _that = this;
switch (_that) {
case _StatusEffectData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  StatusEffectKind kind,  IntRange potency,  IntRange durationTurns)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StatusEffectData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.kind,_that.potency,_that.durationTurns);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  StatusEffectKind kind,  IntRange potency,  IntRange durationTurns)  $default,) {final _that = this;
switch (_that) {
case _StatusEffectData():
return $default(_that.id,_that.name,_that.description,_that.kind,_that.potency,_that.durationTurns);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  StatusEffectKind kind,  IntRange potency,  IntRange durationTurns)?  $default,) {final _that = this;
switch (_that) {
case _StatusEffectData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.kind,_that.potency,_that.durationTurns);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StatusEffectData implements StatusEffectData {
  const _StatusEffectData({required this.id, required this.name, this.description = '', required this.kind, required this.potency, required this.durationTurns});
  factory _StatusEffectData.fromJson(Map<String, dynamic> json) => _$StatusEffectDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  StatusEffectKind kind;
@override final  IntRange potency;
@override final  IntRange durationTurns;

/// Create a copy of StatusEffectData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StatusEffectDataCopyWith<_StatusEffectData> get copyWith => __$StatusEffectDataCopyWithImpl<_StatusEffectData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StatusEffectDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _StatusEffectData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.potency, potency) || other.potency == potency)&&(identical(other.durationTurns, durationTurns) || other.durationTurns == durationTurns));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,kind,potency,durationTurns);
}

@override
String toString() {
    return 'StatusEffectData(id: $id, name: $name, description: $description, kind: $kind, potency: $potency, durationTurns: $durationTurns)';
}


}

/// @nodoc
abstract mixin class _$StatusEffectDataCopyWith<$Res> implements $StatusEffectDataCopyWith<$Res> {
  factory _$StatusEffectDataCopyWith(_StatusEffectData value, $Res Function(_StatusEffectData) _then) = __$StatusEffectDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, StatusEffectKind kind, IntRange potency, IntRange durationTurns
});




}
/// @nodoc
class __$StatusEffectDataCopyWithImpl<$Res>
    implements _$StatusEffectDataCopyWith<$Res> {
  __$StatusEffectDataCopyWithImpl(this._self, this._then);

  final _StatusEffectData _self;
  final $Res Function(_StatusEffectData) _then;

/// Create a copy of StatusEffectData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? kind = null,Object? potency = null,Object? durationTurns = null,}) {
  return _then(_StatusEffectData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as StatusEffectKind,potency: null == potency ? _self.potency : potency // ignore: cast_nullable_to_non_nullable
as IntRange,durationTurns: null == durationTurns ? _self.durationTurns : durationTurns // ignore: cast_nullable_to_non_nullable
as IntRange,
  ));
}


}

// dart format on
