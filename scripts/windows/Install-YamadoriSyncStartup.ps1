# Installe le demarrage auto au login Windows (Tache planifiee).
# Executer en PowerShell : .\Install-YamadoriSyncStartup.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartScript = Join-Path $ScriptDir 'Start-YamadoriSync.ps1'
$TaskName = 'YamadoriSyncServer'

if (-not (Test-Path $StartScript)) {
	throw "Script introuvable : $StartScript"
}

$ConfigExample = Join-Path $ScriptDir 'yamadori-sync.config.example.ps1'
$ConfigFile = Join-Path $ScriptDir 'yamadori-sync.config.ps1'
if (-not (Test-Path $ConfigFile)) {
	Copy-Item $ConfigExample $ConfigFile
	Write-Host "Config creee : $ConfigFile (verifiez PocketBaseDir)"
}

$action = New-ScheduledTaskAction `
	-Execute 'powershell.exe' `
	-Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
	-AllowStartIfOnBatteries `
	-DontStopIfGoingOnBatteries `
	-StartWhenAvailable `
	-ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask `
	-TaskName $TaskName `
	-Action $action `
	-Trigger $trigger `
	-Settings $settings `
	-Description 'Demarre PocketBase + Tailscale Serve pour Yamadori' `
	-Force | Out-Null

Write-Host "Tache planifiee installee : $TaskName"
Write-Host 'Test manuel : .\Start-YamadoriSync.ps1'
Write-Host 'Desinstaller : .\Uninstall-YamadoriSyncStartup.ps1'
