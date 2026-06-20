# Synchronisation Yamadori — setup David (phase 1)

Guide pour tester la sync sur **ton PC** avant de déployer chez ton papa.

## 1. Tailscale

1. Crée un compte sur [tailscale.com](https://tailscale.com)
2. Installe Tailscale sur ton PC Windows et ton téléphone
3. Renomme ton PC en `david-pc` (Tailscale → Machines)

## 2. PocketBase

1. Télécharge [PocketBase](https://pocketbase.io/docs/) pour Windows
2. Extrais dans `C:\Yamadori\` (ou un dossier de ton choix)
3. Lance une première fois pour créer l'admin :

```powershell
cd C:\Yamadori
.\pocketbase.exe serve --http=127.0.0.1:8090
```

4. Ouvre `http://127.0.0.1:8090/_/` et crée ton compte admin

## 3. Collection `trees`

Dans l'admin PocketBase → Collections → Import collections → choisis `pocketbase/pb_collections.json` du repo.

Ou crée manuellement :

| Champ | Type | Options |
|---|---|---|
| `clientId` | Text | Required, Unique |
| `payload` | JSON | Required, **Max size = 0** (illimité — important pour les photos base64) |
| `deleted` | Bool | Default: false |

> **Important** : si Max size du champ `payload` est trop petit (défaut), l'envoi des fiches échoue avec « Something went wrong while processing your request ». Mettez **0** pour illimité.

Ou importez [`pocketbase/pb_collections.json`](../pocketbase/pb_collections.json) (format PocketBase 0.23+).

Règles API (Settings → API Rules) pour la collection `trees` :

```
List/View/Create/Update/Delete : @request.auth.id != ""
```

## 4. Compte utilisateur app

Dans PocketBase admin → Collections → `users` → New record :

- Email : ton email (ex. `david@example.com`)
- Password : un mot de passe que tu utiliseras dans l'app

### Durée du token (éviter « Session expirée »)

Dans PocketBase admin → Collections → **users** → engrenage (Settings) :

- **Token duration** : `31536000` (365 jours) ou `15552000` (180 jours)

Cela prolonge la validité du JWT entre deux rafraîchissements.

## 5. Tailscale Serve (HTTPS)

Dans un terminal (PocketBase doit tourner) :

```powershell
tailscale serve --bg http://127.0.0.1:8090
```

Note l'URL affichée, par ex. `https://david-pc.tail12345.ts.net`

## 6. Configurer l'app

### Sur le téléphone (terrain)

1. Ouvre l'app Yamadori (PWA ou navigateur)
2. **Réglages** → URL : `https://artamiel.tail12345.ts.net` (Tailscale)
3. Email + mot de passe → **Tester la connexion**
4. Cochez **Se souvenir du mot de passe sur cet appareil** (stockage chiffré local) pour reconnexion automatique
5. **Envoyer toutes les fiches locales** (première fois)

### Sur le PC (consultation)

1. Lance l'app : `npm run dev` → `http://localhost:5173`
2. **Réglages** → URL : `http://127.0.0.1:8090` (recommandé en local, plus fiable que Tailscale)
3. Même email + mot de passe → **Tester la connexion** (+ **Se souvenir** si usage perso)
4. **Récupérer depuis le serveur** pour importer les fiches du portable

### Session et reconnexion

| Symptôme | Cause probable | Action |
|---|---|---|
| **Hors-ligne** | PC éteint ou pas de réseau | Normal — sync reprend quand le serveur revient |
| **Session expirée** | JWT expiré, mot de passe non mémorisé | Retaper le mot de passe dans Réglages |
| Token effacé après coupure réseau | Ancien bug corrigé | Mettre à jour l'app ; activer **Se souvenir** |

L'app ne supprime plus le token quand PocketBase est temporairement injoignable. Avec **Se souvenir**, la reconnexion est automatique après expiration du JWT.

> Chaque appareil a sa propre base locale (IndexedDB). PocketBase sur le PC est le point de rencontre : le portable envoie, le PC récupère.

## 8. Sync multi-appareils (quotidien)

| Appareil | Rôle | Action manuelle |
|---|---|---|
| Téléphone | Capture en forêt | Rien — sync auto toutes les ~30 s |
| PC | Archive + consultation | **Récupérer depuis le serveur** si besoin immédiat |

Flux automatique :

1. Tu captures sur le portable → données locales + file d'attente
2. Réseau + PC allumé → envoi vers PocketBase
3. Sur le PC, l'app récupère les nouvelles fiches au prochain cycle de sync (ou via **Récupérer depuis le serveur**)

Les fiches visibles dans l'admin PocketBase (`/_/` → trees) sont sur le serveur. Si elles n'apparaissent pas dans l'app PC, clique **Récupérer depuis le serveur** dans Réglages.

### Dépannage IndexedDB

Si vous voyez `Failed to execute 'put' on 'IDBObjectStore': could not be cloned` après une mise à jour de l'app :

1. Rechargez la page (Ctrl+Shift+R)
2. Si l'erreur persiste : DevTools → **Application** → **IndexedDB** → supprimez les clés `yamadori-*` pour ce site
3. Reconfigurez **Réglages** (URL, email, mot de passe)

### Dépannage sync PocketBase

Si **Envoyer toutes les fiches locales** affiche `Something went wrong while processing your request` :

1. Vérifiez le champ **payload** → **Max size = 0** (voir section 3)
2. Vérifiez que la collection `trees` a bien les 3 champs et les API Rules
3. Testez avec une fiche **sans photo** — si ça passe, c'est un problème de taille
4. L'app affiche désormais un message détaillé (ex. champ `payload` rejeté, fiche trop volumineuse)

## 7. Tester le flux offline

### Après chaque déploiement (important)

Chaque mise à jour sur GitHub Pages change les fichiers JS de l'app. **Ouvrez l'app une fois en ligne** après un déploiement et acceptez la mise à jour si un bandeau apparaît. Sinon le cache PWA peut être incomplet et l'app restera blanche hors-ligne.

1. Ouvrez l'app en ligne → visitez Liste, Capture et Réglages (préchauffe le cache)
2. Si bandeau « Mise à jour disponible » → cliquez **Mettre à jour**
3. Rechargez une fois la page

### Test terrain

1. Sync activée, capturez un arbre (ou modifiez une fiche)
2. Coupez le réseau (mode avion)
3. **Fermez complètement** l'app PWA, rouvrez-la → la liste doit s'afficher (pas d'écran blanc)
4. Ajoutez un arbre → il apparaît en liste + badge « X en attente »
5. Réactivez le réseau → sync auto sous ~30 s

### Si l'app ne charge pas hors-ligne

1. Reconnectez-vous en ligne et acceptez la mise à jour PWA
2. Visitez les pages principales (Liste, Capture, Réglages) puis réessayez
3. Si bandeau « Données locales illisibles » → voir **Dépannage IndexedDB** ci-dessus

## Démarrage automatique (Windows)

Scripts dans [`scripts/windows/`](../scripts/windows/) :

### 1. Configuration (une fois)

```powershell
cd E:\Yamadori\scripts\windows
copy yamadori-sync.config.example.ps1 yamadori-sync.config.ps1
notepad yamadori-sync.config.ps1
```

Verifiez `$PocketBaseDir` (ex. `C:\Yamadori` si `pocketbase.exe` est la).

### 2. Test manuel

```powershell
.\Start-YamadoriSync.ps1
```

Demarre PocketBase (en arriere-plan) + `tailscale serve --bg`. Logs : `C:\Yamadori\logs\yamadori-sync.log`

### 3. Demarrage auto a chaque login

```powershell
.\Install-YamadoriSyncStartup.ps1
```

Cree une tache planifiee **YamadoriSyncServer** (invisible au demarrage).

Desinstaller : `.\Uninstall-YamadoriSyncStartup.ps1`

### 4. Arreter PocketBase

```powershell
.\Stop-YamadoriSync.ps1
```

---

Ancienne methode (raccourci Démarrage) — toujours valable :

```
C:\Yamadori\pocketbase.exe serve --http=127.0.0.1:8090
tailscale serve --bg http://127.0.0.1:8090
```

## Prochaine étape : chez ton papa

Même procédure avec `papa-pc` sur son ordinateur. Son téléphone pointe vers `https://papa-pc....ts.net`.
