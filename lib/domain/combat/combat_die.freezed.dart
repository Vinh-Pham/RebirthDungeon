// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'combat_die.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CombatDie {

 int get dieIndex; String get dieId; int get sides; int get maxFace; int? get faceValue; List<String> get tags; DieStatus get status; String? get assignedAbility;
/// Create a copy of CombatDie
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CombatDieCopyWith<CombatDie> get copyWith => _$CombatDieCopyWithImpl<CombatDie>(this as CombatDie, _$identity);

  /// Serializes this CombatDie to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as CombatDie;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatDie&&(identical(other.dieIndex, _this.dieIndex) || other.dieIndex == _this.dieIndex)&&(identical(other.dieId, _this.dieId) || other.dieId == _this.dieId)&&(identical(other.sides, _this.sides) || other.sides == _this.sides)&&(identical(other.maxFace, _this.maxFace) || other.maxFace == _this.maxFace)&&(identical(other.faceValue, _this.faceValue) || other.faceValue == _this.faceValue)&&const DeepCollectionEquality().equals(other.tags, _this.tags)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.assignedAbility, _this.assignedAbility) || other.assignedAbility == _this.assignedAbility));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as CombatDie;
  return Object.hash(runtimeType,_this.dieIndex,_this.dieId,_this.sides,_this.maxFace,_this.faceValue,const DeepCollectionEquality().hash(_this.tags),_this.status,_this.assignedAbility);
}

@override
String toString() {
  final _this = this as CombatDie;
  return 'CombatDie(dieIndex: ${_this.dieIndex}, dieId: ${_this.dieId}, sides: ${_this.sides}, maxFace: ${_this.maxFace}, faceValue: ${_this.faceValue}, tags: ${_this.tags}, status: ${_this.status}, assignedAbility: ${_this.assignedAbility})';
}


}

/// @nodoc
abstract mixin class $CombatDieCopyWith<$Res>  {
  factory $CombatDieCopyWith(CombatDie value, $Res Function(CombatDie) _then) = _$CombatDieCopyWithImpl;
@useResult
$Res call({
 int dieIndex, String dieId, int sides, int maxFace, int? faceValue, List<String> tags, DieStatus status, String? assignedAbility
});




}
/// @nodoc
class _$CombatDieCopyWithImpl<$Res>
    implements $CombatDieCopyWith<$Res> {
  _$CombatDieCopyWithImpl(this._self, this._then);

  final CombatDie _self;
  final $Res Function(CombatDie) _then;

/// Create a copy of CombatDie
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? dieIndex = null,Object? dieId = null,Object? sides = null,Object? maxFace = null,Object? faceValue = freezed,Object? tags = null,Object? status = null,Object? assignedAbility = freezed,}) {
  return _then(CombatDie(
dieIndex: null == dieIndex ? _self.dieIndex : dieIndex // ignore: cast_nullable_to_non_nullable
as int,dieId: null == dieId ? _self.dieId : dieId // ignore: cast_nullable_to_non_nullable
as String,sides: null == sides ? _self.sides : sides // ignore: cast_nullable_to_non_nullable
as int,maxFace: null == maxFace ? _self.maxFace : maxFace // ignore: cast_nullable_to_non_nullable
as int,faceValue: freezed == faceValue ? _self.faceValue : faceValue // ignore: cast_nullable_to_non_nullable
as int?,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DieStatus,assignedAbility: freezed == assignedAbility ? _self.assignedAbility : assignedAbility // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [CombatDie].
extension CombatDiePatterns on CombatDie {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CombatDie value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CombatDie() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CombatDie value)  $default,){
final _that = this;
switch (_that) {
case _CombatDie():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CombatDie value)?  $default,){
final _that = this;
switch (_that) {
case _CombatDie() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int dieIndex,  String dieId,  int sides,  int maxFace,  int? faceValue,  List<String> tags,  DieStatus status,  String? assignedAbility)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CombatDie() when $default != null:
return $default(_that.dieIndex,_that.dieId,_that.sides,_that.maxFace,_that.faceValue,_that.tags,_that.status,_that.assignedAbility);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int dieIndex,  String dieId,  int sides,  int maxFace,  int? faceValue,  List<String> tags,  DieStatus status,  String? assignedAbility)  $default,) {final _that = this;
switch (_that) {
case _CombatDie():
return $default(_that.dieIndex,_that.dieId,_that.sides,_that.maxFace,_that.faceValue,_that.tags,_that.status,_that.assignedAbility);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int dieIndex,  String dieId,  int sides,  int maxFace,  int? faceValue,  List<String> tags,  DieStatus status,  String? assignedAbility)?  $default,) {final _that = this;
switch (_that) {
case _CombatDie() when $default != null:
return $default(_that.dieIndex,_that.dieId,_that.sides,_that.maxFace,_that.faceValue,_that.tags,_that.status,_that.assignedAbility);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CombatDie implements CombatDie {
  const _CombatDie({required this.dieIndex, required this.dieId, required this.sides, required this.maxFace, this.faceValue,  List<String> tags = const [], this.status = DieStatus.unrolled, this.assignedAbility}): _tags = tags;
  factory _CombatDie.fromJson(Map<String, dynamic> json) => _$CombatDieFromJson(json);

@override final  int dieIndex;
@override final  String dieId;
@override final  int sides;
@override final  int maxFace;
@override final  int? faceValue;
 final  List<String> _tags;
@override@JsonKey() List<String> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}

@override@JsonKey() final  DieStatus status;
@override final  String? assignedAbility;

/// Create a copy of CombatDie
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CombatDieCopyWith<_CombatDie> get copyWith => __$CombatDieCopyWithImpl<_CombatDie>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CombatDieToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _CombatDie&&(identical(other.dieIndex, dieIndex) || other.dieIndex == dieIndex)&&(identical(other.dieId, dieId) || other.dieId == dieId)&&(identical(other.sides, sides) || other.sides == sides)&&(identical(other.maxFace, maxFace) || other.maxFace == maxFace)&&(identical(other.faceValue, faceValue) || other.faceValue == faceValue)&&const DeepCollectionEquality().equals(other.tags, _tags)&&(identical(other.status, status) || other.status == status)&&(identical(other.assignedAbility, assignedAbility) || other.assignedAbility == assignedAbility));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,dieIndex,dieId,sides,maxFace,faceValue,const DeepCollectionEquality().hash(_tags),status,assignedAbility);
}

@override
String toString() {
    return 'CombatDie(dieIndex: $dieIndex, dieId: $dieId, sides: $sides, maxFace: $maxFace, faceValue: $faceValue, tags: $tags, status: $status, assignedAbility: $assignedAbility)';
}


}

/// @nodoc
abstract mixin class _$CombatDieCopyWith<$Res> implements $CombatDieCopyWith<$Res> {
  factory _$CombatDieCopyWith(_CombatDie value, $Res Function(_CombatDie) _then) = __$CombatDieCopyWithImpl;
@override @useResult
$Res call({
 int dieIndex, String dieId, int sides, int maxFace, int? faceValue, List<String> tags, DieStatus status, String? assignedAbility
});




}
/// @nodoc
class __$CombatDieCopyWithImpl<$Res>
    implements _$CombatDieCopyWith<$Res> {
  __$CombatDieCopyWithImpl(this._self, this._then);

  final _CombatDie _self;
  final $Res Function(_CombatDie) _then;

/// Create a copy of CombatDie
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? dieIndex = null,Object? dieId = null,Object? sides = null,Object? maxFace = null,Object? faceValue = freezed,Object? tags = null,Object? status = null,Object? assignedAbility = freezed,}) {
  return _then(_CombatDie(
dieIndex: null == dieIndex ? _self.dieIndex : dieIndex // ignore: cast_nullable_to_non_nullable
as int,dieId: null == dieId ? _self.dieId : dieId // ignore: cast_nullable_to_non_nullable
as String,sides: null == sides ? _self.sides : sides // ignore: cast_nullable_to_non_nullable
as int,maxFace: null == maxFace ? _self.maxFace : maxFace // ignore: cast_nullable_to_non_nullable
as int,faceValue: freezed == faceValue ? _self.faceValue : faceValue // ignore: cast_nullable_to_non_nullable
as int?,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as DieStatus,assignedAbility: freezed == assignedAbility ? _self.assignedAbility : assignedAbility // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
