# build-and-push.ps1
# Run this ONCE from your Windows machine (which has internet).
# It builds both images and pushes them to Docker Hub so Portainer
# can pull them without needing internet access during deployment.
#
# Usage:
#   .\build-and-push.ps1 -Username your-dockerhub-username
#   .\build-and-push.ps1 -Username your-dockerhub-username -Tag v1.0.0

param(
    [Parameter(Mandatory=$true)]
    [string]$Username,

    [string]$Tag = "latest",

    [string]$ApiUrl = "http://localhost:9440"
)

$BackendImage  = "$Username/prism-backend:$Tag"
$FrontendImage = "$Username/prism-frontend:$Tag"

Write-Host ""
Write-Host "=== PRISM Campaigns — Build & Push ===" -ForegroundColor Cyan
Write-Host "Backend  : $BackendImage"
Write-Host "Frontend : $FrontendImage"
Write-Host "API URL  : $ApiUrl"
Write-Host ""

# ── Login ──────────────────────────────────────────────────────────────────
Write-Host ">>> Logging in to Docker Hub..." -ForegroundColor Yellow
docker login
if ($LASTEXITCODE -ne 0) { Write-Error "Docker login failed"; exit 1 }

# ── Backend ────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host ">>> Building backend image..." -ForegroundColor Yellow
docker build -t $BackendImage ./backend
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build failed"; exit 1 }

Write-Host ">>> Pushing backend image..." -ForegroundColor Yellow
docker push $BackendImage
if ($LASTEXITCODE -ne 0) { Write-Error "Backend push failed"; exit 1 }

# ── Frontend ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host ">>> Building frontend image..." -ForegroundColor Yellow
docker build `
    --build-arg NEXT_PUBLIC_API_URL=$ApiUrl `
    -t $FrontendImage `
    ./frontend
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }

Write-Host ">>> Pushing frontend image..." -ForegroundColor Yellow
docker push $FrontendImage
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend push failed"; exit 1 }

# ── Done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Set these environment variables in Portainer when deploying the stack:"
Write-Host ""
Write-Host "  BACKEND_IMAGE   = $BackendImage"  -ForegroundColor White
Write-Host "  FRONTEND_IMAGE  = $FrontendImage" -ForegroundColor White
Write-Host ""
Write-Host "Then click 'Deploy the stack' — Portainer will pull the images, no build needed."
