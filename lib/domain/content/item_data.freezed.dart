// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'item_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ItemData {

 String get id; String get name; String get description; ItemCategory get category; String get rarityId; int get baseValue;
/// Create a copy of ItemData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ItemDataCopyWith<ItemData> get copyWith => _$ItemDataCopyWithImpl<ItemData>(this as ItemData, _$identity);

  /// Serializes this ItemData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ItemData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ItemData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.category, _this.category) || other.category == _this.category)&&(identical(other.rarityId, _this.rarityId) || other.rarityId == _this.rarityId)&&(identical(other.baseValue, _this.baseValue) || other.baseValue == _this.baseValue));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ItemData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.category,_this.rarityId,_this.baseValue);
}

@override
String toString() {
  final _this = this as ItemData;
  return 'ItemData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, category: ${_this.category}, rarityId: ${_this.rarityId}, baseValue: ${_this.baseValue})';
}


}

/// @nodoc
abstract mixin class $ItemDataCopyWith<$Res>  {
  factory $ItemDataCopyWith(ItemData value, $Res Function(ItemData) _then) = _$ItemDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, ItemCategory category, String rarityId, int baseValue
});




}
/// @nodoc
class _$ItemDataCopyWithImpl<$Res>
    implements $ItemDataCopyWith<$Res> {
  _$ItemDataCopyWithImpl(this._self, this._then);

  final ItemData _self;
  final $Res Function(ItemData) _then;

/// Create a copy of ItemData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? category = null,Object? rarityId = null,Object? baseValue = null,}) {
  return _then(ItemData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as ItemCategory,rarityId: null == rarityId ? _self.rarityId : rarityId // ignore: cast_nullable_to_non_nullable
as String,baseValue: null == baseValue ? _self.baseValue : baseValue // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ItemData].
extension ItemDataPatterns on ItemData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ItemData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ItemData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ItemData value)  $default,){
final _that = this;
switch (_that) {
case _ItemData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ItemData value)?  $default,){
final _that = this;
switch (_that) {
case _ItemData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  ItemCategory category,  String rarityId,  int baseValue)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ItemData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.category,_that.rarityId,_that.baseValue);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  ItemCategory category,  String rarityId,  int baseValue)  $default,) {final _that = this;
switch (_that) {
case _ItemData():
return $default(_that.id,_that.name,_that.description,_that.category,_that.rarityId,_that.baseValue);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  ItemCategory category,  String rarityId,  int baseValue)?  $default,) {final _that = this;
switch (_that) {
case _ItemData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.category,_that.rarityId,_that.baseValue);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ItemData implements ItemData {
  const _ItemData({required this.id, required this.name, this.description = '', required this.category, required this.rarityId, required this.baseValue});
  factory _ItemData.fromJson(Map<String, dynamic> json) => _$ItemDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  ItemCategory category;
@override final  String rarityId;
@override final  int baseValue;

/// Create a copy of ItemData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ItemDataCopyWith<_ItemData> get copyWith => __$ItemDataCopyWithImpl<_ItemData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ItemDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ItemData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.category, category) || other.category == category)&&(identical(other.rarityId, rarityId) || other.rarityId == rarityId)&&(identical(other.baseValue, baseValue) || other.baseValue == baseValue));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,category,rarityId,baseValue);
}

@override
String toString() {
    return 'ItemData(id: $id, name: $name, description: $description, category: $category, rarityId: $rarityId, baseValue: $baseValue)';
}


}

/// @nodoc
abstract mixin class _$ItemDataCopyWith<$Res> implements $ItemDataCopyWith<$Res> {
  factory _$ItemDataCopyWith(_ItemData value, $Res Function(_ItemData) _then) = __$ItemDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, ItemCategory category, String rarityId, int baseValue
});




}
/// @nodoc
class __$ItemDataCopyWithImpl<$Res>
    implements _$ItemDataCopyWith<$Res> {
  __$ItemDataCopyWithImpl(this._self, this._then);

  final _ItemData _self;
  final $Res Function(_ItemData) _then;

/// Create a copy of ItemData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? category = null,Object? rarityId = null,Object? baseValue = null,}) {
  return _then(_ItemData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as ItemCategory,rarityId: null == rarityId ? _self.rarityId : rarityId // ignore: cast_nullable_to_non_nullable
as String,baseValue: null == baseValue ? _self.baseValue : baseValue // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
