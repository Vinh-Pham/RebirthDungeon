// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'combat_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CombatState {

 CombatPhase get phase; PlayerCombatant get player; List<EnemyCombatant> get enemies; List<CombatDie> get dice; int get turn; int get enemyActionCursor; int get rerollsUsedThisTurn;
/// Create a copy of CombatState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CombatStateCopyWith<CombatState> get copyWith => _$CombatStateCopyWithImpl<CombatState>(this as CombatState, _$identity);

  /// Serializes this CombatState to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as CombatState;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatState&&(identical(other.phase, _this.phase) || other.phase == _this.phase)&&(identical(other.player, _this.player) || other.player == _this.player)&&const DeepCollectionEquality().equals(other.enemies, _this.enemies)&&const DeepCollectionEquality().equals(other.dice, _this.dice)&&(identical(other.turn, _this.turn) || other.turn == _this.turn)&&(identical(other.enemyActionCursor, _this.enemyActionCursor) || other.enemyActionCursor == _this.enemyActionCursor)&&(identical(other.rerollsUsedThisTurn, _this.rerollsUsedThisTurn) || other.rerollsUsedThisTurn == _this.rerollsUsedThisTurn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as CombatState;
  return Object.hash(runtimeType,_this.phase,_this.player,const DeepCollectionEquality().hash(_this.enemies),const DeepCollectionEquality().hash(_this.dice),_this.turn,_this.enemyActionCursor,_this.rerollsUsedThisTurn);
}

@override
String toString() {
  final _this = this as CombatState;
  return 'CombatState(phase: ${_this.phase}, player: ${_this.player}, enemies: ${_this.enemies}, dice: ${_this.dice}, turn: ${_this.turn}, enemyActionCursor: ${_this.enemyActionCursor}, rerollsUsedThisTurn: ${_this.rerollsUsedThisTurn})';
}


}

/// @nodoc
abstract mixin class $CombatStateCopyWith<$Res>  {
  factory $CombatStateCopyWith(CombatState value, $Res Function(CombatState) _then) = _$CombatStateCopyWithImpl;
@useResult
$Res call({
 CombatPhase phase, PlayerCombatant player, List<EnemyCombatant> enemies, List<CombatDie> dice, int turn, int enemyActionCursor, int rerollsUsedThisTurn
});


$PlayerCombatantCopyWith<$Res> get player;

}
/// @nodoc
class _$CombatStateCopyWithImpl<$Res>
    implements $CombatStateCopyWith<$Res> {
  _$CombatStateCopyWithImpl(this._self, this._then);

  final CombatState _self;
  final $Res Function(CombatState) _then;

/// Create a copy of CombatState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? phase = null,Object? player = null,Object? enemies = null,Object? dice = null,Object? turn = null,Object? enemyActionCursor = null,Object? rerollsUsedThisTurn = null,}) {
  return _then(CombatState(
phase: null == phase ? _self.phase : phase // ignore: cast_nullable_to_non_nullable
as CombatPhase,player: null == player ? _self.player : player // ignore: cast_nullable_to_non_nullable
as PlayerCombatant,enemies: null == enemies ? _self.enemies : enemies // ignore: cast_nullable_to_non_nullable
as List<EnemyCombatant>,dice: null == dice ? _self.dice : dice // ignore: cast_nullable_to_non_nullable
as List<CombatDie>,turn: null == turn ? _self.turn : turn // ignore: cast_nullable_to_non_nullable
as int,enemyActionCursor: null == enemyActionCursor ? _self.enemyActionCursor : enemyActionCursor // ignore: cast_nullable_to_non_nullable
as int,rerollsUsedThisTurn: null == rerollsUsedThisTurn ? _self.rerollsUsedThisTurn : rerollsUsedThisTurn // ignore: cast_nullable_to_non_nullable
as int,
  ));
}
/// Create a copy of CombatState
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PlayerCombatantCopyWith<$Res> get player {
  
  return $PlayerCombatantCopyWith<$Res>(_self.player, (value) {
    return _then(_self.copyWith(player: value));
  });
}
}


/// Adds pattern-matching-related methods to [CombatState].
extension CombatStatePatterns on CombatState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CombatState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CombatState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CombatState value)  $default,){
final _that = this;
switch (_that) {
case _CombatState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CombatState value)?  $default,){
final _that = this;
switch (_that) {
case _CombatState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( CombatPhase phase,  PlayerCombatant player,  List<EnemyCombatant> enemies,  List<CombatDie> dice,  int turn,  int enemyActionCursor,  int rerollsUsedThisTurn)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CombatState() when $default != null:
return $default(_that.phase,_that.player,_that.enemies,_that.dice,_that.turn,_that.enemyActionCursor,_that.rerollsUsedThisTurn);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( CombatPhase phase,  PlayerCombatant player,  List<EnemyCombatant> enemies,  List<CombatDie> dice,  int turn,  int enemyActionCursor,  int rerollsUsedThisTurn)  $default,) {final _that = this;
switch (_that) {
case _CombatState():
return $default(_that.phase,_that.player,_that.enemies,_that.dice,_that.turn,_that.enemyActionCursor,_that.rerollsUsedThisTurn);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( CombatPhase phase,  PlayerCombatant player,  List<EnemyCombatant> enemies,  List<CombatDie> dice,  int turn,  int enemyActionCursor,  int rerollsUsedThisTurn)?  $default,) {final _that = this;
switch (_that) {
case _CombatState() when $default != null:
return $default(_that.phase,_that.player,_that.enemies,_that.dice,_that.turn,_that.enemyActionCursor,_that.rerollsUsedThisTurn);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CombatState implements CombatState {
  const _CombatState({this.phase = CombatPhase.notStarted, this.player = const PlayerCombatant(),  List<EnemyCombatant> enemies = const [],  List<CombatDie> dice = const [], this.turn = 0, this.enemyActionCursor = 0, this.rerollsUsedThisTurn = 0}): _enemies = enemies,_dice = dice;
  factory _CombatState.fromJson(Map<String, dynamic> json) => _$CombatStateFromJson(json);

@override@JsonKey() final  CombatPhase phase;
@override@JsonKey() final  PlayerCombatant player;
 final  List<EnemyCombatant> _enemies;
@override@JsonKey() List<EnemyCombatant> get enemies {
  if (_enemies is EqualUnmodifiableListView) return _enemies;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_enemies);
}

 final  List<CombatDie> _dice;
@override@JsonKey() List<CombatDie> get dice {
  if (_dice is EqualUnmodifiableListView) return _dice;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_dice);
}

@override@JsonKey() final  int turn;
@override@JsonKey() final  int enemyActionCursor;
@override@JsonKey() final  int rerollsUsedThisTurn;

/// Create a copy of CombatState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CombatStateCopyWith<_CombatState> get copyWith => __$CombatStateCopyWithImpl<_CombatState>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CombatStateToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _CombatState&&(identical(other.phase, phase) || other.phase == phase)&&(identical(other.player, player) || other.player == player)&&const DeepCollectionEquality().equals(other.enemies, _enemies)&&const DeepCollectionEquality().equals(other.dice, _dice)&&(identical(other.turn, turn) || other.turn == turn)&&(identical(other.enemyActionCursor, enemyActionCursor) || other.enemyActionCursor == enemyActionCursor)&&(identical(other.rerollsUsedThisTurn, rerollsUsedThisTurn) || other.rerollsUsedThisTurn == rerollsUsedThisTurn));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,phase,player,const DeepCollectionEquality().hash(_enemies),const DeepCollectionEquality().hash(_dice),turn,enemyActionCursor,rerollsUsedThisTurn);
}

@override
String toString() {
    return 'CombatState(phase: $phase, player: $player, enemies: $enemies, dice: $dice, turn: $turn, enemyActionCursor: $enemyActionCursor, rerollsUsedThisTurn: $rerollsUsedThisTurn)';
}


}

/// @nodoc
abstract mixin class _$CombatStateCopyWith<$Res> implements $CombatStateCopyWith<$Res> {
  factory _$CombatStateCopyWith(_CombatState value, $Res Function(_CombatState) _then) = __$CombatStateCopyWithImpl;
@override @useResult
$Res call({
 CombatPhase phase, PlayerCombatant player, List<EnemyCombatant> enemies, List<CombatDie> dice, int turn, int enemyActionCursor, int rerollsUsedThisTurn
});


@override $PlayerCombatantCopyWith<$Res> get player;

}
/// @nodoc
class __$CombatStateCopyWithImpl<$Res>
    implements _$CombatStateCopyWith<$Res> {
  __$CombatStateCopyWithImpl(this._self, this._then);

  final _CombatState _self;
  final $Res Function(_CombatState) _then;

/// Create a copy of CombatState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? phase = null,Object? player = null,Object? enemies = null,Object? dice = null,Object? turn = null,Object? enemyActionCursor = null,Object? rerollsUsedThisTurn = null,}) {
  return _then(_CombatState(
phase: null == phase ? _self.phase : phase // ignore: cast_nullable_to_non_nullable
as CombatPhase,player: null == player ? _self.player : player // ignore: cast_nullable_to_non_nullable
as PlayerCombatant,enemies: null == enemies ? _self._enemies : enemies // ignore: cast_nullable_to_non_nullable
as List<EnemyCombatant>,dice: null == dice ? _self._dice : dice // ignore: cast_nullable_to_non_nullable
as List<CombatDie>,turn: null == turn ? _self.turn : turn // ignore: cast_nullable_to_non_nullable
as int,enemyActionCursor: null == enemyActionCursor ? _self.enemyActionCursor : enemyActionCursor // ignore: cast_nullable_to_non_nullable
as int,rerollsUsedThisTurn: null == rerollsUsedThisTurn ? _self.rerollsUsedThisTurn : rerollsUsedThisTurn // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

/// Create a copy of CombatState
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$PlayerCombatantCopyWith<$Res> get player {
  
  return $PlayerCombatantCopyWith<$Res>(_self.player, (value) {
    return _then(_self.copyWith(player: value));
  });
}
}

// dart format on
