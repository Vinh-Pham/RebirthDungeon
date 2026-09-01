// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'banner_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$BannerData {

 String get id; String get name; String get description; int get version; int get costPerPull; String get currencyId; String get rarityTableId; List<String> get featuredHeroIds; int get hardPity; String? get startsAt; String? get endsAt;
/// Create a copy of BannerData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BannerDataCopyWith<BannerData> get copyWith => _$BannerDataCopyWithImpl<BannerData>(this as BannerData, _$identity);

  /// Serializes this BannerData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as BannerData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BannerData&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.version, _this.version) || other.version == _this.version)&&(identical(other.costPerPull, _this.costPerPull) || other.costPerPull == _this.costPerPull)&&(identical(other.currencyId, _this.currencyId) || other.currencyId == _this.currencyId)&&(identical(other.rarityTableId, _this.rarityTableId) || other.rarityTableId == _this.rarityTableId)&&const DeepCollectionEquality().equals(other.featuredHeroIds, _this.featuredHeroIds)&&(identical(other.hardPity, _this.hardPity) || other.hardPity == _this.hardPity)&&(identical(other.startsAt, _this.startsAt) || other.startsAt == _this.startsAt)&&(identical(other.endsAt, _this.endsAt) || other.endsAt == _this.endsAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as BannerData;
  return Object.hash(runtimeType,_this.id,_this.name,_this.description,_this.version,_this.costPerPull,_this.currencyId,_this.rarityTableId,const DeepCollectionEquality().hash(_this.featuredHeroIds),_this.hardPity,_this.startsAt,_this.endsAt);
}

@override
String toString() {
  final _this = this as BannerData;
  return 'BannerData(id: ${_this.id}, name: ${_this.name}, description: ${_this.description}, version: ${_this.version}, costPerPull: ${_this.costPerPull}, currencyId: ${_this.currencyId}, rarityTableId: ${_this.rarityTableId}, featuredHeroIds: ${_this.featuredHeroIds}, hardPity: ${_this.hardPity}, startsAt: ${_this.startsAt}, endsAt: ${_this.endsAt})';
}


}

/// @nodoc
abstract mixin class $BannerDataCopyWith<$Res>  {
  factory $BannerDataCopyWith(BannerData value, $Res Function(BannerData) _then) = _$BannerDataCopyWithImpl;
@useResult
$Res call({
 String id, String name, String description, int version, int costPerPull, String currencyId, String rarityTableId, List<String> featuredHeroIds, int hardPity, String? startsAt, String? endsAt
});




}
/// @nodoc
class _$BannerDataCopyWithImpl<$Res>
    implements $BannerDataCopyWith<$Res> {
  _$BannerDataCopyWithImpl(this._self, this._then);

  final BannerData _self;
  final $Res Function(BannerData) _then;

/// Create a copy of BannerData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = null,Object? version = null,Object? costPerPull = null,Object? currencyId = null,Object? rarityTableId = null,Object? featuredHeroIds = null,Object? hardPity = null,Object? startsAt = freezed,Object? endsAt = freezed,}) {
  return _then(BannerData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,costPerPull: null == costPerPull ? _self.costPerPull : costPerPull // ignore: cast_nullable_to_non_nullable
as int,currencyId: null == currencyId ? _self.currencyId : currencyId // ignore: cast_nullable_to_non_nullable
as String,rarityTableId: null == rarityTableId ? _self.rarityTableId : rarityTableId // ignore: cast_nullable_to_non_nullable
as String,featuredHeroIds: null == featuredHeroIds ? _self.featuredHeroIds : featuredHeroIds // ignore: cast_nullable_to_non_nullable
as List<String>,hardPity: null == hardPity ? _self.hardPity : hardPity // ignore: cast_nullable_to_non_nullable
as int,startsAt: freezed == startsAt ? _self.startsAt : startsAt // ignore: cast_nullable_to_non_nullable
as String?,endsAt: freezed == endsAt ? _self.endsAt : endsAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [BannerData].
extension BannerDataPatterns on BannerData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BannerData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BannerData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BannerData value)  $default,){
final _that = this;
switch (_that) {
case _BannerData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BannerData value)?  $default,){
final _that = this;
switch (_that) {
case _BannerData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int version,  int costPerPull,  String currencyId,  String rarityTableId,  List<String> featuredHeroIds,  int hardPity,  String? startsAt,  String? endsAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BannerData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.version,_that.costPerPull,_that.currencyId,_that.rarityTableId,_that.featuredHeroIds,_that.hardPity,_that.startsAt,_that.endsAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String description,  int version,  int costPerPull,  String currencyId,  String rarityTableId,  List<String> featuredHeroIds,  int hardPity,  String? startsAt,  String? endsAt)  $default,) {final _that = this;
switch (_that) {
case _BannerData():
return $default(_that.id,_that.name,_that.description,_that.version,_that.costPerPull,_that.currencyId,_that.rarityTableId,_that.featuredHeroIds,_that.hardPity,_that.startsAt,_that.endsAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String description,  int version,  int costPerPull,  String currencyId,  String rarityTableId,  List<String> featuredHeroIds,  int hardPity,  String? startsAt,  String? endsAt)?  $default,) {final _that = this;
switch (_that) {
case _BannerData() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.version,_that.costPerPull,_that.currencyId,_that.rarityTableId,_that.featuredHeroIds,_that.hardPity,_that.startsAt,_that.endsAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BannerData implements BannerData {
  const _BannerData({required this.id, required this.name, this.description = '', required this.version, required this.costPerPull, this.currencyId = 'gems', required this.rarityTableId, required  List<String> featuredHeroIds, required this.hardPity, this.startsAt, this.endsAt}): _featuredHeroIds = featuredHeroIds;
  factory _BannerData.fromJson(Map<String, dynamic> json) => _$BannerDataFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String description;
@override final  int version;
@override final  int costPerPull;
@override@JsonKey() final  String currencyId;
@override final  String rarityTableId;
 final  List<String> _featuredHeroIds;
@override List<String> get featuredHeroIds {
  if (_featuredHeroIds is EqualUnmodifiableListView) return _featuredHeroIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_featuredHeroIds);
}

@override final  int hardPity;
@override final  String? startsAt;
@override final  String? endsAt;

/// Create a copy of BannerData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BannerDataCopyWith<_BannerData> get copyWith => __$BannerDataCopyWithImpl<_BannerData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BannerDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _BannerData&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.version, version) || other.version == version)&&(identical(other.costPerPull, costPerPull) || other.costPerPull == costPerPull)&&(identical(other.currencyId, currencyId) || other.currencyId == currencyId)&&(identical(other.rarityTableId, rarityTableId) || other.rarityTableId == rarityTableId)&&const DeepCollectionEquality().equals(other.featuredHeroIds, _featuredHeroIds)&&(identical(other.hardPity, hardPity) || other.hardPity == hardPity)&&(identical(other.startsAt, startsAt) || other.startsAt == startsAt)&&(identical(other.endsAt, endsAt) || other.endsAt == endsAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,description,version,costPerPull,currencyId,rarityTableId,const DeepCollectionEquality().hash(_featuredHeroIds),hardPity,startsAt,endsAt);
}

@override
String toString() {
    return 'BannerData(id: $id, name: $name, description: $description, version: $version, costPerPull: $costPerPull, currencyId: $currencyId, rarityTableId: $rarityTableId, featuredHeroIds: $featuredHeroIds, hardPity: $hardPity, startsAt: $startsAt, endsAt: $endsAt)';
}


}

/// @nodoc
abstract mixin class _$BannerDataCopyWith<$Res> implements $BannerDataCopyWith<$Res> {
  factory _$BannerDataCopyWith(_BannerData value, $Res Function(_BannerData) _then) = __$BannerDataCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String description, int version, int costPerPull, String currencyId, String rarityTableId, List<String> featuredHeroIds, int hardPity, String? startsAt, String? endsAt
});




}
/// @nodoc
class __$BannerDataCopyWithImpl<$Res>
    implements _$BannerDataCopyWith<$Res> {
  __$BannerDataCopyWithImpl(this._self, this._then);

  final _BannerData _self;
  final $Res Function(_BannerData) _then;

/// Create a copy of BannerData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = null,Object? version = null,Object? costPerPull = null,Object? currencyId = null,Object? rarityTableId = null,Object? featuredHeroIds = null,Object? hardPity = null,Object? startsAt = freezed,Object? endsAt = freezed,}) {
  return _then(_BannerData(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: null == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String,version: null == version ? _self.version : version // ignore: cast_nullable_to_non_nullable
as int,costPerPull: null == costPerPull ? _self.costPerPull : costPerPull // ignore: cast_nullable_to_non_nullable
as int,currencyId: null == currencyId ? _self.currencyId : currencyId // ignore: cast_nullable_to_non_nullable
as String,rarityTableId: null == rarityTableId ? _self.rarityTableId : rarityTableId // ignore: cast_nullable_to_non_nullable
as String,featuredHeroIds: null == featuredHeroIds ? _self._featuredHeroIds : featuredHeroIds // ignore: cast_nullable_to_non_nullable
as List<String>,hardPity: null == hardPity ? _self.hardPity : hardPity // ignore: cast_nullable_to_non_nullable
as int,startsAt: freezed == startsAt ? _self.startsAt : startsAt // ignore: cast_nullable_to_non_nullable
as String?,endsAt: freezed == endsAt ? _self.endsAt : endsAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
