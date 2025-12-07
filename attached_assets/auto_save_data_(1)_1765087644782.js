import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;
import fs from 'fs/promises';
import path from 'path';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Directories for data files
const DATA_DIR = './data_files';
const BOT_DATA_FILE = path.join(DATA_DIR, 'bot_data.json');
const WAIFUS_DATA_FILE = path.join(DATA_DIR, 'waifus_data.json');
const USERS_DATA_FILE = path.join(DATA_DIR, 'users_data.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Save bot configuration data
async function saveBotData() {
    try {
        const botData = {
            last_updated: new Date().toISOString(),
            settings: {
                spawn_rate: 100,
                bid_rate: 150,
                owner_id: 6245574035,
                channel_id: process.env.CHANNEL_ID,
                upload_group_id: process.env.UPLOAD_GROUP_ID
            },
            statistics: {
                total_users: (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count,
                total_waifus: (await pool.query('SELECT COUNT(*) FROM waifus')).rows[0].count,
                total_harem_entries: (await pool.query('SELECT COUNT(*) FROM harem')).rows[0].count,
                total_groups: (await pool.query('SELECT COUNT(*) FROM group_settings')).rows[0].count
            },
            roles: {
                developers: (await pool.query("SELECT u.user_id, u.username, u.first_name FROM users u JOIN roles r ON u.user_id = r.user_id WHERE r.role_type = 'dev'")).rows,
                sudos: (await pool.query("SELECT u.user_id, u.username, u.first_name FROM users u JOIN roles r ON u.user_id = r.user_id WHERE r.role_type = 'sudo'")).rows,
                uploaders: (await pool.query("SELECT u.user_id, u.username, u.first_name FROM users u JOIN roles r ON u.user_id = r.user_id WHERE r.role_type = 'uploader'")).rows
            }
        };

        await fs.writeFile(BOT_DATA_FILE, JSON.stringify(botData, null, 2));
        console.log('✅ Bot data saved to:', BOT_DATA_FILE);
    } catch (error) {
        console.error('❌ Error saving bot data:', error);
    }
}

// Save all waifus data with images
async function saveWaifusData() {
    try {
        const waifus = await pool.query('SELECT * FROM waifus ORDER BY waifu_id');

        const waifusData = {
            last_updated: new Date().toISOString(),
            total_waifus: waifus.rows.length,
            waifus: waifus.rows.map(w => ({
                waifu_id: w.waifu_id,
                name: w.name,
                anime: w.anime,
                rarity: w.rarity,
                rarity_name: getRarityName(w.rarity),
                image_file_id: w.image_file_id,
                price: w.price,
                is_locked: w.is_locked,
                uploaded_by: w.uploaded_by,
                created_at: w.created_at,
                total_owners: 0 // Will be updated below
            }))
        };

        // Get owner count for each waifu
        for (let i = 0; i < waifusData.waifus.length; i++) {
            const ownerCount = await pool.query(
                'SELECT COUNT(DISTINCT user_id) FROM harem WHERE waifu_id = $1',
                [waifusData.waifus[i].waifu_id]
            );
            waifusData.waifus[i].total_owners = parseInt(ownerCount.rows[0].count);
        }

        await fs.writeFile(WAIFUS_DATA_FILE, JSON.stringify(waifusData, null, 2));
        console.log('✅ Waifus data saved to:', WAIFUS_DATA_FILE);
    } catch (error) {
        console.error('❌ Error saving waifus data:', error);
    }
}

// Save all users data
async function saveUsersData() {
    try {
        const users = await pool.query('SELECT * FROM users ORDER BY user_id');

        const usersData = {
            last_updated: new Date().toISOString(),
            total_users: users.rows.length,
            users: []
        };

        for (const user of users.rows) {
            const haremCount = await pool.query(
                'SELECT COUNT(*) FROM harem WHERE user_id = $1',
                [user.user_id]
            );

            const harem = await pool.query(
                'SELECT w.waifu_id, w.name, w.anime, w.rarity FROM harem h JOIN waifus w ON h.waifu_id = w.waifu_id WHERE h.user_id = $1 ORDER BY h.owned_since DESC',
                [user.user_id]
            );

            const roles = await pool.query(
                'SELECT role_type FROM roles WHERE user_id = $1',
                [user.user_id]
            );

            usersData.users.push({
                user_id: user.user_id,
                username: user.username,
                first_name: user.first_name,
                berries: user.berries,
                daily_streak: user.daily_streak,
                weekly_streak: user.weekly_streak,
                last_daily_claim: user.last_daily_claim,
                last_weekly_claim: user.last_weekly_claim,
                favorite_waifu_id: user.favorite_waifu_id,
                total_waifus: parseInt(haremCount.rows[0].count),
                roles: roles.rows.map(r => r.role_type),
                harem: harem.rows.map(w => ({
                    waifu_id: w.waifu_id,
                    name: w.name,
                    anime: w.anime,
                    rarity: w.rarity,
                    rarity_name: getRarityName(w.rarity)
                })),
                created_at: user.created_at
            });
        }

        await fs.writeFile(USERS_DATA_FILE, JSON.stringify(usersData, null, 2));
        console.log('✅ Users data saved to:', USERS_DATA_FILE);
    } catch (error) {
        console.error('❌ Error saving users data:', error);
    }
}

function getRarityName(rarity) {
    const names = {
        1: 'Common ⚪',
        2: 'Rare 🟢',
        3: 'Normal 🟣',
        4: 'Legendary 🟡',
        5: 'Summer 🏖',
        6: 'Winter ❄️',
        7: 'Valentine 💕',
        8: 'Manga ✨',
        9: 'Unique 👑',
        10: 'Neon 💫',
        11: 'Celestial 🪽',
        12: 'Mythical 🪭',
        13: 'Special 🫧',
        14: 'Masterpiece 💸',
        15: 'Limited 🔮',
        16: 'AMV 🎥'
    };
    return names[rarity] || 'Unknown';
}

// Save all data
async function saveAllData() {
    console.log('\n🔄 Starting automatic data save...\n');
    await ensureDataDir();
    await saveBotData();
    await saveWaifusData();
    await saveUsersData();
    console.log('\n✅ All data files saved successfully!\n');
}

// Export functions
export { saveAllData, saveBotData, saveWaifusData, saveUsersData };

// Run if called directly (ES module compatible check)
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
    saveAllData().then(() => {
        pool.end();
        process.exit(0);
    }).catch(error => {
        console.error('Error:', error);
        pool.end();
        process.exit(1);
    });
}