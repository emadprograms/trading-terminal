#!/bin/bash
_GSD_RT="/Users/emadarshadalam/Documents/GitHub/trading-terminal"
EDGE_PROBE_JS="$_GSD_RT/.agents/gsd-core/bin/lib/edge-probe.cjs"
REQS_JSON=$(mktemp "${TMPDIR:-/tmp}/edge-probe-reqs-XXXXXX.json")
cat > "$REQS_JSON" <<'JSON'
[
  { "id": "TEST-01", "text": "Playwright E2E test verifies hovering over the Y-axis, clicking the plus icon, and successfully creating an alert." }
]
JSON
COVERAGE=$(node "$EDGE_PROBE_JS" "$REQS_JSON")
echo "$COVERAGE"
