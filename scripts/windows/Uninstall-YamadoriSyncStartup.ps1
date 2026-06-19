# Supprime la tache planifiee de demarrage auto.
# Usage : .\Uninstall-YamadoriSyncStartup.ps1

$TaskName = 'YamadoriSyncServer'
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Tache $TaskName supprimee (si elle existait)"
