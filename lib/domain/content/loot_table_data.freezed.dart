// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'loot_table_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$LootEntryData {

 String get itemId; int get weight; IntRange get quantity;
/// Create a copy of LootEntryData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LootEntryDataCopyWith<LootEntryData> get copyWith => _$LootEntryDataCopyWithImpl<LootEntryData>(this as LootEntryData, _$identity);

  /// Serializes this LootEntryData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as LootEntryData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LootEntryData&&(identical(other.itemId, _this.itemId) || other.itemId == _this.itemId)&&(identical(other.weight, _this.weight) || other.weight == _this.weight)&&(identical(other.quantity, _this.quantity) || other.quantity == _this.quantity));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as LootEntryData;
  return Object.hash(runtimeType,_this.itemId,_this.weight,_this.quantity);
}

@override
String toString() {
  final _this = this as LootEntryData;
  return 'LootEntryData(itemId: ${_this.itemId}, weight: ${_this.weight}, quantity: ${_this.quantity})';
}


}

/// @nodoc
abstract mixin class $LootEntryDataCopyWith<$Res>  {
  factory $LootEntryDataCopyWith(LootEntryData value, $Res Function(LootEntryData) _then) = _$LootEntryDataCopyWithImpl;
@useResult
$Res call({
 String itemId, int weight, IntRange quantity
});




}
/// @nodoc
class _$LootEntryDataCopyWithImpl<$Res>
    implements $LootEntryDataCopyWith<$Res> {
  _$LootEntryDataCopyWithImpl(this._self, this._then);

  final LootEntryData _self;
  final $Res Function(LootEntryData) _then;

/// Create a copy of LootEntryData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? itemId = null,Object? weight = null,Object? quantity = null,}) {
  return _then(LootEntryData(
itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as int,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as IntRange,
  ));
}

}


/// Adds pattern-matching-related methods to [LootEntryData].
extension LootEntryDataPatterns on LootEntryData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LootEntryData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LootEntryData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LootEntryData value)  $default,){
final _that = this;
switch (_that) {
case _LootEntryData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LootEntryData value)?  $default,){
final _that = this;
switch (_that) {
case _LootEntryData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String itemId,  int weight,  IntRange quantity)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LootEntryData() when $default != null:
return $default(_that.itemId,_that.weight,_that.quantity);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String itemId,  int weight,  IntRange quantity)  $default,) {final _that = this;
switch (_that) {
case _LootEntryData():
return $default(_that.itemId,_that.weight,_that.quantity);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String itemId,  int weight,  IntRange quantity)?  $default,) {final _that = this;
switch (_that) {
case _LootEntryData() when $default != null:
return $default(_that.itemId,_that.weight,_that.quantity);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LootEntryData implements LootEntryData {
  const _LootEntryData({required this.itemId, required this.weight, required this.quantity});
  factory _LootEntryData.fromJson(Map<String, dynamic> json) => _$LootEntryDataFromJson(json);

@override final  String itemId;
@override final  int weight;
@override final  IntRange quantity;

/// Create a copy of LootEntryData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LootEntryDataCopyWith<_LootEntryData> get copyWith => __$LootEntryDataCopyWithImpl<_LootEntryData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LootEntryDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _LootEntryData&&(identical(other.itemId, itemId) || other.itemId == itemId)&&(identical(other.weight, weight) || other.weight == weight)&&(identical(other.quantity, quantity) || other.quantity == quantity));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,itemId,weight,quantity);
}

@override
String toString() {
    return 'LootEntryData(itemId: $itemId, weight: $weight, quantity: $quantity)';
}


}

/// @nodoc
abstract mixin class _$LootEntryDataCopyWith<$Res> implements $LootEntryDataCopyWith<$Res> {
  factory _$LootEntryDataCopyWith(_LootEntryData value, $Res Function(_LootEntryData) _then) = __$LootEntryDataCopyWithImpl;
@override @useResult
$Res call({
 String itemId, int weight, IntRange quantity
});




}
/// @nodoc
class __$LootEntryDataCopyWithImpl<$Res>
    implements _$LootEntryDataCopyWith<$Res> {
  __$LootEntryDataCopyWithImpl(this._self, this._then);

  final _LootEntryData _self;
  final $Res Function(_LootEntryData) _then;

/// Create a copy of LootEntryData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? itemId = null,Object? weight = null,Object? quantity = null,}) {
  return _then(_LootEntryData(
itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,weight: null == weight ? _self.weight : weight // ignore: cast_nullable_to_non_nullable
as int,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as IntRange,
  ));
}


}


/// @nodoc
mixin _$LootTableData {

 String get id; String get name; List<LootEntryData> get entries;
/// Create a copy of LootTableData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LootTableDataCopyWith<LootTableData> get copyWith => _$LootTableDataCopyWithImpl<LootTableData>(this as LootTableData, _$identity);

  /// Serializes this LootTableData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as LootTableData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LootTableData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&const DeepCollectionEquality().equals(other.entries, _this.entries));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as LootTableData;
  return Object.hash(runtimeType,_this.id,_this.name,const DeepCollectionEquality().hash(_this.entries));
}

@override
String toString() {
  final _this = this as LootTableData;
  return 'LootTableData(id: ${_this.id}, name: ${_this.name}, entries: ${_this.entries})';
}


}

/// @nodoc
abstract mixin class $LootTableDataCopyWith<$Res>  {
  factory $LootTableDataCopyWith(LootTableData value, $Res Function(LootTableData) _then) = _$LootTableDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, List<LootEntryData> entries
});




}
/// @nodoc
class _$LootTableDataCopyWithImpl<$Res>
    implements $LootTableDataCopyWith<$Res> {
  _$LootTableDataCopyWithImpl(this._self, this._then);

  final LootTableData _self;
  final $Res Function(LootTableData) _then;

/// Create a copy of LootTableData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? entries = null,}) {
  return _then(LootTableData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,entries: null == entries ? _self.entries : entries // ignore: cast_nullable_to_non_nullable
as List<LootEntryData>,
  ));
}

}


/// Adds pattern-matching-related methods to [LootTableData].
extension LootTableDataPatterns on LootTableData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LootTableData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LootTableData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LootTableData value)  $default,){
final _that = this;
switch (_that) {
case _LootTableData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LootTableData value)?  $default,){
final _that = this;
switch (_that) {
case _LootTableData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  List<LootEntryData> entries)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LootTableData() when $default != null:
return $default(_that.id,_that.name,_that.entries);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  List<LootEntryData> entries)  $default,) {final _that = this;
switch (_that) {
case _LootTableData():
return $default(_that.id,_that.name,_that.entries);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  List<LootEntryData> entries)?  $default,) {final _that = this;
switch (_that) {
case _LootTableData() when $default != null:
return $default(_that.id,_that.name,_that.entries);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LootTableData implements LootTableData {
  const _LootTableData({required this.id, required this.name, required  List<LootEntryData> entries}): _entries = entries;
  factory _LootTableData.fromJson(Map<String, dynamic> json) => _$LootTableDataFromJson(json);

@override final  String id;
@override final  String name;
 final  List<LootEntryData> _entries;
@override List<LootEntryData> get entries {
  if (_entries is EqualUnmodifiableListView) return _entries;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_entries);
}


/// Create a copy of LootTableData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LootTableDataCopyWith<_LootTableData> get copyWith => __$LootTableDataCopyWithImpl<_LootTableData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LootTableDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _LootTableData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&const DeepCollectionEquality().equals(other.entries, _entries));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,const DeepCollectionEquality().hash(_entries));
}

@override
String toString() {
    return 'LootTableData(id: $id, name: $name, entries: $entries)';
}


}

/// @nodoc
abstract mixin class _$LootTableDataCopyWith<$Res> implements $LootTableDataCopyWith<$Res> {
  factory _$LootTableDataCopyWith(_LootTableData value, $Res Function(_LootTableData) _then) = __$LootTableDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, List<LootEntryData> entries
});




}
/// @nodoc
class __$LootTableDataCopyWithImpl<$Res>
    implements _$LootTableDataCopyWith<$Res> {
  __$LootTableDataCopyWithImpl(this._self, this._then);

  final _LootTableData _self;
  final $Res Function(_LootTableData) _then;

/// Create a copy of LootTableData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? entries = null,}) {
  return _then(_LootTableData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,entries: null == entries ? _self._entries : entries // ignore: cast_nullable_to_non_nullable
as List<LootEntryData>,
  ));
}


}

// dart format on
