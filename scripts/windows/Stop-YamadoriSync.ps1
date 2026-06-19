# Arrete PocketBase (Tailscale Serve reste actif jusqu'au prochain reboot).
# Usage : .\Stop-YamadoriSync.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDir 'yamadori-sync.config.ps1'

if (Test-Path $ConfigPath) {
	. $ConfigPath
} else {
	$PocketBasePort = 8090
}

$connections = Get-NetTCPConnection -LocalPort $PocketBasePort -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
	Write-Host "Aucun processus n'ecoute sur le port $PocketBasePort"
	exit 0
}

foreach ($conn in $connections) {
	$proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
	if ($proc -and $proc.ProcessName -match 'pocketbase') {
		Write-Host "Arret de $($proc.ProcessName) (PID $($proc.Id))"
		Stop-Process -Id $proc.Id -Force
	}
}

Write-Host 'Pour desactiver Tailscale Serve : tailscale serve reset'
