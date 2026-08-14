$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
. (Join-Path $PSScriptRoot 'resolve-java-home.ps1')

Set-Location $repoRoot
npx cap run android @args
