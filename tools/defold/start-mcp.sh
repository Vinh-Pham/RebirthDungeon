#!/bin/sh
set -eu

TOOLS_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$TOOLS_DIR/../.." && pwd)
DEFOLD_MCP_DIR=${DEFOLD_MCP_DIR:-"$REPO_ROOT/../defold-mcp"}

if [ ! -f "$DEFOLD_MCP_DIR/dist/index.js" ]; then
    echo "Defold MCP is missing. Follow docs/defold-tooling.md to install it." >&2
    exit 1
fi

# Codex does not inherit arbitrary shell variables. Discover the installed JDK
# here; an explicitly configured JAVA_HOME takes precedence.
if [ -z "${JAVA_HOME:-}" ] && [ -x /usr/libexec/java_home ]; then
    # Pinned Bob 1.14.1 uses Java class version 69 (Java 25), despite the
    # community server's looser Java check. Keep this aligned with toolchain.json.
    JAVA_HOME=$(/usr/libexec/java_home -v '25+' 2>/dev/null) || {
        echo "JDK 25+ is required by Bob 1.14.1. Set JAVA_HOME in the MCP environment." >&2
        exit 1
    }
    export JAVA_HOME
fi

DEFOLD_PROJECT_ROOT=${DEFOLD_PROJECT_ROOT:-"$REPO_ROOT"}
export DEFOLD_PROJECT_ROOT
cd "$DEFOLD_PROJECT_ROOT"
exec node "$DEFOLD_MCP_DIR/dist/index.js" --transport stdio
