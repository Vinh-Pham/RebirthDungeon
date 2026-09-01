// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'run_room.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$RunLoot {

 String get itemId; int get quantity;
/// Create a copy of RunLoot
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RunLootCopyWith<RunLoot> get copyWith => _$RunLootCopyWithImpl<RunLoot>(this as RunLoot, _$identity);

  /// Serializes this RunLoot to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RunLoot;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RunLoot&&(identical(other.itemId, _this.itemId) || other.itemId == _this.itemId)&&(identical(other.quantity, _this.quantity) || other.quantity == _this.quantity));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RunLoot;
  return Object.hash(runtimeType,_this.itemId,_this.quantity);
}

@override
String toString() {
  final _this = this as RunLoot;
  return 'RunLoot(itemId: ${_this.itemId}, quantity: ${_this.quantity})';
}


}

/// @nodoc
abstract mixin class $RunLootCopyWith<$Res>  {
  factory $RunLootCopyWith(RunLoot value, $Res Function(RunLoot) _then) = _$RunLootCopyWithImpl;
@useResult
$Res call({
 String itemId, int quantity
});




}
/// @nodoc
class _$RunLootCopyWithImpl<$Res>
    implements $RunLootCopyWith<$Res> {
  _$RunLootCopyWithImpl(this._self, this._then);

  final RunLoot _self;
  final $Res Function(RunLoot) _then;

/// Create a copy of RunLoot
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? itemId = null,Object? quantity = null,}) {
  return _then(RunLoot(
itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [RunLoot].
extension RunLootPatterns on RunLoot {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RunLoot value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RunLoot() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RunLoot value)  $default,){
final _that = this;
switch (_that) {
case _RunLoot():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RunLoot value)?  $default,){
final _that = this;
switch (_that) {
case _RunLoot() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String itemId,  int quantity)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RunLoot() when $default != null:
return $default(_that.itemId,_that.quantity);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String itemId,  int quantity)  $default,) {final _that = this;
switch (_that) {
case _RunLoot():
return $default(_that.itemId,_that.quantity);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String itemId,  int quantity)?  $default,) {final _that = this;
switch (_that) {
case _RunLoot() when $default != null:
return $default(_that.itemId,_that.quantity);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RunLoot implements RunLoot {
  const _RunLoot({required this.itemId, required this.quantity});
  factory _RunLoot.fromJson(Map<String, dynamic> json) => _$RunLootFromJson(json);

@override final  String itemId;
@override final  int quantity;

/// Create a copy of RunLoot
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RunLootCopyWith<_RunLoot> get copyWith => __$RunLootCopyWithImpl<_RunLoot>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RunLootToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RunLoot&&(identical(other.itemId, itemId) || other.itemId == itemId)&&(identical(other.quantity, quantity) || other.quantity == quantity));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,itemId,quantity);
}

@override
String toString() {
    return 'RunLoot(itemId: $itemId, quantity: $quantity)';
}


}

/// @nodoc
abstract mixin class _$RunLootCopyWith<$Res> implements $RunLootCopyWith<$Res> {
  factory _$RunLootCopyWith(_RunLoot value, $Res Function(_RunLoot) _then) = __$RunLootCopyWithImpl;
@override @useResult
$Res call({
 String itemId, int quantity
});




}
/// @nodoc
class __$RunLootCopyWithImpl<$Res>
    implements _$RunLootCopyWith<$Res> {
  __$RunLootCopyWithImpl(this._self, this._then);

  final _RunLoot _self;
  final $Res Function(_RunLoot) _then;

/// Create a copy of RunLoot
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? itemId = null,Object? quantity = null,}) {
  return _then(_RunLoot(
itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,quantity: null == quantity ? _self.quantity : quantity // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$RunRoom {

 int get index;/// Grid cell of this room on the floor, used by the presentation layer
/// to place the room in the world.
 int get x; int get y; RoomKind get kind; List<int> get doors; List<String> get monsterIds; List<RunLoot> get loot; bool get cleared;
/// Create a copy of RunRoom
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RunRoomCopyWith<RunRoom> get copyWith => _$RunRoomCopyWithImpl<RunRoom>(this as RunRoom, _$identity);

  /// Serializes this RunRoom to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RunRoom;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RunRoom&&(identical(other.index, _this.index) || other.index == _this.index)&&(identical(other.x, _this.x) || other.x == _this.x)&&(identical(other.y, _this.y) || other.y == _this.y)&&(identical(other.kind, _this.kind) || other.kind == _this.kind)&&const DeepCollectionEquality().equals(other.doors, _this.doors)&&const DeepCollectionEquality().equals(other.monsterIds, _this.monsterIds)&&const DeepCollectionEquality().equals(other.loot, _this.loot)&&(identical(other.cleared, _this.cleared) || other.cleared == _this.cleared));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RunRoom;
  return Object.hash(runtimeType,_this.index,_this.x,_this.y,_this.kind,const DeepCollectionEquality().hash(_this.doors),const DeepCollectionEquality().hash(_this.monsterIds),const DeepCollectionEquality().hash(_this.loot),_this.cleared);
}

@override
String toString() {
  final _this = this as RunRoom;
  return 'RunRoom(index: ${_this.index}, x: ${_this.x}, y: ${_this.y}, kind: ${_this.kind}, doors: ${_this.doors}, monsterIds: ${_this.monsterIds}, loot: ${_this.loot}, cleared: ${_this.cleared})';
}


}

/// @nodoc
abstract mixin class $RunRoomCopyWith<$Res>  {
  factory $RunRoomCopyWith(RunRoom value, $Res Function(RunRoom) _then) = _$RunRoomCopyWithImpl;
@useResult
$Res call({
 int index, int x, int y, RoomKind kind, List<int> doors, List<String> monsterIds, List<RunLoot> loot, bool cleared
});




}
/// @nodoc
class _$RunRoomCopyWithImpl<$Res>
    implements $RunRoomCopyWith<$Res> {
  _$RunRoomCopyWithImpl(this._self, this._then);

  final RunRoom _self;
  final $Res Function(RunRoom) _then;

/// Create a copy of RunRoom
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? index = null,Object? x = null,Object? y = null,Object? kind = null,Object? doors = null,Object? monsterIds = null,Object? loot = null,Object? cleared = null,}) {
  return _then(RunRoom(
index: null == index ? _self.index : index // ignore: cast_nullable_to_non_nullable
as int,x: null == x ? _self.x : x // ignore: cast_nullable_to_non_nullable
as int,y: null == y ? _self.y : y // ignore: cast_nullable_to_non_nullable
as int,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as RoomKind,doors: null == doors ? _self.doors : doors // ignore: cast_nullable_to_non_nullable
as List<int>,monsterIds: null == monsterIds ? _self.monsterIds : monsterIds // ignore: cast_nullable_to_non_nullable
as List<String>,loot: null == loot ? _self.loot : loot // ignore: cast_nullable_to_non_nullable
as List<RunLoot>,cleared: null == cleared ? _self.cleared : cleared // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [RunRoom].
extension RunRoomPatterns on RunRoom {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RunRoom value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RunRoom() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RunRoom value)  $default,){
final _that = this;
switch (_that) {
case _RunRoom():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RunRoom value)?  $default,){
final _that = this;
switch (_that) {
case _RunRoom() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int index,  int x,  int y,  RoomKind kind,  List<int> doors,  List<String> monsterIds,  List<RunLoot> loot,  bool cleared)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RunRoom() when $default != null:
return $default(_that.index,_that.x,_that.y,_that.kind,_that.doors,_that.monsterIds,_that.loot,_that.cleared);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int index,  int x,  int y,  RoomKind kind,  List<int> doors,  List<String> monsterIds,  List<RunLoot> loot,  bool cleared)  $default,) {final _that = this;
switch (_that) {
case _RunRoom():
return $default(_that.index,_that.x,_that.y,_that.kind,_that.doors,_that.monsterIds,_that.loot,_that.cleared);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int index,  int x,  int y,  RoomKind kind,  List<int> doors,  List<String> monsterIds,  List<RunLoot> loot,  bool cleared)?  $default,) {final _that = this;
switch (_that) {
case _RunRoom() when $default != null:
return $default(_that.index,_that.x,_that.y,_that.kind,_that.doors,_that.monsterIds,_that.loot,_that.cleared);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RunRoom implements RunRoom {
  const _RunRoom({required this.index, required this.x, required this.y, required this.kind,  List<int> doors = const [],  List<String> monsterIds = const [],  List<RunLoot> loot = const [], this.cleared = false}): _doors = doors,_monsterIds = monsterIds,_loot = loot;
  factory _RunRoom.fromJson(Map<String, dynamic> json) => _$RunRoomFromJson(json);

@override final  int index;
/// Grid cell of this room on the floor, used by the presentation layer
/// to place the room in the world.
@override final  int x;
@override final  int y;
@override final  RoomKind kind;
 final  List<int> _doors;
@override@JsonKey() List<int> get doors {
  if (_doors is EqualUnmodifiableListView) return _doors;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_doors);
}

 final  List<String> _monsterIds;
@override@JsonKey() List<String> get monsterIds {
  if (_monsterIds is EqualUnmodifiableListView) return _monsterIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_monsterIds);
}

 final  List<RunLoot> _loot;
@override@JsonKey() List<RunLoot> get loot {
  if (_loot is EqualUnmodifiableListView) return _loot;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_loot);
}

@override@JsonKey() final  bool cleared;

/// Create a copy of RunRoom
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RunRoomCopyWith<_RunRoom> get copyWith => __$RunRoomCopyWithImpl<_RunRoom>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RunRoomToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RunRoom&&(identical(other.index, index) || other.index == index)&&(identical(other.x, x) || other.x == x)&&(identical(other.y, y) || other.y == y)&&(identical(other.kind, kind) || other.kind == kind)&&const DeepCollectionEquality().equals(other.doors, _doors)&&const DeepCollectionEquality().equals(other.monsterIds, _monsterIds)&&const DeepCollectionEquality().equals(other.loot, _loot)&&(identical(other.cleared, cleared) || other.cleared == cleared));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,index,x,y,kind,const DeepCollectionEquality().hash(_doors),const DeepCollectionEquality().hash(_monsterIds),const DeepCollectionEquality().hash(_loot),cleared);
}

@override
String toString() {
    return 'RunRoom(index: $index, x: $x, y: $y, kind: $kind, doors: $doors, monsterIds: $monsterIds, loot: $loot, cleared: $cleared)';
}


}

/// @nodoc
abstract mixin class _$RunRoomCopyWith<$Res> implements $RunRoomCopyWith<$Res> {
  factory _$RunRoomCopyWith(_RunRoom value, $Res Function(_RunRoom) _then) = __$RunRoomCopyWithImpl;
@override @useResult
$Res call({
 int index, int x, int y, RoomKind kind, List<int> doors, List<String> monsterIds, List<RunLoot> loot, bool cleared
});




}
/// @nodoc
class __$RunRoomCopyWithImpl<$Res>
    implements _$RunRoomCopyWith<$Res> {
  __$RunRoomCopyWithImpl(this._self, this._then);

  final _RunRoom _self;
  final $Res Function(_RunRoom) _then;

/// Create a copy of RunRoom
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? index = null,Object? x = null,Object? y = null,Object? kind = null,Object? doors = null,Object? monsterIds = null,Object? loot = null,Object? cleared = null,}) {
  return _then(_RunRoom(
index: null == index ? _self.index : index // ignore: cast_nullable_to_non_nullable
as int,x: null == x ? _self.x : x // ignore: cast_nullable_to_non_nullable
as int,y: null == y ? _self.y : y // ignore: cast_nullable_to_non_nullable
as int,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as RoomKind,doors: null == doors ? _self._doors : doors // ignore: cast_nullable_to_non_nullable
as List<int>,monsterIds: null == monsterIds ? _self._monsterIds : monsterIds // ignore: cast_nullable_to_non_nullable
as List<String>,loot: null == loot ? _self._loot : loot // ignore: cast_nullable_to_non_nullable
as List<RunLoot>,cleared: null == cleared ? _self.cleared : cleared // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
