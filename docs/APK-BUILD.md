# Build APK Android (Yamadori)

Yamadori est une application SvelteKit empaquetée en APK via [Capacitor](https://capacitorjs.com/). La variante Android ajoute le suivi GPS en arrière-plan (optionnel, dans Réglages).

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
4. À la première ouverture, accordez la localisation. Pour le suivi en arrière-plan, activez **Suivi GPS en arrière-plan** dans Réglages puis choisissez **Autoriser tout le temps** dans les réglages Android.

## Signature release (distribution)

Pour un APK signé (hors debug) :

```bash
keytool -genkey -v -keystore yamadori-release.keystore -alias yamadori -keyalg RSA -keysize 2048 -validity 10000
```

Configurez la signature dans `android/app/build.gradle` (bloc `signingConfigs`) ou via Android Studio **Build → Generate Signed Bundle / APK**.

**Ne commitez jamais** le keystore ni son mot de passe. Stockez-les dans un gestionnaire de secrets.

### Variables CI (GitHub Actions)

Pour les releases signées via GitHub Actions, définissez ces secrets :

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Keystore encodé en base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | Alias de la clé (ex. `yamadori`) |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la clé |

Sans ces secrets, le workflow CI produit un APK **debug** utilisable pour les tests.

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

## GPS natif

- **Premier plan** : `@capacitor/geolocation`
- **Arrière-plan** (opt-in) : `@capacitor-community/background-geolocation` avec notification persistante

La précision en forêt dense reste limitée par le signal satellite ; l'APK évite surtout la coupure du suivi quand l'écran s'éteint.
