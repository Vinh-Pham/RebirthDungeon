// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'failure.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$Failure {





@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is Failure);
}


@override
int get hashCode => runtimeType.hashCode;

@override
String toString() {
    return 'Failure()';
}


}

/// @nodoc
class $FailureCopyWith<$Res>  {
$FailureCopyWith(Failure _, $Res Function(Failure) __);
}


/// Adds pattern-matching-related methods to [Failure].
extension FailurePatterns on Failure {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>({TResult Function( NotFoundFailure value)?  notFound,TResult Function( ValidationFailure value)?  validation,TResult Function( InvalidOperationFailure value)?  invalidOperation,TResult Function( UnexpectedFailure value)?  unexpected,required TResult orElse(),}){
final _that = this;
switch (_that) {
case NotFoundFailure() when notFound != null:
return notFound(_that);case ValidationFailure() when validation != null:
return validation(_that);case InvalidOperationFailure() when invalidOperation != null:
return invalidOperation(_that);case UnexpectedFailure() when unexpected != null:
return unexpected(_that);case _:
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

@optionalTypeArgs TResult map<TResult extends Object?>({required TResult Function( NotFoundFailure value)  notFound,required TResult Function( ValidationFailure value)  validation,required TResult Function( InvalidOperationFailure value)  invalidOperation,required TResult Function( UnexpectedFailure value)  unexpected,}){
final _that = this;
switch (_that) {
case NotFoundFailure():
return notFound(_that);case ValidationFailure():
return validation(_that);case InvalidOperationFailure():
return invalidOperation(_that);case UnexpectedFailure():
return unexpected(_that);}
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>({TResult? Function( NotFoundFailure value)?  notFound,TResult? Function( ValidationFailure value)?  validation,TResult? Function( InvalidOperationFailure value)?  invalidOperation,TResult? Function( UnexpectedFailure value)?  unexpected,}){
final _that = this;
switch (_that) {
case NotFoundFailure() when notFound != null:
return notFound(_that);case ValidationFailure() when validation != null:
return validation(_that);case InvalidOperationFailure() when invalidOperation != null:
return invalidOperation(_that);case UnexpectedFailure() when unexpected != null:
return unexpected(_that);case _:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>({TResult Function( String entity,  String id)?  notFound,TResult Function( String message,  Map<String, Object> details)?  validation,TResult Function( String message)?  invalidOperation,TResult Function( String message,  Object? cause)?  unexpected,required TResult orElse(),}) {final _that = this;
switch (_that) {
case NotFoundFailure() when notFound != null:
return notFound(_that.entity,_that.id);case ValidationFailure() when validation != null:
return validation(_that.message,_that.details);case InvalidOperationFailure() when invalidOperation != null:
return invalidOperation(_that.message);case UnexpectedFailure() when unexpected != null:
return unexpected(_that.message,_that.cause);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>({required TResult Function( String entity,  String id)  notFound,required TResult Function( String message,  Map<String, Object> details)  validation,required TResult Function( String message)  invalidOperation,required TResult Function( String message,  Object? cause)  unexpected,}) {final _that = this;
switch (_that) {
case NotFoundFailure():
return notFound(_that.entity,_that.id);case ValidationFailure():
return validation(_that.message,_that.details);case InvalidOperationFailure():
return invalidOperation(_that.message);case UnexpectedFailure():
return unexpected(_that.message,_that.cause);}
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>({TResult? Function( String entity,  String id)?  notFound,TResult? Function( String message,  Map<String, Object> details)?  validation,TResult? Function( String message)?  invalidOperation,TResult? Function( String message,  Object? cause)?  unexpected,}) {final _that = this;
switch (_that) {
case NotFoundFailure() when notFound != null:
return notFound(_that.entity,_that.id);case ValidationFailure() when validation != null:
return validation(_that.message,_that.details);case InvalidOperationFailure() when invalidOperation != null:
return invalidOperation(_that.message);case UnexpectedFailure() when unexpected != null:
return unexpected(_that.message,_that.cause);case _:
  return null;

}
}

}

/// @nodoc


class NotFoundFailure implements Failure {
  const NotFoundFailure({required this.entity, required this.id});
  

 final  String entity;
 final  String id;

/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NotFoundFailureCopyWith<NotFoundFailure> get copyWith => _$NotFoundFailureCopyWithImpl<NotFoundFailure>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is NotFoundFailure&&(identical(other.entity, entity) || other.entity == entity)&&(identical(other.id, id) || other.id == id));
}


@override
int get hashCode {
    return Object.hash(runtimeType,entity,id);
}

@override
String toString() {
    return 'Failure.notFound(entity: $entity, id: $id)';
}


}

/// @nodoc
abstract mixin class $NotFoundFailureCopyWith<$Res> implements $FailureCopyWith<$Res> {
  factory $NotFoundFailureCopyWith(NotFoundFailure value, $Res Function(NotFoundFailure) _then) = _$NotFoundFailureCopyWithImpl;
@useResult
$Res call({
 String entity, String id
});




}
/// @nodoc
class _$NotFoundFailureCopyWithImpl<$Res>
    implements $NotFoundFailureCopyWith<$Res> {
  _$NotFoundFailureCopyWithImpl(this._self, this._then);

  final NotFoundFailure _self;
  final $Res Function(NotFoundFailure) _then;

/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? entity = null,Object? id = null,}) {
  return _then(NotFoundFailure(
entity: null == entity ? _self.entity : entity // ignore: cast_nullable_to_non_nullable
as String,id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class ValidationFailure implements Failure {
  const ValidationFailure({required this.message,  Map<String, Object> details = const <String, Object>{}}): _details = details;
  

 final  String message;
 final  Map<String, Object> _details;
@JsonKey() Map<String, Object> get details {
  if (_details is EqualUnmodifiableMapView) return _details;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_details);
}


/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ValidationFailureCopyWith<ValidationFailure> get copyWith => _$ValidationFailureCopyWithImpl<ValidationFailure>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is ValidationFailure&&(identical(other.message, message) || other.message == message)&&const DeepCollectionEquality().equals(other.details, _details));
}


@override
int get hashCode {
    return Object.hash(runtimeType,message,const DeepCollectionEquality().hash(_details));
}

@override
String toString() {
    return 'Failure.validation(message: $message, details: $details)';
}


}

/// @nodoc
abstract mixin class $ValidationFailureCopyWith<$Res> implements $FailureCopyWith<$Res> {
  factory $ValidationFailureCopyWith(ValidationFailure value, $Res Function(ValidationFailure) _then) = _$ValidationFailureCopyWithImpl;
@useResult
$Res call({
 String message, Map<String, Object> details
});




}
/// @nodoc
class _$ValidationFailureCopyWithImpl<$Res>
    implements $ValidationFailureCopyWith<$Res> {
  _$ValidationFailureCopyWithImpl(this._self, this._then);

  final ValidationFailure _self;
  final $Res Function(ValidationFailure) _then;

/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? message = null,Object? details = null,}) {
  return _then(ValidationFailure(
message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,details: null == details ? _self._details : details // ignore: cast_nullable_to_non_nullable
as Map<String, Object>,
  ));
}


}

/// @nodoc


class InvalidOperationFailure implements Failure {
  const InvalidOperationFailure({required this.message});
  

 final  String message;

/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$InvalidOperationFailureCopyWith<InvalidOperationFailure> get copyWith => _$InvalidOperationFailureCopyWithImpl<InvalidOperationFailure>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is InvalidOperationFailure&&(identical(other.message, message) || other.message == message));
}


@override
int get hashCode {
    return Object.hash(runtimeType,message);
}

@override
String toString() {
    return 'Failure.invalidOperation(message: $message)';
}


}

/// @nodoc
abstract mixin class $InvalidOperationFailureCopyWith<$Res> implements $FailureCopyWith<$Res> {
  factory $InvalidOperationFailureCopyWith(InvalidOperationFailure value, $Res Function(InvalidOperationFailure) _then) = _$InvalidOperationFailureCopyWithImpl;
@useResult
$Res call({
 String message
});




}
/// @nodoc
class _$InvalidOperationFailureCopyWithImpl<$Res>
    implements $InvalidOperationFailureCopyWith<$Res> {
  _$InvalidOperationFailureCopyWithImpl(this._self, this._then);

  final InvalidOperationFailure _self;
  final $Res Function(InvalidOperationFailure) _then;

/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? message = null,}) {
  return _then(InvalidOperationFailure(
message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

/// @nodoc


class UnexpectedFailure implements Failure {
  const UnexpectedFailure({required this.message, this.cause});
  

 final  String message;
 final  Object? cause;

/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UnexpectedFailureCopyWith<UnexpectedFailure> get copyWith => _$UnexpectedFailureCopyWithImpl<UnexpectedFailure>(this, _$identity);



@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is UnexpectedFailure&&(identical(other.message, message) || other.message == message)&&const DeepCollectionEquality().equals(other.cause, cause));
}


@override
int get hashCode {
    return Object.hash(runtimeType,message,const DeepCollectionEquality().hash(cause));
}

@override
String toString() {
    return 'Failure.unexpected(message: $message, cause: $cause)';
}


}

/// @nodoc
abstract mixin class $UnexpectedFailureCopyWith<$Res> implements $FailureCopyWith<$Res> {
  factory $UnexpectedFailureCopyWith(UnexpectedFailure value, $Res Function(UnexpectedFailure) _then) = _$UnexpectedFailureCopyWithImpl;
@useResult
$Res call({
 String message, Object? cause
});




}
/// @nodoc
class _$UnexpectedFailureCopyWithImpl<$Res>
    implements $UnexpectedFailureCopyWith<$Res> {
  _$UnexpectedFailureCopyWithImpl(this._self, this._then);

  final UnexpectedFailure _self;
  final $Res Function(UnexpectedFailure) _then;

/// Create a copy of Failure
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') $Res call({Object? message = null,Object? cause = freezed,}) {
  return _then(UnexpectedFailure(
message: null == message ? _self.message : message // ignore: cast_nullable_to_non_nullable
as String,cause: freezed == cause ? _self.cause : cause ,
  ));
}


}

// dart format on
