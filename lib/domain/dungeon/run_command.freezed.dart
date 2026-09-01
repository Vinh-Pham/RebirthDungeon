// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'run_command.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$RunCommand {





@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is RunCommand);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'RunCommand()';
}


}

/// @nodoc
class $RunCommandCopyWith<$Res>  {
$RunCommandCopyWith(RunCommand _, $Res Function(RunCommand) __);
}


/// Adds pattern-matching-related methods to [RunCommand].
extension RunCommandPatterns on RunCommand {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( StartRun value)?  startRun,TResult Function( EnterRoom value)?  enterRoom,TResult Function( CombatAction value)?  combatCommand,TResult Function( Descend value)?  descend,required TResult orElse(),}){
final _that = this;
switch (_that) {
case StartRun() when startRun != null:
return startRun(_that);case EnterRoom() when enterRoom != null:
return enterRoom(_that);case CombatAction() when combatCommand != null:
return combatCommand(_that);case Descend() when descend != null:
return descend(_that);case _:
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

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( StartRun value)  startRun,required TResult Function( EnterRoom value)  enterRoom,required TResult Function( CombatAction value)  combatCommand,required TResult Function( Descend value)  descend,}){
final _that = this;
switch (_that) {
case StartRun():
return startRun(_that);case EnterRoom():
return enterRoom(_that);case CombatAction():
return combatCommand(_that);case Descend():
return descend(_that);}
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( StartRun value)?  startRun,TResult? Function( EnterRoom value)?  enterRoom,TResult? Function( CombatAction value)?  combatCommand,TResult? Function( Descend value)?  descend,}){
final _that = this;
switch (_that) {
case StartRun() when startRun != null:
return startRun(_that);case EnterRoom() when enterRoom != null:
return enterRoom(_that);case CombatAction() when combatCommand != null:
return combatCommand(_that);case Descend() when descend != null:
return descend(_that);case _:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function( String heroId,  String dungeonId,  int seed)?  startRun,TResult Function( int roomIndex)?  enterRoom,TResult Function( CombatCommand command)?  combatCommand,TResult Function()?  descend,required TResult orElse(),}) {final _that = this;
switch (_that) {
case StartRun() when startRun != null:
return startRun(_that.heroId,_that.dungeonId,_that.seed);case EnterRoom() when enterRoom != null:
return enterRoom(_that.roomIndex);case CombatAction() when combatCommand != null:
return combatCommand(_that.command);case Descend() when descend != null:
return descend();case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function( String heroId,  String dungeonId,  int seed)  startRun,required TResult Function( int roomIndex)  enterRoom,required TResult Function( CombatCommand command)  combatCommand,required TResult Function()  descend,}) {final _that = this;
switch (_that) {
case StartRun():
return startRun(_that.heroId,_that.dungeonId,_that.seed);case EnterRoom():
return enterRoom(_that.roomIndex);case CombatAction():
return combatCommand(_that.command);case Descend():
return descend();}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function( String heroId,  String dungeonId,  int seed)?  startRun,TResult? Function( int roomIndex)?  enterRoom,TResult? Function( CombatCommand command)?  combatCommand,TResult? Function()?  descend,}) {final _that = this;
switch (_that) {
case StartRun() when startRun != null:
return startRun(_that.heroId,_that.dungeonId,_that.seed);case EnterRoom() when enterRoom != null:
return enterRoom(_that.roomIndex);case CombatAction() when combatCommand != null:
return combatCommand(_that.command);case Descend() when descend != null:
return descend();case _:
  return null;

}
}

}

/// @nodoc


class StartRun extends RunCommand {
  const StartRun({required this.heroId, required this.dungeonId, required this.seed}): super._();
  

 final  String heroId;
 final  String dungeonId;
 final  int seed;

/// Create a copy of RunCommand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StartRunCopyWith<StartRun> get copyWith => _$StartRunCopyWithImpl<StartRun>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is StartRun&&(identical(other.heroId, heroId) || other.heroId == heroId)&&(identical(other.dungeonId, dungeonId) || other.dungeonId == dungeonId)&&(identical(other.seed, seed) || other.seed == seed));
}


@override
int get hashCode {
    return Object.hash(runtimeType,heroId,dungeonId,seed);
}

@override
String toString() {
    return 'RunCommand.startRun(heroId: $heroId, dungeonId: $dungeonId, seed: $seed)';
}


}

/// @nodoc
abstract mixin class $StartRunCopyWith<$Res> implements $RunCommandCopyWith<$Res> {
  factory $StartRunCopyWith(StartRun value, $Res Function(StartRun) _then) = _$StartRunCopyWithImpl;
@useResult
$Res call({
 String heroId, String dungeonId, int seed
});




}
/// @nodoc
class _$StartRunCopyWithImpl<$Res>
    implements $StartRunCopyWith<$Res> {
  _$StartRunCopyWithImpl(this._self, this._then);

  final StartRun _self;
  final $Res Function(StartRun) _then;

/// Create a copy of RunCommand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? heroId = null,Object? dungeonId = null,Object? seed = null,}) {
  return _then(StartRun(
heroId: null == heroId ? _self.heroId : heroId // ignore: cast_nullable_to_non_nullable
as String,dungeonId: null == dungeonId ? _self.dungeonId : dungeonId // ignore: cast_nullable_to_non_nullable
as String,seed: null == seed ? _self.seed : seed // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class EnterRoom extends RunCommand {
  const EnterRoom({required this.roomIndex}): super._();
  

 final  int roomIndex;

/// Create a copy of RunCommand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EnterRoomCopyWith<EnterRoom> get copyWith => _$EnterRoomCopyWithImpl<EnterRoom>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is EnterRoom&&(identical(other.roomIndex, roomIndex) || other.roomIndex == roomIndex));
}


@override
int get hashCode {
    return Object.hash(runtimeType,roomIndex);
}

@override
String toString() {
    return 'RunCommand.enterRoom(roomIndex: $roomIndex)';
}


}

/// @nodoc
abstract mixin class $EnterRoomCopyWith<$Res> implements $RunCommandCopyWith<$Res> {
  factory $EnterRoomCopyWith(EnterRoom value, $Res Function(EnterRoom) _then) = _$EnterRoomCopyWithImpl;
@useResult
$Res call({
 int roomIndex
});




}
/// @nodoc
class _$EnterRoomCopyWithImpl<$Res>
    implements $EnterRoomCopyWith<$Res> {
  _$EnterRoomCopyWithImpl(this._self, this._then);

  final EnterRoom _self;
  final $Res Function(EnterRoom) _then;

/// Create a copy of RunCommand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? roomIndex = null,}) {
  return _then(EnterRoom(
roomIndex: null == roomIndex ? _self.roomIndex : roomIndex // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}

/// @nodoc


class CombatAction extends RunCommand {
  const CombatAction({required this.command}): super._();
  

 final  CombatCommand command;

/// Create a copy of RunCommand
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CombatActionCopyWith<CombatAction> get copyWith => _$CombatActionCopyWithImpl<CombatAction>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is CombatAction&&(identical(other.command, command) || other.command == command));
}


@override
int get hashCode {
    return Object.hash(runtimeType,command);
}

@override
String toString() {
    return 'RunCommand.combatCommand(command: $command)';
}


}

/// @nodoc
abstract mixin class $CombatActionCopyWith<$Res> implements $RunCommandCopyWith<$Res> {
  factory $CombatActionCopyWith(CombatAction value, $Res Function(CombatAction) _then) = _$CombatActionCopyWithImpl;
@useResult
$Res call({
 CombatCommand command
});


$CombatCommandCopyWith<$Res> get command;

}
/// @nodoc
class _$CombatActionCopyWithImpl<$Res>
    implements $CombatActionCopyWith<$Res> {
  _$CombatActionCopyWithImpl(this._self, this._then);

  final CombatAction _self;
  final $Res Function(CombatAction) _then;

/// Create a copy of RunCommand
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? command = null,}) {
  return _then(CombatAction(
command: null == command ? _self.command : command // ignore: cast_nullable_to_non_nullable
as CombatCommand,
  ));
}

/// Create a copy of RunCommand
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CombatCommandCopyWith<$Res> get command {
  
  return $CombatCommandCopyWith<$Res>(_self.command, (value) {
    return _then(_self.copyWith(command: value));
  });
}
}

/// @nodoc


class Descend extends RunCommand {
  const Descend(): super._();
  






@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is Descend);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'RunCommand.descend()';
}


}




// dart format on
