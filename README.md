# Yamadori Scouting

Application Android de repérage d'arbres en forêt, construite avec SvelteKit et empaquetée via [Capacitor](https://capacitorjs.com/).

## Développement

```sh
npm install
npm run dev
```

`npm run dev` lance l'app dans le navigateur pour le développement UI. Les fonctionnalités natives (GPS, caméra, etc.) ne sont disponibles que dans l'APK.

## Build Android

| Command | Description |
|---------|-------------|
| `npm run build` | Build web statique (`build/`) |
| `npm run build:android` | Build + sync Capacitor vers `android/` |
| `npm run cap:open` | Ouvre le projet dans Android Studio |

Voir [docs/APK-BUILD.md](docs/APK-BUILD.md) pour compiler et installer l'APK (sideload, signature release, CI).

```sh
npm run build:android
npm run cap:open
```

## Tests

```sh
npm run check
npm run test
```

## Traductions (i18n)

Les fichiers [`messages/*.json`](messages/fr.json) sont la source de vérité pour Paraglide. Pour ajouter ou modifier une traduction :

```sh
# 1. Éditer messages/fr.json (+ en, de, it, es)
npm run i18n:compile   # régénère src/lib/paraglide/
npm run i18n:check     # vérifie la parité des clés entre les 5 locales
```

Le script [`scripts/build-i18n-messages.mjs`](scripts/build-i18n-messages.mjs) est un outil de sync partiel : il propage les clés définies dans son catalogue vers les JSON en mode fusion (sans supprimer les clés existantes). Workflow normal : éditer les JSON directement.

## Politique de confidentialité (Play Store)

Page publique hébergée via GitHub Pages (dossier [`docs/`](docs/)) :

| Langue | URL |
|--------|-----|
| Français | https://voiston.github.io/Yamadori/privacy.html |
| Anglais | https://voiston.github.io/Yamadori/privacy-en.html |

Régénérer après modification des clés `privacy_*` dans `messages/fr.json` ou `messages/en.json` :

```sh
npm run privacy:docs
```

**Activation GitHub Pages** (une fois) : Settings → Pages → Deploy from branch → `main` → `/docs`.

URL à renseigner dans la Play Console : `https://voiston.github.io/Yamadori/privacy.html`
