// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'dungeon_run_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$DungeonRunState {

 RunStatus get status; String get runId; String get dungeonId; String get heroId; int get seed; int get heroHp; int get heroMaxHp; int get floorIndex; int get floorCount; List<RunRoom> get rooms; int get currentRoomIndex; CombatState? get combat; List<RunLoot> get collectedLoot;
/// Create a copy of DungeonRunState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DungeonRunStateCopyWith<DungeonRunState> get copyWith => _$DungeonRunStateCopyWithImpl<DungeonRunState>(this as DungeonRunState, _$identity);

  /// Serializes this DungeonRunState to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DungeonRunState;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DungeonRunState&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.runId, _this.runId) || other.runId == _this.runId)&&(identical(other.dungeonId, _this.dungeonId) || other.dungeonId == _this.dungeonId)&&(identical(other.heroId, _this.heroId) || other.heroId == _this.heroId)&&(identical(other.seed, _this.seed) || other.seed == _this.seed)&&(identical(other.heroHp, _this.heroHp) || other.heroHp == _this.heroHp)&&(identical(other.heroMaxHp, _this.heroMaxHp) || other.heroMaxHp == _this.heroMaxHp)&&(identical(other.floorIndex, _this.floorIndex) || other.floorIndex == _this.floorIndex)&&(identical(other.floorCount, _this.floorCount) || other.floorCount == _this.floorCount)&&const DeepCollectionEquality().equals(other.rooms, _this.rooms)&&(identical(other.currentRoomIndex, _this.currentRoomIndex) || other.currentRoomIndex == _this.currentRoomIndex)&&(identical(other.combat, _this.combat) || other.combat == _this.combat)&&const DeepCollectionEquality().equals(other.collectedLoot, _this.collectedLoot));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DungeonRunState;
  return Object.hash(runtimeType,_this.status,_this.runId,_this.dungeonId,_this.heroId,_this.seed,_this.heroHp,_this.heroMaxHp,_this.floorIndex,_this.floorCount,const DeepCollectionEquality().hash(_this.rooms),_this.currentRoomIndex,_this.combat,const DeepCollectionEquality().hash(_this.collectedLoot));
}

@override
String toString() {
  final _this = this as DungeonRunState;
  return 'DungeonRunState(status: ${_this.status}, runId: ${_this.runId}, dungeonId: ${_this.dungeonId}, heroId: ${_this.heroId}, seed: ${_this.seed}, heroHp: ${_this.heroHp}, heroMaxHp: ${_this.heroMaxHp}, floorIndex: ${_this.floorIndex}, floorCount: ${_this.floorCount}, rooms: ${_this.rooms}, currentRoomIndex: ${_this.currentRoomIndex}, combat: ${_this.combat}, collectedLoot: ${_this.collectedLoot})';
}


}

/// @nodoc
abstract mixin class $DungeonRunStateCopyWith<$Res>  {
  factory $DungeonRunStateCopyWith(DungeonRunState value, $Res Function(DungeonRunState) _then) = _$DungeonRunStateCopyWithImpl;
@useResult
$Res call({
 RunStatus status, String runId, String dungeonId, String heroId, int seed, int heroHp, int heroMaxHp, int floorIndex, int floorCount, List<RunRoom> rooms, int currentRoomIndex, CombatState? combat, List<RunLoot> collectedLoot
});


$CombatStateCopyWith<$Res>? get combat;

}
/// @nodoc
class _$DungeonRunStateCopyWithImpl<$Res>
    implements $DungeonRunStateCopyWith<$Res> {
  _$DungeonRunStateCopyWithImpl(this._self, this._then);

  final DungeonRunState _self;
  final $Res Function(DungeonRunState) _then;

/// Create a copy of DungeonRunState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = null,Object? runId = null,Object? dungeonId = null,Object? heroId = null,Object? seed = null,Object? heroHp = null,Object? heroMaxHp = null,Object? floorIndex = null,Object? floorCount = null,Object? rooms = null,Object? currentRoomIndex = null,Object? combat = freezed,Object? collectedLoot = null,}) {
  return _then(DungeonRunState(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RunStatus,runId: null == runId ? _self.runId : runId // ignore: cast_nullable_to_non_nullable
as String,dungeonId: null == dungeonId ? _self.dungeonId : dungeonId // ignore: cast_nullable_to_non_nullable
as String,heroId: null == heroId ? _self.heroId : heroId // ignore: cast_nullable_to_non_nullable
as String,seed: null == seed ? _self.seed : seed // ignore: cast_nullable_to_non_nullable
as int,heroHp: null == heroHp ? _self.heroHp : heroHp // ignore: cast_nullable_to_non_nullable
as int,heroMaxHp: null == heroMaxHp ? _self.heroMaxHp : heroMaxHp // ignore: cast_nullable_to_non_nullable
as int,floorIndex: null == floorIndex ? _self.floorIndex : floorIndex // ignore: cast_nullable_to_non_nullable
as int,floorCount: null == floorCount ? _self.floorCount : floorCount // ignore: cast_nullable_to_non_nullable
as int,rooms: null == rooms ? _self.rooms : rooms // ignore: cast_nullable_to_non_nullable
as List<RunRoom>,currentRoomIndex: null == currentRoomIndex ? _self.currentRoomIndex : currentRoomIndex // ignore: cast_nullable_to_non_nullable
as int,combat: freezed == combat ? _self.combat : combat // ignore: cast_nullable_to_non_nullable
as CombatState?,collectedLoot: null == collectedLoot ? _self.collectedLoot : collectedLoot // ignore: cast_nullable_to_non_nullable
as List<RunLoot>,
  ));
}
/// Create a copy of DungeonRunState
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CombatStateCopyWith<$Res>? get combat {
    if (_self.combat == null) {
    return null;
  }

  return $CombatStateCopyWith<$Res>(_self.combat!, (value) {
    return _then(_self.copyWith(combat: value));
  });
}
}


/// Adds pattern-matching-related methods to [DungeonRunState].
extension DungeonRunStatePatterns on DungeonRunState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DungeonRunState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DungeonRunState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DungeonRunState value)  $default,){
final _that = this;
switch (_that) {
case _DungeonRunState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DungeonRunState value)?  $default,){
final _that = this;
switch (_that) {
case _DungeonRunState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( RunStatus status,  String runId,  String dungeonId,  String heroId,  int seed,  int heroHp,  int heroMaxHp,  int floorIndex,  int floorCount,  List<RunRoom> rooms,  int currentRoomIndex,  CombatState? combat,  List<RunLoot> collectedLoot)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DungeonRunState() when $default != null:
return $default(_that.status,_that.runId,_that.dungeonId,_that.heroId,_that.seed,_that.heroHp,_that.heroMaxHp,_that.floorIndex,_that.floorCount,_that.rooms,_that.currentRoomIndex,_that.combat,_that.collectedLoot);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( RunStatus status,  String runId,  String dungeonId,  String heroId,  int seed,  int heroHp,  int heroMaxHp,  int floorIndex,  int floorCount,  List<RunRoom> rooms,  int currentRoomIndex,  CombatState? combat,  List<RunLoot> collectedLoot)  $default,) {final _that = this;
switch (_that) {
case _DungeonRunState():
return $default(_that.status,_that.runId,_that.dungeonId,_that.heroId,_that.seed,_that.heroHp,_that.heroMaxHp,_that.floorIndex,_that.floorCount,_that.rooms,_that.currentRoomIndex,_that.combat,_that.collectedLoot);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( RunStatus status,  String runId,  String dungeonId,  String heroId,  int seed,  int heroHp,  int heroMaxHp,  int floorIndex,  int floorCount,  List<RunRoom> rooms,  int currentRoomIndex,  CombatState? combat,  List<RunLoot> collectedLoot)?  $default,) {final _that = this;
switch (_that) {
case _DungeonRunState() when $default != null:
return $default(_that.status,_that.runId,_that.dungeonId,_that.heroId,_that.seed,_that.heroHp,_that.heroMaxHp,_that.floorIndex,_that.floorCount,_that.rooms,_that.currentRoomIndex,_that.combat,_that.collectedLoot);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DungeonRunState implements DungeonRunState {
  const _DungeonRunState({this.status = RunStatus.notStarted, this.runId = '', this.dungeonId = '', this.heroId = '', this.seed = 0, this.heroHp = 0, this.heroMaxHp = 0, this.floorIndex = 0, this.floorCount = 0,  List<RunRoom> rooms = const [], this.currentRoomIndex = 0, this.combat,  List<RunLoot> collectedLoot = const []}): _rooms = rooms,_collectedLoot = collectedLoot;
  factory _DungeonRunState.fromJson(Map<String, dynamic> json) => _$DungeonRunStateFromJson(json);

@override@JsonKey() final  RunStatus status;
@override@JsonKey() final  String runId;
@override@JsonKey() final  String dungeonId;
@override@JsonKey() final  String heroId;
@override@JsonKey() final  int seed;
@override@JsonKey() final  int heroHp;
@override@JsonKey() final  int heroMaxHp;
@override@JsonKey() final  int floorIndex;
@override@JsonKey() final  int floorCount;
 final  List<RunRoom> _rooms;
@override@JsonKey() List<RunRoom> get rooms {
  if (_rooms is EqualUnmodifiableListView) return _rooms;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_rooms);
}

@override@JsonKey() final  int currentRoomIndex;
@override final  CombatState? combat;
 final  List<RunLoot> _collectedLoot;
@override@JsonKey() List<RunLoot> get collectedLoot {
  if (_collectedLoot is EqualUnmodifiableListView) return _collectedLoot;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_collectedLoot);
}


/// Create a copy of DungeonRunState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DungeonRunStateCopyWith<_DungeonRunState> get copyWith => __$DungeonRunStateCopyWithImpl<_DungeonRunState>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DungeonRunStateToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DungeonRunState&&(identical(other.status, status) || other.status == status)&&(identical(other.runId, runId) || other.runId == runId)&&(identical(other.dungeonId, dungeonId) || other.dungeonId == dungeonId)&&(identical(other.heroId, heroId) || other.heroId == heroId)&&(identical(other.seed, seed) || other.seed == seed)&&(identical(other.heroHp, heroHp) || other.heroHp == heroHp)&&(identical(other.heroMaxHp, heroMaxHp) || other.heroMaxHp == heroMaxHp)&&(identical(other.floorIndex, floorIndex) || other.floorIndex == floorIndex)&&(identical(other.floorCount, floorCount) || other.floorCount == floorCount)&&const DeepCollectionEquality().equals(other.rooms, _rooms)&&(identical(other.currentRoomIndex, currentRoomIndex) || other.currentRoomIndex == currentRoomIndex)&&(identical(other.combat, combat) || other.combat == combat)&&const DeepCollectionEquality().equals(other.collectedLoot, _collectedLoot));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,status,runId,dungeonId,heroId,seed,heroHp,heroMaxHp,floorIndex,floorCount,const DeepCollectionEquality().hash(_rooms),currentRoomIndex,combat,const DeepCollectionEquality().hash(_collectedLoot));
}

@override
String toString() {
    return 'DungeonRunState(status: $status, runId: $runId, dungeonId: $dungeonId, heroId: $heroId, seed: $seed, heroHp: $heroHp, heroMaxHp: $heroMaxHp, floorIndex: $floorIndex, floorCount: $floorCount, rooms: $rooms, currentRoomIndex: $currentRoomIndex, combat: $combat, collectedLoot: $collectedLoot)';
}


}

/// @nodoc
abstract mixin class _$DungeonRunStateCopyWith<$Res> implements $DungeonRunStateCopyWith<$Res> {
  factory _$DungeonRunStateCopyWith(_DungeonRunState value, $Res Function(_DungeonRunState) _then) = __$DungeonRunStateCopyWithImpl;
@override @useResult
$Res call({
 RunStatus status, String runId, String dungeonId, String heroId, int seed, int heroHp, int heroMaxHp, int floorIndex, int floorCount, List<RunRoom> rooms, int currentRoomIndex, CombatState? combat, List<RunLoot> collectedLoot
});


@override $CombatStateCopyWith<$Res>? get combat;

}
/// @nodoc
class __$DungeonRunStateCopyWithImpl<$Res>
    implements _$DungeonRunStateCopyWith<$Res> {
  __$DungeonRunStateCopyWithImpl(this._self, this._then);

  final _DungeonRunState _self;
  final $Res Function(_DungeonRunState) _then;

/// Create a copy of DungeonRunState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = null,Object? runId = null,Object? dungeonId = null,Object? heroId = null,Object? seed = null,Object? heroHp = null,Object? heroMaxHp = null,Object? floorIndex = null,Object? floorCount = null,Object? rooms = null,Object? currentRoomIndex = null,Object? combat = freezed,Object? collectedLoot = null,}) {
  return _then(_DungeonRunState(
status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as RunStatus,runId: null == runId ? _self.runId : runId // ignore: cast_nullable_to_non_nullable
as String,dungeonId: null == dungeonId ? _self.dungeonId : dungeonId // ignore: cast_nullable_to_non_nullable
as String,heroId: null == heroId ? _self.heroId : heroId // ignore: cast_nullable_to_non_nullable
as String,seed: null == seed ? _self.seed : seed // ignore: cast_nullable_to_non_nullable
as int,heroHp: null == heroHp ? _self.heroHp : heroHp // ignore: cast_nullable_to_non_nullable
as int,heroMaxHp: null == heroMaxHp ? _self.heroMaxHp : heroMaxHp // ignore: cast_nullable_to_non_nullable
as int,floorIndex: null == floorIndex ? _self.floorIndex : floorIndex // ignore: cast_nullable_to_non_nullable
as int,floorCount: null == floorCount ? _self.floorCount : floorCount // ignore: cast_nullable_to_non_nullable
as int,rooms: null == rooms ? _self._rooms : rooms // ignore: cast_nullable_to_non_nullable
as List<RunRoom>,currentRoomIndex: null == currentRoomIndex ? _self.currentRoomIndex : currentRoomIndex // ignore: cast_nullable_to_non_nullable
as int,combat: freezed == combat ? _self.combat : combat // ignore: cast_nullable_to_non_nullable
as CombatState?,collectedLoot: null == collectedLoot ? _self._collectedLoot : collectedLoot // ignore: cast_nullable_to_non_nullable
as List<RunLoot>,
  ));
}

/// Create a copy of DungeonRunState
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CombatStateCopyWith<$Res>? get combat {
    if (_self.combat == null) {
    return null;
  }

  return $CombatStateCopyWith<$Res>(_self.combat!, (value) {
    return _then(_self.copyWith(combat: value));
  });
}
}

// dart format on
