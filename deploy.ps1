# PRISM Campaigns — Deploy from GitHub Actions artifact
# Usage: .\deploy.ps1 -ArtifactZip "path\to\prism-app-images.zip"
# Or:    .\deploy.ps1  (will prompt for path)

param(
    [string]$ArtifactZip = ""
)

$SERVER      = "172.25.47.101"
$SERVER_USER = "root"
$SERVER_PASS = "qwerty"
$HOST_KEY    = "ssh-ed25519 255 SHA256:0FdTECCMiIQqdVAn7tqYow8zn0qsJ0AayRx4c2DZQRI"
$PLINK       = "C:\Program Files\PuTTY\plink.exe"
$PSCP        = "C:\Program Files\PuTTY\pscp.exe"

if (-not $ArtifactZip) {
    $ArtifactZip = Read-Host "Path to prism-app-images.zip (downloaded from GitHub Actions)"
}

if (-not (Test-Path $ArtifactZip)) {
    Write-Error "File not found: $ArtifactZip"
    exit 1
}

$TempDir = Join-Path $env:TEMP "prism-deploy-$(Get-Random)"
New-Item -ItemType Directory -Force $TempDir | Out-Null

Write-Host "`n[1/4] Extracting artifact..." -ForegroundColor Cyan
Expand-Archive -Path $ArtifactZip -DestinationPath $TempDir -Force

$backendTar  = Join-Path $TempDir "prism-backend.tar.gz"
$frontendTar = Join-Path $TempDir "prism-frontend.tar.gz"

if (-not (Test-Path $frontendTar)) {
    Write-Error "prism-frontend.tar.gz not found in artifact ZIP"
    exit 1
}

Write-Host "[2/4] Copying images to server..." -ForegroundColor Cyan
& $PSCP -pw $SERVER_PASS -hostkey $HOST_KEY $frontendTar "${SERVER_USER}@${SERVER}:/root/prism-frontend.tar.gz"
if (Test-Path $backendTar) {
    & $PSCP -pw $SERVER_PASS -hostkey $HOST_KEY $backendTar "${SERVER_USER}@${SERVER}:/root/prism-backend.tar.gz"
}

Write-Host "[3/4] Loading images on server..." -ForegroundColor Cyan
$loadCmd = @"
set -e
echo "Loading frontend image..."
docker load < /root/prism-frontend.tar.gz
"@

if (Test-Path $backendTar) {
    $loadCmd += @"

echo "Loading backend image..."
docker load < /root/prism-backend.tar.gz
"@
}

& $PLINK -ssh "${SERVER_USER}@${SERVER}" -pw $SERVER_PASS -hostkey $HOST_KEY $loadCmd

Write-Host "[4/4] Restarting containers..." -ForegroundColor Cyan
$restartCmd = @"
echo "Restarting frontend..."
docker stop prism_frontend && docker rm prism_frontend
docker compose -f /var/lib/docker/volumes/portainer_data/_data/compose/23/docker-compose.yml up -d frontend
echo "Done!"
docker ps --filter name=prism --format 'table {{.Names}}\t{{.Status}}'
"@

& $PLINK -ssh "${SERVER_USER}@${SERVER}" -pw $SERVER_PASS -hostkey $HOST_KEY $restartCmd

Remove-Item -Recurse -Force $TempDir
Write-Host "`nDeployment complete! App running at http://${SERVER}:9440" -ForegroundColor Green
