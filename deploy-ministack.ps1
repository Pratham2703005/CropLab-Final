# Deploys CropLab to MiniStack as ECS tasks (backend + frontend).
# Prereqs:
#   - Docker Desktop running
#   - AWS CLI installed and configured (any fake creds; region us-east-1)
# The script starts MiniStack itself. Run from the project root.

$ErrorActionPreference = "Stop"
$endpoint = "http://localhost:4566"

# Disable the AWS CLI pager so long JSON output doesn't pause the script.
$env:AWS_PAGER = ""

function Invoke-Step($name, $script) {
    Write-Host "`n=== $name ===" -ForegroundColor Cyan
    # Pipe through Out-Host so the command's stdout is a pipe, not a TTY.
    # This stops the AWS CLI from launching its pager mid-script.
    & $script | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $name (exit $LASTEXITCODE)" -ForegroundColor Red
        exit 1
    }
}

Invoke-Step "Start MiniStack (local AWS)" {
    docker-compose --profile ecs up -d ministack
}

Invoke-Step "Build backend image" {
    docker build -t croplab-backend:latest ./Backend
}

Invoke-Step "Build frontend image" {
    docker build -t croplab-frontend:latest ./Frontend
}

Write-Host "`n=== Wait for MiniStack to be ready ===" -ForegroundColor Cyan
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        Invoke-WebRequest -Uri $endpoint -UseBasicParsing -TimeoutSec 2 | Out-Null
        $ready = $true; break
    } catch { Start-Sleep -Seconds 1 }
}
if (-not $ready) {
    Write-Host "FAILED: MiniStack not reachable at $endpoint" -ForegroundColor Red
    exit 1
}
Write-Host "MiniStack is ready."

Invoke-Step "Create ECS cluster" {
    aws --endpoint-url=$endpoint ecs create-cluster --cluster-name croplab
}

# --- Generate the backend task definition with credentials injected ---
# The backend image is secret-free (safe to push to Docker Hub). Credentials
# are read here from Backend/.env + the GEE service-account JSON and passed to
# ECS as task environment variables. The generated file is git-ignored.
Write-Host "`n=== Generate backend task definition (inject credentials) ===" -ForegroundColor Cyan

$envVars = @()
if (Test-Path ./Backend/.env) {
    foreach ($line in Get-Content ./Backend/.env) {
        $t = $line.Trim()
        if (-not $t -or $t.StartsWith("#") -or ($t -notmatch "=")) { continue }
        $name, $value = $t -split "=", 2
        $envVars += @{ name = $name.Trim(); value = $value.Trim().Trim('"').Trim("'") }
    }
}
if (Test-Path ./Backend/earth-engine-service-account.json) {
    $gee = Get-Content ./Backend/earth-engine-service-account.json -Raw | ConvertFrom-Json
    $envVars += @{ name = "GEE_SERVICE_ACCOUNT_EMAIL"; value = "$($gee.client_email)" }
    $envVars += @{ name = "GEE_PROJECT_ID";            value = "$($gee.project_id)" }
    $envVars += @{ name = "GEE_PRIVATE_KEY_ID";        value = "$($gee.private_key_id)" }
    $envVars += @{ name = "GEE_CLIENT_ID";             value = "$($gee.client_id)" }
    $envVars += @{ name = "GEE_CLIENT_CERT_URL";       value = "$($gee.client_x509_cert_url)" }
    # Code expects literal \n in the env var; convert real newlines to \n.
    $envVars += @{ name = "GEE_PRIVATE_KEY";           value = ($gee.private_key -replace "`r?`n", "\n") }
} else {
    Write-Host "  WARNING: Backend/earth-engine-service-account.json not found - GEE disabled." -ForegroundColor Yellow
}
$envVars += @{ name = "PYTHONUNBUFFERED"; value = "1" }

$taskDef = Get-Content ./ecs/croplab-backend.task.json -Raw | ConvertFrom-Json
$taskDef.containerDefinitions[0].environment = $envVars
[System.IO.File]::WriteAllText(
    (Join-Path $PSScriptRoot "ecs\croplab-backend.task.generated.json"),
    ($taskDef | ConvertTo-Json -Depth 12))
Write-Host "  wrote ecs/croplab-backend.task.generated.json ($($envVars.Count) env vars injected)"

Invoke-Step "Register backend task definition" {
    aws --endpoint-url=$endpoint ecs register-task-definition `
        --cli-input-json file://ecs/croplab-backend.task.generated.json
}

Invoke-Step "Register frontend task definition" {
    aws --endpoint-url=$endpoint ecs register-task-definition `
        --cli-input-json file://ecs/croplab-frontend.task.json
}

Invoke-Step "Stop existing tasks (clean redeploy)" {
    $existing = aws --endpoint-url=$endpoint ecs list-tasks --cluster croplab --output json | ConvertFrom-Json
    foreach ($arn in $existing.taskArns) {
        Write-Host "  stopping $arn"
        aws --endpoint-url=$endpoint ecs stop-task --cluster croplab --task $arn | Out-Null
    }
    if (-not $existing.taskArns) { Write-Host "  none running" }
}

Invoke-Step "Run backend task" {
    aws --endpoint-url=$endpoint ecs run-task `
        --cluster croplab --task-definition croplab-backend
}

Invoke-Step "Run frontend task" {
    aws --endpoint-url=$endpoint ecs run-task `
        --cluster croplab --task-definition croplab-frontend
}

Invoke-Step "List running tasks" {
    aws --endpoint-url=$endpoint ecs list-tasks --cluster croplab
}

Write-Host "`nDone." -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:5173"
Write-Host "  Backend  -> http://localhost:8000/docs"
