# Copiez ce fichier vers yamadori-sync.config.ps1 et adaptez les chemins.

# Dossier contenant pocketbase.exe et pb_data/
$PocketBaseDir = 'C:\Yamadori'

# Port local PocketBase
$PocketBasePort = 8090

# Exposer via Tailscale Serve (HTTPS sur le tailnet)
$TailscaleServe = $true

# Délai max d'attente au démarrage (secondes)
$HealthTimeoutSec = 30
