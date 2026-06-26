# PRISM Campaigns - offline VM deployment
#
# Builds the app images on this machine, copies them to the offline Docker VM,
# loads them there, and redeploys the stack with Docker Compose.
#
# Example:
#   .\deploy-offline.ps1
#
# If you want to redeploy an existing Portainer stack compose file instead of
# /root/prism/docker-compose.yml, pass its path:
#   .\deploy-offline.ps1 -RemoteComposeFile "/var/lib/docker/volumes/portainer_data/_data/compose/23/docker-compose.yml"

param(
    [string]$Server = "172.27.45.101",
    [string]$User = "root",
    [string]$Password = "",
    [string]$ApiUrl = "http://172.27.45.101:9440",
    [string]$Tag = "latest",
    [string]$RemoteDir = "/root/prism",
    [string]$RemoteComposeFile = "/root/prism/docker-compose.yml",
    [string]$Plink = "C:\Program Files\PuTTY\plink.exe",
    [string]$Pscp = "C:\Program Files\PuTTY\pscp.exe",
    [string]$HostKey = "",
    [switch]$IncludeInfraImages,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Invoke-Checked {
    param(
        [string]$Label,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host ">>> $Label" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

function New-PuttyArgs {
    $args = @("-pw", $Password)
    if ($HostKey) {
        $args += @("-hostkey", $HostKey)
    }
    return $args
}

function Read-PlainTextPassword {
    $secure = Read-Host "VM password" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BundleDir = Join-Path $Root ".deploy"
$BackendImage = "prism-backend:$Tag"
$FrontendImage = "prism-frontend:$Tag"
$Images = @(
    @{ Name = $BackendImage;  File = "prism-backend.tar" },
    @{ Name = $FrontendImage; File = "prism-frontend.tar" }
)

if ($IncludeInfraImages) {
    $Images += @(
        @{ Name = "postgres:16-alpine"; File = "postgres-16-alpine.tar" },
        @{ Name = "redis:7-alpine"; File = "redis-7-alpine.tar" },
        @{ Name = "minio/minio:latest"; File = "minio-latest.tar" },
        @{ Name = "nginx:alpine"; File = "nginx-alpine.tar" }
    )
}

Assert-Command "docker"
if (-not (Test-Path $Plink)) { throw "plink.exe not found at $Plink" }
if (-not (Test-Path $Pscp)) { throw "pscp.exe not found at $Pscp" }
if (-not $Password) { $Password = Read-PlainTextPassword }

New-Item -ItemType Directory -Force $BundleDir | Out-Null

Write-Host ""
Write-Host "PRISM offline deployment" -ForegroundColor Green
Write-Host "Server       : $Server"
Write-Host "Remote dir   : $RemoteDir"
Write-Host "Compose file : $RemoteComposeFile"
Write-Host "Backend      : $BackendImage"
Write-Host "Frontend     : $FrontendImage"
Write-Host "API URL      : $ApiUrl"

if (-not $SkipBuild) {
    Invoke-Checked "Build backend image" {
        docker build -t $BackendImage (Join-Path $Root "backend")
    }

    Invoke-Checked "Build frontend image" {
        docker build --build-arg NEXT_PUBLIC_API_URL=$ApiUrl -t $FrontendImage (Join-Path $Root "frontend")
    }
}

if ($IncludeInfraImages) {
    foreach ($image in $Images | Select-Object -Skip 2) {
        Invoke-Checked "Pull $($image.Name)" {
            docker pull $image.Name
        }
    }
}

foreach ($image in $Images) {
    $path = Join-Path $BundleDir $image.File
    if (Test-Path $path) {
        Remove-Item -Force $path
    }

    Invoke-Checked "Save $($image.Name)" {
        docker save -o $path $image.Name
    }
}

$puttyArgs = New-PuttyArgs
$remote = "${User}@${Server}"

Invoke-Checked "Prepare remote directories" {
    & $Plink -ssh $remote @puttyArgs "mkdir -p $RemoteDir/nginx $RemoteDir/docker/postgres $RemoteDir/images"
}

Invoke-Checked "Copy compose and config files" {
    & $Pscp @puttyArgs `
        (Join-Path $Root "docker-compose.yml") `
        "${remote}:$RemoteDir/docker-compose.yml"
}

Invoke-Checked "Copy nginx config" {
    & $Pscp @puttyArgs `
        (Join-Path $Root "nginx\nginx.conf") `
        "${remote}:$RemoteDir/nginx/nginx.conf"
}

Invoke-Checked "Copy postgres init script" {
    & $Pscp @puttyArgs `
        (Join-Path $Root "docker\postgres\init.sql") `
        "${remote}:$RemoteDir/docker/postgres/init.sql"
}

foreach ($image in $Images) {
    $path = Join-Path $BundleDir $image.File
    Invoke-Checked "Copy $($image.File)" {
        & $Pscp @puttyArgs $path "${remote}:$RemoteDir/images/$($image.File)"
    }
}

$remoteImageFiles = ($Images | ForEach-Object { "$RemoteDir/images/$($_.File)" }) -join " "
$deployCmd = @"
set -e
for image in $remoteImageFiles; do
  echo "Loading `$image"
  docker load -i "`$image"
done

export BACKEND_IMAGE="$BackendImage"
export FRONTEND_IMAGE="$FrontendImage"
export NEXT_PUBLIC_API_URL="$ApiUrl"
export ALLOWED_ORIGINS="$ApiUrl"

if docker compose version >/dev/null 2>&1; then
  docker compose -f "$RemoteComposeFile" up -d
else
  docker-compose -f "$RemoteComposeFile" up -d
fi

docker ps --filter name=prism --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
"@

Invoke-Checked "Load images and redeploy stack" {
    & $Plink -ssh $remote @puttyArgs $deployCmd
}

Write-Host ""
Write-Host "Deployment complete: $ApiUrl" -ForegroundColor Green
