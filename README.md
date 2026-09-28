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

Écrivez **depuis contact@siamavocat.fr** à **loukigeronimo.richou+carnets@gmail.com** :

- **Objet** : le titre de l'article.
- **Corps** : le texte. Une ligne vide sépare deux paragraphes.
- **Photo** (facultatif) : la première image jointe devient la couverture.

L'article est en ligne une quinzaine de minutes plus tard.

Le même envoi fonctionne **depuis loukigeronimo.richou@gmail.com**, vers la même adresse `+carnets` : pratique pour publier un texte qu'elle a transmis autrement, ou pour un essai.

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

La signature et l'historique de réponse sont retirés automatiquement. Les récits doivent rester anonymisés (noms, lieux, dates, circonstances).

### Fonctionnement et sécurité

- La tâche `.github/workflows/carnets.yml` relève toutes les 15 minutes la boîte Gmail `loukigeronimo.richou@gmail.com`, via IMAP et un mot de passe d'application.
- Elle ne lit **que** les messages adressés à `loukigeronimo.richou+carnets@gmail.com` et envoyés par une adresse de `CARNETS_ALLOWED`. Les autres e-mails de la boîte ne sont ni lus ni modifiés.
- Un message de `contact@siamavocat.fr` n'est publié que si Gmail atteste une **signature DKIM valide de siamavocat.fr**, c'est-à-dire que le message a réellement été envoyé depuis la messagerie du cabinet. Une adresse d'expéditeur imitée ne suffit pas.
- Un message de `loukigeronimo.richou@gmail.com` n'est publié que s'il figure dans les **Messages envoyés** de cette même boîte : il en est donc réellement parti. Un e-mail extérieur qui imiterait cette adresse n'y figure pas.
- Les messages traités reçoivent le libellé Gmail « Carnets » et ne sont plus relus. Qu'ils aient déjà été lus ou archivés dans Gmail n'empêche pas leur publication, et leur état « lu / non lu » n'est pas modifié.

Secrets du dépôt (*Settings → Secrets and variables → Actions*) :

| Secret | Valeur |
| --- | --- |
| `CARNETS_IMAP_HOST` | `imap.gmail.com` |
| `CARNETS_IMAP_USER` | `loukigeronimo.richou@gmail.com` |
| `CARNETS_IMAP_PASSWORD` | mot de passe d'application Google (https://myaccount.google.com/apppasswords) |
| `CARNETS_TO` | `loukigeronimo.richou+carnets@gmail.com` |
| `CARNETS_ALLOWED` | `contact@siamavocat.fr,loukigeronimo.richou@gmail.com` (adresses séparées par des virgules) |
| `CARNETS_SMTP_HOST` | `smtp.gmail.com` : l'expéditeur reçoit un accusé de réception avec le lien de l'article |

Une fois le site en ligne, ajouter la *variable* `CARNETS_SITE_URL` = `https://www.siamavocat.fr/`. La tâche peut aussi être lancée à la main depuis l'onglet *Actions*. GitHub suspend les tâches planifiées d'un dépôt resté sans activité pendant 60 jours : une relance depuis *Actions* les réactive.

Test en local, sans boîte e-mail :

```bash
CARNETS_ALLOWED=contact@siamavocat.fr python3 tools/mail2blog.py --eml message.eml && python3 tools/build.py
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
