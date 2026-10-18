#!/usr/bin/env bash
# Starts a throw-away dev server (in-memory KV, canned AI replies) and runs the browser checks.
set -u
cd "$(dirname "$0")/.."
PORT="${PORT:-3100}"
FINISH_AFTER=4 PORT=$PORT node tests/dev-server.mjs > /tmp/chavruta-dev.log 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null "localhost:$PORT/" && break; sleep 0.2; done
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}" BASE="http://localhost:$PORT" node tests/e2e.mjs
