[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateNotNullOrEmpty()]
    [string]$LocationsFile = 'run-locations.txt'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

# Resolve script-relative defaults after parameter binding (Windows PowerShell 5.1).
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not [IO.Path]::IsPathRooted($LocationsFile)) {
    $LocationsFile = Join-Path $scriptDirectory $LocationsFile
}

# All relative paths are resolved against the locations file, not the terminal's cwd.
$locationsPath = (Resolve-Path -LiteralPath $LocationsFile).Path
$locationsDirectory = Split-Path -Parent $locationsPath
$lineNumber = 0
$applications = @(
    foreach ($line in Get-Content -LiteralPath $locationsPath -Encoding UTF8) {
        $lineNumber++
        $location = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($location) -or $location.StartsWith('#')) {
            continue
        }

        # Accept paths copied with surrounding double quotes; do not split on spaces.
        if ($location.Length -ge 2 -and $location.StartsWith('"') -and $location.EndsWith('"')) {
            $location = $location.Substring(1, $location.Length - 2)
        }

        if ($location -match '^[a-zA-Z][a-zA-Z0-9+.-]*://') {
            [PSCustomObject]@{ Path = $location; IsUri = $true }
            continue
        }

        $applicationPath = if ([IO.Path]::IsPathRooted($location)) {
            $location
        } else {
            Join-Path $locationsDirectory $location
        }

        if (-not (Test-Path -LiteralPath $applicationPath -PathType Leaf)) {
            throw "Linea ${lineNumber} de ${locationsPath}: no se encuentra '$applicationPath'."
        }

        [PSCustomObject]@{
            Path = (Resolve-Path -LiteralPath $applicationPath).Path
            IsUri = $false
        }
    }
)

if ($applications.Count -eq 0) {
    throw "No hay aplicaciones configuradas en '$locationsPath'."
}

# Check every executable above before launching anything. Preserve the listed order.
foreach ($application in $applications) {
    if (-not $PSCmdlet.ShouldProcess($application.Path, 'Arrancar aplicacion')) {
        continue
    }

    try {
        if ($application.IsUri) {
            Start-Process -FilePath $application.Path -ErrorAction Stop
        } else {
            Start-Process -FilePath $application.Path -WorkingDirectory (Split-Path -Parent $application.Path) -ErrorAction Stop
        }
        Write-Host "Arranque solicitado: $($application.Path)"
    } catch {
        throw "No se pudo arrancar '$($application.Path)': $($_.Exception.Message)"
    }
}
