// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'die_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$DieFaceData {

 int get value; List<String> get tags;
/// Create a copy of DieFaceData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DieFaceDataCopyWith<DieFaceData> get copyWith => _$DieFaceDataCopyWithImpl<DieFaceData>(this as DieFaceData, _$identity);

  /// Serializes this DieFaceData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DieFaceData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DieFaceData&&(identical(other.value, _this.value) || other.value == _this.value)&&const DeepCollectionEquality().equals(other.tags, _this.tags));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DieFaceData;
  return Object.hash(runtimeType,_this.value,const DeepCollectionEquality().hash(_this.tags));
}

@override
String toString() {
  final _this = this as DieFaceData;
  return 'DieFaceData(value: ${_this.value}, tags: ${_this.tags})';
}


}

/// @nodoc
abstract mixin class $DieFaceDataCopyWith<$Res>  {
  factory $DieFaceDataCopyWith(DieFaceData value, $Res Function(DieFaceData) _then) = _$DieFaceDataCopyWithImpl;
@useResult
$Res call({
 int value, List<String> tags
});




}
/// @nodoc
class _$DieFaceDataCopyWithImpl<$Res>
    implements $DieFaceDataCopyWith<$Res> {
  _$DieFaceDataCopyWithImpl(this._self, this._then);

  final DieFaceData _self;
  final $Res Function(DieFaceData) _then;

/// Create a copy of DieFaceData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? value = null,Object? tags = null,}) {
  return _then(DieFaceData(
value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [DieFaceData].
extension DieFaceDataPatterns on DieFaceData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DieFaceData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DieFaceData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DieFaceData value)  $default,){
final _that = this;
switch (_that) {
case _DieFaceData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DieFaceData value)?  $default,){
final _that = this;
switch (_that) {
case _DieFaceData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int value,  List<String> tags)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DieFaceData() when $default != null:
return $default(_that.value,_that.tags);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int value,  List<String> tags)  $default,) {final _that = this;
switch (_that) {
case _DieFaceData():
return $default(_that.value,_that.tags);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int value,  List<String> tags)?  $default,) {final _that = this;
switch (_that) {
case _DieFaceData() when $default != null:
return $default(_that.value,_that.tags);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DieFaceData implements DieFaceData {
  const _DieFaceData({required this.value,  List<String> tags = const []}): _tags = tags;
  factory _DieFaceData.fromJson(Map<String, dynamic> json) => _$DieFaceDataFromJson(json);

@override final  int value;
 final  List<String> _tags;
@override@JsonKey() List<String> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}


/// Create a copy of DieFaceData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DieFaceDataCopyWith<_DieFaceData> get copyWith => __$DieFaceDataCopyWithImpl<_DieFaceData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DieFaceDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DieFaceData&&(identical(other.value, value) || other.value == value)&&const DeepCollectionEquality().equals(other.tags, _tags));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,value,const DeepCollectionEquality().hash(_tags));
}

@override
String toString() {
    return 'DieFaceData(value: $value, tags: $tags)';
}


}

/// @nodoc
abstract mixin class _$DieFaceDataCopyWith<$Res> implements $DieFaceDataCopyWith<$Res> {
  factory _$DieFaceDataCopyWith(_DieFaceData value, $Res Function(_DieFaceData) _then) = __$DieFaceDataCopyWithImpl;
@override @useResult
$Res call({
 int value, List<String> tags
});




}
/// @nodoc
class __$DieFaceDataCopyWithImpl<$Res>
    implements _$DieFaceDataCopyWith<$Res> {
  __$DieFaceDataCopyWithImpl(this._self, this._then);

  final _DieFaceData _self;
  final $Res Function(_DieFaceData) _then;

/// Create a copy of DieFaceData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? value = null,Object? tags = null,}) {
  return _then(_DieFaceData(
value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}


/// @nodoc
mixin _$DieData {

 String get id; String get name; String get description; int get sides; List<DieFaceData>? get faces;
/// Create a copy of DieData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DieDataCopyWith<DieData> get copyWith => _$DieDataCopyWithImpl<DieData>(this as DieData, _$identity);

  /// Serializes this DieData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DieData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DieData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.sides, _this.sides) || other.sides == _this.sides)&&const DeepCollectionEquality().equals(other.faces, _this.faces));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DieData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.sides,const DeepCollectionEquality().hash(_this.faces));
}

@override
String toString() {
  final _this = this as DieData;
  return 'DieData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, sides: ${_this.sides}, faces: ${_this.faces})';
}


}

/// @nodoc
abstract mixin class $DieDataCopyWith<$Res>  {
  factory $DieDataCopyWith(DieData value, $Res Function(DieData) _then) = _$DieDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, int sides, List<DieFaceData>? faces
});




}
/// @nodoc
class _$DieDataCopyWithImpl<$Res>
    implements $DieDataCopyWith<$Res> {
  _$DieDataCopyWithImpl(this._self, this._then);

  final DieData _self;
  final $Res Function(DieData) _then;

/// Create a copy of DieData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? sides = null,Object? faces = freezed,}) {
  return _then(DieData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,sides: null == sides ? _self.sides : sides // ignore: cast_nullable_to_non_nullable
as int,faces: freezed == faces ? _self.faces : faces // ignore: cast_nullable_to_non_nullable
as List<DieFaceData>?,
  ));
}

}


/// Adds pattern-matching-related methods to [DieData].
extension DieDataPatterns on DieData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DieData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DieData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DieData value)  $default,){
final _that = this;
switch (_that) {
case _DieData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DieData value)?  $default,){
final _that = this;
switch (_that) {
case _DieData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int sides,  List<DieFaceData>? faces)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DieData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.sides,_that.faces);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int sides,  List<DieFaceData>? faces)  $default,) {final _that = this;
switch (_that) {
case _DieData():
return $default(_that.id,_that.name,_that.description,_that.sides,_that.faces);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  int sides,  List<DieFaceData>? faces)?  $default,) {final _that = this;
switch (_that) {
case _DieData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.sides,_that.faces);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DieData implements DieData {
  const _DieData({required this.id, required this.name, this.description = '', required this.sides,  List<DieFaceData>? faces}): _faces = faces;
  factory _DieData.fromJson(Map<String, dynamic> json) => _$DieDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  int sides;
 final  List<DieFaceData>? _faces;
@override List<DieFaceData>? get faces {
  final value = _faces;
  if (value == null) return null;
  if (_faces is EqualUnmodifiableListView) return _faces;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}


/// Create a copy of DieData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DieDataCopyWith<_DieData> get copyWith => __$DieDataCopyWithImpl<_DieData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DieDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DieData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.sides, sides) || other.sides == sides)&&const DeepCollectionEquality().equals(other.faces, _faces));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,sides,const DeepCollectionEquality().hash(_faces));
}

@override
String toString() {
    return 'DieData(id: $id, name: $name, description: $description, sides: $sides, faces: $faces)';
}


}

/// @nodoc
abstract mixin class _$DieDataCopyWith<$Res> implements $DieDataCopyWith<$Res> {
  factory _$DieDataCopyWith(_DieData value, $Res Function(_DieData) _then) = __$DieDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, int sides, List<DieFaceData>? faces
});




}
/// @nodoc
class __$DieDataCopyWithImpl<$Res>
    implements _$DieDataCopyWith<$Res> {
  __$DieDataCopyWithImpl(this._self, this._then);

  final _DieData _self;
  final $Res Function(_DieData) _then;

/// Create a copy of DieData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? sides = null,Object? faces = freezed,}) {
  return _then(_DieData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,sides: null == sides ? _self.sides : sides // ignore: cast_nullable_to_non_nullable
as int,faces: freezed == faces ? _self._faces : faces // ignore: cast_nullable_to_non_nullable
as List<DieFaceData>?,
  ));
}


}

// dart format on
