# Configuration GitHub du depot

Certaines options GitHub ne peuvent pas etre appliquees uniquement avec des fichiers versionnes. Les workflows, les templates de pull request, Dependabot ou CODEOWNERS peuvent vivre dans le depot. En revanche, les reglages comme la suppression automatique des branches fusionnees et la protection de branche sont des parametres du depot GitHub: ils doivent etre appliques via l'interface GitHub, l'API REST, Terraform, ou un outil comme GitHub CLI.

Ce depot fournit donc un script versionne qui applique les reglages recommandes via l'API GitHub.

## Reglages couverts

Le script `scripts/configure-github-repo.js` configure actuellement:

- suppression automatique des branches apres merge;
- activation de l'auto-merge GitHub;
- protection de la branche `master`;
- obligation de passer par une pull request;
- obligation que les checks requis soient verts avant merge;
- obligation que les checks soient a jour avec la branche cible;
- aucune approbation humaine obligatoire, pour rester compatible avec un depot solo;
- obligation de resoudre les conversations avant merge;
- interdiction des force pushes sur `master`;
- interdiction de supprimer `master`;
- application des protections aux administrateurs.

Le check requis par defaut est:

```text
Build and unit tests
```

Il correspond au nom du job dans `.github/workflows/pr-checks.yml`.

## Mode simulation

Afficher le plan sans modifier GitHub:

```bash
node scripts/configure-github-repo.js
```

## Application reelle

Creer un token GitHub avec les permissions d'administration du depot, puis lancer:

```bash
GITHUB_TOKEN=ghp_xxx node scripts/configure-github-repo.js --apply
```

Le script accepte aussi `GH_TOKEN`.

## Branche cible differente

```bash
GITHUB_TOKEN=ghp_xxx node scripts/configure-github-repo.js --apply --branch main
```

## Checks requis differents

```bash
GITHUB_TOKEN=ghp_xxx node scripts/configure-github-repo.js --apply --check "Build and unit tests" --check "CodeQL"
```

## Alternative via interface GitHub

Dans GitHub:

1. Aller dans `Settings` du depot.
2. Activer `Automatically delete head branches` dans `General`.
3. Aller dans `Settings > Branches` ou `Settings > Rules > Rulesets`.
4. Ajouter une protection pour `master`.
5. Activer `Require a pull request before merging`.
6. Activer `Require status checks to pass before merging`.
7. Selectionner le check `Build and unit tests`.
8. Activer `Require branches to be up to date before merging`.
9. Activer `Require conversation resolution before merging`.
10. Laisser le nombre d'approbations requises a `0` pour un depot solo.
11. Desactiver force pushes et suppressions.
