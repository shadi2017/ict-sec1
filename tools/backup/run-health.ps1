# Backup health check (Windows Task Scheduler: task "ICT-Backup-Health").
# Verifies that the latest encrypted backup is recent and can actually be decrypted.
# Sends a Telegram alert if something is wrong.
$ErrorActionPreference = 'Stop'

$root    = 'E:\simulation\ict-sec1'
$checker = Join-Path $root 'tools\backup\health.mjs'
$logDir  = Join-Path $root '.data\backups'
$log     = Join-Path $logDir 'health.log'
$node    = 'C:\Program Files\nodejs\node.exe'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $log -Value "[$stamp] --- check ---" -Encoding UTF8

Push-Location $root
try {
    $output = & $node $checker 2>&1
    $code = $LASTEXITCODE
    foreach ($line in $output) { Add-Content -Path $log -Value $line -Encoding UTF8 }
} catch {
    $code = 1
    Add-Content -Path $log -Value ("ERROR: " + $_.Exception.Message) -Encoding UTF8
} finally {
    Pop-Location
}

Add-Content -Path $log -Value "[$stamp] --- exit=$code ---" -Encoding UTF8

try {
    if ((Get-Item $log).Length -gt 2MB) {
        Move-Item -Path $log -Destination ($log + '.old') -Force
    }
} catch { }

exit $code
