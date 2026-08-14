# Resolves JAVA_HOME on Windows for Android/Gradle builds (JDK 21+ required for Capacitor 8).
# Usage: . .\scripts\windows\resolve-java-home.ps1

$script:RequiredJavaMajor = 21

function Get-JavaMajorVersion {
	param([string]$JavaHome)

	$releaseFile = Join-Path $JavaHome 'release'
	if (Test-Path $releaseFile) {
		$content = Get-Content $releaseFile -Raw -ErrorAction SilentlyContinue
		if ($content -match 'JAVA_VERSION="(\d+)') {
			return [int]$Matches[1]
		}
		if ($content -match 'JAVA_VERSION="1\.(\d+)') {
			return [int]$Matches[1]
		}
	}

	$javaExe = Join-Path $JavaHome 'bin\java.exe'
	if (-not (Test-Path $javaExe)) {
		return $null
	}

	# java -version writes to stderr; avoid NativeCommandError under $ErrorActionPreference = 'Stop'.
	$versionOutput = cmd /c "`"$javaExe`" -version 2>&1"
	if ($versionOutput -match 'version "(\d+)') {
		return [int]$Matches[1]
	}
	if ($versionOutput -match 'version "1\.(\d+)') {
		return [int]$Matches[1]
	}
	return $null
}

function Find-JavaHome {
	$candidates = New-Object System.Collections.Generic.List[object]

	if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
		$candidates.Add($env:JAVA_HOME)
	}

	$searchPatterns = @(
		'C:\Program Files\Java\jdk*',
		'C:\Program Files\Eclipse Adoptium\jdk-*',
		'C:\Program Files\Microsoft\jdk-*',
		'C:\Program Files\Amazon Corretto\jdk*'
	)

	foreach ($pattern in $searchPatterns) {
		Get-ChildItem -Path $pattern -Directory -ErrorAction SilentlyContinue |
			Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') } |
			ForEach-Object { $candidates.Add($_.FullName) }
	}

	$studioJbrPaths = @(
		"$env:LOCALAPPDATA\Programs\Android Studio\jbr",
		'C:\Program Files\Android\Android Studio\jbr'
	)
	foreach ($path in $studioJbrPaths) {
		if (Test-Path (Join-Path $path 'bin\java.exe')) {
			$candidates.Add($path)
		}
	}

	$ranked = $candidates |
		Select-Object -Unique |
		ForEach-Object {
			$major = Get-JavaMajorVersion $_
			if ($null -ne $major) {
				[PSCustomObject]@{ Path = $_; Major = $major }
			}
		} |
		Sort-Object Major -Descending

	if ($ranked.Count -eq 0) {
		return $null
	}

	$preferred = $ranked | Where-Object { $_.Major -ge $script:RequiredJavaMajor } | Select-Object -First 1
	if ($preferred) {
		return $preferred.Path
	}

	return $ranked[0].Path
}

$resolved = Find-JavaHome
if (-not $resolved) {
	Write-Error @"
JAVA_HOME is not set and no JDK was found.
Install JDK 21+ (e.g. https://adoptium.net/temurin/releases/?version=21) or Android Studio, then retry.
"@
	exit 1
}

$major = Get-JavaMajorVersion $resolved
if ($null -eq $major) {
	Write-Error "Could not detect Java version for: $resolved"
	exit 1
}

if ($major -lt $script:RequiredJavaMajor) {
	Write-Host "JAVA_HOME=$resolved (Java $major, Capacitor 8 requires Java 21+)" -ForegroundColor DarkYellow
	Write-Host 'Gradle will auto-download JDK 21 via the toolchain resolver for compilation.' -ForegroundColor DarkYellow
} else {
	Write-Host "JAVA_HOME=$resolved (Java $major)"
}

$env:JAVA_HOME = $resolved
if ($env:PATH -notlike "*$resolved\bin*") {
	$env:PATH = "$resolved\bin;$env:PATH"
}
