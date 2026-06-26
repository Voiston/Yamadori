# Prepare Yamadori for Google Play internal testing (paywall + license testers).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/windows/prepare-play-internal-test.ps1

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
. (Join-Path $PSScriptRoot 'resolve-java-home.ps1')

Set-Location $repoRoot

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$keystorePath = if ($env:ANDROID_KEYSTORE_PATH) { $env:ANDROID_KEYSTORE_PATH } else { 'android/yamadori-release.keystore' }
$hasSigning =
	$env:ANDROID_KEYSTORE_PASSWORD -and
	$env:ANDROID_KEY_ALIAS -and
	(Test-Path $keystorePath)

Write-Host ''
Write-Host '=== Yamadori — test interne Play (paywall) ===' -ForegroundColor Cyan
Write-Host "Version cible: $version (versionCode dans android/app/build.gradle)"
Write-Host ''

Write-Host '--- Play Console (manuel) ---' -ForegroundColor Yellow
Write-Host @"
1. Monétisation → Produits in-app → créer 2 produits gérés NON consommables, statut Actif:
   - yamadori_pro
   - yamadori_pro_promo
   (IDs exacts, sensibles à la casse — voir src/lib/constants/pro.ts)

2. Paramètres → Tests de licence:
   - Ajouter les Gmail testeurs (toi + testeurs)
   - Réponse: LICENSED

3. Test → Test interne:
   - Uploader Yamadori-$version.aab (voir build ci-dessous)
   - Ajouter les mêmes Gmail dans la liste testeurs
   - Partager le lien opt-in

4. Prérequis store si demandés:
   - Politique de confidentialité: https://voiston.github.io/Yamadori/privacy.html
   - Data Safety, fiche minimale

IMPORTANT: installer depuis le Play Store (pas APK debug). Même compte Google sur l'appareil
que dans Tests de licence ET testeurs internes.
"@

Write-Host '--- Build web + sync Android ---' -ForegroundColor Yellow
npm run build:android

if (-not $hasSigning) {
	Write-Host ''
	Write-Host 'Keystore release non configuré — AAB non généré.' -ForegroundColor DarkYellow
	Write-Host @"
Définir avant bundleRelease:
  ANDROID_KEYSTORE_PATH (défaut: android/yamadori-release.keystore)
  ANDROID_KEYSTORE_PASSWORD
  ANDROID_KEY_ALIAS
  ANDROID_KEY_PASSWORD (optionnel)
Puis relancer ce script ou:
  cd android; .\gradlew.bat bundleRelease
AAB attendu: android/app/build/outputs/bundle/release/Yamadori-$version.aab
"@
	exit 0
}

Write-Host ''
Write-Host '--- AAB release signé ---' -ForegroundColor Yellow
Set-Location (Join-Path $repoRoot 'android')
.\gradlew.bat bundleRelease
if ($LASTEXITCODE -ne 0) {
	Write-Error @"
bundleRelease a échoué (code $LASTEXITCODE).
Capacitor 8 requiert Java 21 pour compiler les plugins. Vérifiez:
  - JDK 21+ installé (Temurin 21 ou Android Studio récent), ou
  - accès réseau pour le téléchargement auto Gradle (foojay toolchain).
Relancez après correction: npm run release:play-internal
"@
}

$aab = Join-Path $repoRoot "android/app/build/outputs/bundle/release/Yamadori-$version.aab"
if (Test-Path $aab) {
	Write-Host "AAB prêt: $aab" -ForegroundColor Green
} else {
	$fallback = Join-Path $repoRoot 'android/app/build/outputs/bundle/release/app-release.aab'
	if (Test-Path $fallback) {
		Write-Host "AAB trouvé sous le nom par défaut: $fallback" -ForegroundColor Yellow
	} else {
		Write-Error "AAB introuvable après bundleRelease: $aab"
	}
}

Write-Host ''
Write-Host '--- QA paywall (appareil, install Play) ---' -ForegroundColor Yellow
Write-Host @"
[ ] 4e arbre → paywall
[ ] Prix Play affiché (ou avertissement produits indisponibles)
[ ] Achat test licence → Pro actif
[ ] Relance app → Pro persiste
[ ] Désinstall / réinstall → Restaurer l'achat
[ ] Fenêtre promo 24h → SKU yamadori_pro_promo
"@
