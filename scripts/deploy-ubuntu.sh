#!/bin/bash
# ──────────────────────────────────────────────
# WhatsApp Manager - Deploy Script for Ubuntu
# ──────────────────────────────────────────────
set -e

echo "🚀 WhatsApp Manager - Deploy to Ubuntu"
echo "======================================"

# ── Check prerequisites ──
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
fi

# ── Clone / Pull repo ──
REPO_DIR="/opt/whatsapp-manager"
if [ -d "$REPO_DIR" ]; then
    echo "📂 Updating existing installation..."
    cd "$REPO_DIR"
    git pull
else
    echo "📂 Cloning repository..."
    git clone <tu-repo-url> "$REPO_DIR"
    cd "$REPO_DIR"
fi

# ── Generate secure secrets ──
if [ ! -f .env ]; then
    echo "🔐 Generating .env with secure secrets..."
    cat > .env << EOF
NODE_ENV=production
API_PORT=3000
API_URL=http://localhost:3000
WEB_URL=http://localhost:5173

# Database
POSTGRES_DB=whatsapp_manager
POSTGRES_USER=wm_user
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DATABASE_URL=postgresql://wm_user:${POSTGRES_PASSWORD}@postgres:5432/whatsapp_manager

# JWT
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
MASTER_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Baileys
BAILEYS_SESSION_DIR=./data/sessions
BAILEYS_MAX_RECONNECT_RETRIES=5
BAILEYS_RECONNECT_INTERVAL=5000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173

# WebSocket
WS_PATH=/ws
EOF
    echo "✅ .env created"
else
    echo "✅ .env already exists"
fi

# ── Start services ──
echo "🐳 Starting Docker containers..."
docker compose up -d --build

# ── Run migrations ──
echo "🗄️  Running database migrations..."
sleep 5
docker exec wm-api npx prisma migrate deploy --schema=prisma/schema.prisma 2>/dev/null || \
docker exec wm-api sh -c "cd /app && npx prisma migrate deploy"

# ── Seed (first time only) ──
if [ ! -f .seed-done ]; then
    echo "🌱 Seeding database..."
    docker exec wm-api npx prisma db seed --schema=prisma/schema.prisma 2>/dev/null || true
    touch .seed-done
fi

echo ""
echo "✅ Deploy complete!"
echo "📡 API: http://localhost:3000"
echo "🌐 Web: http://localhost:5173"
echo ""
echo "📝 Default credentials:"
echo "   Admin: admin@whatsappmanager.com / admin123"
echo ""
echo "📊 View logs: docker compose logs -f"
echo "⛔ Stop:     docker compose down"
