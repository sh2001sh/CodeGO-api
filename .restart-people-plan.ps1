$ErrorActionPreference = 'Stop'

function Stop-PortProcess {
  param([int]$Port)

  $listen = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($null -eq $listen) {
    return
  }

  $proc = Get-Process -Id $listen.OwningProcess -ErrorAction SilentlyContinue
  if ($null -ne $proc) {
    Stop-Process -Id $proc.Id -Force
    Start-Sleep -Milliseconds 800
  }
}

Stop-PortProcess -Port 3000
Stop-PortProcess -Port 3001

$backendOut = 'E:\sh\Coding\cpa_bussiness\new-api\.backend-live.out.log'
$backendErr = 'E:\sh\Coding\cpa_bussiness\new-api\.backend-live.err.log'
$frontendOut = 'E:\sh\Coding\cpa_bussiness\new-api\.frontend-live.out.log'
$frontendErr = 'E:\sh\Coding\cpa_bussiness\new-api\.frontend-live.err.log'

$backend = Start-Process `
  -FilePath 'go' `
  -ArgumentList 'run', 'main.go' `
  -WorkingDirectory 'E:\sh\Coding\cpa_bussiness\new-api' `
  -RedirectStandardOutput $backendOut `
  -RedirectStandardError $backendErr `
  -WindowStyle Hidden `
  -PassThru

$frontend = Start-Process `
  -FilePath 'npm.cmd' `
  -ArgumentList 'run', 'dev', '--', '--port', '3001' `
  -WorkingDirectory 'E:\sh\Coding\cpa_bussiness\new-api\web\default' `
  -RedirectStandardOutput $frontendOut `
  -RedirectStandardError $frontendErr `
  -WindowStyle Hidden `
  -PassThru

$deadline = (Get-Date).AddSeconds(40)
do {
  $backendReady = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  $frontendReady = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
  if ($backendReady -and $frontendReady) {
    break
  }
  Start-Sleep -Seconds 1
} while ((Get-Date) -lt $deadline)

[PSCustomObject]@{
  backendPid = $backend.Id
  frontendPid = $frontend.Id
  backendReady = [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
  frontendReady = [bool](Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue)
} | ConvertTo-Json -Compress
