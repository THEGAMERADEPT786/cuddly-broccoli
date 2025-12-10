
# 🤖 Aqua Waifu Bot - Telegram Anime Collection Game

## 📋 **Complete Deployment Guide**

### **Prerequisites**
- Node.js 18+ installed
- PostgreSQL database
- Telegram Bot Token (from @BotFather)

---

## 🚀 **1. GitHub Actions Deployment**

### **Setup Steps:**

1. **Fork/Clone this repository**
```bash
git clone https://github.com/yourusername/aqua-waifu-bot.git
cd aqua-waifu-bot
```

2. **Add GitHub Secrets** (Settings → Secrets → Actions):
   - `BOT_TOKEN` - Main bot token from @BotFather
   - `GUESS_BOT_TOKEN` - Guess bot token from @BotFather
   - `DATABASE_URL` - PostgreSQL connection string
   - `OWNER_ID` - Your Telegram user ID
   - `CHANNEL_ID` - Database backup channel ID
   - `UPLOAD_GROUP_ID` - Upload notification group ID

3. **Push to GitHub:**
```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

4. **GitHub Actions will automatically:**
   - Install dependencies
   - Start both bots
   - Run 24/7 on GitHub servers

---

## 🌐 **2. Replit Deployment** (Recommended for Beginners)

### **Setup Steps:**

1. **Import to Replit:**
   - Go to [Replit](https://replit.com)
   - Click "Create Repl" → "Import from GitHub"
   - Paste repository URL

2. **Add Secrets** (Tools → Secrets):
   ```
   BOT_TOKEN=your_main_bot_token
   GUESS_BOT_TOKEN=your_guess_bot_token
   DATABASE_URL=your_postgres_url
   OWNER_ID=your_telegram_id
   ```

3. **Run:**
   - Click the "Run" button
   - Bot will start automatically

4. **Deploy to Production:**
   - Click "Deploy" → Choose deployment type
   - Recommended: **Autoscale Deployment** for 24/7 uptime

---

## 🚂 **3. Railway Deployment**

### **Setup Steps:**

1. **Create `Procfile`:**
```
web: node bot.js
worker: node guess_bot.js
```

2. **Deploy to Railway:**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository

3. **Add Environment Variables:**
   - `BOT_TOKEN`
   - `GUESS_BOT_TOKEN`
   - `DATABASE_URL`
   - `OWNER_ID`

4. **Railway will:**
   - Auto-install dependencies
   - Run both bots 24/7
   - Auto-restart on crashes

---

## ☁️ **4. Vercel Deployment** (Webhook Mode Only)

**⚠️ Note:** Vercel doesn't support long-polling bots. Use webhooks instead.

### **Setup Steps:**

1. **Create `api/webhook.js`:**
```javascript
const TelegramBot = require('node-telegram-bot-api');

module.exports = async (req, res) => {
    const bot = new TelegramBot(process.env.BOT_TOKEN);
    
    if (req.method === 'POST') {
        bot.processUpdate(req.body);
    }
    
    res.status(200).send('OK');
};
```

2. **Create `vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ]
}
```

3. **Set Webhook:**
```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-vercel-app.vercel.app/api/webhook
```

---

## 📦 **Required Files for All Platforms**

### **package.json** ✅ (Already included)
```json
{
  "name": "aqua-waifu-bot",
  "version": "1.0.0",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "dotenv": "^16.6.1",
    "express": "^4.22.1",
    "node-telegram-bot-api": "^0.66.0",
    "pg": "^8.16.3"
  }
}
```

### **Environment Variables** (Required):
```
BOT_TOKEN=your_main_bot_token
GUESS_BOT_TOKEN=your_guess_bot_token
DATABASE_URL=postgresql://user:pass@host:5432/dbname
OWNER_ID=your_telegram_user_id
CHANNEL_ID=-1001234567890
UPLOAD_GROUP_ID=-1001234567890
```

---

## 🗄️ **Database Setup**

### **PostgreSQL Tables:**

All tables are auto-created on first run, but you can manually create them:

```sql
-- Users table
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    berries BIGINT DEFAULT 0,
    gems INT DEFAULT 0,
    crimson INT DEFAULT 0,
    daily_streak INT DEFAULT 0,
    weekly_streak INT DEFAULT 0,
    last_daily_claim TIMESTAMP,
    last_weekly_claim TIMESTAMP,
    favorite_waifu_id INT
);

-- Waifus table
CREATE TABLE waifus (
    waifu_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    anime TEXT NOT NULL,
    rarity INT NOT NULL,
    image_file_id TEXT,
    price BIGINT DEFAULT 5000,
    is_locked BOOLEAN DEFAULT FALSE,
    uploaded_by BIGINT
);

-- Custom commands table
CREATE TABLE custom_commands (
    command_trigger TEXT PRIMARY KEY,
    reward_type TEXT NOT NULL,
    reward_amount BIGINT,
    waifu_id INT,
    created_by BIGINT NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Treasure state table
CREATE TABLE treasure_state (
    user_id BIGINT PRIMARY KEY,
    winning_position INT NOT NULL,
    gems_amount INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ✅ **Deployment Checklist**

- ✅ Node.js 18+ installed
- ✅ PostgreSQL database created
- ✅ Bot tokens obtained from @BotFather
- ✅ Environment variables configured
- ✅ GitHub secrets added (for GitHub Actions)
- ✅ Repository pushed to GitHub
- ✅ Deployment workflow triggered

---

## 🛠️ **Troubleshooting**

### **Bot Not Starting:**
```bash
# Check logs
node bot.js
# Should output: ✅ Waifu Collection Bot started successfully!
```

### **Database Connection Failed:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

### **GitHub Actions Failing:**
- Check secrets are correctly named
- Verify DATABASE_URL format: `postgresql://user:pass@host:5432/dbname`
- Check workflow logs in Actions tab

---

## 📞 **Support**

- **Telegram:** [@AQUA_REALM](https://t.me/AQUA_REALM)
- **Issues:** [GitHub Issues](https://github.com/yourusername/aqua-waifu-bot/issues)

---

## 📄 **License**

MIT License - Feel free to modify and use!
