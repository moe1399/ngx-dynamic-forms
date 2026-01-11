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

# 1. Bump version in Angular library
echo ""
echo ">>> Bumping Angular library version..."
cd "$ROOT_DIR/projects/ngx-dynamic-forms"
npm version "$VERSION_TYPE" --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"

# 2. Bump version in TypeScript validation package
echo ""
echo ">>> Bumping TypeScript validation package version..."
cd "$ROOT_DIR/packages/ngx-dynamic-forms-validation"
npm version "$VERSION_TYPE" --no-git-tag-version

# 3. Bump version in .NET validation package
if [ -z "$NPM_ONLY" ]; then
  echo ""
  echo ">>> Bumping .NET validation package version..."
  cd "$ROOT_DIR/packages/ngx-dynamic-forms-validation-dotnet"
  # Extract current version and bump it
  CURRENT_DOTNET_VERSION=$(grep -oP '(?<=<Version>)[^<]+' DynamicForms.FormValidation.csproj)
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_DOTNET_VERSION"
  case $VERSION_TYPE in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
  esac
  NEW_DOTNET_VERSION="$MAJOR.$MINOR.$PATCH"
  sed -i '' "s|<Version>$CURRENT_DOTNET_VERSION</Version>|<Version>$NEW_DOTNET_VERSION</Version>|" DynamicForms.FormValidation.csproj
  echo "New .NET version: $NEW_DOTNET_VERSION"
fi

# 4. Update changelog
echo ""
echo ">>> Updating changelog..."
cd "$ROOT_DIR"
npm run changelog

# 5. Build all packages
echo ""
echo ">>> Building all packages..."
cd "$ROOT_DIR"
npm run build:lib
npm run build:validation
if [ -z "$NPM_ONLY" ]; then
  npm run build:validation-dotnet
fi

# 6. Publish Angular library
echo ""
echo ">>> Publishing Angular library..."
cd "$ROOT_DIR/dist/ngx-dynamic-forms"
if [ -n "$DRY_RUN" ]; then
  npm publish --access public --dry-run
else
  npm publish --access public
fi

# 7. Publish TypeScript validation package
echo ""
echo ">>> Publishing TypeScript validation package..."
cd "$ROOT_DIR/packages/ngx-dynamic-forms-validation"
if [ -n "$DRY_RUN" ]; then
  npm publish --access public --dry-run
else
  npm publish --access public
fi

# 8. Publish .NET validation package
if [ -z "$NPM_ONLY" ] && [ -z "$DRY_RUN" ]; then
  echo ""
  echo ">>> Publishing .NET validation package..."
  cd "$ROOT_DIR/packages/ngx-dynamic-forms-validation-dotnet"
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

# 9. Commit and push changes
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
