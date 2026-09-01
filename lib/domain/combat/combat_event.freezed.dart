// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'combat_event.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$DieRoll {

 int get dieIndex; int get value; List<String> get tags;
/// Create a copy of DieRoll
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DieRollCopyWith<DieRoll> get copyWith => _$DieRollCopyWithImpl<DieRoll>(this as DieRoll, _$identity);



@override
bool operator ==(Object other) {
  final _this = this as DieRoll;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DieRoll&&(identical(other.dieIndex, _this.dieIndex) || other.dieIndex == _this.dieIndex)&&(identical(other.value, _this.value) || other.value == _this.value)&&const DeepCollectionEquality().equals(other.tags, _this.tags));
}


@override
int get hashCode {
  final _this = this as DieRoll;
  return Object.hash(runtimeType,_this.dieIndex,_this.value,const DeepCollectionEquality().hash(_this.tags));
}

@override
String toString() {
  final _this = this as DieRoll;
  return 'DieRoll(dieIndex: ${_this.dieIndex}, value: ${_this.value}, tags: ${_this.tags})';
}


}

/// @nodoc
abstract mixin class $DieRollCopyWith<$Res>  {
  factory $DieRollCopyWith(DieRoll value, $Res Function(DieRoll) _then) = _$DieRollCopyWithImpl;
@useResult
$Res call({
 int dieIndex, int value, List<String> tags
});




}
/// @nodoc
class _$DieRollCopyWithImpl<$Res>
    implements $DieRollCopyWith<$Res> {
  _$DieRollCopyWithImpl(this._self, this._then);

  final DieRoll _self;
  final $Res Function(DieRoll) _then;

/// Create a copy of DieRoll
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? dieIndex = null,Object? value = null,Object? tags = null,}) {
  return _then(DieRoll(
dieIndex: null == dieIndex ? _self.dieIndex : dieIndex // ignore: cast_nullable_to_non_nullable
as int,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [DieRoll].
extension DieRollPatterns on DieRoll {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DieRoll value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DieRoll() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DieRoll value)  $default,){
final _that = this;
switch (_that) {
case _DieRoll():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DieRoll value)?  $default,){
final _that = this;
switch (_that) {
case _DieRoll() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int dieIndex,  int value,  List<String> tags)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DieRoll() when $default != null:
return $default(_that.dieIndex,_that.value,_that.tags);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int dieIndex,  int value,  List<String> tags)  $default,) {final _that = this;
switch (_that) {
case _DieRoll():
return $default(_that.dieIndex,_that.value,_that.tags);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int dieIndex,  int value,  List<String> tags)?  $default,) {final _that = this;
switch (_that) {
case _DieRoll() when $default != null:
return $default(_that.dieIndex,_that.value,_that.tags);case _:
  return null;

}
}

}

/// @nodoc


class _DieRoll implements DieRoll {
  const _DieRoll({required this.dieIndex, required this.value,  List<String> tags = const []}): _tags = tags;
  

@override final  int dieIndex;
@override final  int value;
 final  List<String> _tags;
@override@JsonKey() List<String> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}


/// Create a copy of DieRoll
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DieRollCopyWith<_DieRoll> get copyWith => __$DieRollCopyWithImpl<_DieRoll>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DieRoll&&(identical(other.dieIndex, dieIndex) || other.dieIndex == dieIndex)&&(identical(other.value, value) || other.value == value)&&const DeepCollectionEquality().equals(other.tags, _tags));
}


@override
int get hashCode {
    return Object.hash(runtimeType,dieIndex,value,const DeepCollectionEquality().hash(_tags));
}

@override
String toString() {
    return 'DieRoll(dieIndex: $dieIndex, value: $value, tags: $tags)';
}


}

/// @nodoc
abstract mixin class _$DieRollCopyWith<$Res> implements $DieRollCopyWith<$Res> {
  factory _$DieRollCopyWith(_DieRoll value, $Res Function(_DieRoll) _then) = __$DieRollCopyWithImpl;
@override @useResult
$Res call({
 int dieIndex, int value, List<String> tags
});




}
/// @nodoc
class __$DieRollCopyWithImpl<$Res>
    implements _$DieRollCopyWith<$Res> {
  __$DieRollCopyWithImpl(this._self, this._then);

  final _DieRoll _self;
  final $Res Function(_DieRoll) _then;

/// Create a copy of DieRoll
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? dieIndex = null,Object? value = null,Object? tags = null,}) {
  return _then(_DieRoll(
dieIndex: null == dieIndex ? _self.dieIndex : dieIndex // ignore: cast_nullable_to_non_nullable
as int,value: null == value ? _self.value : value // ignore: cast_nullable_to_non_nullable
as int,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}

/// @nodoc
mixin _$CombatEvent {





@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatEvent);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'CombatEvent()';
}


}

/// @nodoc
class $CombatEventCopyWith<$Res>  {
$CombatEventCopyWith(CombatEvent _, $Res Function(CombatEvent) __);
}


/// Adds pattern-matching-related methods to [CombatEvent].
extension CombatEventPatterns on CombatEvent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( CombatStarted value)?  combatStarted,TResult Function( TurnStarted value)?  turnStarted,TResult Function( DiceRolled value)?  diceRolled,TResult Function( DieAssigned value)?  dieAssigned,TResult Function( AbilityActivated value)?  abilityActivated,TResult Function( CriticalHit value)?  criticalHit,TResult Function( ShieldAbsorbed value)?  shieldAbsorbed,TResult Function( DamageDealt value)?  damageDealt,TResult Function( HealingApplied value)?  healingApplied,TResult Function( ShieldGained value)?  shieldGained,TResult Function( StatusApplied value)?  statusApplied,TResult Function( StatusExpired value)?  statusExpired,TResult Function( EnemyDefeated value)?  enemyDefeated,TResult Function( PlayerDefeated value)?  playerDefeated,TResult Function( CombatWon value)?  combatWon,required TResult orElse(),}){
final _that = this;
switch (_that) {
case CombatStarted() when combatStarted != null:
return combatStarted(_that);case TurnStarted() when turnStarted != null:
return turnStarted(_that);case DiceRolled() when diceRolled != null:
return diceRolled(_that);case DieAssigned() when dieAssigned != null:
return dieAssigned(_that);case AbilityActivated() when abilityActivated != null:
return abilityActivated(_that);case CriticalHit() when criticalHit != null:
return criticalHit(_that);case ShieldAbsorbed() when shieldAbsorbed != null:
return shieldAbsorbed(_that);case DamageDealt() when damageDealt != null:
return damageDealt(_that);case HealingApplied() when healingApplied != null:
return healingApplied(_that);case ShieldGained() when shieldGained != null:
return shieldGained(_that);case StatusApplied() when statusApplied != null:
return statusApplied(_that);case StatusExpired() when statusExpired != null:
return statusExpired(_that);case EnemyDefeated() when enemyDefeated != null:
return enemyDefeated(_that);case PlayerDefeated() when playerDefeated != null:
return playerDefeated(_that);case CombatWon() when combatWon != null:
return combatWon(_that);case _:
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

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( CombatStarted value)  combatStarted,required TResult Function( TurnStarted value)  turnStarted,required TResult Function( DiceRolled value)  diceRolled,required TResult Function( DieAssigned value)  dieAssigned,required TResult Function( AbilityActivated value)  abilityActivated,required TResult Function( CriticalHit value)  criticalHit,required TResult Function( ShieldAbsorbed value)  shieldAbsorbed,required TResult Function( DamageDealt value)  damageDealt,required TResult Function( HealingApplied value)  healingApplied,required TResult Function( ShieldGained value)  shieldGained,required TResult Function( StatusApplied value)  statusApplied,required TResult Function( StatusExpired value)  statusExpired,required TResult Function( EnemyDefeated value)  enemyDefeated,required TResult Function( PlayerDefeated value)  playerDefeated,required TResult Function( CombatWon value)  combatWon,}){
final _that = this;
switch (_that) {
case CombatStarted():
return combatStarted(_that);case TurnStarted():
return turnStarted(_that);case DiceRolled():
return diceRolled(_that);case DieAssigned():
return dieAssigned(_that);case AbilityActivated():
return abilityActivated(_that);case CriticalHit():
return criticalHit(_that);case ShieldAbsorbed():
return shieldAbsorbed(_that);case DamageDealt():
return damageDealt(_that);case HealingApplied():
return healingApplied(_that);case ShieldGained():
return shieldGained(_that);case StatusApplied():
return statusApplied(_that);case StatusExpired():
return statusExpired(_that);case EnemyDefeated():
return enemyDefeated(_that);case PlayerDefeated():
return playerDefeated(_that);case CombatWon():
return combatWon(_that);}
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( CombatStarted value)?  combatStarted,TResult? Function( TurnStarted value)?  turnStarted,TResult? Function( DiceRolled value)?  diceRolled,TResult? Function( DieAssigned value)?  dieAssigned,TResult? Function( AbilityActivated value)?  abilityActivated,TResult? Function( CriticalHit value)?  criticalHit,TResult? Function( ShieldAbsorbed value)?  shieldAbsorbed,TResult? Function( DamageDealt value)?  damageDealt,TResult? Function( HealingApplied value)?  healingApplied,TResult? Function( ShieldGained value)?  shieldGained,TResult? Function( StatusApplied value)?  statusApplied,TResult? Function( StatusExpired value)?  statusExpired,TResult? Function( EnemyDefeated value)?  enemyDefeated,TResult? Function( PlayerDefeated value)?  playerDefeated,TResult? Function( CombatWon value)?  combatWon,}){
final _that = this;
switch (_that) {
case CombatStarted() when combatStarted != null:
return combatStarted(_that);case TurnStarted() when turnStarted != null:
return turnStarted(_that);case DiceRolled() when diceRolled != null:
return diceRolled(_that);case DieAssigned() when dieAssigned != null:
return dieAssigned(_that);case AbilityActivated() when abilityActivated != null:
return abilityActivated(_that);case CriticalHit() when criticalHit != null:
return criticalHit(_that);case ShieldAbsorbed() when shieldAbsorbed != null:
return shieldAbsorbed(_that);case DamageDealt() when damageDealt != null:
return damageDealt(_that);case HealingApplied() when healingApplied != null:
return healingApplied(_that);case ShieldGained() when shieldGained != null:
return shieldGained(_that);case StatusApplied() when statusApplied != null:
return statusApplied(_that);case StatusExpired() when statusExpired != null:
return statusExpired(_that);case EnemyDefeated() when enemyDefeated != null:
return enemyDefeated(_that);case PlayerDefeated() when playerDefeated != null:
return playerDefeated(_that);case CombatWon() when combatWon != null:
return combatWon(_that);case _:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function( String playerId,  List<String> enemyIds)?  combatStarted,TResult Function( int turn)?  turnStarted,TResult Function( List<DieRoll> rolls)?  diceRolled,TResult Function( int dieIndex,  String abilityId)?  dieAssigned,TResult Function( String actorId,  String? abilityId,  String targetId)?  abilityActivated,TResult Function( String targetId,  int amount)?  criticalHit,TResult Function( String targetId,  int amount)?  shieldAbsorbed,TResult Function( String targetId,  int amount,  int remainingHp,  DamageSource source)?  damageDealt,TResult Function( String targetId,  int amount,  int remainingHp)?  healingApplied,TResult Function( String targetId,  int amount,  int totalShield)?  shieldGained,TResult Function( String targetId,  String statusId,  int potency,  int remainingTurns)?  statusApplied,TResult Function( String targetId,  String statusId)?  statusExpired,TResult Function( String enemyId)?  enemyDefeated,TResult Function()?  playerDefeated,TResult Function( int turns)?  combatWon,required TResult orElse(),}) {final _that = this;
switch (_that) {
case CombatStarted() when combatStarted != null:
return combatStarted(_that.playerId,_that.enemyIds);case TurnStarted() when turnStarted != null:
return turnStarted(_that.turn);case DiceRolled() when diceRolled != null:
return diceRolled(_that.rolls);case DieAssigned() when dieAssigned != null:
return dieAssigned(_that.dieIndex,_that.abilityId);case AbilityActivated() when abilityActivated != null:
return abilityActivated(_that.actorId,_that.abilityId,_that.targetId);case CriticalHit() when criticalHit != null:
return criticalHit(_that.targetId,_that.amount);case ShieldAbsorbed() when shieldAbsorbed != null:
return shieldAbsorbed(_that.targetId,_that.amount);case DamageDealt() when damageDealt != null:
return damageDealt(_that.targetId,_that.amount,_that.remainingHp,_that.source);case HealingApplied() when healingApplied != null:
return healingApplied(_that.targetId,_that.amount,_that.remainingHp);case ShieldGained() when shieldGained != null:
return shieldGained(_that.targetId,_that.amount,_that.totalShield);case StatusApplied() when statusApplied != null:
return statusApplied(_that.targetId,_that.statusId,_that.potency,_that.remainingTurns);case StatusExpired() when statusExpired != null:
return statusExpired(_that.targetId,_that.statusId);case EnemyDefeated() when enemyDefeated != null:
return enemyDefeated(_that.enemyId);case PlayerDefeated() when playerDefeated != null:
return playerDefeated();case CombatWon() when combatWon != null:
return combatWon(_that.turns);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function( String playerId,  List<String> enemyIds)  combatStarted,required TResult Function( int turn)  turnStarted,required TResult Function( List<DieRoll> rolls)  diceRolled,required TResult Function( int dieIndex,  String abilityId)  dieAssigned,required TResult Function( String actorId,  String? abilityId,  String targetId)  abilityActivated,required TResult Function( String targetId,  int amount)  criticalHit,required TResult Function( String targetId,  int amount)  shieldAbsorbed,required TResult Function( String targetId,  int amount,  int remainingHp,  DamageSource source)  damageDealt,required TResult Function( String targetId,  int amount,  int remainingHp)  healingApplied,required TResult Function( String targetId,  int amount,  int totalShield)  shieldGained,required TResult Function( String targetId,  String statusId,  int potency,  int remainingTurns)  statusApplied,required TResult Function( String targetId,  String statusId)  statusExpired,required TResult Function( String enemyId)  enemyDefeated,required TResult Function()  playerDefeated,required TResult Function( int turns)  combatWon,}) {final _that = this;
switch (_that) {
case CombatStarted():
return combatStarted(_that.playerId,_that.enemyIds);case TurnStarted():
return turnStarted(_that.turn);case DiceRolled():
return diceRolled(_that.rolls);case DieAssigned():
return dieAssigned(_that.dieIndex,_that.abilityId);case AbilityActivated():
return abilityActivated(_that.actorId,_that.abilityId,_that.targetId);case CriticalHit():
return criticalHit(_that.targetId,_that.amount);case ShieldAbsorbed():
return shieldAbsorbed(_that.targetId,_that.amount);case DamageDealt():
return damageDealt(_that.targetId,_that.amount,_that.remainingHp,_that.source);case HealingApplied():
return healingApplied(_that.targetId,_that.amount,_that.remainingHp);case ShieldGained():
return shieldGained(_that.targetId,_that.amount,_that.totalShield);case StatusApplied():
return statusApplied(_that.targetId,_that.statusId,_that.potency,_that.remainingTurns);case StatusExpired():
return statusExpired(_that.targetId,_that.statusId);case EnemyDefeated():
return enemyDefeated(_that.enemyId);case PlayerDefeated():
return playerDefeated();case CombatWon():
return combatWon(_that.turns);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function( String playerId,  List<String> enemyIds)?  combatStarted,TResult? Function( int turn)?  turnStarted,TResult? Function( List<DieRoll> rolls)?  diceRolled,TResult? Function( int dieIndex,  String abilityId)?  dieAssigned,TResult? Function( String actorId,  String? abilityId,  String targetId)?  abilityActivated,TResult? Function( String targetId,  int amount)?  criticalHit,TResult? Function( String targetId,  int amount)?  shieldAbsorbed,TResult? Function( String targetId,  int amount,  int remainingHp,  DamageSource source)?  damageDealt,TResult? Function( String targetId,  int amount,  int remainingHp)?  healingApplied,TResult? Function( String targetId,  int amount,  int totalShield)?  shieldGained,TResult? Function( String targetId,  String statusId,  int potency,  int remainingTurns)?  statusApplied,TResult? Function( String targetId,  String statusId)?  statusExpired,TResult? Function( String enemyId)?  enemyDefeated,TResult? Function()?  playerDefeated,TResult? Function( int turns)?  combatWon,}) {final _that = this;
switch (_that) {
case CombatStarted() when combatStarted != null:
return combatStarted(_that.playerId,_that.enemyIds);case TurnStarted() when turnStarted != null:
return turnStarted(_that.turn);case DiceRolled() when diceRolled != null:
return diceRolled(_that.rolls);case DieAssigned() when dieAssigned != null:
return dieAssigned(_that.dieIndex,_that.abilityId);case AbilityActivated() when abilityActivated != null:
return abilityActivated(_that.actorId,_that.abilityId,_that.targetId);case CriticalHit() when criticalHit != null:
return criticalHit(_that.targetId,_that.amount);case ShieldAbsorbed() when shieldAbsorbed != null:
return shieldAbsorbed(_that.targetId,_that.amount);case DamageDealt() when damageDealt != null:
return damageDealt(_that.targetId,_that.amount,_that.remainingHp,_that.source);case HealingApplied() when healingApplied != null:
return healingApplied(_that.targetId,_that.amount,_that.remainingHp);case ShieldGained() when shieldGained != null:
return shieldGained(_that.targetId,_that.amount,_that.totalShield);case StatusApplied() when statusApplied != null:
return statusApplied(_that.targetId,_that.statusId,_that.potency,_that.remainingTurns);case StatusExpired() when statusExpired != null:
return statusExpired(_that.targetId,_that.statusId);case EnemyDefeated() when enemyDefeated != null:
return enemyDefeated(_that.enemyId);case PlayerDefeated() when playerDefeated != null:
return playerDefeated();case CombatWon() when combatWon != null:
return combatWon(_that.turns);case _:
  return null;

}
}

}

/// @nodoc


class CombatStarted extends CombatEvent {
  const CombatStarted({required this.playerId, required  List<String> enemyIds}): _enemyIds = enemyIds,super._();
  

 final  String playerId;
 final  List<String> _enemyIds;
 List<String> get enemyIds {
  if (_enemyIds is EqualUnmodifiableListView) return _enemyIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_enemyIds);
}


/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CombatStartedCopyWith<CombatStarted> get copyWith => _$CombatStartedCopyWithImpl<CombatStarted>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatStarted&&(identical(other.playerId, playerId) || other.playerId == playerId)&&const DeepCollectionEquality().equals(other.enemyIds, _enemyIds));
}


@override
int get hashCode {
    return Object.hash(runtimeType,playerId,const DeepCollectionEquality().hash(_enemyIds));
}

@override
String toString() {
    return 'CombatEvent.combatStarted(playerId: $playerId, enemyIds: $enemyIds)';
}


}

/// @nodoc
abstract mixin class $CombatStartedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $CombatStartedCopyWith(CombatStarted value, $Res Function(CombatStarted) _then) = _$CombatStartedCopyWithImpl;
@useResult
$Res call({
 String playerId, List<String> enemyIds
});




}
/// @nodoc
class _$CombatStartedCopyWithImpl<$Res>
    implements $CombatStartedCopyWith<$Res> {
  _$CombatStartedCopyWithImpl(this._self, this._then);

  final CombatStarted _self;
  final $Res Function(CombatStarted) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? playerId = null,Object? enemyIds = null,}) {
  return _then(CombatStarted(
playerId: null == playerId ? _self.playerId : playerId // ignore: cast_nullable_to_non_nullable
as String,enemyIds: null == enemyIds ? _self._enemyIds : enemyIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}

/// @nodoc


class TurnStarted extends CombatEvent {
  const TurnStarted({required this.turn}): super._();
  

 final  int turn;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TurnStartedCopyWith<TurnStarted> get copyWith => _$TurnStartedCopyWithImpl<TurnStarted>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is TurnStarted&&(identical(other.turn, turn) || other.turn == turn));
}


@override
int get hashCode {
    return Object.hash(runtimeType,turn);
}

@override
String toString() {
    return 'CombatEvent.turnStarted(turn: $turn)';
}


}

/// @nodoc
abstract mixin class $TurnStartedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $TurnStartedCopyWith(TurnStarted value, $Res Function(TurnStarted) _then) = _$TurnStartedCopyWithImpl;
@useResult
$Res call({
 int turn
});




}
/// @nodoc
class _$TurnStartedCopyWithImpl<$Res>
    implements $TurnStartedCopyWith<$Res> {
  _$TurnStartedCopyWithImpl(this._self, this._then);

  final TurnStarted _self;
  final $Res Function(TurnStarted) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? turn = null,}) {
  return _then(TurnStarted(
turn: null == turn ? _self.turn : turn // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class DiceRolled extends CombatEvent {
  const DiceRolled({required  List<DieRoll> rolls}): _rolls = rolls,super._();
  

 final  List<DieRoll> _rolls;
 List<DieRoll> get rolls {
  if (_rolls is EqualUnmodifiableListView) return _rolls;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_rolls);
}


/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DiceRolledCopyWith<DiceRolled> get copyWith => _$DiceRolledCopyWithImpl<DiceRolled>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is DiceRolled&&const DeepCollectionEquality().equals(other.rolls, _rolls));
}


@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_rolls));
}

@override
String toString() {
    return 'CombatEvent.diceRolled(rolls: $rolls)';
}


}

/// @nodoc
abstract mixin class $DiceRolledCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $DiceRolledCopyWith(DiceRolled value, $Res Function(DiceRolled) _then) = _$DiceRolledCopyWithImpl;
@useResult
$Res call({
 List<DieRoll> rolls
});




}
/// @nodoc
class _$DiceRolledCopyWithImpl<$Res>
    implements $DiceRolledCopyWith<$Res> {
  _$DiceRolledCopyWithImpl(this._self, this._then);

  final DiceRolled _self;
  final $Res Function(DiceRolled) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? rolls = null,}) {
  return _then(DiceRolled(
rolls: null == rolls ? _self._rolls : rolls // ignore: cast_nullable_to_non_nullable
as List<DieRoll>,
  ));
}


}

/// @nodoc


class DieAssigned extends CombatEvent {
  const DieAssigned({required this.dieIndex, required this.abilityId}): super._();
  

 final  int dieIndex;
 final  String abilityId;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DieAssignedCopyWith<DieAssigned> get copyWith => _$DieAssignedCopyWithImpl<DieAssigned>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is DieAssigned&&(identical(other.dieIndex, dieIndex) || other.dieIndex == dieIndex)&&(identical(other.abilityId, abilityId) || other.abilityId == abilityId));
}


@override
int get hashCode {
    return Object.hash(runtimeType,dieIndex,abilityId);
}

@override
String toString() {
    return 'CombatEvent.dieAssigned(dieIndex: $dieIndex, abilityId: $abilityId)';
}


}

/// @nodoc
abstract mixin class $DieAssignedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $DieAssignedCopyWith(DieAssigned value, $Res Function(DieAssigned) _then) = _$DieAssignedCopyWithImpl;
@useResult
$Res call({
 int dieIndex, String abilityId
});




}
/// @nodoc
class _$DieAssignedCopyWithImpl<$Res>
    implements $DieAssignedCopyWith<$Res> {
  _$DieAssignedCopyWithImpl(this._self, this._then);

  final DieAssigned _self;
  final $Res Function(DieAssigned) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? dieIndex = null,Object? abilityId = null,}) {
  return _then(DieAssigned(
dieIndex: null == dieIndex ? _self.dieIndex : dieIndex // ignore: cast_nullable_to_non_nullable
as int,abilityId: null == abilityId ? _self.abilityId : abilityId // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class AbilityActivated extends CombatEvent {
  const AbilityActivated({required this.actorId, this.abilityId, required this.targetId}): super._();
  

 final  String actorId;
 final  String? abilityId;
 final  String targetId;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AbilityActivatedCopyWith<AbilityActivated> get copyWith => _$AbilityActivatedCopyWithImpl<AbilityActivated>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is AbilityActivated&&(identical(other.actorId, actorId) || other.actorId == actorId)&&(identical(other.abilityId, abilityId) || other.abilityId == abilityId)&&(identical(other.targetId, targetId) || other.targetId == targetId));
}


@override
int get hashCode {
    return Object.hash(runtimeType,actorId,abilityId,targetId);
}

@override
String toString() {
    return 'CombatEvent.abilityActivated(actorId: $actorId, abilityId: $abilityId, targetId: $targetId)';
}


}

/// @nodoc
abstract mixin class $AbilityActivatedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $AbilityActivatedCopyWith(AbilityActivated value, $Res Function(AbilityActivated) _then) = _$AbilityActivatedCopyWithImpl;
@useResult
$Res call({
 String actorId, String? abilityId, String targetId
});




}
/// @nodoc
class _$AbilityActivatedCopyWithImpl<$Res>
    implements $AbilityActivatedCopyWith<$Res> {
  _$AbilityActivatedCopyWithImpl(this._self, this._then);

  final AbilityActivated _self;
  final $Res Function(AbilityActivated) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? actorId = null,Object? abilityId = freezed,Object? targetId = null,}) {
  return _then(AbilityActivated(
actorId: null == actorId ? _self.actorId : actorId // ignore: cast_nullable_to_non_nullable
as String,abilityId: freezed == abilityId ? _self.abilityId : abilityId // ignore: cast_nullable_to_non_nullable
as String?,targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class CriticalHit extends CombatEvent {
  const CriticalHit({required this.targetId, required this.amount}): super._();
  

 final  String targetId;
 final  int amount;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CriticalHitCopyWith<CriticalHit> get copyWith => _$CriticalHitCopyWithImpl<CriticalHit>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CriticalHit&&(identical(other.targetId, targetId) || other.targetId == targetId)&&(identical(other.amount, amount) || other.amount == amount));
}


@override
int get hashCode {
    return Object.hash(runtimeType,targetId,amount);
}

@override
String toString() {
    return 'CombatEvent.criticalHit(targetId: $targetId, amount: $amount)';
}


}

/// @nodoc
abstract mixin class $CriticalHitCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $CriticalHitCopyWith(CriticalHit value, $Res Function(CriticalHit) _then) = _$CriticalHitCopyWithImpl;
@useResult
$Res call({
 String targetId, int amount
});




}
/// @nodoc
class _$CriticalHitCopyWithImpl<$Res>
    implements $CriticalHitCopyWith<$Res> {
  _$CriticalHitCopyWithImpl(this._self, this._then);

  final CriticalHit _self;
  final $Res Function(CriticalHit) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? targetId = null,Object? amount = null,}) {
  return _then(CriticalHit(
targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class ShieldAbsorbed extends CombatEvent {
  const ShieldAbsorbed({required this.targetId, required this.amount}): super._();
  

 final  String targetId;
 final  int amount;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShieldAbsorbedCopyWith<ShieldAbsorbed> get copyWith => _$ShieldAbsorbedCopyWithImpl<ShieldAbsorbed>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is ShieldAbsorbed&&(identical(other.targetId, targetId) || other.targetId == targetId)&&(identical(other.amount, amount) || other.amount == amount));
}


@override
int get hashCode {
    return Object.hash(runtimeType,targetId,amount);
}

@override
String toString() {
    return 'CombatEvent.shieldAbsorbed(targetId: $targetId, amount: $amount)';
}


}

/// @nodoc
abstract mixin class $ShieldAbsorbedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $ShieldAbsorbedCopyWith(ShieldAbsorbed value, $Res Function(ShieldAbsorbed) _then) = _$ShieldAbsorbedCopyWithImpl;
@useResult
$Res call({
 String targetId, int amount
});




}
/// @nodoc
class _$ShieldAbsorbedCopyWithImpl<$Res>
    implements $ShieldAbsorbedCopyWith<$Res> {
  _$ShieldAbsorbedCopyWithImpl(this._self, this._then);

  final ShieldAbsorbed _self;
  final $Res Function(ShieldAbsorbed) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? targetId = null,Object? amount = null,}) {
  return _then(ShieldAbsorbed(
targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class DamageDealt extends CombatEvent {
  const DamageDealt({required this.targetId, required this.amount, required this.remainingHp, required this.source}): super._();
  

 final  String targetId;
 final  int amount;
 final  int remainingHp;
 final  DamageSource source;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DamageDealtCopyWith<DamageDealt> get copyWith => _$DamageDealtCopyWithImpl<DamageDealt>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is DamageDealt&&(identical(other.targetId, targetId) || other.targetId == targetId)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.remainingHp, remainingHp) || other.remainingHp == remainingHp)&&(identical(other.source, source) || other.source == source));
}


@override
int get hashCode {
    return Object.hash(runtimeType,targetId,amount,remainingHp,source);
}

@override
String toString() {
    return 'CombatEvent.damageDealt(targetId: $targetId, amount: $amount, remainingHp: $remainingHp, source: $source)';
}


}

/// @nodoc
abstract mixin class $DamageDealtCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $DamageDealtCopyWith(DamageDealt value, $Res Function(DamageDealt) _then) = _$DamageDealtCopyWithImpl;
@useResult
$Res call({
 String targetId, int amount, int remainingHp, DamageSource source
});




}
/// @nodoc
class _$DamageDealtCopyWithImpl<$Res>
    implements $DamageDealtCopyWith<$Res> {
  _$DamageDealtCopyWithImpl(this._self, this._then);

  final DamageDealt _self;
  final $Res Function(DamageDealt) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? targetId = null,Object? amount = null,Object? remainingHp = null,Object? source = null,}) {
  return _then(DamageDealt(
targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,remainingHp: null == remainingHp ? _self.remainingHp : remainingHp // ignore: cast_nullable_to_non_nullable
as int,source: null == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as DamageSource,
  ));
}


}

/// @nodoc


class HealingApplied extends CombatEvent {
  const HealingApplied({required this.targetId, required this.amount, required this.remainingHp}): super._();
  

 final  String targetId;
 final  int amount;
 final  int remainingHp;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HealingAppliedCopyWith<HealingApplied> get copyWith => _$HealingAppliedCopyWithImpl<HealingApplied>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is HealingApplied&&(identical(other.targetId, targetId) || other.targetId == targetId)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.remainingHp, remainingHp) || other.remainingHp == remainingHp));
}


@override
int get hashCode {
    return Object.hash(runtimeType,targetId,amount,remainingHp);
}

@override
String toString() {
    return 'CombatEvent.healingApplied(targetId: $targetId, amount: $amount, remainingHp: $remainingHp)';
}


}

/// @nodoc
abstract mixin class $HealingAppliedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $HealingAppliedCopyWith(HealingApplied value, $Res Function(HealingApplied) _then) = _$HealingAppliedCopyWithImpl;
@useResult
$Res call({
 String targetId, int amount, int remainingHp
});




}
/// @nodoc
class _$HealingAppliedCopyWithImpl<$Res>
    implements $HealingAppliedCopyWith<$Res> {
  _$HealingAppliedCopyWithImpl(this._self, this._then);

  final HealingApplied _self;
  final $Res Function(HealingApplied) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? targetId = null,Object? amount = null,Object? remainingHp = null,}) {
  return _then(HealingApplied(
targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,remainingHp: null == remainingHp ? _self.remainingHp : remainingHp // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class ShieldGained extends CombatEvent {
  const ShieldGained({required this.targetId, required this.amount, required this.totalShield}): super._();
  

 final  String targetId;
 final  int amount;
 final  int totalShield;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ShieldGainedCopyWith<ShieldGained> get copyWith => _$ShieldGainedCopyWithImpl<ShieldGained>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is ShieldGained&&(identical(other.targetId, targetId) || other.targetId == targetId)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.totalShield, totalShield) || other.totalShield == totalShield));
}


@override
int get hashCode {
    return Object.hash(runtimeType,targetId,amount,totalShield);
}

@override
String toString() {
    return 'CombatEvent.shieldGained(targetId: $targetId, amount: $amount, totalShield: $totalShield)';
}


}

/// @nodoc
abstract mixin class $ShieldGainedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $ShieldGainedCopyWith(ShieldGained value, $Res Function(ShieldGained) _then) = _$ShieldGainedCopyWithImpl;
@useResult
$Res call({
 String targetId, int amount, int totalShield
});




}
/// @nodoc
class _$ShieldGainedCopyWithImpl<$Res>
    implements $ShieldGainedCopyWith<$Res> {
  _$ShieldGainedCopyWithImpl(this._self, this._then);

  final ShieldGained _self;
  final $Res Function(ShieldGained) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? targetId = null,Object? amount = null,Object? totalShield = null,}) {
  return _then(ShieldGained(
targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as int,totalShield: null == totalShield ? _self.totalShield : totalShield // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class StatusApplied extends CombatEvent {
  const StatusApplied({required this.targetId, required this.statusId, required this.potency, required this.remainingTurns}): super._();
  

 final  String targetId;
 final  String statusId;
 final  int potency;
 final  int remainingTurns;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StatusAppliedCopyWith<StatusApplied> get copyWith => _$StatusAppliedCopyWithImpl<StatusApplied>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is StatusApplied&&(identical(other.targetId, targetId) || other.targetId == targetId)&&(identical(other.statusId, statusId) || other.statusId == statusId)&&(identical(other.potency, potency) || other.potency == potency)&&(identical(other.remainingTurns, remainingTurns) || other.remainingTurns == remainingTurns));
}


@override
int get hashCode {
    return Object.hash(runtimeType,targetId,statusId,potency,remainingTurns);
}

@override
String toString() {
    return 'CombatEvent.statusApplied(targetId: $targetId, statusId: $statusId, potency: $potency, remainingTurns: $remainingTurns)';
}


}

/// @nodoc
abstract mixin class $StatusAppliedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $StatusAppliedCopyWith(StatusApplied value, $Res Function(StatusApplied) _then) = _$StatusAppliedCopyWithImpl;
@useResult
$Res call({
 String targetId, String statusId, int potency, int remainingTurns
});




}
/// @nodoc
class _$StatusAppliedCopyWithImpl<$Res>
    implements $StatusAppliedCopyWith<$Res> {
  _$StatusAppliedCopyWithImpl(this._self, this._then);

  final StatusApplied _self;
  final $Res Function(StatusApplied) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? targetId = null,Object? statusId = null,Object? potency = null,Object? remainingTurns = null,}) {
  return _then(StatusApplied(
targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,statusId: null == statusId ? _self.statusId : statusId // ignore: cast_nullable_to_non_nullable
as String,potency: null == potency ? _self.potency : potency // ignore: cast_nullable_to_non_nullable
as int,remainingTurns: null == remainingTurns ? _self.remainingTurns : remainingTurns // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class StatusExpired extends CombatEvent {
  const StatusExpired({required this.targetId, required this.statusId}): super._();
  

 final  String targetId;
 final  String statusId;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StatusExpiredCopyWith<StatusExpired> get copyWith => _$StatusExpiredCopyWithImpl<StatusExpired>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is StatusExpired&&(identical(other.targetId, targetId) || other.targetId == targetId)&&(identical(other.statusId, statusId) || other.statusId == statusId));
}


@override
int get hashCode {
    return Object.hash(runtimeType,targetId,statusId);
}

@override
String toString() {
    return 'CombatEvent.statusExpired(targetId: $targetId, statusId: $statusId)';
}


}

/// @nodoc
abstract mixin class $StatusExpiredCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $StatusExpiredCopyWith(StatusExpired value, $Res Function(StatusExpired) _then) = _$StatusExpiredCopyWithImpl;
@useResult
$Res call({
 String targetId, String statusId
});




}
/// @nodoc
class _$StatusExpiredCopyWithImpl<$Res>
    implements $StatusExpiredCopyWith<$Res> {
  _$StatusExpiredCopyWithImpl(this._self, this._then);

  final StatusExpired _self;
  final $Res Function(StatusExpired) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? targetId = null,Object? statusId = null,}) {
  return _then(StatusExpired(
targetId: null == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String,statusId: null == statusId ? _self.statusId : statusId // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class EnemyDefeated extends CombatEvent {
  const EnemyDefeated({required this.enemyId}): super._();
  

 final  String enemyId;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EnemyDefeatedCopyWith<EnemyDefeated> get copyWith => _$EnemyDefeatedCopyWithImpl<EnemyDefeated>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is EnemyDefeated&&(identical(other.enemyId, enemyId) || other.enemyId == enemyId));
}


@override
int get hashCode {
    return Object.hash(runtimeType,enemyId);
}

@override
String toString() {
    return 'CombatEvent.enemyDefeated(enemyId: $enemyId)';
}


}

/// @nodoc
abstract mixin class $EnemyDefeatedCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $EnemyDefeatedCopyWith(EnemyDefeated value, $Res Function(EnemyDefeated) _then) = _$EnemyDefeatedCopyWithImpl;
@useResult
$Res call({
 String enemyId
});




}
/// @nodoc
class _$EnemyDefeatedCopyWithImpl<$Res>
    implements $EnemyDefeatedCopyWith<$Res> {
  _$EnemyDefeatedCopyWithImpl(this._self, this._then);

  final EnemyDefeated _self;
  final $Res Function(EnemyDefeated) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? enemyId = null,}) {
  return _then(EnemyDefeated(
enemyId: null == enemyId ? _self.enemyId : enemyId // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class PlayerDefeated extends CombatEvent {
  const PlayerDefeated(): super._();
  






@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is PlayerDefeated);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'CombatEvent.playerDefeated()';
}


}




/// @nodoc


class CombatWon extends CombatEvent {
  const CombatWon({required this.turns}): super._();
  

 final  int turns;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CombatWonCopyWith<CombatWon> get copyWith => _$CombatWonCopyWithImpl<CombatWon>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatWon&&(identical(other.turns, turns) || other.turns == turns));
}


@override
int get hashCode {
    return Object.hash(runtimeType,turns);
}

@override
String toString() {
    return 'CombatEvent.combatWon(turns: $turns)';
}


}

/// @nodoc
abstract mixin class $CombatWonCopyWith<$Res> implements $CombatEventCopyWith<$Res> {
  factory $CombatWonCopyWith(CombatWon value, $Res Function(CombatWon) _then) = _$CombatWonCopyWithImpl;
@useResult
$Res call({
 int turns
});




}
/// @nodoc
class _$CombatWonCopyWithImpl<$Res>
    implements $CombatWonCopyWith<$Res> {
  _$CombatWonCopyWithImpl(this._self, this._then);

  final CombatWon _self;
  final $Res Function(CombatWon) _then;

/// Create a copy of CombatEvent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? turns = null,}) {
  return _then(CombatWon(
turns: null == turns ? _self.turns : turns // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
