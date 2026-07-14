# ---------------------------------------------------------------------------
# Rend chaque diagramme Mermaid (diagrams/*.mmd) en PDF vectoriel, inclus
# ensuite dans report.tex via \includegraphics.
#
# Prerequis : Node.js >= 18 (mermaid-cli telecharge Chromium au premier appel).
# Usage     : .\build-diagrams.ps1
# ---------------------------------------------------------------------------
Set-Location -Path $PSScriptRoot

$failed = $false
Get-ChildItem -Path "diagrams" -Filter "*.mmd" | Sort-Object Name | ForEach-Object {
    $src = $_.FullName
    $out = [System.IO.Path]::ChangeExtension($src, ".pdf")
    Write-Host ("{0,-44}" -f $_.Name) -NoNewline

    npx -y "@mermaid-js/mermaid-cli@11" -i $src -o $out --pdfFit *> $null

    if ((Test-Path $out) -and ((Get-Item $out).Length -gt 0)) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "ECHEC" -ForegroundColor Red
        $script:failed = $true
    }
}

if ($failed) { exit 1 } else { exit 0 }
