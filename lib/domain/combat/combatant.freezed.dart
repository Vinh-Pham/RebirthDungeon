// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'combatant.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ActiveStatusEffect {

 String get statusId; StatusEffectKind get kind; int get potency; int get remainingTurns;
/// Create a copy of ActiveStatusEffect
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ActiveStatusEffectCopyWith<ActiveStatusEffect> get copyWith => _$ActiveStatusEffectCopyWithImpl<ActiveStatusEffect>(this as ActiveStatusEffect, _$identity);

  /// Serializes this ActiveStatusEffect to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ActiveStatusEffect;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ActiveStatusEffect&&(identical(other.statusId, _this.statusId) || other.statusId == _this.statusId)&&(identical(other.kind, _this.kind) || other.kind == _this.kind)&&(identical(other.potency, _this.potency) || other.potency == _this.potency)&&(identical(other.remainingTurns, _this.remainingTurns) || other.remainingTurns == _this.remainingTurns));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ActiveStatusEffect;
  return Object.hash(runtimeType,_this.statusId,_this.kind,_this.potency,_this.remainingTurns);
}

@override
String toString() {
  final _this = this as ActiveStatusEffect;
  return 'ActiveStatusEffect(statusId: ${_this.statusId}, kind: ${_this.kind}, potency: ${_this.potency}, remainingTurns: ${_this.remainingTurns})';
}


}

/// @nodoc
abstract mixin class $ActiveStatusEffectCopyWith<$Res>  {
  factory $ActiveStatusEffectCopyWith(ActiveStatusEffect value, $Res Function(ActiveStatusEffect) _then) = _$ActiveStatusEffectCopyWithImpl;
@useResult
$Res call({
 String statusId, StatusEffectKind kind, int potency, int remainingTurns
});




}
/// @nodoc
class _$ActiveStatusEffectCopyWithImpl<$Res>
    implements $ActiveStatusEffectCopyWith<$Res> {
  _$ActiveStatusEffectCopyWithImpl(this._self, this._then);

  final ActiveStatusEffect _self;
  final $Res Function(ActiveStatusEffect) _then;

/// Create a copy of ActiveStatusEffect
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? statusId = null,Object? kind = null,Object? potency = null,Object? remainingTurns = null,}) {
  return _then(ActiveStatusEffect(
statusId: null == statusId ? _self.statusId : statusId // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as StatusEffectKind,potency: null == potency ? _self.potency : potency // ignore: cast_nullable_to_non_nullable
as int,remainingTurns: null == remainingTurns ? _self.remainingTurns : remainingTurns // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ActiveStatusEffect].
extension ActiveStatusEffectPatterns on ActiveStatusEffect {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ActiveStatusEffect value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ActiveStatusEffect() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ActiveStatusEffect value)  $default,){
final _that = this;
switch (_that) {
case _ActiveStatusEffect():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ActiveStatusEffect value)?  $default,){
final _that = this;
switch (_that) {
case _ActiveStatusEffect() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String statusId,  StatusEffectKind kind,  int potency,  int remainingTurns)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ActiveStatusEffect() when $default != null:
return $default(_that.statusId,_that.kind,_that.potency,_that.remainingTurns);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String statusId,  StatusEffectKind kind,  int potency,  int remainingTurns)  $default,) {final _that = this;
switch (_that) {
case _ActiveStatusEffect():
return $default(_that.statusId,_that.kind,_that.potency,_that.remainingTurns);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String statusId,  StatusEffectKind kind,  int potency,  int remainingTurns)?  $default,) {final _that = this;
switch (_that) {
case _ActiveStatusEffect() when $default != null:
return $default(_that.statusId,_that.kind,_that.potency,_that.remainingTurns);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ActiveStatusEffect implements ActiveStatusEffect {
  const _ActiveStatusEffect({required this.statusId, required this.kind, required this.potency, required this.remainingTurns});
  factory _ActiveStatusEffect.fromJson(Map<String, dynamic> json) => _$ActiveStatusEffectFromJson(json);

@override final  String statusId;
@override final  StatusEffectKind kind;
@override final  int potency;
@override final  int remainingTurns;

/// Create a copy of ActiveStatusEffect
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ActiveStatusEffectCopyWith<_ActiveStatusEffect> get copyWith => __$ActiveStatusEffectCopyWithImpl<_ActiveStatusEffect>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ActiveStatusEffectToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ActiveStatusEffect&&(identical(other.statusId, statusId) || other.statusId == statusId)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.potency, potency) || other.potency == potency)&&(identical(other.remainingTurns, remainingTurns) || other.remainingTurns == remainingTurns));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,statusId,kind,potency,remainingTurns);
}

@override
String toString() {
    return 'ActiveStatusEffect(statusId: $statusId, kind: $kind, potency: $potency, remainingTurns: $remainingTurns)';
}


}

/// @nodoc
abstract mixin class _$ActiveStatusEffectCopyWith<$Res> implements $ActiveStatusEffectCopyWith<$Res> {
  factory _$ActiveStatusEffectCopyWith(_ActiveStatusEffect value, $Res Function(_ActiveStatusEffect) _then) = __$ActiveStatusEffectCopyWithImpl;
@override @useResult
$Res call({
 String statusId, StatusEffectKind kind, int potency, int remainingTurns
});




}
/// @nodoc
class __$ActiveStatusEffectCopyWithImpl<$Res>
    implements _$ActiveStatusEffectCopyWith<$Res> {
  __$ActiveStatusEffectCopyWithImpl(this._self, this._then);

  final _ActiveStatusEffect _self;
  final $Res Function(_ActiveStatusEffect) _then;

/// Create a copy of ActiveStatusEffect
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? statusId = null,Object? kind = null,Object? potency = null,Object? remainingTurns = null,}) {
  return _then(_ActiveStatusEffect(
statusId: null == statusId ? _self.statusId : statusId // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as StatusEffectKind,potency: null == potency ? _self.potency : potency // ignore: cast_nullable_to_non_nullable
as int,remainingTurns: null == remainingTurns ? _self.remainingTurns : remainingTurns // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$PlayerCombatant {

 String get id; String get name; int get hp; int get maxHp; int get attack; int get defense; int get shield; List<ActiveStatusEffect> get statuses; List<String> get abilityIds;
/// Create a copy of PlayerCombatant
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PlayerCombatantCopyWith<PlayerCombatant> get copyWith => _$PlayerCombatantCopyWithImpl<PlayerCombatant>(this as PlayerCombatant, _$identity);

  /// Serializes this PlayerCombatant to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as PlayerCombatant;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PlayerCombatant&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.hp, _this.hp) || other.hp == _this.hp)&&(identical(other.maxHp, _this.maxHp) || other.maxHp == _this.maxHp)&&(identical(other.attack, _this.attack) || other.attack == _this.attack)&&(identical(other.defense, _this.defense) || other.defense == _this.defense)&&(identical(other.shield, _this.shield) || other.shield == _this.shield)&&const DeepCollectionEquality().equals(other.statuses, _this.statuses)&&const DeepCollectionEquality().equals(other.abilityIds, _this.abilityIds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as PlayerCombatant;
  return Object.hash(runtimeType,_this.id,_this.name,_this.hp,_this.maxHp,_this.attack,_this.defense,_this.shield,const DeepCollectionEquality().hash(_this.statuses),const DeepCollectionEquality().hash(_this.abilityIds));
}

@override
String toString() {
  final _this = this as PlayerCombatant;
  return 'PlayerCombatant(id: ${_this.id}, name: ${_this.name}, hp: ${_this.hp}, maxHp: ${_this.maxHp}, attack: ${_this.attack}, defense: ${_this.defense}, shield: ${_this.shield}, statuses: ${_this.statuses}, abilityIds: ${_this.abilityIds})';
}


}

/// @nodoc
abstract mixin class $PlayerCombatantCopyWith<$Res>  {
  factory $PlayerCombatantCopyWith(PlayerCombatant value, $Res Function(PlayerCombatant) _then) = _$PlayerCombatantCopyWithImpl;
@useResult
$Res call({
 String id, String name, int hp, int maxHp, int attack, int defense, int shield, List<ActiveStatusEffect> statuses, List<String> abilityIds
});




}
/// @nodoc
class _$PlayerCombatantCopyWithImpl<$Res>
    implements $PlayerCombatantCopyWith<$Res> {
  _$PlayerCombatantCopyWithImpl(this._self, this._then);

  final PlayerCombatant _self;
  final $Res Function(PlayerCombatant) _then;

/// Create a copy of PlayerCombatant
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? hp = null,Object? maxHp = null,Object? attack = null,Object? defense = null,Object? shield = null,Object? statuses = null,Object? abilityIds = null,}) {
  return _then(PlayerCombatant(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,hp: null == hp ? _self.hp : hp // ignore: cast_nullable_to_non_nullable
as int,maxHp: null == maxHp ? _self.maxHp : maxHp // ignore: cast_nullable_to_non_nullable
as int,attack: null == attack ? _self.attack : attack // ignore: cast_nullable_to_non_nullable
as int,defense: null == defense ? _self.defense : defense // ignore: cast_nullable_to_non_nullable
as int,shield: null == shield ? _self.shield : shield // ignore: cast_nullable_to_non_nullable
as int,statuses: null == statuses ? _self.statuses : statuses // ignore: cast_nullable_to_non_nullable
as List<ActiveStatusEffect>,abilityIds: null == abilityIds ? _self.abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [PlayerCombatant].
extension PlayerCombatantPatterns on PlayerCombatant {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PlayerCombatant value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PlayerCombatant() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PlayerCombatant value)  $default,){
final _that = this;
switch (_that) {
case _PlayerCombatant():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PlayerCombatant value)?  $default,){
final _that = this;
switch (_that) {
case _PlayerCombatant() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  int hp,  int maxHp,  int attack,  int defense,  int shield,  List<ActiveStatusEffect> statuses,  List<String> abilityIds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PlayerCombatant() when $default != null:
return $default(_that.id,_that.name,_that.hp,_that.maxHp,_that.attack,_that.defense,_that.shield,_that.statuses,_that.abilityIds);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  int hp,  int maxHp,  int attack,  int defense,  int shield,  List<ActiveStatusEffect> statuses,  List<String> abilityIds)  $default,) {final _that = this;
switch (_that) {
case _PlayerCombatant():
return $default(_that.id,_that.name,_that.hp,_that.maxHp,_that.attack,_that.defense,_that.shield,_that.statuses,_that.abilityIds);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  int hp,  int maxHp,  int attack,  int defense,  int shield,  List<ActiveStatusEffect> statuses,  List<String> abilityIds)?  $default,) {final _that = this;
switch (_that) {
case _PlayerCombatant() when $default != null:
return $default(_that.id,_that.name,_that.hp,_that.maxHp,_that.attack,_that.defense,_that.shield,_that.statuses,_that.abilityIds);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PlayerCombatant implements PlayerCombatant {
  const _PlayerCombatant({this.id = '', this.name = '', this.hp = 0, this.maxHp = 0, this.attack = 0, this.defense = 0, this.shield = 0,  List<ActiveStatusEffect> statuses = const [],  List<String> abilityIds = const []}): _statuses = statuses,_abilityIds = abilityIds;
  factory _PlayerCombatant.fromJson(Map<String, dynamic> json) => _$PlayerCombatantFromJson(json);

@override@JsonKey() final  String id;
@override@JsonKey() final  String name;
@override@JsonKey() final  int hp;
@override@JsonKey() final  int maxHp;
@override@JsonKey() final  int attack;
@override@JsonKey() final  int defense;
@override@JsonKey() final  int shield;
 final  List<ActiveStatusEffect> _statuses;
@override@JsonKey() List<ActiveStatusEffect> get statuses {
  if (_statuses is EqualUnmodifiableListView) return _statuses;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_statuses);
}

 final  List<String> _abilityIds;
@override@JsonKey() List<String> get abilityIds {
  if (_abilityIds is EqualUnmodifiableListView) return _abilityIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_abilityIds);
}


/// Create a copy of PlayerCombatant
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PlayerCombatantCopyWith<_PlayerCombatant> get copyWith => __$PlayerCombatantCopyWithImpl<_PlayerCombatant>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PlayerCombatantToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _PlayerCombatant&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.hp, hp) || other.hp == hp)&&(identical(other.maxHp, maxHp) || other.maxHp == maxHp)&&(identical(other.attack, attack) || other.attack == attack)&&(identical(other.defense, defense) || other.defense == defense)&&(identical(other.shield, shield) || other.shield == shield)&&const DeepCollectionEquality().equals(other.statuses, _statuses)&&const DeepCollectionEquality().equals(other.abilityIds, _abilityIds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,hp,maxHp,attack,defense,shield,const DeepCollectionEquality().hash(_statuses),const DeepCollectionEquality().hash(_abilityIds));
}

@override
String toString() {
    return 'PlayerCombatant(id: $id, name: $name, hp: $hp, maxHp: $maxHp, attack: $attack, defense: $defense, shield: $shield, statuses: $statuses, abilityIds: $abilityIds)';
}


}

/// @nodoc
abstract mixin class _$PlayerCombatantCopyWith<$Res> implements $PlayerCombatantCopyWith<$Res> {
  factory _$PlayerCombatantCopyWith(_PlayerCombatant value, $Res Function(_PlayerCombatant) _then) = __$PlayerCombatantCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, int hp, int maxHp, int attack, int defense, int shield, List<ActiveStatusEffect> statuses, List<String> abilityIds
});




}
/// @nodoc
class __$PlayerCombatantCopyWithImpl<$Res>
    implements _$PlayerCombatantCopyWith<$Res> {
  __$PlayerCombatantCopyWithImpl(this._self, this._then);

  final _PlayerCombatant _self;
  final $Res Function(_PlayerCombatant) _then;

/// Create a copy of PlayerCombatant
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? hp = null,Object? maxHp = null,Object? attack = null,Object? defense = null,Object? shield = null,Object? statuses = null,Object? abilityIds = null,}) {
  return _then(_PlayerCombatant(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,hp: null == hp ? _self.hp : hp // ignore: cast_nullable_to_non_nullable
as int,maxHp: null == maxHp ? _self.maxHp : maxHp // ignore: cast_nullable_to_non_nullable
as int,attack: null == attack ? _self.attack : attack // ignore: cast_nullable_to_non_nullable
as int,defense: null == defense ? _self.defense : defense // ignore: cast_nullable_to_non_nullable
as int,shield: null == shield ? _self.shield : shield // ignore: cast_nullable_to_non_nullable
as int,statuses: null == statuses ? _self._statuses : statuses // ignore: cast_nullable_to_non_nullable
as List<ActiveStatusEffect>,abilityIds: null == abilityIds ? _self._abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}


/// @nodoc
mixin _$EnemyCombatant {

 String get id; String get contentId; String get name; int get hp; int get maxHp; int get attack; int get defense; int get shield; List<ActiveStatusEffect> get statuses; List<String> get abilityIds; int get basicAttackMax;
/// Create a copy of EnemyCombatant
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EnemyCombatantCopyWith<EnemyCombatant> get copyWith => _$EnemyCombatantCopyWithImpl<EnemyCombatant>(this as EnemyCombatant, _$identity);

  /// Serializes this EnemyCombatant to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as EnemyCombatant;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EnemyCombatant&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.contentId, _this.contentId) || other.contentId == _this.contentId)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.hp, _this.hp) || other.hp == _this.hp)&&(identical(other.maxHp, _this.maxHp) || other.maxHp == _this.maxHp)&&(identical(other.attack, _this.attack) || other.attack == _this.attack)&&(identical(other.defense, _this.defense) || other.defense == _this.defense)&&(identical(other.shield, _this.shield) || other.shield == _this.shield)&&const DeepCollectionEquality().equals(other.statuses, _this.statuses)&&const DeepCollectionEquality().equals(other.abilityIds, _this.abilityIds)&&(identical(other.basicAttackMax, _this.basicAttackMax) || other.basicAttackMax == _this.basicAttackMax));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as EnemyCombatant;
  return Object.hash(runtimeType,_this.id,_this.contentId,_this.name,_this.hp,_this.maxHp,_this.attack,_this.defense,_this.shield,const DeepCollectionEquality().hash(_this.statuses),const DeepCollectionEquality().hash(_this.abilityIds),_this.basicAttackMax);
}

@override
String toString() {
  final _this = this as EnemyCombatant;
  return 'EnemyCombatant(id: ${_this.id}, contentId: ${_this.contentId}, name: ${_this.name}, hp: ${_this.hp}, maxHp: ${_this.maxHp}, attack: ${_this.attack}, defense: ${_this.defense}, shield: ${_this.shield}, statuses: ${_this.statuses}, abilityIds: ${_this.abilityIds}, basicAttackMax: ${_this.basicAttackMax})';
}


}

/// @nodoc
abstract mixin class $EnemyCombatantCopyWith<$Res>  {
  factory $EnemyCombatantCopyWith(EnemyCombatant value, $Res Function(EnemyCombatant) _then) = _$EnemyCombatantCopyWithImpl;
@useResult
$Res call({
 String id, String contentId, String name, int hp, int maxHp, int attack, int defense, int shield, List<ActiveStatusEffect> statuses, List<String> abilityIds, int basicAttackMax
});




}
/// @nodoc
class _$EnemyCombatantCopyWithImpl<$Res>
    implements $EnemyCombatantCopyWith<$Res> {
  _$EnemyCombatantCopyWithImpl(this._self, this._then);

  final EnemyCombatant _self;
  final $Res Function(EnemyCombatant) _then;

/// Create a copy of EnemyCombatant
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? contentId = null,Object? name = null,Object? hp = null,Object? maxHp = null,Object? attack = null,Object? defense = null,Object? shield = null,Object? statuses = null,Object? abilityIds = null,Object? basicAttackMax = null,}) {
  return _then(EnemyCombatant(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,contentId: null == contentId ? _self.contentId : contentId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,hp: null == hp ? _self.hp : hp // ignore: cast_nullable_to_non_nullable
as int,maxHp: null == maxHp ? _self.maxHp : maxHp // ignore: cast_nullable_to_non_nullable
as int,attack: null == attack ? _self.attack : attack // ignore: cast_nullable_to_non_nullable
as int,defense: null == defense ? _self.defense : defense // ignore: cast_nullable_to_non_nullable
as int,shield: null == shield ? _self.shield : shield // ignore: cast_nullable_to_non_nullable
as int,statuses: null == statuses ? _self.statuses : statuses // ignore: cast_nullable_to_non_nullable
as List<ActiveStatusEffect>,abilityIds: null == abilityIds ? _self.abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,basicAttackMax: null == basicAttackMax ? _self.basicAttackMax : basicAttackMax // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [EnemyCombatant].
extension EnemyCombatantPatterns on EnemyCombatant {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EnemyCombatant value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EnemyCombatant() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EnemyCombatant value)  $default,){
final _that = this;
switch (_that) {
case _EnemyCombatant():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EnemyCombatant value)?  $default,){
final _that = this;
switch (_that) {
case _EnemyCombatant() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String contentId,  String name,  int hp,  int maxHp,  int attack,  int defense,  int shield,  List<ActiveStatusEffect> statuses,  List<String> abilityIds,  int basicAttackMax)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EnemyCombatant() when $default != null:
return $default(_that.id,_that.contentId,_that.name,_that.hp,_that.maxHp,_that.attack,_that.defense,_that.shield,_that.statuses,_that.abilityIds,_that.basicAttackMax);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String contentId,  String name,  int hp,  int maxHp,  int attack,  int defense,  int shield,  List<ActiveStatusEffect> statuses,  List<String> abilityIds,  int basicAttackMax)  $default,) {final _that = this;
switch (_that) {
case _EnemyCombatant():
return $default(_that.id,_that.contentId,_that.name,_that.hp,_that.maxHp,_that.attack,_that.defense,_that.shield,_that.statuses,_that.abilityIds,_that.basicAttackMax);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String contentId,  String name,  int hp,  int maxHp,  int attack,  int defense,  int shield,  List<ActiveStatusEffect> statuses,  List<String> abilityIds,  int basicAttackMax)?  $default,) {final _that = this;
switch (_that) {
case _EnemyCombatant() when $default != null:
return $default(_that.id,_that.contentId,_that.name,_that.hp,_that.maxHp,_that.attack,_that.defense,_that.shield,_that.statuses,_that.abilityIds,_that.basicAttackMax);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EnemyCombatant implements EnemyCombatant {
  const _EnemyCombatant({this.id = '', this.contentId = '', this.name = '', this.hp = 0, this.maxHp = 0, this.attack = 0, this.defense = 0, this.shield = 0,  List<ActiveStatusEffect> statuses = const [],  List<String> abilityIds = const [], this.basicAttackMax = 1}): _statuses = statuses,_abilityIds = abilityIds;
  factory _EnemyCombatant.fromJson(Map<String, dynamic> json) => _$EnemyCombatantFromJson(json);

@override@JsonKey() final  String id;
@override@JsonKey() final  String contentId;
@override@JsonKey() final  String name;
@override@JsonKey() final  int hp;
@override@JsonKey() final  int maxHp;
@override@JsonKey() final  int attack;
@override@JsonKey() final  int defense;
@override@JsonKey() final  int shield;
 final  List<ActiveStatusEffect> _statuses;
@override@JsonKey() List<ActiveStatusEffect> get statuses {
  if (_statuses is EqualUnmodifiableListView) return _statuses;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_statuses);
}

 final  List<String> _abilityIds;
@override@JsonKey() List<String> get abilityIds {
  if (_abilityIds is EqualUnmodifiableListView) return _abilityIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_abilityIds);
}

@override@JsonKey() final  int basicAttackMax;

/// Create a copy of EnemyCombatant
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EnemyCombatantCopyWith<_EnemyCombatant> get copyWith => __$EnemyCombatantCopyWithImpl<_EnemyCombatant>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EnemyCombatantToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _EnemyCombatant&&(identical(other.id, id) || other.id == id)&&(identical(other.contentId, contentId) || other.contentId == contentId)&&(identical(other.name, name) || other.name == name)&&(identical(other.hp, hp) || other.hp == hp)&&(identical(other.maxHp, maxHp) || other.maxHp == maxHp)&&(identical(other.attack, attack) || other.attack == attack)&&(identical(other.defense, defense) || other.defense == defense)&&(identical(other.shield, shield) || other.shield == shield)&&const DeepCollectionEquality().equals(other.statuses, _statuses)&&const DeepCollectionEquality().equals(other.abilityIds, _abilityIds)&&(identical(other.basicAttackMax, basicAttackMax) || other.basicAttackMax == basicAttackMax));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,contentId,name,hp,maxHp,attack,defense,shield,const DeepCollectionEquality().hash(_statuses),const DeepCollectionEquality().hash(_abilityIds),basicAttackMax);
}

@override
String toString() {
    return 'EnemyCombatant(id: $id, contentId: $contentId, name: $name, hp: $hp, maxHp: $maxHp, attack: $attack, defense: $defense, shield: $shield, statuses: $statuses, abilityIds: $abilityIds, basicAttackMax: $basicAttackMax)';
}


}

/// @nodoc
abstract mixin class _$EnemyCombatantCopyWith<$Res> implements $EnemyCombatantCopyWith<$Res> {
  factory _$EnemyCombatantCopyWith(_EnemyCombatant value, $Res Function(_EnemyCombatant) _then) = __$EnemyCombatantCopyWithImpl;
@override @useResult
$Res call({
 String id, String contentId, String name, int hp, int maxHp, int attack, int defense, int shield, List<ActiveStatusEffect> statuses, List<String> abilityIds, int basicAttackMax
});




}
/// @nodoc
class __$EnemyCombatantCopyWithImpl<$Res>
    implements _$EnemyCombatantCopyWith<$Res> {
  __$EnemyCombatantCopyWithImpl(this._self, this._then);

  final _EnemyCombatant _self;
  final $Res Function(_EnemyCombatant) _then;

/// Create a copy of EnemyCombatant
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? contentId = null,Object? name = null,Object? hp = null,Object? maxHp = null,Object? attack = null,Object? defense = null,Object? shield = null,Object? statuses = null,Object? abilityIds = null,Object? basicAttackMax = null,}) {
  return _then(_EnemyCombatant(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,contentId: null == contentId ? _self.contentId : contentId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,hp: null == hp ? _self.hp : hp // ignore: cast_nullable_to_non_nullable
as int,maxHp: null == maxHp ? _self.maxHp : maxHp // ignore: cast_nullable_to_non_nullable
as int,attack: null == attack ? _self.attack : attack // ignore: cast_nullable_to_non_nullable
as int,defense: null == defense ? _self.defense : defense // ignore: cast_nullable_to_non_nullable
as int,shield: null == shield ? _self.shield : shield // ignore: cast_nullable_to_non_nullable
as int,statuses: null == statuses ? _self._statuses : statuses // ignore: cast_nullable_to_non_nullable
as List<ActiveStatusEffect>,abilityIds: null == abilityIds ? _self._abilityIds : abilityIds // ignore: cast_nullable_to_non_nullable
as List<String>,basicAttackMax: null == basicAttackMax ? _self.basicAttackMax : basicAttackMax // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

// dart format on
