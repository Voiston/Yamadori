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
