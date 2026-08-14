# Liens permit / légaux / species-search — check anti-404

Les URLs hardcodées sous `src/lib/geo/` (portails mairie, ONF, Carabinieri, cantons CH, hubs species-search, etc.) peuvent mourir sans préavis. Ce check détecte les **404 / 410** avant qu’ils n’arrivent en prod.

**Périmètre scanné :**
- [`src/lib/geo/legal/`](../src/lib/geo/legal/) — permits + articles / gazettes
- [`src/lib/geo/speciesSearchUrls.ts`](../src/lib/geo/speciesSearchUrls.ts) — bases de recherche espèces
- [`src/lib/geo/providers/species-protection/`](../src/lib/geo/providers/species-protection/) — packs protection

Script : [`scripts/check-permit-links.mjs`](../scripts/check-permit-links.mjs)

Préférer des **hubs stables** (annuaire, page d’accueil, URL de recherche) plutôt que des fiches profondes (`F34574`, chemins régionaux longs).

## Commandes utiles

```sh
# Smoke-check toutes les URLs https hardcodées (legal + species-search + packs)
npm run links:check

# Avant une release / un APK (tests + types/i18n + encoding + liens)
npm run release:check
```

## Lire le résultat

| Ligne | Signification | Action |
|-------|---------------|--------|
| `OK` | Page joignable (2xx / redirect) | Rien |
| `WARN` | 403, 5xx, timeout, erreur réseau | Souvent anti-bot (ex. NatureScot) — vérifier à la main si doute |
| `FAIL` | **404** ou **410** | Lien mort → corriger |

Exit code `1` dès qu’il y a au moins un `FAIL`.

Exemple de FAIL :

```text
FAIL 404 https://exemple.gouv.fr/ancienne-page ← src/lib/geo/legal/euPermitLinks.ts
```

## Corriger un FAIL

1. Ouvrir le fichier indiqué après `←`.
2. Remplacer l’URL par une page vivante du **même** organisme (annuaire, portail forêt / environnement).
3. Relancer `npm run links:check` jusqu’à `FAIL: 0`.
4. Si un test unitaire couvre ce lien (ex. [`euPermitLinks.test.ts`](../src/lib/utils/euPermitLinks.test.ts)), mettre à jour l’assert d’URL.

## Ajouter une nouvelle URL

Dans un fichier du périmètre ci-dessus, utiliser une **string littérale** :

```ts
url: 'https://exemple.gouv.fr/page'
```

Éviter les templates `` `https://...?${id}` `` : le checker ne les suit pas.

## CI GitHub

Workflow : [`.github/workflows/links.yml`](../.github/workflows/links.yml)

- **Automatique** : chaque lundi à 06:00 UTC
- **Manuel** : GitHub → Actions → **Permit links** → **Run workflow**

Ce job n’est **pas** dans le CI PR (`ci.yml`), pour ne pas bloquer les merges sur des 403 flaky.
