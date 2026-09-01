// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'experience_curve_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ExperienceCurveData {

 String get id; String get name; List<int> get xpToLevel;
/// Create a copy of ExperienceCurveData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExperienceCurveDataCopyWith<ExperienceCurveData> get copyWith => _$ExperienceCurveDataCopyWithImpl<ExperienceCurveData>(this as ExperienceCurveData, _$identity);

  /// Serializes this ExperienceCurveData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ExperienceCurveData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExperienceCurveData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&const DeepCollectionEquality().equals(other.xpToLevel, _this.xpToLevel));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ExperienceCurveData;
  return Object.hash(runtimeType,_this.id,_this.name,const DeepCollectionEquality().hash(_this.xpToLevel));
}

@override
String toString() {
  final _this = this as ExperienceCurveData;
  return 'ExperienceCurveData(id: ${_this.id}, name: ${_this.name}, xpToLevel: ${_this.xpToLevel})';
}


}

/// @nodoc
abstract mixin class $ExperienceCurveDataCopyWith<$Res>  {
  factory $ExperienceCurveDataCopyWith(ExperienceCurveData value, $Res Function(ExperienceCurveData) _then) = _$ExperienceCurveDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, List<int> xpToLevel
});




}
/// @nodoc
class _$ExperienceCurveDataCopyWithImpl<$Res>
    implements $ExperienceCurveDataCopyWith<$Res> {
  _$ExperienceCurveDataCopyWithImpl(this._self, this._then);

  final ExperienceCurveData _self;
  final $Res Function(ExperienceCurveData) _then;

/// Create a copy of ExperienceCurveData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? xpToLevel = null,}) {
  return _then(ExperienceCurveData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,xpToLevel: null == xpToLevel ? _self.xpToLevel : xpToLevel // ignore: cast_nullable_to_non_nullable
as List<int>,
  ));
}

}


/// Adds pattern-matching-related methods to [ExperienceCurveData].
extension ExperienceCurveDataPatterns on ExperienceCurveData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExperienceCurveData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExperienceCurveData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExperienceCurveData value)  $default,){
final _that = this;
switch (_that) {
case _ExperienceCurveData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExperienceCurveData value)?  $default,){
final _that = this;
switch (_that) {
case _ExperienceCurveData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  List<int> xpToLevel)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExperienceCurveData() when $default != null:
return $default(_that.id,_that.name,_that.xpToLevel);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  List<int> xpToLevel)  $default,) {final _that = this;
switch (_that) {
case _ExperienceCurveData():
return $default(_that.id,_that.name,_that.xpToLevel);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  List<int> xpToLevel)?  $default,) {final _that = this;
switch (_that) {
case _ExperienceCurveData() when $default != null:
return $default(_that.id,_that.name,_that.xpToLevel);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ExperienceCurveData implements ExperienceCurveData {
  const _ExperienceCurveData({required this.id, required this.name, required  List<int> xpToLevel}): _xpToLevel = xpToLevel;
  factory _ExperienceCurveData.fromJson(Map<String, dynamic> json) => _$ExperienceCurveDataFromJson(json);

@override final  String id;
@override final  String name;
 final  List<int> _xpToLevel;
@override List<int> get xpToLevel {
  if (_xpToLevel is EqualUnmodifiableListView) return _xpToLevel;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_xpToLevel);
}


/// Create a copy of ExperienceCurveData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExperienceCurveDataCopyWith<_ExperienceCurveData> get copyWith => __$ExperienceCurveDataCopyWithImpl<_ExperienceCurveData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ExperienceCurveDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExperienceCurveData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&const DeepCollectionEquality().equals(other.xpToLevel, _xpToLevel));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,const DeepCollectionEquality().hash(_xpToLevel));
}

@override
String toString() {
    return 'ExperienceCurveData(id: $id, name: $name, xpToLevel: $xpToLevel)';
}


}

/// @nodoc
abstract mixin class _$ExperienceCurveDataCopyWith<$Res> implements $ExperienceCurveDataCopyWith<$Res> {
  factory _$ExperienceCurveDataCopyWith(_ExperienceCurveData value, $Res Function(_ExperienceCurveData) _then) = __$ExperienceCurveDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, List<int> xpToLevel
});




}
/// @nodoc
class __$ExperienceCurveDataCopyWithImpl<$Res>
    implements _$ExperienceCurveDataCopyWith<$Res> {
  __$ExperienceCurveDataCopyWithImpl(this._self, this._then);

  final _ExperienceCurveData _self;
  final $Res Function(_ExperienceCurveData) _then;

/// Create a copy of ExperienceCurveData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? xpToLevel = null,}) {
  return _then(_ExperienceCurveData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,xpToLevel: null == xpToLevel ? _self._xpToLevel : xpToLevel // ignore: cast_nullable_to_non_nullable
as List<int>,
  ));
}


}

// dart format on
