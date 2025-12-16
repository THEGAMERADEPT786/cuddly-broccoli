
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreFromJSON() {
    try {
        console.log('🔄 Starting data restoration...\n');

        // Use the most recent uploaded data files
        const usersFile = './attached_assets/users_data_1765087644875.json';
        const waifusFile = './attached_assets/waifus_data_1765087644903.json';
        const botFile = './attached_assets/bot_data_1765087644936.json';

        // Check if files exist
        try {
            await fs.access(usersFile);
            await fs.access(waifusFile);
            await fs.access(botFile);
        } catch (error) {
            console.error('❌ Data files not found!');
            return;
        }

        // Read data files
        const usersData = JSON.parse(await fs.readFile(usersFile, 'utf-8'));
        const waifusData = JSON.parse(await fs.readFile(waifusFile, 'utf-8'));
        const botData = JSON.parse(await fs.readFile(botFile, 'utf-8'));

        console.log('📊 Data to restore:');
        console.log(`   Users: ${usersData.total_users}`);
        console.log(`   Waifus: ${waifusData.total_waifus}`);
        console.log('\n');

        // Restore waifus first
        console.log('🎴 Restoring waifus...');
        for (const waifu of waifusData.waifus) {
            await pool.query(
                `INSERT INTO waifus (waifu_id, name, anime, rarity, image_file_id, price, is_locked, uploaded_by, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                ON CONFLICT (waifu_id) DO UPDATE SET 
                name = $2, anime = $3, rarity = $4, image_file_id = $5, price = $6, 
                is_locked = $7, uploaded_by = $8`,
                [waifu.waifu_id, waifu.name, waifu.anime, waifu.rarity, 
                 waifu.image_file_id, waifu.price, waifu.is_locked, 
                 waifu.uploaded_by, waifu.created_at]
            );
        }
        console.log(`✅ Restored ${waifusData.total_waifus} waifus\n`);

        // Restore users
        console.log('👥 Restoring users...');
        for (const user of usersData.users) {
            await pool.query(
                `INSERT INTO users (user_id, username, first_name, berries, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, favorite_waifu_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                ON CONFLICT (user_id) DO UPDATE SET 
                username = $2, first_name = $3, berries = $4, daily_streak = $5, weekly_streak = $6, 
                last_daily_claim = $7, last_weekly_claim = $8, favorite_waifu_id = $9`,
                [user.user_id, user.username, user.first_name, user.berries, 
                 user.daily_streak, user.weekly_streak, user.last_daily_claim, 
                 user.last_weekly_claim, user.favorite_waifu_id]
            );

            // Restore user's harem
            if (user.harem && user.harem.length > 0) {
                for (const waifuEntry of user.harem) {
                    await pool.query(
                        'INSERT INTO harem (user_id, waifu_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [user.user_id, waifuEntry.waifu_id]
                    );
                }
            }

            // Restore user's roles
            if (user.roles && user.roles.length > 0) {
                for (const role of user.roles) {
                    await pool.query(
                        'INSERT INTO roles (user_id, role_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [user.user_id, role]
                    );
                }
            }
        }
        console.log(`✅ Restored ${usersData.total_users} users\n`);

        // Restore roles from bot data
        console.log('👑 Restoring roles...');
        if (botData.roles) {
            for (const dev of botData.roles.developers || []) {
                await pool.query(
                    'INSERT INTO roles (user_id, role_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [dev.user_id, 'dev']
                );
            }
            for (const sudo of botData.roles.sudos || []) {
                if (sudo.user_id) {
                    await pool.query(
                        'INSERT INTO roles (user_id, role_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [sudo.user_id, 'sudo']
                    );
                }
            }
        }
        console.log('✅ Roles restored\n');

        console.log('🎉 Data restoration complete!\n');
        console.log('📊 Final Summary:');
        console.log(`   ✅ ${waifusData.total_waifus} waifus restored`);
        console.log(`   ✅ ${usersData.total_users} users restored`);
        console.log(`   ✅ All harems and roles restored`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error restoring data:', error);
        process.exit(1);
    }
}

restoreFromJSON();
