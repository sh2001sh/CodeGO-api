$ErrorActionPreference = 'Stop'

$projectRoot = "E:\sh\Coding\cpa_bussiness\new-api"
$cacheRoot = Join-Path $projectRoot ".tmp\go"
$env:GOCACHE = Join-Path $cacheRoot "build-cache"
$env:GOTMPDIR = Join-Path $cacheRoot "tmp"
$env:GOFLAGS = "-p=1"
$env:GOMAXPROCS = "2"
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:ALL_PROXY = ""
$env:GIT_HTTP_PROXY = ""
$env:GIT_HTTPS_PROXY = ""

foreach ($dir in @($env:GOCACHE, $env:GOTMPDIR)) {
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

Set-Location -LiteralPath $projectRoot
& "D:\Program Files\Go\bin\go.exe" run "main.go"
