# QR Code Studio

QR Code Studio est une application Angular monopage qui permet de generer rapidement un code QR personnalise a partir d'une URL. L'utilisateur peut saisir une adresse web, importer une image qui sera utilisee comme logo au centre du code QR, choisir un style visuel, basculer l'interface entre le francais et l'anglais, puis telecharger le resultat en PNG.

L'application est concue comme un outil simple, moderne et autonome: aucune API externe n'est necessaire pour generer le QR code, l'image choisie reste traitee cote navigateur, et l'export PNG se fait directement depuis le canvas local.

## Fonctionnalites

- Generation instantanee d'un code QR depuis une URL `http` ou `https`.
- Validation de l'URL avec message utilisateur localise.
- Ajout d'un logo au centre du QR code via un selecteur de fichier image.
- Optimisation automatique du logo avant rendu afin d'eviter les ralentissements avec de grandes images.
- Redimensionnement du logo a une taille adaptee au QR code avant conversion en data URL.
- Rendu QR en `canvas` pour accelerer l'export PNG.
- Correction d'erreur elevee (`H`) pour mieux supporter l'incrustation du logo.
- Trois styles visuels: Encre, Menthe et Braise.
- Apercu en direct du QR code.
- Export PNG via un bouton dedie.
- Protection contre les clics multiples pendant la preparation du telechargement.
- Reinitialisation du formulaire et du style.
- Interface bilingue francais/anglais avec le francais comme langue par defaut.
- Mise en page responsive pour mobile, tablette et bureau.
- Tests unitaires Angular/Karma couvrant les principaux comportements.
- Workflow GitHub Actions pour verifier les pull requests vers `master`.
- Workflow GitHub Actions de deploiement automatique apres merge sur `master`, avec declenchement manuel possible.

## Stack technique

- Angular 20
- TypeScript strict
- SCSS
- `qr-code-styling` pour la generation et le rendu du QR code
- Jasmine et Karma pour les tests unitaires
- Chrome Headless pour l'execution CI des tests
- GitHub Actions pour l'integration continue

## Prerequis

- Node.js compatible avec Angular 20. Le projet a ete verifie avec Node `v24.8.0`; le workflow CI utilise Node `24.15.0`.
- npm compatible avec le fichier `package-lock.json`.
- Chrome ou Chromium pour executer les tests unitaires localement avec Karma.

Verifier les versions locales:

```bash
node --version
npm --version
```

## Installation

Installer les dependances:

```bash
npm install
```

Pour une installation reproductible en CI ou sur une machine propre:

```bash
npm ci
```

## Lancement en developpement

Demarrer le serveur Angular:

```bash
npm run start
```

L'application est ensuite disponible par defaut a l'adresse:

```text
http://localhost:4200/
```

`npm run start` ne se termine pas tout seul: c'est normal. Angular reste en mode watch pour reconstruire l'application a chaque modification. Pour arreter le serveur, utiliser `Ctrl+C`.

## Build de production

Generer le build de production:

```bash
npm run build
```

La sortie est generee dans:

```text
dist/qrcodegenerator
```

## Tests unitaires

Executer les tests:

```bash
npm test
```

Le script lance:

```bash
ng test --watch=false --browsers=ChromeHeadless
```

Les tests couvrent notamment:

- la langue francaise par defaut;
- le basculement vers l'anglais;
- la validation des URL;
- le rafraichissement du QR code lors du changement de style;
- l'optimisation du logo avant rendu;
- l'annulation logique d'une ancienne selection de logo si une nouvelle arrive avant la fin du traitement;
- la suppression du logo;
- la reinitialisation de l'outil;
- le telechargement PNG;
- les garde-fous qui empechent un telechargement invalide ou concurrent.

Si Karma indique qu'aucun binaire Chrome n'est disponible, installer Chrome/Chromium ou definir `CHROME_BIN`:

```bash
CHROME_BIN=/chemin/vers/chrome npm test
```

## Integration continue

Le workflow de verification des pull requests se trouve dans:

```text
.github/workflows/pr-checks.yml
```

Il se declenche sur toute pull request ciblant la branche `master`.

Etapes executees:

1. Recuperation du depot.
2. Installation de Node.js `24.15.0`.
3. Installation reproductible avec `npm ci`.
4. Execution des tests unitaires avec Chrome Headless.
5. Build de production avec `npm run build`.

## Deploiement

Le workflow de deploiement se trouve dans:

```text
.github/workflows/deploy-pages.yml
```

Il publie l'application sur GitHub Pages, un hebergement gratuit adapte a cette application Angular statique. Le deploiement se declenche automatiquement apres un merge sur `master`, car GitHub emet alors un evenement `push` sur la branche `master`. Il peut aussi etre lance manuellement depuis l'onglet "Actions" de GitHub grace a `workflow_dispatch`.

Etapes executees:

1. Recuperation du depot.
2. Installation de Node.js `24.15.0`.
3. Installation reproductible avec `npm ci`.
4. Build Angular avec un `base-href` adapte au nom du depot.
5. Configuration de GitHub Pages.
6. Upload de `dist/qrcodegenerator/browser` comme artefact Pages.
7. Deploiement sur GitHub Pages.

Lorsque le deploiement reussit, l'URL publique est affichee dans la page du workflow GitHub Actions, dans l'environnement `github-pages` et dans le resume du job de deploiement.

## Structure du projet

```text
.
├── .github/workflows/deploy-pages.yml
├── .github/workflows/pr-checks.yml
├── angular.json
├── package.json
├── package-lock.json
├── public/
├── src/
│   ├── app/
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.component.spec.ts
│   │   └── app.component.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json
```

## Fonctionnement applicatif

### Saisie de l'URL

L'utilisateur saisit une URL dans le champ principal. Seules les URL commencant par `http://` ou `https://` sont considerees valides. Si l'URL est invalide, l'interface affiche un message et bloque le telechargement.

### Generation du QR code

Le QR code est cree avec `qr-code-styling`. Le rendu utilise le mode `canvas`, ce qui evite une conversion SVG vers PNG au moment du telechargement et reduit les risques de blocage du navigateur.

### Logo central

Quand l'utilisateur choisit une image, l'application:

1. cree une URL objet locale;
2. charge l'image dans un element `Image`;
3. calcule une taille maximale de rendu;
4. dessine l'image dans un canvas temporaire;
5. extrait un PNG optimise sous forme de data URL;
6. met a jour le QR code avec cette image optimisee.

Cette approche evite d'envoyer une photo tres lourde directement au moteur de QR code.

### Changement de style

Les changements de style sont regroupes avec `requestAnimationFrame`. Si plusieurs changements arrivent tres vite, le composant evite de redessiner inutilement le QR code plusieurs fois dans la meme frame.

### Localisation

La localisation est geree par un dictionnaire TypeScript interne au composant. La langue par defaut est le francais (`fr`). L'utilisateur peut basculer vers l'anglais (`en`) avec le controle `EN / FR`.

## Scripts npm

| Script | Description |
| --- | --- |
| `npm run start` | Lance le serveur de developpement Angular. |
| `npm run build` | Genere le build de production. |
| `npm run watch` | Genere un build de developpement en mode watch. |
| `npm test` | Execute les tests unitaires en Chrome Headless. |
| `npm run ng` | Proxy vers Angular CLI. |

## Notes de performance

- Le logo est limite a une dimension maximale adaptee au QR code avant d'etre encode.
- Le QR code utilise un canvas pour accelerer l'export PNG.
- Le bouton de telechargement est desactive pendant la preparation du PNG.
- Le champ fichier est desactive pendant l'optimisation du logo.
- Les mises a jour visuelles du QR code sont planifiees par frame avec `requestAnimationFrame`.
- Le composant utilise `ChangeDetectionStrategy.OnPush` pour reduire les cycles de detection Angular inutiles.

## Accessibilite et ergonomie

- Les groupes de controles ont des labels ARIA.
- Les messages de validation sont visibles pres du champ URL.
- Les boutons exposent un etat actif clair.
- L'interface reste utilisable sur petits ecrans.
- Les actions principales sont separees: telechargement, reinitialisation, suppression du logo.

## Limites connues

- Le QR code encode uniquement des URL, pas du texte libre, des vCards ou du Wi-Fi.
- Le logo est integre au centre du QR code; un logo trop complexe peut reduire la lisibilite malgre la correction d'erreur elevee.
- Les tests Karma necessitent un navigateur Chrome ou Chromium disponible dans l'environnement local.
- L'application ne persiste pas les preferences de langue ou de style apres rechargement de la page.

## Depannage

### Angular indique que `zone.js` est requis

Le fichier `src/main.ts` importe `zone.js` avant le bootstrap Angular. Si l'erreur reapparait, verifier que `zone.js` est bien installe et que l'import est toujours present.

### Le bouton de telechargement semble bloquer

Le rendu actuel utilise `canvas` et le bouton est protege contre les clics multiples. Si le probleme survient encore, verifier la taille de l'image importee et tester sans logo pour isoler le fichier source.

### Les tests ne demarrent pas

Verifier la presence de Chrome:

```bash
which google-chrome
which chromium
```

Puis definir `CHROME_BIN` si necessaire:

```bash
CHROME_BIN=/usr/bin/google-chrome npm test
```

### Le build echoue apres mise a jour de Node

Angular impose des plages de versions Node precises. Verifier la version installee et consulter les messages de compatibilite affiches par Angular CLI.

## Contribution

Avant d'ouvrir une pull request vers `master`:

1. Installer les dependances avec `npm ci` ou `npm install`.
2. Executer `npm test`.
3. Executer `npm run build`.
4. Verifier manuellement le flux principal: URL, logo, style, langue, telechargement.

Les pull requests vers `master` sont automatiquement verifiees par GitHub Actions. Apres merge sur `master`, le workflow de deploiement publie automatiquement l'application sur GitHub Pages. Le meme deploiement peut aussi etre lance manuellement depuis GitHub Actions. Les reglages GitHub recommandes pour le depot sont documentes dans `docs/github-repository-settings.md` et peuvent etre appliques avec `scripts/configure-github-repo.js`.
