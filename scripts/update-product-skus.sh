#!/bin/bash

# Script de migration des SKU utilisant sqlite3 CLI
# Usage: ./scripts/update-product-skus.sh [--dry-run] [db-path]

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
DRY_RUN=false
DB_PATH=""

for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      if [ -z "$DB_PATH" ]; then
        DB_PATH="$arg"
      fi
      shift
      ;;
  esac
done

# Fonction pour trouver la base de données
find_database() {
  local possible_paths=(
    "$HOME/Library/Application Support/posplus/posplus.db"
    "$HOME/Library/Application Support/POSPlus/posplus.db"
    "$HOME/Library/Application Support/Electron/posplus.db"
    "$HOME/AppData/Roaming/posplus/posplus.db"
    "$HOME/AppData/Roaming/POSPlus/posplus.db"
    "$HOME/.config/posplus/posplus.db"
    "$HOME/.config/POSPlus/posplus.db"
    "./posplus.db"
    "./pos.db"
  )

  echo -e "${BLUE}🔍 Recherche de la base de données...${NC}\n" >&2

  for db in "${possible_paths[@]}"; do
    if [ -f "$db" ] && [ -s "$db" ]; then
      echo -e "   ${GREEN}Trouvé: $db ($(du -h "$db" | cut -f1))${NC}" >&2
      echo "$db"
      return 0
    fi
  done

  echo -e "\n${RED}❌ Aucune base de données trouvée dans les emplacements suivants:${NC}" >&2
  for db in "${possible_paths[@]}"; do
    echo -e "   - $db" >&2
  done
  return 1
}

# Trouver la base de données
if [ -z "$DB_PATH" ]; then
  DB_PATH=$(find_database)
  if [ $? -ne 0 ]; then
    echo -e "\n${RED}Base de données introuvable. Assurez-vous que l'application a été lancée au moins une fois.${NC}"
    exit 1
  fi
elif [ ! -f "$DB_PATH" ]; then
  echo -e "${RED}❌ Fichier non trouvé: $DB_PATH${NC}"
  exit 1
fi

echo -e "\n${BLUE}📂 Base de données: $DB_PATH${NC}"

# Vérifier sqlite3
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}❌ sqlite3 n'est pas installé. Installez-le avec: brew install sqlite${NC}"
    exit 1
fi

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}🔍 Mode DRY RUN - Aucune modification ne sera effectuée${NC}\n"
else
  echo -e "${YELLOW}⚠️  Mode PRODUCTION - Les SKU vont être modifiés${NC}\n"
fi

# Compter les produits
PRODUCT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM products;")
echo -e "${BLUE}📦 $PRODUCT_COUNT produits trouvés${NC}\n"

if [ "$PRODUCT_COUNT" -eq 0 ]; then
  echo -e "${YELLOW}ℹ️  Aucun produit trouvé dans la base de données${NC}"
  exit 0
fi

# Récupérer les produits groupés par date
DATES=$(sqlite3 "$DB_PATH" "SELECT DISTINCT DATE(created_at) FROM products WHERE created_at IS NOT NULL ORDER BY created_at;")

UPDATED_COUNT=0
SKIPPED_COUNT=0

# Pour chaque date
for DATE in $DATES; do
  # Convertir YYYY-MM-DD en YYYYMMDD
  DATE_STR=$(echo "$DATE" | tr -d '-')

  # Récupérer les produits de cette date
  PRODUCTS=$(sqlite3 "$DB_PATH" "SELECT id, sku, name FROM products WHERE DATE(created_at) = '$DATE' ORDER BY created_at, id;")

  PRODUCT_COUNT_DATE=$(echo "$PRODUCTS" | wc -l | tr -d ' ')
  echo -e "\n${BLUE}📅 Date: $DATE ($PRODUCT_COUNT_DATE produits)${NC}"

  SEQ=1
  while IFS='|' read -r ID SKU NAME; do
    NEW_SKU="SKU-${DATE_STR}-$(printf "%05d" $SEQ)"

    # Vérifier si le SKU est déjà au bon format
    if [[ "$SKU" =~ ^SKU-[0-9]{8}-[0-9]{5}$ ]]; then
      echo -e "  ${YELLOW}⏭️  #$ID $NAME: SKU déjà au bon format ($SKU)${NC}"
      ((SKIPPED_COUNT++))
    else
      OLD_SKU=${SKU:-"(vide)"}
      echo -e "  ${GREEN}✏️  #$ID $NAME: $OLD_SKU → $NEW_SKU${NC}"

      if [ "$DRY_RUN" = false ]; then
        sqlite3 "$DB_PATH" "UPDATE products SET sku = '$NEW_SKU' WHERE id = $ID;"
      fi
      ((UPDATED_COUNT++))
    fi

    ((SEQ++))
  done <<< "$PRODUCTS"
done

# Traiter les produits sans date de création
PRODUCTS_NO_DATE=$(sqlite3 "$DB_PATH" "SELECT id, sku, name FROM products WHERE created_at IS NULL ORDER BY id;")

if [ -n "$PRODUCTS_NO_DATE" ]; then
  TODAY=$(date +%Y%m%d)
  PRODUCT_COUNT_NO_DATE=$(echo "$PRODUCTS_NO_DATE" | wc -l | tr -d ' ')
  echo -e "\n${BLUE}📅 Sans date de création ($PRODUCT_COUNT_NO_DATE produits) - utilisation de la date actuelle${NC}"

  SEQ=1
  while IFS='|' read -r ID SKU NAME; do
    NEW_SKU="SKU-${TODAY}-$(printf "%05d" $SEQ)"

    if [[ "$SKU" =~ ^SKU-[0-9]{8}-[0-9]{5}$ ]]; then
      echo -e "  ${YELLOW}⏭️  #$ID $NAME: SKU déjà au bon format ($SKU)${NC}"
      ((SKIPPED_COUNT++))
    else
      OLD_SKU=${SKU:-"(vide)"}
      echo -e "  ${GREEN}✏️  #$ID $NAME: $OLD_SKU → $NEW_SKU${NC}"

      if [ "$DRY_RUN" = false ]; then
        sqlite3 "$DB_PATH" "UPDATE products SET sku = '$NEW_SKU' WHERE id = $ID;"
      fi
      ((UPDATED_COUNT++))
    fi

    ((SEQ++))
  done <<< "$PRODUCTS_NO_DATE"
fi

# Résumé
echo -e "\n============================================================"
echo -e "${GREEN}✅ Résumé:${NC}"
echo -e "   - Produits analysés: $PRODUCT_COUNT"
echo -e "   - SKU mis à jour: $UPDATED_COUNT"
echo -e "   - SKU déjà corrects: $SKIPPED_COUNT"

if [ "$DRY_RUN" = true ]; then
  echo -e "\n${YELLOW}⚠️  Mode DRY RUN - Aucune modification effectuée${NC}"
  echo -e "   Pour appliquer les changements, lancez: $0"
else
  echo -e "\n${GREEN}✅ Migration terminée avec succès!${NC}"
fi
