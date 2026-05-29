## Tri Gmail par expéditeur (Google Apps Script)

Pour les boîtes **Gmail / Google Workspace** (pas de sous-adressage `+`, IMAP par
mot de passe souvent désactivé). Le script libellise chaque mail de la boîte de
réception selon l'expéditeur, puis l'archive — l'équivalent Gmail d'un rangement
en dossier. Il tourne **nativement dans Google** : aucun IMAP, aucun serveur,
aucun mot de passe d'application, aucun OAuth.

`n.dupont@domain.tld` → libellé **`domain.tld/n.dupont`** (ou `domain.tld` seul, au choix).

### Installation

1. Va sur [script.google.com](https://script.google.com) → **Nouveau projet**.
2. Colle le contenu de `Code.gs`.
3. (Optionnel) règle la configuration en haut du fichier (voir le tableau).
4. Sélectionne la fonction **`installTrigger`** → **Exécuter**.
5. **Autorise** les accès Gmail (écran de consentement ; pour ton propre script,
   *Avancé → Accéder à …* si Google affiche « app non vérifiée »).

C'est tout. `installTrigger` pose un déclencheur horaire **et** lance un premier
passage. Le tri tourne ensuite automatiquement : **set & forget**.

> Pas besoin de « Déployer » : cette commande sert aux apps web / modules
> complémentaires, pas à un script déclenché par minuterie.

### Configuration

| Option | Rôle | Défaut |
|--------|------|--------|
| `PREFIX` | Parent commun des libellés (ex. `Expediteurs` → `Expediteurs/domain.tld`) | `''` |
| `SUBLABEL_BY_SENDER` | `true` : `domain.tld/n.dupont` ; `false` : `domain.tld` seul | `true` |
| `ARCHIVE_AFTER` | `true` : sort de la boîte de réception (rangé) ; `false` : reste mais libellé | `true` |
| `ARCHIVE_ONLY_IF_READ` | `true` : n'archive que les mails **lus** (les non-lus restent visibles) | `true` |
| `BATCH` | Nombre de fils traités par exécution (limite ~6 min/exécution) | `100` |
| `EVERY_MINUTES` | Fréquence du déclencheur (1, 5, 10, 15 ou 30) | `10` |
| `EXCLUDE_DOMAINS` | Domaines à ne pas classer (ex. `['mondomaine.com']`) | `[]` |

### Utilisation au quotidien

- **Automatique** : rien à faire, le déclencheur classe en continu.
- **Manuel / rattrapage du backlog** : sélectionne `classifyInbox` → **Exécuter**.
  Chaque run traite `BATCH` fils ; relance plusieurs fois pour vider une grosse
  boîte (idempotent, sans doublons de libellés).
- **Suivi** : panneau de gauche → **Exécutions** (durée, logs, erreurs).
- **Arrêter** : exécute `removeTriggers` (les libellés déjà posés restent).

### Bon à savoir

- **Libellés imbriqués** : Gmail utilise `/` pour la hiérarchie, donc `PREFIX` et
  `SUBLABEL_BY_SENDER` créent bien `Expediteurs/domain.tld/n.dupont`.
- **Casse** : les libellés Gmail sont insensibles à la casse ; le script réutilise
  un libellé existant au lieu d'en créer un doublon.
- **`+tag` expéditeur** retiré : `n.dupont+promo@domain.tld` est groupé sous `n.dupont`.
- **Quotas** : pour une boîte à débit normal, tu ne les atteins pas. Le seul moment
  chargé est le rattrapage initial — laisse le déclencheur tourner quelques cycles.
