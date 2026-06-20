#!/bin/bash
# ──────────────────────────────────────────────
# WhatsApp Manager - Backup Script
# ──────────────────────────────────────────────

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="${POSTGRES_DB:-whatsapp_manager}"
DB_USER="${POSTGRES_USER:-wm_user}"

mkdir -p "$BACKUP_DIR"

echo "📦 Starting backup: $TIMESTAMP"

# Backup PostgreSQL
echo "🗄️  Backing up database..."
docker exec wm-postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/db_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/db_$TIMESTAMP.sql"
echo "✅ Database backup created: db_$TIMESTAMP.sql.gz"

# Backup session credentials
echo "🔐 Backing up session credentials..."
docker exec wm-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "\COPY session_credentials TO '$BACKUP_DIR/credentials_$TIMESTAMP.csv' CSV HEADER"
echo "✅ Credentials backup created"

# Backup Redis
echo "💾 Backing up Redis..."
docker exec wm-redis redis-cli SAVE
docker cp wm-redis:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"
echo "✅ Redis backup created"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +7 -delete

echo "✅ Backup complete: $TIMESTAMP"
echo "📁 Location: $BACKUP_DIR"
