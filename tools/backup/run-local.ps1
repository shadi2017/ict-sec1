# Daily local backup runner (used by Windows Task Scheduler: task "ICT-Daily-Backup").
# Saves an encrypted copy of the Supabase database into .data\backups\, then uploads
# the same encrypted file to Telegram and Google Drive (rclone), and writes a log.
$ErrorActionPreference = 'Stop'

$root   = 'E:\simulation\ict-sec1'
$backup = Join-Path $root 'tools\backup\backup.mjs'
$logDir = Join-Path $root '.data\backups'
$log    = Join-Path $logDir 'backup.log'
$node   = 'C:\Program Files\nodejs\node.exe'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $log -Value "[$stamp] --- start ---" -Encoding UTF8

Push-Location $root
try {
    $output = & $node $backup --force 2>&1
    $code = $LASTEXITCODE
    foreach ($line in $output) { Add-Content -Path $log -Value $line -Encoding UTF8 }
} catch {
    $code = 1
    Add-Content -Path $log -Value ("ERROR: " + $_.Exception.Message) -Encoding UTF8
} finally {
    Pop-Location
}

Add-Content -Path $log -Value "[$stamp] --- exit=$code ---" -Encoding UTF8

# Keep the log small (rotate at 5 MB).
try {
    if ((Get-Item $log).Length -gt 5MB) {
        Move-Item -Path $log -Destination ($log + '.old') -Force
    }
} catch { }

exit $code
