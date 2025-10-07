#!/bin/bash

# Phase 3 Setup Script
# Installs dependencies and verifies the installation

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/planka/server"

echo "========================================="
echo "Phase 3 - Notification System Setup"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "$SERVER_DIR/package.json" ]; then
    echo "❌ Error: Cannot find server/package.json"
    echo "Please run this script from the project root"
    exit 1
fi

echo "📦 Installing server dependencies..."
cd "$SERVER_DIR"
npm install

echo ""
echo "✅ Dependencies installed"
echo ""

# Check if node-cron was installed
if npm list node-cron > /dev/null 2>&1; then
    echo "✅ node-cron installed"
else
    echo "❌ node-cron not found"
    exit 1
fi

# Check if sinon was installed (dev dependency)
if npm list sinon > /dev/null 2>&1; then
    echo "✅ sinon installed (dev)"
else
    echo "⚠️  sinon not found (dev dependency)"
fi

echo ""
echo "🧪 Running tests..."
npm test -- test/notifications/ || {
    echo "⚠️  Some tests failed, but installation is complete"
}

echo ""
echo "========================================="
echo "✅ Phase 3 Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start the due date worker:"
echo "   node server/workers/due-date-worker.js"
echo ""
echo "   Or with PM2:"
echo "   pm2 start server/workers/due-date-worker.js --name planka-due-date-worker"
echo ""
echo "2. Restart Planka:"
echo "   docker-compose restart"
echo "   # or"
echo "   pm2 restart planka"
echo ""
echo "3. Access UI:"
echo "   Login → Settings → Notifications tab"
echo ""
echo "For more information, see docs/PHASE3_QUICK_START.md"
echo ""
