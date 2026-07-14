#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Rend chaque diagramme Mermaid (diagrams/*.mmd) en PDF vectoriel, inclus
# ensuite dans report.tex via \includegraphics.
#
# Prérequis : Node.js >= 18 (mermaid-cli télécharge Chromium au premier appel).
# Usage     : ./build-diagrams.sh
# ---------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")"

fail=0
for src in diagrams/*.mmd; do
    out="${src%.mmd}.pdf"
    printf '%-44s' "$(basename "$src")"
    if npx -y @mermaid-js/mermaid-cli@11 -i "$src" -o "$out" --pdfFit >/dev/null 2>&1 && [ -s "$out" ]; then
        echo "OK"
    else
        echo "ECHEC"
        fail=1
    fi
done

exit "$fail"
