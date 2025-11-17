#!/bin/bash
# Script de build Windows pour POSPlus
# À exécuter sur Windows (WSL) ou sur une machine avec accès direct à GitHub

set -e

echo "=== POSPlus Windows Build Script ==="

# Vérifier si node est installé
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js n'est pas installé"
    exit 1
fi

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Nettoyer les anciens builds
echo "Nettoyage des anciens builds..."
rm -rf dist release node_modules/.cache

# Installer les dépendances
echo "Installation des dépendances..."
npm install

# Rebuild des modules natifs
echo "Rebuild des modules natifs..."
npm rebuild better-sqlite3

# Build de l'application
echo "Build de l'application..."
npm run build

# Package Windows
echo "Création du package Windows..."
npm run package:win

echo "=== Build terminé ==="
echo "Le package Windows se trouve dans: ./release/"
ls -la ./release/*.exe 2>/dev/null || ls -la ./release/ | grep -E '\.(exe|portable)' || echo "Package créé dans ./release/"
