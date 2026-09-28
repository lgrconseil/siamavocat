# siamavocat.fr — site de Maître Essra Siam

Site statique (HTML, CSS, JavaScript, sans framework) du cabinet de Maître Essra Siam, avocate au Barreau de Paris, 20 rue de Longchamp, 75116 Paris.

## Pages

| Page | Contenu |
| --- | --- |
| `index.html` | Accueil : portes d'entrée (première visite), citations, visite du cabinet au fil du défilement, méthode, domaines, Carnets, espace Art oratoire, plan d'accès interactif, prise de rendez-vous |
| `cabinet.html` | Le texte « À propos » complet, le cabinet, le parcours |
| `domaines.html` | Pénal, étrangers et asile, travail, famille, avec des boutons de contact propres à chaque domaine |
| `carnets.html` et `carnets/*.html` | Le blog : récits anonymisés et encadrés juridiques |
| `parole.html` | L'espace Art oratoire et communication, distinct de l'activité d'avocate (univers bleu nuit) |
| `mentions-legales.html` | Mentions légales complètes |

Le site existe en **français, anglais et arabe** : le sélecteur FR · EN · عربي, en haut de chaque page, traduit tout le site. En arabe, la lecture se fait de droite à gauche.

## Modifier le site

Les pages sont **générées** : on ne modifie pas directement les fichiers `.html` à la racine.

```
_src/partials/   en-tête, pied de page, portes, fiche de contact… (communs à toutes les pages)
_src/pages/      le contenu de chaque page
_src/templates/  le gabarit d'un article des Carnets
_src/carnets/    les articles (un fichier .md par article)
assets/          styles, scripts, images, vidéo, fiche contact (.vcf)
tools/build.py   assemble le tout
```

Après une modification :

```bash
python3 tools/build.py
```

**Textes et traductions.** Le français se trouve dans `_src/`. L'anglais et l'arabe sont dans `assets/js/i18n.js`, sous la même clé (attribut `data-i18n`). Si l'on modifie un texte français, il faut mettre à jour ses deux traductions.

**Adresse, téléphone, e-mail.** Ils figurent dans `_src/partials/`, en tête de `assets/js/main.js` (constantes `PHONE`, `EMAIL`, `CABINET`) et dans `assets/essra-siam.vcf`.

## Carnets : publier par e-mail

### Pour Maître Siam

Écrivez à l'adresse des Carnets (par exemple `carnets@siamavocat.fr`) **depuis votre adresse habituelle** :

- **Objet** : le titre de l'article.
- **Corps** : le texte. Une ligne vide sépare deux paragraphes.
- **Photo** (facultatif) : la première image jointe devient la couverture.

Quelques repères de mise en forme, tous facultatifs :

| Pour obtenir… | Écrire… |
| --- | --- |
| Une catégorie | `Catégorie : Droit d'asile` en toute première ligne, puis une ligne vide |
| Un article en arabe | il est reconnu automatiquement (ou `Langue : arabe` en première ligne) |
| Une grande citation | une phrase seule entre guillemets : `« Le silence n'est pas un aveu. »` |
| Un intertitre | `## Ce qu'il faut retenir` |
| Du gras | `**un mois**` |
| Un encadré « Le point de droit » | une ligne `::: droit`, les points (un par ligne, commençant par `- `), puis une ligne `:::` |

Commandes dans l'objet :

- `[Brouillon] Mon titre` : l'article est enregistré sans apparaître dans la liste. Il reste lisible par son lien, pour relecture.
- Renvoyer un message **avec exactement le même titre** remplace l'article.
- `[Supprimer] Mon titre` : retire l'article.

L'article est en ligne une vingtaine de minutes plus tard. Si l'accusé de réception est activé, un e-mail de confirmation indique son adresse.

La signature et l'historique de réponse sont retirés automatiquement. Comme pour tout le site, les récits doivent rester anonymisés (noms, lieux, dates, circonstances).

### Mise en place (une seule fois)

1. **Boîte e-mail.** Chez IONOS, créer la boîte `carnets@siamavocat.fr`.
2. **Secrets GitHub.** Dans le dépôt : *Settings → Secrets and variables → Actions*.

   | Secret | Valeur |
   | --- | --- |
   | `CARNETS_IMAP_HOST` | `imap.ionos.fr` |
   | `CARNETS_IMAP_USER` | `carnets@siamavocat.fr` |
   | `CARNETS_IMAP_PASSWORD` | mot de passe de la boîte |
   | `CARNETS_ALLOWED` | adresse(s) de Maître Siam autorisée(s) à publier, séparées par des virgules |
   | `CARNETS_CODE` | *facultatif* : un mot secret, à ajouter dans l'objet pour renforcer la sécurité |
   | `CARNETS_SMTP_HOST`, `CARNETS_SMTP_USER`, `CARNETS_SMTP_PASSWORD` | *facultatif* : `smtp.ionos.fr` et les identifiants de la boîte, pour l'accusé de réception |

   Une fois le site en ligne, ajouter la *variable* `CARNETS_SITE_URL` = `https://www.siamavocat.fr/`.
3. **Mise en route.** La tâche `.github/workflows/carnets.yml` relève la boîte toutes les 20 minutes, publie, reconstruit le site et le redéploie. On peut aussi la lancer à la main depuis l'onglet *Actions*.

Seuls les messages venant d'une adresse autorisée, et non signalés comme usurpés par le serveur de réception, sont publiés. GitHub suspend les tâches planifiées d'un dépôt resté sans activité pendant 60 jours : un simple commit, ou une relance depuis *Actions*, les réactive.

Test en local, sans boîte e-mail :

```bash
CARNETS_ALLOWED=moi@exemple.fr python3 tools/mail2blog.py --eml message.eml && python3 tools/build.py
```

## Hébergement IONOS et nom de domaine

Le site est statique. Il suffit de déposer le contenu du dossier à la racine de l'espace web IONOS, sans `.git`, `.github`, `_src` ni `tools`. On passe par SFTP ou par le gestionnaire de fichiers, puis on active le certificat SSL.

Pour que les articles envoyés par e-mail arrivent aussi chez IONOS, ajouter les secrets `IONOS_SFTP_HOST`, `IONOS_SFTP_USER` et `IONOS_SFTP_PASSWORD`, et au besoin la variable `IONOS_SFTP_DIR`. La tâche des Carnets pousse alors le site par SFTP après chaque publication.

## Avant la mise en ligne sur siamavocat.fr

1. **Indexation.** Supprimer la balise `<meta name="robots" content="noindex, nofollow">` de `_src/partials/head.html`, puis remplacer `robots.txt` par `User-agent: *` / `Allow: /`.
2. **Image de partage.** Remplacer `https://lgrconseil.github.io/siamavocat/` par `https://www.siamavocat.fr/` dans `tools/build.py` (variable `ogimage`).
3. **Carnets d'exemple.** Les trois articles marqués `exemple: oui` sont des textes de démonstration : à remplacer par de vrais récits, ou à valider puis retirer la ligne `exemple: oui`.
4. **Polices.** Pour une conformité RGPD stricte, héberger les polices dans `assets/fonts/` plutôt que via Google Fonts.
5. **WhatsApp.** Vérifier que le 07 43 62 79 00 est bien associé à un compte WhatsApp, idéalement WhatsApp Business.

## Aperçu local

```bash
python3 tools/build.py && python3 -m http.server 8765
```

puis ouvrir http://localhost:8765. Ajouter `?nodoors` à l'adresse pour passer l'animation des portes, et `?lang=en` ou `?lang=ar` pour forcer une langue.
