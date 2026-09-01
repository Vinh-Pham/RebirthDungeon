// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'rarity_table_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RarityTierData {

 String get id; String get name; int get weight;
/// Create a copy of RarityTierData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RarityTierDataCopyWith<RarityTierData> get copyWith => _$RarityTierDataCopyWithImpl<RarityTierData>(this as RarityTierData, _$identity);

  /// Serializes this RarityTierData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RarityTierData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RarityTierData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.weight, _this.weight) || other.weight == _this.weight));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RarityTierData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.weight);
}

@override
String toString() {
  final _this = this as RarityTierData;
  return 'RarityTierData(id: ${_this.id}, name: ${_this.name}, weight: ${_this.weight})';
}


}

/// @nodoc
abstract mixin class $RarityTierDataCopyWith<$Res>  {
  factory $RarityTierDataCopyWith(RarityTierData value, $Res Function(RarityTierData) _then) = _$RarityTierDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, int weight
});




}
/// @nodoc
class _$RarityTierDataCopyWithImpl<$Res>
    implements $RarityTierDataCopyWith<$Res> {
  _$RarityTierDataCopyWithImpl(this._self, this._then);

  final RarityTierData _self;
  final $Res Function(RarityTierData) _then;

/// Create a copy of RarityTierData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? weight = null,}) {
  return _then(RarityTierData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [RarityTierData].
extension RarityTierDataPatterns on RarityTierData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RarityTierData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RarityTierData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RarityTierData value)  $default,){
final _that = this;
switch (_that) {
case _RarityTierData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RarityTierData value)?  $default,){
final _that = this;
switch (_that) {
case _RarityTierData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  int weight)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RarityTierData() when $default != null:
return $default(_that.id,_that.name,_that.weight);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  int weight)  $default,) {final _that = this;
switch (_that) {
case _RarityTierData():
return $default(_that.id,_that.name,_that.weight);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  int weight)?  $default,) {final _that = this;
switch (_that) {
case _RarityTierData() when $default != null:
return $default(_that.id,_that.name,_that.weight);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RarityTierData implements RarityTierData {
  const _RarityTierData({required this.id, required this.name, required this.weight});
  factory _RarityTierData.fromJson(Map<String, dynamic> json) => _$RarityTierDataFromJson(json);

@override final  String id;
@override final  String name;
@override final  int weight;

/// Create a copy of RarityTierData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RarityTierDataCopyWith<_RarityTierData> get copyWith => __$RarityTierDataCopyWithImpl<_RarityTierData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RarityTierDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RarityTierData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.weight, weight) || other.weight == weight));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,weight);
}

@override
String toString() {
    return 'RarityTierData(id: $id, name: $name, weight: $weight)';
}


}

/// @nodoc
abstract mixin class _$RarityTierDataCopyWith<$Res> implements $RarityTierDataCopyWith<$Res> {
  factory _$RarityTierDataCopyWith(_RarityTierData value, $Res Function(_RarityTierData) _then) = __$RarityTierDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, int weight
});




}
/// @nodoc
class __$RarityTierDataCopyWithImpl<$Res>
    implements _$RarityTierDataCopyWith<$Res> {
  __$RarityTierDataCopyWithImpl(this._self, this._then);

  final _RarityTierData _self;
  final $Res Function(_RarityTierData) _then;

/// Create a copy of RarityTierData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? weight = null,}) {
  return _then(_RarityTierData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$RarityTableData {

 String get id; String get name; List<RarityTierData> get tiers;
/// Create a copy of RarityTableData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RarityTableDataCopyWith<RarityTableData> get copyWith => _$RarityTableDataCopyWithImpl<RarityTableData>(this as RarityTableData, _$identity);

  /// Serializes this RarityTableData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RarityTableData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RarityTableData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&const DeepCollectionEquality().equals(other.tiers, _this.tiers));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RarityTableData;
  return Object.hash(runtimeType,_this.id,_this.name,const DeepCollectionEquality().hash(_this.tiers));
}

@override
String toString() {
  final _this = this as RarityTableData;
  return 'RarityTableData(id: ${_this.id}, name: ${_this.name}, tiers: ${_this.tiers})';
}


}

/// @nodoc
abstract mixin class $RarityTableDataCopyWith<$Res>  {
  factory $RarityTableDataCopyWith(RarityTableData value, $Res Function(RarityTableData) _then) = _$RarityTableDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, List<RarityTierData> tiers
});




}
/// @nodoc
class _$RarityTableDataCopyWithImpl<$Res>
    implements $RarityTableDataCopyWith<$Res> {
  _$RarityTableDataCopyWithImpl(this._self, this._then);

  final RarityTableData _self;
  final $Res Function(RarityTableData) _then;

/// Create a copy of RarityTableData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? tiers = null,}) {
  return _then(RarityTableData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,tiers: null == tiers ? _self.tiers : tiers // ignore: cast_nullable_to_non_nullable
as List<RarityTierData>,
  ));
}

}


/// Adds pattern-matching-related methods to [RarityTableData].
extension RarityTableDataPatterns on RarityTableData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RarityTableData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RarityTableData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RarityTableData value)  $default,){
final _that = this;
switch (_that) {
case _RarityTableData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RarityTableData value)?  $default,){
final _that = this;
switch (_that) {
case _RarityTableData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  List<RarityTierData> tiers)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RarityTableData() when $default != null:
return $default(_that.id,_that.name,_that.tiers);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  List<RarityTierData> tiers)  $default,) {final _that = this;
switch (_that) {
case _RarityTableData():
return $default(_that.id,_that.name,_that.tiers);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  List<RarityTierData> tiers)?  $default,) {final _that = this;
switch (_that) {
case _RarityTableData() when $default != null:
return $default(_that.id,_that.name,_that.tiers);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RarityTableData implements RarityTableData {
  const _RarityTableData({required this.id, required this.name, required  List<RarityTierData> tiers}): _tiers = tiers;
  factory _RarityTableData.fromJson(Map<String, dynamic> json) => _$RarityTableDataFromJson(json);

@override final  String id;
@override final  String name;
 final  List<RarityTierData> _tiers;
@override List<RarityTierData> get tiers {
  if (_tiers is EqualUnmodifiableListView) return _tiers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tiers);
}


/// Create a copy of RarityTableData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RarityTableDataCopyWith<_RarityTableData> get copyWith => __$RarityTableDataCopyWithImpl<_RarityTableData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RarityTableDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RarityTableData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&const DeepCollectionEquality().equals(other.tiers, _tiers));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,const DeepCollectionEquality().hash(_tiers));
}

@override
String toString() {
    return 'RarityTableData(id: $id, name: $name, tiers: $tiers)';
}


}

/// @nodoc
abstract mixin class _$RarityTableDataCopyWith<$Res> implements $RarityTableDataCopyWith<$Res> {
  factory _$RarityTableDataCopyWith(_RarityTableData value, $Res Function(_RarityTableData) _then) = __$RarityTableDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, List<RarityTierData> tiers
});




}
/// @nodoc
class __$RarityTableDataCopyWithImpl<$Res>
    implements _$RarityTableDataCopyWith<$Res> {
  __$RarityTableDataCopyWithImpl(this._self, this._then);

  final _RarityTableData _self;
  final $Res Function(_RarityTableData) _then;

/// Create a copy of RarityTableData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? tiers = null,}) {
  return _then(_RarityTableData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,tiers: null == tiers ? _self._tiers : tiers // ignore: cast_nullable_to_non_nullable
as List<RarityTierData>,
  ));
}


}

// dart format on
