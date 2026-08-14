# Yamadori Scouting

Application Android de repérage d'arbres en forêt, construite avec SvelteKit et empaquetée via [Capacitor](https://capacitorjs.com/).

Le code source est visible. Tous droits réservés — ce n’est pas une licence d’utilisation, de modification ou de redistribution.

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

## Couverture geo (honnête, souvent partielle)

Yamadori route cadastre, zones protégées, packs légaux et cartes selon le pays GPS ([`src/lib/geo/countries.ts`](src/lib/geo/countries.ts) — 20 pays). Seule la France a un pack **full** (cadastre parcellaire + ZNIEFF + espèces). Ailleurs l’app affiche une bannière : les données sont **indicatives**, pas un permis de prélèvement.

| Pays | Cadastre / tenure | Zones protégées | Notes |
|------|-------------------|-----------------|-------|
| FR | IGN / Apicarto (full) | ZNIEFF1 | Pack de référence |
| ES, IT, BE, NL, NO | Registre parcellaire (full) | EEA Natura 2000 / CDDA | Municipalité et espèces en partial |
| DE, GB, CH, AT, SE, PT | Partial (souvent commune / OSM) | EEA ou inventaire national | — |
| US, CA, NZ | Tenure publique, pas le parcellaire privé | PADUS / CPCAD / DOC | — |
| AU | CAPAD (tenure publique, pas le cadastre privé) | CAPAD | — |
| IE, DK, FI | Nominatim (localité seulement) — Tailte / Matriklen / MML derrière une clé | EEA | Pas de numéro de parcelle |
| JP | Nominatim (pas de 地番) | Polygones parcs nationaux MOE (build `npm run build:jp-ksj`) | Pack légal national **en attente de relecture humaine** ; parcs préfectoraux / 国有林 incomplets. Pas de locale UI japonaise (l’UI tombe sur l’anglais). |

Le gzip KSJ / MOE (`static/jp-ksj-a10/natural-parks.geojson.gz`) est **généré au build**, pas versionné. Voir [`static/jp-ksj-a10/README.md`](static/jp-ksj-a10/README.md).

## Tests

```sh
npm run check
npm run test
npm run links:check   # URLs permit / légales (404/410)

# Avant une release / un APK
npm run release:check
```

Voir [docs/PERMIT-LINKS.md](docs/PERMIT-LINKS.md) pour le tuto anti-liens morts et le workflow CI hebdo.

## Traductions (i18n)

Les fichiers [`messages/*.json`](messages/fr.json) sont la source de vérité pour Paraglide. Pour ajouter ou modifier une traduction :

```sh
# 1. Éditer messages/fr.json (+ en, de, it, es, nl, sv, nb, pt, da, fi)
npm run i18n:compile   # régénère src/lib/paraglide/
npm run i18n:check     # vérifie la parité des clés entre les 11 locales
```

Le script [`scripts/build-i18n-messages.mjs`](scripts/build-i18n-messages.mjs) est un outil de sync partiel : il propage les clés définies dans son catalogue vers les JSON en mode fusion (sans supprimer les clés existantes). Workflow normal : éditer les JSON directement.

## Politique de confidentialité (Play Store)

Page publique hébergée via GitHub Pages (dossier [`docs/`](docs/)) :

| Langue | URL |
|--------|-----|
| Français | https://voiston.github.io/Yamadori/privacy.html |
| Anglais | https://voiston.github.io/Yamadori/privacy-en.html |
| Deutsch | https://voiston.github.io/Yamadori/privacy-de.html |
| Español | https://voiston.github.io/Yamadori/privacy-es.html |
| Italiano | https://voiston.github.io/Yamadori/privacy-it.html |
| Nederlands | https://voiston.github.io/Yamadori/privacy-nl.html |
| Svenska | https://voiston.github.io/Yamadori/privacy-sv.html |
| Norsk | https://voiston.github.io/Yamadori/privacy-nb.html |
| Português | https://voiston.github.io/Yamadori/privacy-pt.html |
| Dansk | https://voiston.github.io/Yamadori/privacy-da.html |
| Suomi | https://voiston.github.io/Yamadori/privacy-fi.html |

Régénérer après modification des clés `privacy_*` dans `messages/fr.json` ou `messages/en.json` :

```sh
npm run privacy:docs
```

**Activation GitHub Pages** (une fois) : Settings → Pages → Deploy from branch → `main` → `/docs`.

URL à renseigner dans la Play Console : `https://voiston.github.io/Yamadori/privacy.html`
