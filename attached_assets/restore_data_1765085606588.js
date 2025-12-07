
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreFromBackup() {
    try {
        // Find latest backup
        const backupDir = './backups';
        const files = await fs.readdir(backupDir);
        const backupFiles = files.filter(f => f.startsWith('backup_') && f.endsWith('.json'));
        
        if (backupFiles.length === 0) {
            console.log('❌ No backup files found!');
            return;
        }

        // Sort by date (newest first)
        backupFiles.sort().reverse();
        const latestBackup = backupFiles[0];
        
        console.log(`📁 Restoring from: ${latestBackup}`);
        
        const backupPath = path.join(backupDir, latestBackup);
        const backupData = JSON.parse(await fs.readFile(backupPath, 'utf-8'));
        
        // Restore users
        console.log('👥 Restoring users...');
        for (const user of backupData.users) {
            await pool.query(
                `INSERT INTO users (user_id, username, first_name, berries, gems, crimson, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, last_claim_date, favorite_waifu_id, harem_filter_rarity) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
                ON CONFLICT (user_id) DO UPDATE SET 
                berries = $4, gems = $5, crimson = $6, daily_streak = $7, weekly_streak = $8, 
                last_daily_claim = $9, last_weekly_claim = $10, last_claim_date = $11, 
                favorite_waifu_id = $12, harem_filter_rarity = $13`,
                [user.user_id, user.username, user.first_name, user.berries || 50000, 
                 user.gems || 0, user.crimson || 0, user.daily_streak || 0, user.weekly_streak || 0, 
                 user.last_daily_claim, user.last_weekly_claim, user.last_claim_date, 
                 user.favorite_waifu_id, user.harem_filter_rarity]
            );
        }
        console.log(`✅ Restored ${backupData.users.length} users`);
        
        // Restore waifus (including uploaded ones)
        console.log('🎴 Restoring waifus...');
        for (const waifu of backupData.waifus) {
            await pool.query(
                `INSERT INTO waifus (waifu_id, name, anime, rarity, image_file_id, price, is_locked, uploaded_by, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                ON CONFLICT (waifu_id) DO UPDATE SET 
                name = $2, anime = $3, rarity = $4, image_file_id = $5, price = $6, 
                is_locked = $7, uploaded_by = $8`,
                [waifu.waifu_id, waifu.name, waifu.anime, waifu.rarity, 
                 waifu.image_file_id, waifu.price || 5000, waifu.is_locked || false, 
                 waifu.uploaded_by, waifu.created_at]
            );
        }
        console.log(`✅ Restored ${backupData.waifus.length} waifus`);
        
        // Restore harem
        console.log('💕 Restoring harem...');
        for (const harem of backupData.harem) {
            await pool.query(
                'INSERT INTO harem (user_id, waifu_id, acquired_date, owned_since) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, waifu_id) DO NOTHING',
                [harem.user_id, harem.waifu_id, harem.acquired_date || harem.owned_since, harem.owned_since]
            );
        }
        console.log(`✅ Restored ${backupData.harem.length} harem entries`);
        
        // Restore roles
        console.log('👑 Restoring roles...');
        for (const role of backupData.roles) {
            await pool.query(
                'INSERT INTO roles (user_id, role_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [role.user_id, role.role_type]
            );
        }
        console.log(`✅ Restored ${backupData.roles.length} roles`);
        
        console.log('\n🎉 Data restoration complete!');
        console.log(`\n📊 Summary:`);
        console.log(`   Users: ${backupData.users.length}`);
        console.log(`   Waifus: ${backupData.waifus.length}`);
        console.log(`   Harem entries: ${backupData.harem.length}`);
        console.log(`   Roles: ${backupData.roles.length}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error restoring data:', error);
        process.exit(1);
    }
}

restoreFromBackup();
