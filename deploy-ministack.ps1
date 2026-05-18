# Deploys CropLab to MiniStack as ECS tasks (backend + frontend).
# Prereqs:
#   - AWS CLI installed and configured (any fake creds; region us-east-1)
#   - MiniStack running:  docker-compose --profile ecs up -d ministack
# Run from the project root:  ./deploy-ministack.ps1

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

Invoke-Step "Register backend task definition" {
    aws --endpoint-url=$endpoint ecs register-task-definition `
        --cli-input-json file://ecs/croplab-backend.task.json
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
