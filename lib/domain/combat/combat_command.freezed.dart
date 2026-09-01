// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'combat_command.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$CombatCommand {





@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatCommand);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'CombatCommand()';
}


}

/// @nodoc
class $CombatCommandCopyWith<$Res>  {
$CombatCommandCopyWith(CombatCommand _, $Res Function(CombatCommand) __);
}


/// Adds pattern-matching-related methods to [CombatCommand].
extension CombatCommandPatterns on CombatCommand {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( StartCombat value)?  startCombat,TResult Function( RollDice value)?  rollDice,TResult Function( RerollDice value)?  rerollDice,TResult Function( AssignDieToAbility value)?  assignDie,TResult Function( UseAbility value)?  useAbility,TResult Function( EndTurn value)?  endTurn,TResult Function( EnemyAct value)?  enemyAct,required TResult orElse(),}){
final _that = this;
switch (_that) {
case StartCombat() when startCombat != null:
return startCombat(_that);case RollDice() when rollDice != null:
return rollDice(_that);case RerollDice() when rerollDice != null:
return rerollDice(_that);case AssignDieToAbility() when assignDie != null:
return assignDie(_that);case UseAbility() when useAbility != null:
return useAbility(_that);case EndTurn() when endTurn != null:
return endTurn(_that);case EnemyAct() when enemyAct != null:
return enemyAct(_that);case _:
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

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( StartCombat value)  startCombat,required TResult Function( RollDice value)  rollDice,required TResult Function( RerollDice value)  rerollDice,required TResult Function( AssignDieToAbility value)  assignDie,required TResult Function( UseAbility value)  useAbility,required TResult Function( EndTurn value)  endTurn,required TResult Function( EnemyAct value)  enemyAct,}){
final _that = this;
switch (_that) {
case StartCombat():
return startCombat(_that);case RollDice():
return rollDice(_that);case RerollDice():
return rerollDice(_that);case AssignDieToAbility():
return assignDie(_that);case UseAbility():
return useAbility(_that);case EndTurn():
return endTurn(_that);case EnemyAct():
return enemyAct(_that);}
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( StartCombat value)?  startCombat,TResult? Function( RollDice value)?  rollDice,TResult? Function( RerollDice value)?  rerollDice,TResult? Function( AssignDieToAbility value)?  assignDie,TResult? Function( UseAbility value)?  useAbility,TResult? Function( EndTurn value)?  endTurn,TResult? Function( EnemyAct value)?  enemyAct,}){
final _that = this;
switch (_that) {
case StartCombat() when startCombat != null:
return startCombat(_that);case RollDice() when rollDice != null:
return rollDice(_that);case RerollDice() when rerollDice != null:
return rerollDice(_that);case AssignDieToAbility() when assignDie != null:
return assignDie(_that);case UseAbility() when useAbility != null:
return useAbility(_that);case EndTurn() when endTurn != null:
return endTurn(_that);case EnemyAct() when enemyAct != null:
return enemyAct(_that);case _:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function( String heroId,  List<String> monsterIds)?  startCombat,TResult Function()?  rollDice,TResult Function( List<int> dieIndices)?  rerollDice,TResult Function( int dieIndex,  String abilityId)?  assignDie,TResult Function( String abilityId,  String? targetId)?  useAbility,TResult Function()?  endTurn,TResult Function()?  enemyAct,required TResult orElse(),}) {final _that = this;
switch (_that) {
case StartCombat() when startCombat != null:
return startCombat(_that.heroId,_that.monsterIds);case RollDice() when rollDice != null:
return rollDice();case RerollDice() when rerollDice != null:
return rerollDice(_that.dieIndices);case AssignDieToAbility() when assignDie != null:
return assignDie(_that.dieIndex,_that.abilityId);case UseAbility() when useAbility != null:
return useAbility(_that.abilityId,_that.targetId);case EndTurn() when endTurn != null:
return endTurn();case EnemyAct() when enemyAct != null:
return enemyAct();case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function( String heroId,  List<String> monsterIds)  startCombat,required TResult Function()  rollDice,required TResult Function( List<int> dieIndices)  rerollDice,required TResult Function( int dieIndex,  String abilityId)  assignDie,required TResult Function( String abilityId,  String? targetId)  useAbility,required TResult Function()  endTurn,required TResult Function()  enemyAct,}) {final _that = this;
switch (_that) {
case StartCombat():
return startCombat(_that.heroId,_that.monsterIds);case RollDice():
return rollDice();case RerollDice():
return rerollDice(_that.dieIndices);case AssignDieToAbility():
return assignDie(_that.dieIndex,_that.abilityId);case UseAbility():
return useAbility(_that.abilityId,_that.targetId);case EndTurn():
return endTurn();case EnemyAct():
return enemyAct();}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function( String heroId,  List<String> monsterIds)?  startCombat,TResult? Function()?  rollDice,TResult? Function( List<int> dieIndices)?  rerollDice,TResult? Function( int dieIndex,  String abilityId)?  assignDie,TResult? Function( String abilityId,  String? targetId)?  useAbility,TResult? Function()?  endTurn,TResult? Function()?  enemyAct,}) {final _that = this;
switch (_that) {
case StartCombat() when startCombat != null:
return startCombat(_that.heroId,_that.monsterIds);case RollDice() when rollDice != null:
return rollDice();case RerollDice() when rerollDice != null:
return rerollDice(_that.dieIndices);case AssignDieToAbility() when assignDie != null:
return assignDie(_that.dieIndex,_that.abilityId);case UseAbility() when useAbility != null:
return useAbility(_that.abilityId,_that.targetId);case EndTurn() when endTurn != null:
return endTurn();case EnemyAct() when enemyAct != null:
return enemyAct();case _:
  return null;

}
}

}

/// @nodoc


class StartCombat extends CombatCommand {
  const StartCombat({required this.heroId, required  List<String> monsterIds}): _monsterIds = monsterIds,super._();
  

 final  String heroId;
 final  List<String> _monsterIds;
 List<String> get monsterIds {
  if (_monsterIds is EqualUnmodifiableListView) return _monsterIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_monsterIds);
}


/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StartCombatCopyWith<StartCombat> get copyWith => _$StartCombatCopyWithImpl<StartCombat>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is StartCombat&&(identical(other.heroId, heroId) || other.heroId == heroId)&&const DeepCollectionEquality().equals(other.monsterIds, _monsterIds));
}


@override
int get hashCode {
    return Object.hash(runtimeType,heroId,const DeepCollectionEquality().hash(_monsterIds));
}

@override
String toString() {
    return 'CombatCommand.startCombat(heroId: $heroId, monsterIds: $monsterIds)';
}


}

/// @nodoc
abstract mixin class $StartCombatCopyWith<$Res> implements $CombatCommandCopyWith<$Res> {
  factory $StartCombatCopyWith(StartCombat value, $Res Function(StartCombat) _then) = _$StartCombatCopyWithImpl;
@useResult
$Res call({
 String heroId, List<String> monsterIds
});




}
/// @nodoc
class _$StartCombatCopyWithImpl<$Res>
    implements $StartCombatCopyWith<$Res> {
  _$StartCombatCopyWithImpl(this._self, this._then);

  final StartCombat _self;
  final $Res Function(StartCombat) _then;

/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? heroId = null,Object? monsterIds = null,}) {
  return _then(StartCombat(
heroId: null == heroId ? _self.heroId : heroId // ignore: cast_nullable_to_non_nullable
as String,monsterIds: null == monsterIds ? _self._monsterIds : monsterIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}

/// @nodoc


class RollDice extends CombatCommand {
  const RollDice(): super._();
  






@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RollDice);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'CombatCommand.rollDice()';
}


}




/// @nodoc


class RerollDice extends CombatCommand {
  const RerollDice({required  List<int> dieIndices}): _dieIndices = dieIndices,super._();
  

 final  List<int> _dieIndices;
 List<int> get dieIndices {
  if (_dieIndices is EqualUnmodifiableListView) return _dieIndices;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_dieIndices);
}


/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RerollDiceCopyWith<RerollDice> get copyWith => _$RerollDiceCopyWithImpl<RerollDice>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RerollDice&&const DeepCollectionEquality().equals(other.dieIndices, _dieIndices));
}


@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_dieIndices));
}

@override
String toString() {
    return 'CombatCommand.rerollDice(dieIndices: $dieIndices)';
}


}

/// @nodoc
abstract mixin class $RerollDiceCopyWith<$Res> implements $CombatCommandCopyWith<$Res> {
  factory $RerollDiceCopyWith(RerollDice value, $Res Function(RerollDice) _then) = _$RerollDiceCopyWithImpl;
@useResult
$Res call({
 List<int> dieIndices
});




}
/// @nodoc
class _$RerollDiceCopyWithImpl<$Res>
    implements $RerollDiceCopyWith<$Res> {
  _$RerollDiceCopyWithImpl(this._self, this._then);

  final RerollDice _self;
  final $Res Function(RerollDice) _then;

/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? dieIndices = null,}) {
  return _then(RerollDice(
dieIndices: null == dieIndices ? _self._dieIndices : dieIndices // ignore: cast_nullable_to_non_nullable
as List<int>,
  ));
}


}

/// @nodoc


class AssignDieToAbility extends CombatCommand {
  const AssignDieToAbility({required this.dieIndex, required this.abilityId}): super._();
  

 final  int dieIndex;
 final  String abilityId;

/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AssignDieToAbilityCopyWith<AssignDieToAbility> get copyWith => _$AssignDieToAbilityCopyWithImpl<AssignDieToAbility>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is AssignDieToAbility&&(identical(other.dieIndex, dieIndex) || other.dieIndex == dieIndex)&&(identical(other.abilityId, abilityId) || other.abilityId == abilityId));
}


@override
int get hashCode {
    return Object.hash(runtimeType,dieIndex,abilityId);
}

@override
String toString() {
    return 'CombatCommand.assignDie(dieIndex: $dieIndex, abilityId: $abilityId)';
}


}

/// @nodoc
abstract mixin class $AssignDieToAbilityCopyWith<$Res> implements $CombatCommandCopyWith<$Res> {
  factory $AssignDieToAbilityCopyWith(AssignDieToAbility value, $Res Function(AssignDieToAbility) _then) = _$AssignDieToAbilityCopyWithImpl;
@useResult
$Res call({
 int dieIndex, String abilityId
});




}
/// @nodoc
class _$AssignDieToAbilityCopyWithImpl<$Res>
    implements $AssignDieToAbilityCopyWith<$Res> {
  _$AssignDieToAbilityCopyWithImpl(this._self, this._then);

  final AssignDieToAbility _self;
  final $Res Function(AssignDieToAbility) _then;

/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? dieIndex = null,Object? abilityId = null,}) {
  return _then(AssignDieToAbility(
dieIndex: null == dieIndex ? _self.dieIndex : dieIndex // ignore: cast_nullable_to_non_nullable
as int,abilityId: null == abilityId ? _self.abilityId : abilityId // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class UseAbility extends CombatCommand {
  const UseAbility({required this.abilityId, this.targetId}): super._();
  

 final  String abilityId;
 final  String? targetId;

/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UseAbilityCopyWith<UseAbility> get copyWith => _$UseAbilityCopyWithImpl<UseAbility>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is UseAbility&&(identical(other.abilityId, abilityId) || other.abilityId == abilityId)&&(identical(other.targetId, targetId) || other.targetId == targetId));
}


@override
int get hashCode {
    return Object.hash(runtimeType,abilityId,targetId);
}

@override
String toString() {
    return 'CombatCommand.useAbility(abilityId: $abilityId, targetId: $targetId)';
}


}

/// @nodoc
abstract mixin class $UseAbilityCopyWith<$Res> implements $CombatCommandCopyWith<$Res> {
  factory $UseAbilityCopyWith(UseAbility value, $Res Function(UseAbility) _then) = _$UseAbilityCopyWithImpl;
@useResult
$Res call({
 String abilityId, String? targetId
});




}
/// @nodoc
class _$UseAbilityCopyWithImpl<$Res>
    implements $UseAbilityCopyWith<$Res> {
  _$UseAbilityCopyWithImpl(this._self, this._then);

  final UseAbility _self;
  final $Res Function(UseAbility) _then;

/// Create a copy of CombatCommand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? abilityId = null,Object? targetId = freezed,}) {
  return _then(UseAbility(
abilityId: null == abilityId ? _self.abilityId : abilityId // ignore: cast_nullable_to_non_nullable
as String,targetId: freezed == targetId ? _self.targetId : targetId // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

/// @nodoc


class EndTurn extends CombatCommand {
  const EndTurn(): super._();
  






@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is EndTurn);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'CombatCommand.endTurn()';
}


}




/// @nodoc


class EnemyAct extends CombatCommand {
  const EnemyAct(): super._();
  






@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is EnemyAct);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'CombatCommand.enemyAct()';
}


}




// dart format on
