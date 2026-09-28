# siamavocat.fr — refonte du site de Maître Essra Siam

Site statique (HTML, CSS, un peu de JavaScript, sans dépendance ni étape de build) pour le cabinet de Maître Essra Siam, avocate au Barreau de Paris.

## Pages

| Fichier | Contenu |
| --- | --- |
| `index.html` | Accueil : présentation, méthode, domaines, citation de Victor Hugo, portrait, galerie, bloc en arabe, prise de rendez-vous |
| `cabinet.html` | Le texte « À propos » complet, citation de Camus, Sénat et valeurs, parcours |
| `domaines.html` | Une section détaillée par domaine (pénal, étrangers, travail, famille) et les activités hors contentieux |
| `mentions-legales.html` | Mentions obligatoires et données personnelles (champs à compléter surlignés) |

## Prise de rendez-vous

Aucun serveur n'est nécessaire. Le module de l'accueil (`#rendez-vous`) compose un message à partir du motif, du nom, des disponibilités et de la langue choisie, puis l'ouvre :

- dans **WhatsApp** (`wa.me/33743627900`), ou
- dans la **messagerie** de l'internaute (`mailto:contact@siamavocat.fr`, objet pré-rempli).

Chaque domaine renvoie vers `index.html?motif=<clé>#rendez-vous`, ce qui pré-sélectionne le motif (clés : `penal`, `etrangers`, `travail`, `famille`, `oratoire`, `communication`, `discriminations`, `autre`). Sur mobile, une barre fixe propose Appeler / WhatsApp / E-mail.

Le numéro et l'adresse e-mail se changent en tête de `assets/js/main.js` et dans les liens `tel:` / `mailto:` des pages.

## Trois langues : français, anglais, arabe

Le sélecteur **FR · EN · عربي**, toujours visible en haut de page, traduit l'intégralité du site sans recharger la page. Le choix est mémorisé dans le navigateur, et un lien peut forcer une langue : `index.html?lang=ar`, `cabinet.html?lang=en`.

- Le français reste la langue source : c'est le texte des fichiers HTML.
- Les traductions sont dans `assets/js/i18n.js`, une clé par élément marqué `data-i18n` (contenu) ou `data-i18n-attr` (attributs : `alt`, `placeholder`, `aria-label`…). Une clé absente retombe sur le français.
- En arabe, la page passe en lecture de droite à gauche (`dir="rtl"`), avec les polices Amiri et IBM Plex Sans Arabic.
- Les messages WhatsApp et e-mail sont rédigés dans la langue du site, et la langue du rendez-vous est pré-sélectionnée en conséquence.
- La citation de Camus reste en français dans toutes les versions (œuvre encore protégée). Celle de Victor Hugo est traduite.

Pour modifier un texte : changer le français dans le HTML **et** les deux traductions dans `i18n.js`, sous la même clé. Les traductions arabes méritent une relecture par Maître Siam.

## Avant la mise en ligne sur siamavocat.fr

1. **Indexation** : supprimer la balise `<meta name="robots" content="noindex, nofollow">` des 4 pages et remplacer `robots.txt` par :
   ```
   User-agent: *
   Allow: /
   ```
2. **Image de partage** : remplacer `https://lgrconseil.github.io/siamavocat/` par `https://www.siamavocat.fr/` dans les balises `og:image`.
3. **Adresse** : les mentions légales reprennent l'adresse professionnelle inscrite au Barreau (11 B avenue Victor Hugo), le reste du site celle de la carte de visite (20 rue de Longchamp). Harmoniser si besoin.
4. **Polices** : pour une conformité RGPD stricte, héberger les polices (Cinzel, Cormorant Garamond, Jost, Amiri, IBM Plex Sans Arabic) dans `assets/fonts/` plutôt que via Google Fonts.
5. **WhatsApp** : vérifier que le 07 43 62 79 00 est bien associé à un compte WhatsApp (idéalement WhatsApp Business, avec un message d'absence).

## Hébergement IONOS

Le site est entièrement statique : il suffit de déposer le contenu du dossier (sans `.git`) à la racine de l'espace web IONOS, par SFTP ou via le gestionnaire de fichiers, puis de rattacher le domaine `siamavocat.fr` à cet espace et d'activer le certificat SSL dans l'espace client IONOS.

## Aperçu local

```bash
python3 -m http.server 8765
```

puis ouvrir http://localhost:8765.
