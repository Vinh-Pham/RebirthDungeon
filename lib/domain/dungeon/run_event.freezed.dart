// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'run_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$RunEvent {





@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RunEvent);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'RunEvent()';
}


}

/// @nodoc
class $RunEventCopyWith<$Res>  {
$RunEventCopyWith(RunEvent _, $Res Function(RunEvent) __);
}


/// Adds pattern-matching-related methods to [RunEvent].
extension RunEventPatterns on RunEvent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( CombatHappened value)?  combat,TResult Function( RunStarted value)?  runStarted,TResult Function( RoomEntered value)?  roomEntered,TResult Function( RoomCleared value)?  roomCleared,TResult Function( LootGained value)?  lootGained,TResult Function( ShrineHealed value)?  shrineHealed,TResult Function( CombatVictory value)?  combatVictory,TResult Function( CombatDefeat value)?  combatDefeat,TResult Function( FloorDescended value)?  floorDescended,TResult Function( RunCompleted value)?  runCompleted,TResult Function( RunFailed value)?  runFailed,required TResult orElse(),}){
final _that = this;
switch (_that) {
case CombatHappened() when combat != null:
return combat(_that);case RunStarted() when runStarted != null:
return runStarted(_that);case RoomEntered() when roomEntered != null:
return roomEntered(_that);case RoomCleared() when roomCleared != null:
return roomCleared(_that);case LootGained() when lootGained != null:
return lootGained(_that);case ShrineHealed() when shrineHealed != null:
return shrineHealed(_that);case CombatVictory() when combatVictory != null:
return combatVictory(_that);case CombatDefeat() when combatDefeat != null:
return combatDefeat(_that);case FloorDescended() when floorDescended != null:
return floorDescended(_that);case RunCompleted() when runCompleted != null:
return runCompleted(_that);case RunFailed() when runFailed != null:
return runFailed(_that);case _:
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

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( CombatHappened value)  combat,required TResult Function( RunStarted value)  runStarted,required TResult Function( RoomEntered value)  roomEntered,required TResult Function( RoomCleared value)  roomCleared,required TResult Function( LootGained value)  lootGained,required TResult Function( ShrineHealed value)  shrineHealed,required TResult Function( CombatVictory value)  combatVictory,required TResult Function( CombatDefeat value)  combatDefeat,required TResult Function( FloorDescended value)  floorDescended,required TResult Function( RunCompleted value)  runCompleted,required TResult Function( RunFailed value)  runFailed,}){
final _that = this;
switch (_that) {
case CombatHappened():
return combat(_that);case RunStarted():
return runStarted(_that);case RoomEntered():
return roomEntered(_that);case RoomCleared():
return roomCleared(_that);case LootGained():
return lootGained(_that);case ShrineHealed():
return shrineHealed(_that);case CombatVictory():
return combatVictory(_that);case CombatDefeat():
return combatDefeat(_that);case FloorDescended():
return floorDescended(_that);case RunCompleted():
return runCompleted(_that);case RunFailed():
return runFailed(_that);}
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( CombatHappened value)?  combat,TResult? Function( RunStarted value)?  runStarted,TResult? Function( RoomEntered value)?  roomEntered,TResult? Function( RoomCleared value)?  roomCleared,TResult? Function( LootGained value)?  lootGained,TResult? Function( ShrineHealed value)?  shrineHealed,TResult? Function( CombatVictory value)?  combatVictory,TResult? Function( CombatDefeat value)?  combatDefeat,TResult? Function( FloorDescended value)?  floorDescended,TResult? Function( RunCompleted value)?  runCompleted,TResult? Function( RunFailed value)?  runFailed,}){
final _that = this;
switch (_that) {
case CombatHappened() when combat != null:
return combat(_that);case RunStarted() when runStarted != null:
return runStarted(_that);case RoomEntered() when roomEntered != null:
return roomEntered(_that);case RoomCleared() when roomCleared != null:
return roomCleared(_that);case LootGained() when lootGained != null:
return lootGained(_that);case ShrineHealed() when shrineHealed != null:
return shrineHealed(_that);case CombatVictory() when combatVictory != null:
return combatVictory(_that);case CombatDefeat() when combatDefeat != null:
return combatDefeat(_that);case FloorDescended() when floorDescended != null:
return floorDescended(_that);case RunCompleted() when runCompleted != null:
return runCompleted(_that);case RunFailed() when runFailed != null:
return runFailed(_that);case _:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function( CombatEvent event)?  combat,TResult Function( String runId,  String dungeonId,  int seed)?  runStarted,TResult Function( int roomIndex,  RoomKind roomKind)?  roomEntered,TResult Function( int roomIndex)?  roomCleared,TResult Function( int roomIndex,  List<RunLoot> entries)?  lootGained,TResult Function( int healed,  int remainingHp)?  shrineHealed,TResult Function( int roomIndex)?  combatVictory,TResult Function()?  combatDefeat,TResult Function( int floorIndex)?  floorDescended,TResult Function( int floorsCleared)?  runCompleted,TResult Function()?  runFailed,required TResult orElse(),}) {final _that = this;
switch (_that) {
case CombatHappened() when combat != null:
return combat(_that.event);case RunStarted() when runStarted != null:
return runStarted(_that.runId,_that.dungeonId,_that.seed);case RoomEntered() when roomEntered != null:
return roomEntered(_that.roomIndex,_that.roomKind);case RoomCleared() when roomCleared != null:
return roomCleared(_that.roomIndex);case LootGained() when lootGained != null:
return lootGained(_that.roomIndex,_that.entries);case ShrineHealed() when shrineHealed != null:
return shrineHealed(_that.healed,_that.remainingHp);case CombatVictory() when combatVictory != null:
return combatVictory(_that.roomIndex);case CombatDefeat() when combatDefeat != null:
return combatDefeat();case FloorDescended() when floorDescended != null:
return floorDescended(_that.floorIndex);case RunCompleted() when runCompleted != null:
return runCompleted(_that.floorsCleared);case RunFailed() when runFailed != null:
return runFailed();case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function( CombatEvent event)  combat,required TResult Function( String runId,  String dungeonId,  int seed)  runStarted,required TResult Function( int roomIndex,  RoomKind roomKind)  roomEntered,required TResult Function( int roomIndex)  roomCleared,required TResult Function( int roomIndex,  List<RunLoot> entries)  lootGained,required TResult Function( int healed,  int remainingHp)  shrineHealed,required TResult Function( int roomIndex)  combatVictory,required TResult Function()  combatDefeat,required TResult Function( int floorIndex)  floorDescended,required TResult Function( int floorsCleared)  runCompleted,required TResult Function()  runFailed,}) {final _that = this;
switch (_that) {
case CombatHappened():
return combat(_that.event);case RunStarted():
return runStarted(_that.runId,_that.dungeonId,_that.seed);case RoomEntered():
return roomEntered(_that.roomIndex,_that.roomKind);case RoomCleared():
return roomCleared(_that.roomIndex);case LootGained():
return lootGained(_that.roomIndex,_that.entries);case ShrineHealed():
return shrineHealed(_that.healed,_that.remainingHp);case CombatVictory():
return combatVictory(_that.roomIndex);case CombatDefeat():
return combatDefeat();case FloorDescended():
return floorDescended(_that.floorIndex);case RunCompleted():
return runCompleted(_that.floorsCleared);case RunFailed():
return runFailed();}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function( CombatEvent event)?  combat,TResult? Function( String runId,  String dungeonId,  int seed)?  runStarted,TResult? Function( int roomIndex,  RoomKind roomKind)?  roomEntered,TResult? Function( int roomIndex)?  roomCleared,TResult? Function( int roomIndex,  List<RunLoot> entries)?  lootGained,TResult? Function( int healed,  int remainingHp)?  shrineHealed,TResult? Function( int roomIndex)?  combatVictory,TResult? Function()?  combatDefeat,TResult? Function( int floorIndex)?  floorDescended,TResult? Function( int floorsCleared)?  runCompleted,TResult? Function()?  runFailed,}) {final _that = this;
switch (_that) {
case CombatHappened() when combat != null:
return combat(_that.event);case RunStarted() when runStarted != null:
return runStarted(_that.runId,_that.dungeonId,_that.seed);case RoomEntered() when roomEntered != null:
return roomEntered(_that.roomIndex,_that.roomKind);case RoomCleared() when roomCleared != null:
return roomCleared(_that.roomIndex);case LootGained() when lootGained != null:
return lootGained(_that.roomIndex,_that.entries);case ShrineHealed() when shrineHealed != null:
return shrineHealed(_that.healed,_that.remainingHp);case CombatVictory() when combatVictory != null:
return combatVictory(_that.roomIndex);case CombatDefeat() when combatDefeat != null:
return combatDefeat();case FloorDescended() when floorDescended != null:
return floorDescended(_that.floorIndex);case RunCompleted() when runCompleted != null:
return runCompleted(_that.floorsCleared);case RunFailed() when runFailed != null:
return runFailed();case _:
  return null;

}
}

}

/// @nodoc


class CombatHappened extends RunEvent {
  const CombatHappened(this.event): super._();
  

 final  CombatEvent event;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CombatHappenedCopyWith<CombatHappened> get copyWith => _$CombatHappenedCopyWithImpl<CombatHappened>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatHappened&&(identical(other.event, event) || other.event == event));
}


@override
int get hashCode {
    return Object.hash(runtimeType,event);
}

@override
String toString() {
    return 'RunEvent.combat(event: $event)';
}


}

/// @nodoc
abstract mixin class $CombatHappenedCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $CombatHappenedCopyWith(CombatHappened value, $Res Function(CombatHappened) _then) = _$CombatHappenedCopyWithImpl;
@useResult
$Res call({
 CombatEvent event
});


$CombatEventCopyWith<$Res> get event;

}
/// @nodoc
class _$CombatHappenedCopyWithImpl<$Res>
    implements $CombatHappenedCopyWith<$Res> {
  _$CombatHappenedCopyWithImpl(this._self, this._then);

  final CombatHappened _self;
  final $Res Function(CombatHappened) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? event = null,}) {
  return _then(CombatHappened(
null == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as CombatEvent,
  ));
}

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CombatEventCopyWith<$Res> get event {
  
  return $CombatEventCopyWith<$Res>(_self.event, (value) {
    return _then(_self.copyWith(event: value));
  });
}
}

/// @nodoc


class RunStarted extends RunEvent {
  const RunStarted({required this.runId, required this.dungeonId, required this.seed}): super._();
  

 final  String runId;
 final  String dungeonId;
 final  int seed;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RunStartedCopyWith<RunStarted> get copyWith => _$RunStartedCopyWithImpl<RunStarted>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RunStarted&&(identical(other.runId, runId) || other.runId == runId)&&(identical(other.dungeonId, dungeonId) || other.dungeonId == dungeonId)&&(identical(other.seed, seed) || other.seed == seed));
}


@override
int get hashCode {
    return Object.hash(runtimeType,runId,dungeonId,seed);
}

@override
String toString() {
    return 'RunEvent.runStarted(runId: $runId, dungeonId: $dungeonId, seed: $seed)';
}


}

/// @nodoc
abstract mixin class $RunStartedCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $RunStartedCopyWith(RunStarted value, $Res Function(RunStarted) _then) = _$RunStartedCopyWithImpl;
@useResult
$Res call({
 String runId, String dungeonId, int seed
});




}
/// @nodoc
class _$RunStartedCopyWithImpl<$Res>
    implements $RunStartedCopyWith<$Res> {
  _$RunStartedCopyWithImpl(this._self, this._then);

  final RunStarted _self;
  final $Res Function(RunStarted) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? runId = null,Object? dungeonId = null,Object? seed = null,}) {
  return _then(RunStarted(
runId: null == runId ? _self.runId : runId // ignore: cast_nullable_to_non_nullable
as String,dungeonId: null == dungeonId ? _self.dungeonId : dungeonId // ignore: cast_nullable_to_non_nullable
as String,seed: null == seed ? _self.seed : seed // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class RoomEntered extends RunEvent {
  const RoomEntered({required this.roomIndex, required this.roomKind}): super._();
  

 final  int roomIndex;
 final  RoomKind roomKind;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RoomEnteredCopyWith<RoomEntered> get copyWith => _$RoomEnteredCopyWithImpl<RoomEntered>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RoomEntered&&(identical(other.roomIndex, roomIndex) || other.roomIndex == roomIndex)&&(identical(other.roomKind, roomKind) || other.roomKind == roomKind));
}


@override
int get hashCode {
    return Object.hash(runtimeType,roomIndex,roomKind);
}

@override
String toString() {
    return 'RunEvent.roomEntered(roomIndex: $roomIndex, roomKind: $roomKind)';
}


}

/// @nodoc
abstract mixin class $RoomEnteredCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $RoomEnteredCopyWith(RoomEntered value, $Res Function(RoomEntered) _then) = _$RoomEnteredCopyWithImpl;
@useResult
$Res call({
 int roomIndex, RoomKind roomKind
});




}
/// @nodoc
class _$RoomEnteredCopyWithImpl<$Res>
    implements $RoomEnteredCopyWith<$Res> {
  _$RoomEnteredCopyWithImpl(this._self, this._then);

  final RoomEntered _self;
  final $Res Function(RoomEntered) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? roomIndex = null,Object? roomKind = null,}) {
  return _then(RoomEntered(
roomIndex: null == roomIndex ? _self.roomIndex : roomIndex // ignore: cast_nullable_to_non_nullable
as int,roomKind: null == roomKind ? _self.roomKind : roomKind // ignore: cast_nullable_to_non_nullable
as RoomKind,
  ));
}


}

/// @nodoc


class RoomCleared extends RunEvent {
  const RoomCleared({required this.roomIndex}): super._();
  

 final  int roomIndex;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RoomClearedCopyWith<RoomCleared> get copyWith => _$RoomClearedCopyWithImpl<RoomCleared>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RoomCleared&&(identical(other.roomIndex, roomIndex) || other.roomIndex == roomIndex));
}


@override
int get hashCode {
    return Object.hash(runtimeType,roomIndex);
}

@override
String toString() {
    return 'RunEvent.roomCleared(roomIndex: $roomIndex)';
}


}

/// @nodoc
abstract mixin class $RoomClearedCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $RoomClearedCopyWith(RoomCleared value, $Res Function(RoomCleared) _then) = _$RoomClearedCopyWithImpl;
@useResult
$Res call({
 int roomIndex
});




}
/// @nodoc
class _$RoomClearedCopyWithImpl<$Res>
    implements $RoomClearedCopyWith<$Res> {
  _$RoomClearedCopyWithImpl(this._self, this._then);

  final RoomCleared _self;
  final $Res Function(RoomCleared) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? roomIndex = null,}) {
  return _then(RoomCleared(
roomIndex: null == roomIndex ? _self.roomIndex : roomIndex // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class LootGained extends RunEvent {
  const LootGained({required this.roomIndex, required  List<RunLoot> entries}): _entries = entries,super._();
  

 final  int roomIndex;
 final  List<RunLoot> _entries;
 List<RunLoot> get entries {
  if (_entries is EqualUnmodifiableListView) return _entries;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_entries);
}


/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LootGainedCopyWith<LootGained> get copyWith => _$LootGainedCopyWithImpl<LootGained>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is LootGained&&(identical(other.roomIndex, roomIndex) || other.roomIndex == roomIndex)&&const DeepCollectionEquality().equals(other.entries, _entries));
}


@override
int get hashCode {
    return Object.hash(runtimeType,roomIndex,const DeepCollectionEquality().hash(_entries));
}

@override
String toString() {
    return 'RunEvent.lootGained(roomIndex: $roomIndex, entries: $entries)';
}


}

/// @nodoc
abstract mixin class $LootGainedCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $LootGainedCopyWith(LootGained value, $Res Function(LootGained) _then) = _$LootGainedCopyWithImpl;
@useResult
$Res call({
 int roomIndex, List<RunLoot> entries
});




}
/// @nodoc
class _$LootGainedCopyWithImpl<$Res>
    implements $LootGainedCopyWith<$Res> {
  _$LootGainedCopyWithImpl(this._self, this._then);

  final LootGained _self;
  final $Res Function(LootGained) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? roomIndex = null,Object? entries = null,}) {
  return _then(LootGained(
roomIndex: null == roomIndex ? _self.roomIndex : roomIndex // ignore: cast_nullable_to_non_nullable
as int,entries: null == entries ? _self._entries : entries // ignore: cast_nullable_to_non_nullable
as List<RunLoot>,
  ));
}


}

/// @nodoc


class ShrineHealed extends RunEvent {
  const ShrineHealed({required this.healed, required this.remainingHp}): super._();
  

 final  int healed;
 final  int remainingHp;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShrineHealedCopyWith<ShrineHealed> get copyWith => _$ShrineHealedCopyWithImpl<ShrineHealed>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is ShrineHealed&&(identical(other.healed, healed) || other.healed == healed)&&(identical(other.remainingHp, remainingHp) || other.remainingHp == remainingHp));
}


@override
int get hashCode {
    return Object.hash(runtimeType,healed,remainingHp);
}

@override
String toString() {
    return 'RunEvent.shrineHealed(healed: $healed, remainingHp: $remainingHp)';
}


}

/// @nodoc
abstract mixin class $ShrineHealedCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $ShrineHealedCopyWith(ShrineHealed value, $Res Function(ShrineHealed) _then) = _$ShrineHealedCopyWithImpl;
@useResult
$Res call({
 int healed, int remainingHp
});




}
/// @nodoc
class _$ShrineHealedCopyWithImpl<$Res>
    implements $ShrineHealedCopyWith<$Res> {
  _$ShrineHealedCopyWithImpl(this._self, this._then);

  final ShrineHealed _self;
  final $Res Function(ShrineHealed) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? healed = null,Object? remainingHp = null,}) {
  return _then(ShrineHealed(
healed: null == healed ? _self.healed : healed // ignore: cast_nullable_to_non_nullable
as int,remainingHp: null == remainingHp ? _self.remainingHp : remainingHp // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class CombatVictory extends RunEvent {
  const CombatVictory({required this.roomIndex}): super._();
  

 final  int roomIndex;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CombatVictoryCopyWith<CombatVictory> get copyWith => _$CombatVictoryCopyWithImpl<CombatVictory>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatVictory&&(identical(other.roomIndex, roomIndex) || other.roomIndex == roomIndex));
}


@override
int get hashCode {
    return Object.hash(runtimeType,roomIndex);
}

@override
String toString() {
    return 'RunEvent.combatVictory(roomIndex: $roomIndex)';
}


}

/// @nodoc
abstract mixin class $CombatVictoryCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $CombatVictoryCopyWith(CombatVictory value, $Res Function(CombatVictory) _then) = _$CombatVictoryCopyWithImpl;
@useResult
$Res call({
 int roomIndex
});




}
/// @nodoc
class _$CombatVictoryCopyWithImpl<$Res>
    implements $CombatVictoryCopyWith<$Res> {
  _$CombatVictoryCopyWithImpl(this._self, this._then);

  final CombatVictory _self;
  final $Res Function(CombatVictory) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? roomIndex = null,}) {
  return _then(CombatVictory(
roomIndex: null == roomIndex ? _self.roomIndex : roomIndex // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class CombatDefeat extends RunEvent {
  const CombatDefeat(): super._();
  






@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatDefeat);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'RunEvent.combatDefeat()';
}


}




/// @nodoc


class FloorDescended extends RunEvent {
  const FloorDescended({required this.floorIndex}): super._();
  

 final  int floorIndex;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FloorDescendedCopyWith<FloorDescended> get copyWith => _$FloorDescendedCopyWithImpl<FloorDescended>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is FloorDescended&&(identical(other.floorIndex, floorIndex) || other.floorIndex == floorIndex));
}


@override
int get hashCode {
    return Object.hash(runtimeType,floorIndex);
}

@override
String toString() {
    return 'RunEvent.floorDescended(floorIndex: $floorIndex)';
}


}

/// @nodoc
abstract mixin class $FloorDescendedCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $FloorDescendedCopyWith(FloorDescended value, $Res Function(FloorDescended) _then) = _$FloorDescendedCopyWithImpl;
@useResult
$Res call({
 int floorIndex
});




}
/// @nodoc
class _$FloorDescendedCopyWithImpl<$Res>
    implements $FloorDescendedCopyWith<$Res> {
  _$FloorDescendedCopyWithImpl(this._self, this._then);

  final FloorDescended _self;
  final $Res Function(FloorDescended) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? floorIndex = null,}) {
  return _then(FloorDescended(
floorIndex: null == floorIndex ? _self.floorIndex : floorIndex // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class RunCompleted extends RunEvent {
  const RunCompleted({required this.floorsCleared}): super._();
  

 final  int floorsCleared;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RunCompletedCopyWith<RunCompleted> get copyWith => _$RunCompletedCopyWithImpl<RunCompleted>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RunCompleted&&(identical(other.floorsCleared, floorsCleared) || other.floorsCleared == floorsCleared));
}


@override
int get hashCode {
    return Object.hash(runtimeType,floorsCleared);
}

@override
String toString() {
    return 'RunEvent.runCompleted(floorsCleared: $floorsCleared)';
}


}

/// @nodoc
abstract mixin class $RunCompletedCopyWith<$Res> implements $RunEventCopyWith<$Res> {
  factory $RunCompletedCopyWith(RunCompleted value, $Res Function(RunCompleted) _then) = _$RunCompletedCopyWithImpl;
@useResult
$Res call({
 int floorsCleared
});




}
/// @nodoc
class _$RunCompletedCopyWithImpl<$Res>
    implements $RunCompletedCopyWith<$Res> {
  _$RunCompletedCopyWithImpl(this._self, this._then);

  final RunCompleted _self;
  final $Res Function(RunCompleted) _then;

/// Create a copy of RunEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? floorsCleared = null,}) {
  return _then(RunCompleted(
floorsCleared: null == floorsCleared ? _self.floorsCleared : floorsCleared // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class RunFailed extends RunEvent {
  const RunFailed(): super._();
  






@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RunFailed);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'RunEvent.runFailed()';
}


}




// dart format on
