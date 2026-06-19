# Demarre PocketBase + Tailscale Serve pour la sync Yamadori.
# Usage : .\Start-YamadoriSync.ps1

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDir 'yamadori-sync.config.ps1'

if (Test-Path $ConfigPath) {
	. $ConfigPath
} else {
	$PocketBaseDir = 'C:\Yamadori'
	$PocketBasePort = 8090
	$TailscaleServe = $true
	$HealthTimeoutSec = 30
}

$PocketBaseExe = Join-Path $PocketBaseDir 'pocketbase.exe'
$LogDir = Join-Path $PocketBaseDir 'logs'
$LogFile = Join-Path $LogDir 'yamadori-sync.log'
$HealthUrl = "http://127.0.0.1:$PocketBasePort/api/health"
$LocalUrl = "http://127.0.0.1:$PocketBasePort"

function Write-Log {
	param([string]$Message)
	$line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
	if (-not (Test-Path $LogDir)) {
		New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
	}
	Add-Content -Path $LogFile -Value $line
}

function Test-PortListening {
	param([int]$Port)
	return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-ForHealth {
	param([string]$Url, [int]$TimeoutSec)
	$deadline = (Get-Date).AddSeconds($TimeoutSec)
	while ((Get-Date) -lt $deadline) {
		try {
			Invoke-RestMethod -Uri $Url -TimeoutSec 3 | Out-Null
			return $true
		} catch {
			Start-Sleep -Seconds 1
		}
	}
	return $false
}

try {
	Write-Log 'Demarrage Yamadori sync...'

	if (-not (Test-Path $PocketBaseExe)) {
		throw "pocketbase.exe introuvable : $PocketBaseExe"
	}

	if (Test-PortListening -Port $PocketBasePort) {
		Write-Log "PocketBase deja actif sur le port $PocketBasePort"
	} else {
		Write-Log "Lancement PocketBase sur $LocalUrl"
		Start-Process `
			-FilePath $PocketBaseExe `
			-ArgumentList @('serve', "--http=127.0.0.1:$PocketBasePort") `
			-WorkingDirectory $PocketBaseDir `
			-WindowStyle Hidden

		if (-not (Wait-ForHealth -Url $HealthUrl -TimeoutSec $HealthTimeoutSec)) {
			throw "PocketBase ne repond pas sur $HealthUrl"
		}
		Write-Log 'PocketBase pret'
	}

	if ($TailscaleServe) {
		$tailscale = Get-Command tailscale -ErrorAction SilentlyContinue
		if (-not $tailscale) {
			throw 'tailscale introuvable dans le PATH'
		}

		Write-Log "Configuration Tailscale Serve -> $LocalUrl"
		& tailscale serve --bg $LocalUrl 2>&1 | ForEach-Object { Write-Log $_ }
		& tailscale serve status 2>&1 | ForEach-Object { Write-Log $_ }
		Write-Log 'Tailscale Serve configure'
	}

	Write-Log 'Yamadori sync OK'
	exit 0
} catch {
	Write-Log "ERREUR : $($_.Exception.Message)"
	exit 1
}
