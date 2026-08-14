# Build APK Android (Yamadori)

Yamadori est une application SvelteKit empaquetée en APK via [Capacitor](https://capacitorjs.com/).

## Prérequis

- Node.js 20+
- [Android Studio](https://developer.android.com/studio) Otter 2025.2.1+ (SDK + platform-tools)
- Variable d'environnement `ANDROID_HOME` ou `ANDROID_SDK_ROOT` configurée

## Versions Gradle (Capacitor 8)

Ce projet est aligné sur la stack officielle Capacitor 8 :

| Composant | Version |
|-----------|---------|
| Android Gradle Plugin | **8.13.0** |
| Gradle wrapper | **8.14.3** |

**Ne pas utiliser l'AGP Upgrade Assistant au-delà de 8.13.0** tant que Capacitor ne supporte pas officiellement AGP 9. Une montée vers AGP 9.x réintroduit des warnings de dépréciation et peut casser des plugins communautaires.

## Build local

```bash
# Build web + sync Capacitor
npm run build:android

# Ouvrir le projet dans Android Studio
npm run cap:open
```

Utilisez toujours `npm run build:android` avant `cap sync` ou un build Gradle — ne lancez pas `cap sync` seul sans avoir reconstruit le bundle web.

### Mise à jour sur téléphone

1. Dans Android Studio : **Run** (ou réinstallez l'APK debug).
2. Ne lancez pas seulement « Build APK » sans avoir exécuté `npm run build:android` au préalable.

Dans Android Studio : **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

L'APK debug se trouve dans :

`android/app/build/outputs/apk/debug/app-debug.apk`

## Installation sideload

1. Transférez l'APK sur le téléphone (USB, cloud, etc.).
2. Autorisez l'installation depuis des sources inconnues pour votre gestionnaire de fichiers.
3. Installez l'APK.
4. À la première ouverture, accordez la localisation lorsque l'application est au premier plan.

## Signature release (distribution)

Pour un APK signé (hors debug) :

```bash
keytool -genkey -v -keystore yamadori-release.keystore -alias yamadori -keyalg RSA -keysize 2048 -validity 10000
```

Configurez la signature dans `android/app/build.gradle` (bloc `signingConfigs`) ou via Android Studio **Build → Generate Signed Bundle / APK**.

**Ne commitez jamais** le keystore ni son mot de passe. Stockez-les dans un gestionnaire de secrets.

### Signature locale (Play)

L’AAB / APK release se construit en local (`npm run release:play-internal`), pas via GitHub Actions. Ne commitez jamais le keystore. Variables d’environnement : `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

## Dépannage Gradle

### `cordova.variables.gradle` introuvable

```
Could not read script '.../android/capacitor-cordova-android-plugins/cordova.variables.gradle' as it does not exist.
```

Le dossier `android/capacitor-cordova-android-plugins/` est **généré** par Capacitor et listé dans `.gitignore`. Il n'est pas versionné dans Git.

**Correction :** exécutez un sync avant d'ouvrir ou de builder dans Android Studio :

```bash
npm run build:android
# ou, si le bundle web est déjà à jour :
npm run cap:sync
```

Puis relancez le build Gradle / Android Studio.

## Scripts utiles

| Script | Description |
|--------|-------------|
| `npm run build` | Build web statique (`build/`) |
| `npm run build:android` | Build + `cap sync android` |
| `npm run cap:sync` | Synchronise `build/` vers `android/` |
| `npm run cap:open` | Ouvre Android Studio |

## Sauvegarde (export / import)

Dans **Réglages → Sauvegarde** :

- **Exporter (partager)** : ouvre la feuille de partage Android (Drive, messagerie, etc.).
- **Enregistrer dans Téléchargements** : écrit le fichier `.yamadori.zip` dans le dossier public Téléchargements (visible dans l'app Fichiers).

### Ouvrir une sauvegarde avec Yamadori

1. Dans l'app **Fichiers**, appuyez longuement sur un fichier `*.yamadori.zip`.
2. Choisissez **Ouvrir avec** → **Yamadori**.
3. L'app ouvre **Réglages** avec une bannière : fusionnez ou remplacez les données locales.

Vous pouvez aussi **partager** un ZIP vers Yamadori depuis une autre application.

### Checklist de test manuel

- [ ] Export partager → feuille de partage s'affiche
- [ ] Export Téléchargements → fichier visible dans Fichiers → Téléchargements
- [ ] Ouvrir avec depuis le gestionnaire de fichiers → bannière d'import dans Réglages
- [ ] Partager un ZIP vers Yamadori → même bannière d'import
- [ ] Import fusionner / remplacer fonctionne comme l'import manuel

## Test interne Play vs APK debug

L'APK **debug** (`fr.yamadori.scouting.debug`) et la release **Play** (`fr.yamadori.scouting`) sont deux applications distinctes : IndexedDB, Secure Storage et préférences ne sont **pas partagés**. Recréez des données de test après installation depuis le Play Store.

### Comparer debug et release localement

```bash
npm run build:android
cd android
./gradlew.bat assembleDebug assembleRelease
```

Installez les deux APK sur le même appareil et comparez export, mot de passe backup et repérage.

### Isoler un problème ProGuard/R8

Si la release échoue mais pas le debug, désactivez temporairement la minification dans `android/app/build.gradle` (`minifyEnabled false`), rebuild `assembleRelease`, puis retestez. Consultez logcat (`Capacitor`, `YamadoriBackup`, `SecureStorage`) et la console WebView (`chrome://inspect`).

### Checklist test interne (release Play)

- [ ] Repérage 10 min en mouvement GPS instable — pas de gel, sauvegarde OK
- [ ] Export backup 5+ arbres avec photos — partage **et** Téléchargements
- [ ] Configurer / changer / supprimer mot de passe backup
- [ ] Activer chiffrement local → exporter → désactiver
- [ ] Logcat : aucune rejection plugin non surfacée
- [ ] **Pro / facturation** : les deux produits in-app non consommables **Actifs** sur la même piste (`yamadori_pro` à 29 €, `yamadori_pro_promo` à 19 € — IDs exacts dans [`src/lib/constants/pro.ts`](../src/lib/constants/pro.ts))
- [ ] 4e arbre → paywall promo : prix Play affiché avant achat ; achat -34 % OK
- [ ] Après remboursement test Google : attendre la propagation (quelques heures) avant de retester le SKU promo

## GPS natif

- **Premier plan** : `@capacitor/geolocation`
- Le suivi s'arrête lorsque l'app passe en arrière-plan ou que l'écran s'éteint

La précision en forêt dense reste limitée par le signal satellite.
