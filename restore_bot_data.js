require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function importData() {
    try {
        console.log('🚀 Starting data import...');

        // Import users data
        console.log('📥 Importing users data...');
        const usersData = JSON.parse(await fs.readFile(path.join(__dirname, 'attached_assets', 'users_data_1765087644875.json'), 'utf8'));
        let userCount = 0;

        for (const user of usersData.users) {
            try {
                await pool.query(`
                    INSERT INTO users (user_id, username, first_name, berries, gems, daily_streak, weekly_streak, last_daily_claim, last_weekly_claim, favorite_waifu_id, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (user_id) DO UPDATE SET
                        username = EXCLUDED.username,
                        first_name = EXCLUDED.first_name,
                        berries = EXCLUDED.berries,
                        gems = EXCLUDED.gems,
                        daily_streak = EXCLUDED.daily_streak,
                        weekly_streak = EXCLUDED.weekly_streak,
                        last_daily_claim = EXCLUDED.last_daily_claim,
                        last_weekly_claim = EXCLUDED.last_weekly_claim,
                        favorite_waifu_id = EXCLUDED.favorite_waifu_id
                `, [
                    user.user_id,
                    user.username,
                    user.first_name,
                    parseInt(user.berries) || 0,
                    parseInt(user.gems) || 0,
                    user.daily_streak || 0,
                    user.weekly_streak || 0,
                    user.last_daily_claim,
                    user.last_weekly_claim,
                    user.favorite_waifu_id,
                    user.created_at || new Date()
                ]);

                // Import harem data for this user
                if (user.harem && user.harem.length > 0) {
                    for (const waifuId of user.harem) {
                        await pool.query(`
                            INSERT INTO harem (user_id, waifu_id, acquired_date, owned_since)
                            VALUES ($1, $2, $3, $3)
                            ON CONFLICT DO NOTHING
                        `, [user.user_id, waifuId, new Date()]);
                    }
                }

                // Import roles for this user
                if (user.roles && user.roles.length > 0) {
                    for (const role of user.roles) {
                        await pool.query(`
                            INSERT INTO roles (user_id, role_type)
                            VALUES ($1, $2)
                            ON CONFLICT DO NOTHING
                        `, [user.user_id, role]);
                    }
                }

                userCount++;
                if (userCount % 10 === 0) {
                    console.log(`📊 Imported ${userCount}/${usersData.users.length} users...`);
                }
            } catch (error) {
                console.error(`❌ Error importing user ${user.user_id}:`, error.message);
                console.error('❌ SQL Error details:', error);
            }
        }

        console.log(`✅ Imported ${userCount} users`);

        // Import waifus data
        console.log('📥 Importing waifus data...');
        const waifusData = JSON.parse(await fs.readFile(path.join(__dirname, 'attached_assets', 'waifus_data_1765087644903.json'), 'utf8'));
        let waifuCount = 0;

        for (const waifu of waifusData.waifus) {
            try {
                await pool.query(`
                    INSERT INTO waifus (waifu_id, name, anime, rarity, image_file_id, price, is_locked, uploaded_by, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (waifu_id) DO UPDATE SET
                        name = EXCLUDED.name,
                        anime = EXCLUDED.anime,
                        rarity = EXCLUDED.rarity,
                        image_file_id = EXCLUDED.image_file_id,
                        price = EXCLUDED.price,
                        is_locked = EXCLUDED.is_locked,
                        uploaded_by = EXCLUDED.uploaded_by
                `, [
                    waifu.waifu_id,
                    waifu.name,
                    waifu.anime,
                    waifu.rarity,
                    waifu.image_file_id,
                    parseInt(waifu.price) || 5000,
                    waifu.is_locked || false,
                    waifu.uploaded_by,
                    waifu.created_at || new Date()
                ]);

                waifuCount++;
                if (waifuCount % 20 === 0) {
                    console.log(`📊 Imported ${waifuCount}/${waifusData.waifus.length} waifus...`);
                }
            } catch (error) {
                console.error(`❌ Error importing waifu ${waifu.waifu_id}:`, error.message);
            }
        }

        console.log(`✅ Imported ${waifuCount} waifus`);

        // Import bot settings and roles
        console.log('📥 Importing bot settings and roles...');
        const botData = JSON.parse(await fs.readFile(path.join(__dirname, 'attached_assets', 'bot_data_1765087644936.json'), 'utf8'));

        // Import roles
        if (botData.roles) {
            for (const [roleType, users] of Object.entries(botData.roles)) {
                for (const user of users) {
                    try {
                        await pool.query(`
                            INSERT INTO roles (user_id, role_type)
                            VALUES ($1, $2)
                            ON CONFLICT DO NOTHING
                        `, [user.user_id, roleType]);
                    } catch (error) {
                        console.error(`❌ Error importing role ${roleType} for user ${user.user_id}:`, error.message);
                    }
                }
            }
        }

        console.log('✅ Data import completed successfully!');
        console.log(`📊 Summary: ${userCount} users, ${waifuCount} waifus imported`);

    } catch (error) {
        console.error('❌ Data import failed:', error);
    } finally {
        await pool.end();
    }
}

importData();