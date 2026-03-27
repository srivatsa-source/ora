$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv/Scripts/python.exe"
$uiDir = Join-Path $root "web_ui"

if (-not (Test-Path $python)) {
    throw "Python virtual environment not found at $python"
}

if (-not (Test-Path $uiDir)) {
    throw "Frontend directory not found at $uiDir"
}

Write-Host "Starting Ora backend on http://localhost:8000 ..."
$backend = Start-Process -FilePath $python `
    -ArgumentList "-m", "uvicorn", "web_backend.main:app", "--reload", "--port", "8000" `
    -WorkingDirectory $root `
    -PassThru

try {
    Write-Host "Starting Ora frontend on http://localhost:5173 ..."
    Set-Location $uiDir
    npm run dev
}
finally {
    if ($backend -and -not $backend.HasExited) {
        Write-Host "Stopping backend process..."
        Stop-Process -Id $backend.Id -Force
    }
}
