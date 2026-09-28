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

## Avant la mise en ligne sur siamavocat.fr

1. **Indexation** : supprimer la balise `<meta name="robots" content="noindex, nofollow">` des 4 pages et remplacer `robots.txt` par :
   ```
   User-agent: *
   Allow: /
   ```
2. **Image de partage** : remplacer `https://lgrconseil.github.io/siamavocat/` par `https://www.siamavocat.fr/` dans les balises `og:image`.
3. **Mentions légales** : compléter toque, SIRET, TVA, assurance RCP, médiateur et hébergeur.
4. **Polices** : pour une conformité RGPD stricte, héberger les polices (Cinzel, Cormorant Garamond, Jost, Amiri) dans `assets/fonts/` plutôt que via Google Fonts.
5. **WhatsApp** : vérifier que le 07 43 62 79 00 est bien associé à un compte WhatsApp (idéalement WhatsApp Business, avec un message d'absence).

## Nom de domaine

Le site peut être servi par n'importe quel hébergement statique (OVH, Netlify, Vercel, GitHub Pages…). Avec GitHub Pages :

1. Ajouter un fichier `CNAME` contenant `www.siamavocat.fr`.
2. Chez le registrar : un enregistrement `CNAME` `www` → `lgrconseil.github.io`, et pour le domaine nu des enregistrements `A` vers `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
3. Dans les réglages Pages du dépôt, activer « Enforce HTTPS ».

## Aperçu local

```bash
python3 -m http.server 8765
```

puis ouvrir http://localhost:8765.
