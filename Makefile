# Engineering commands for Rebirth Dungeon (see ARCHITECTURE.md).
#
# Dart is resolved from the same Flutter SDK that `flutter` resolves to, so
# the formatter and code generators always match the app's Dart version even
# when a different standalone `dart` is on PATH.
FLUTTER ?= flutter
DART ?= $(shell dirname $$(command -v flutter))/dart

.PHONY: setup gen format format-check analyze boundaries test check run

setup:
	$(FLUTTER) pub get

gen:
	$(DART) run build_runner build

format:
	$(DART) format lib test tool

format-check:
	$(DART) format --output=none --set-exit-if-changed lib test tool

analyze:
	$(FLUTTER) analyze

boundaries:
	$(DART) run tool/check_architecture_boundaries.dart

test:
	$(FLUTTER) test

check: format-check analyze boundaries test

run:
	$(FLUTTER) run
