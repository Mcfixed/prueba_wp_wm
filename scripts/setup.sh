#!/bin/bash
# ──────────────────────────────────────────────
# WhatsApp Manager - Setup Script
# ──────────────────────────────────────────────

set -e

echo "🚀 WhatsApp Manager Setup"
echo "========================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install Node.js 22+"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required"; exit 1; }

echo "✅ Prerequisites checked"

# Copy .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env file created from .env.example"
    echo "⚠️  Please update the .env file with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate --schema=apps/api/prisma/schema.prisma

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma --name init

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed --schema=apps/api/prisma/schema.prisma

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "To start with Docker:"
echo "  docker compose up -d"
echo ""
echo "Default credentials:"
echo "  Admin:    admin@whatsappmanager.com / admin123"
echo "  Operator: operator@whatsappmanager.com / operator123"
echo "  Viewer:   viewer@whatsappmanager.com / viewer123"
