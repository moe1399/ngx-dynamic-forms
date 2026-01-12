#!/bin/bash
set -e

# Publish script for all packages
# Usage: ./scripts/publish.sh [patch|minor|major] [--dry-run] [--npm-only]

VERSION_TYPE="${1:-patch}"
DRY_RUN=""
NPM_ONLY=""

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN="--dry-run"
      ;;
    --npm-only)
      NPM_ONLY="true"
      ;;
  esac
done

echo "========================================"
echo "Publishing all packages"
echo "Version bump: $VERSION_TYPE"
echo "Dry run: ${DRY_RUN:-no}"
echo "NPM only: ${NPM_ONLY:-no}"
echo "========================================"

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Calculate new version first (without modifying files yet)
echo ""
echo ">>> Calculating new version..."
cd "$ROOT_DIR/projects/ngx-dynamic-forms"
CURRENT_VERSION=$(node -p "require('./package.json').version")
IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$CURRENT_VERSION"
case $VERSION_TYPE in
  major)
    V_MAJOR=$((V_MAJOR + 1))
    V_MINOR=0
    V_PATCH=0
    ;;
  minor)
    V_MINOR=$((V_MINOR + 1))
    V_PATCH=0
    ;;
  patch)
    V_PATCH=$((V_PATCH + 1))
    ;;
esac
NEW_VERSION="$V_MAJOR.$V_MINOR.$V_PATCH"
echo "New version will be: $NEW_VERSION"

# 2. Update peer dependency in Angular library BEFORE version bumps
echo ""
echo ">>> Updating peer dependency version..."
cd "$ROOT_DIR/projects/ngx-dynamic-forms"
# Update the peer dependency to use the new major.minor range
NEW_PEER_RANGE="^$V_MAJOR.$V_MINOR.0"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.peerDependencies['@moe1399/ngx-dynamic-forms-validation'] = '$NEW_PEER_RANGE';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Updated peer dependency to: $NEW_PEER_RANGE"

# 3. Bump version in TypeScript validation package first
echo ""
echo ">>> Bumping TypeScript validation package version..."
cd "$ROOT_DIR/packages/ngx-dynamic-forms-validation"
npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version

# 4. Reinstall to update lockfile with new versions
echo ""
echo ">>> Updating npm lockfile..."
cd "$ROOT_DIR"
npm install

# 5. Bump version in Angular library
echo ""
echo ">>> Bumping Angular library version..."
cd "$ROOT_DIR/projects/ngx-dynamic-forms"
npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version

# 6. Bump version in .NET validation package
if [ -z "$NPM_ONLY" ]; then
  echo ""
  echo ">>> Bumping .NET validation package version..."
  cd "$ROOT_DIR/packages/form-validation-dotnet"
  # Use the same version as the npm packages
  CURRENT_DOTNET_VERSION=$(grep -oP '(?<=<Version>)[^<]+' DynamicForms.FormValidation.csproj || echo "0.0.0")
  sed -i '' "s|<Version>$CURRENT_DOTNET_VERSION</Version>|<Version>$NEW_VERSION</Version>|" DynamicForms.FormValidation.csproj
  echo "New .NET version: $NEW_VERSION"
fi

# 7. Update changelog
echo ""
echo ">>> Updating changelog..."
cd "$ROOT_DIR"
npm run changelog

# 8. Build all packages
echo ""
echo ">>> Building all packages..."
cd "$ROOT_DIR"
npm run build:lib
npm run build:validation
if [ -z "$NPM_ONLY" ]; then
  npm run build:validation-dotnet
fi

# 9. Publish Angular library
echo ""
echo ">>> Publishing Angular library..."
cd "$ROOT_DIR/dist/ngx-dynamic-forms"
if [ -n "$DRY_RUN" ]; then
  npm publish --access public --dry-run
else
  npm publish --access public
fi

# 10. Publish TypeScript validation package
echo ""
echo ">>> Publishing TypeScript validation package..."
cd "$ROOT_DIR/packages/ngx-dynamic-forms-validation"
if [ -n "$DRY_RUN" ]; then
  npm publish --access public --dry-run
else
  npm publish --access public
fi

# 11. Publish .NET validation package
if [ -z "$NPM_ONLY" ] && [ -z "$DRY_RUN" ]; then
  echo ""
  echo ">>> Publishing .NET validation package..."
  cd "$ROOT_DIR/packages/form-validation-dotnet"
  dotnet pack -c Release
  if [ -n "$NUGET_API_KEY" ]; then
    dotnet nuget push bin/Release/DynamicForms.FormValidation.*.nupkg \
      --api-key "$NUGET_API_KEY" \
      --source https://api.nuget.org/v3/index.json \
      --skip-duplicate
  else
    echo "Warning: NUGET_API_KEY not set, skipping NuGet publish"
  fi
fi

# 12. Commit and push changes
if [ -z "$DRY_RUN" ]; then
  echo ""
  echo ">>> Committing version changes..."
  cd "$ROOT_DIR"
  git add -A
  git commit -m "chore: release v$NEW_VERSION"

  echo ""
  echo ">>> Pushing to remote..."
  git push

  echo ""
  echo ">>> Creating git tag..."
  git tag "v$NEW_VERSION"
  git push --tags
fi

echo ""
echo "========================================"
echo "Publishing complete!"
echo "New version: $NEW_VERSION"
echo "========================================"
