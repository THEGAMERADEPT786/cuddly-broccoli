#!/bin/bash

echo "🚀 Setting up Waifu Bot Database"
echo "================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set!"
    echo ""
    echo "For Render PostgreSQL:"
    echo "1. Go to Render Dashboard → New → PostgreSQL"
    echo "2. Create database and copy the 'External Database URL'"
    echo "3. Set DATABASE_URL in your Render web service environment variables"
    echo ""
    echo "For local development with Docker:"
    echo "docker run --name postgres-waifu -e POSTGRES_PASSWORD=mypassword -e POSTGRES_DB=waifu_bot -p 5432:5432 -d postgres:13"
    echo "Then set: DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/waifu_bot"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL found"
echo "📦 Installing dependencies..."

npm install

echo "🏗️ Creating database tables..."
node create_tables.js

echo "📥 Importing bot data..."
node restore_bot_data.js

echo "✅ Database setup complete!"
echo ""
echo "🎉 Your bot is ready to deploy!"
echo ""
echo "For Render deployment:"
echo "1. Push this code to GitHub"
echo "2. Connect Render to your GitHub repo"
echo "3. Set these environment variables in Render:"
echo "   - TELEGRAM_BOT_TOKEN"
echo "   - DATABASE_URL (from step 1)"
echo "   - WEBHOOK_URL (your Render app URL)"
echo "   - OWNER_ID"
echo "   - GUESS_BOT_TOKEN (optional, for guess game)"