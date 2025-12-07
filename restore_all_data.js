require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreAllData() {
    try {
        console.log('🔄 Starting complete data restoration...\n');

        // Check all possible data files in attached_assets
        const assetsDir = './attached_assets';
        const files = await fs.readdir(assetsDir);

        console.log('📁 Available files in attached_assets:');
        files.forEach(f => console.log(`   - ${f}`));
        console.log('\n');

        // Check if files exist - USE LATEST UPLOADED FILES
        let usersFile = './attached_assets/users_data_1765087644875.json';
        let waifusFile = './attached_assets/waifus_data_1765087644903.json';
        let botFile = './attached_assets/bot_data_1765087644936.json';

        // Check if files exist
        let usersData, waifusData, botData;

        try {
            usersData = JSON.parse(await fs.readFile(usersFile, 'utf-8'));
            console.log(`✅ Users data loaded: ${usersData.total_users} users`);
        } catch (error) {
            console.log('❌ Users data file not found');
            usersData = { users: [], total_users: 0 };
        }

        try {
            waifusData = JSON.parse(await fs.readFile(waifusFile, 'utf-8'));
            console.log(`✅ Waifus data loaded: ${waifusData.total_waifus} waifus`);
        } catch (error) {
            console.log('❌ Waifus data file not found');
            waifusData = { waifus: [], total_waifus: 0 };
        }

        try {
            botData = JSON.parse(await fs.readFile(botFile, 'utf-8'));
            console.log(`✅ Bot data loaded`);
        } catch (error) {
            console.log('❌ Bot data file not found');
            botData = { roles: { developers: [], sudos: [], uploaders: [] } };
        }

        console.log('\n📊 Data Summary:');
        console.log(`   Users to restore: ${usersData.total_users || usersData.users?.length || 0}`);
        console.log(`   Waifus to restore: ${waifusData.total_waifus || waifusData.waifus?.length || 0}`);
        console.log(`   Developers: ${botData.roles?.developers?.length || 0}`);
        console.log(`   Sudos: ${botData.roles?.sudos?.length || 0}`);
        console.log(`   Uploaders: ${botData.roles?.uploaders?.length || 0}`);
        console.log('\n');

        // Restore waifus first (if any)
        if (waifusData.waifus && waifusData.waifus.length > 0) {
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
            console.log(`✅ Restored ${waifusData.waifus.length} waifus\n`);
        } else {
            console.log('⚠️  No waifus found in backup - database will have 0 waifus\n');
        }

        // Restore users with all data
        if (usersData.users && usersData.users.length > 0) {
            console.log('👥 Restoring users...');
            for (const user of usersData.users) {
                await pool.query(
                    `INSERT INTO users (user_id, username, first_name, berries, gems, crimson, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, favorite_waifu_id) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
                    ON CONFLICT (user_id) DO UPDATE SET 
                    username = $2, first_name = $3, berries = $4, gems = $5, crimson = $6, daily_streak = $7, weekly_streak = $8, 
                    last_daily_claim = $9, last_weekly_claim = $10, favorite_waifu_id = $11`,
                    [user.user_id, user.username, user.first_name, user.berries, 
                     user.gems || 0, user.crimson || 0, user.daily_streak, user.weekly_streak, user.last_daily_claim, 
                     user.last_weekly_claim, user.favorite_waifu_id]
                );

                // Restore user's harem (only if waifus exist)
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
            console.log(`✅ Restored ${usersData.users.length} users\n`);
        }

        // Restore roles from bot data
        if (botData.roles) {
            console.log('👑 Restoring roles from bot data...');
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
            for (const uploader of botData.roles.uploaders || []) {
                if (uploader.user_id) {
                    await pool.query(
                        'INSERT INTO roles (user_id, role_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [uploader.user_id, 'uploader']
                    );
                }
            }
            console.log('✅ Roles restored\n');
        }

        // Final statistics
        const finalStats = {
            users: await pool.query('SELECT COUNT(*) FROM users'),
            waifus: await pool.query('SELECT COUNT(*) FROM waifus'),
            harem: await pool.query('SELECT COUNT(*) FROM harem')
        };

        console.log('🎉 Data restoration complete!\n');
        console.log('📊 Current Database Status:');
        console.log(`   👥 Users: ${finalStats.users.rows[0].count}`);
        console.log(`   🎴 Waifus: ${finalStats.waifus.rows[0].count}`);
        console.log(`   💕 Harem Entries: ${finalStats.harem.rows[0].count}`);
        console.log('\n');

        if (parseInt(finalStats.waifus.rows[0].count) === 0) {
            console.log('⚠️  WARNING: No waifus in database!');
            console.log('📝 Next steps:');
            console.log('   1. Upload your previous waifus backup (if available)');
            console.log('   2. Or start uploading new waifus using /upload command');
            console.log('\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error restoring data:', error);
        process.exit(1);
    }
}

restoreAllData();