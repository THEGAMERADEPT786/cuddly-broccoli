require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTables() {
    try {
        console.log('🏗️ Creating database tables...');

        const schemaSQL = await fs.readFile('./attached_assets/db_schema_(1)_1765085606494.sql', 'utf8');

        // Split the SQL into individual statements
        const statements = schemaSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await pool.query(statement);
                    console.log('✅ Executed SQL statement');
                } catch (error) {
                    // Ignore "already exists" errors
                    if (!error.message.includes('already exists')) {
                        console.error('❌ SQL Error:', error.message);
                        console.error('Statement:', statement.substring(0, 100) + '...');
                    }
                }
            }
        }

        // Create additional tables that might be missing
        const additionalTables = [
            `CREATE TABLE IF NOT EXISTS custom_commands (
                id SERIAL PRIMARY KEY,
                command_trigger VARCHAR(255) UNIQUE NOT NULL,
                reward_type VARCHAR(50) NOT NULL,
                reward_amount BIGINT,
                waifu_id INTEGER,
                max_uses INTEGER DEFAULT -1,
                uses INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                created_by BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS dynamic_commands (
                id SERIAL PRIMARY KEY,
                command_name VARCHAR(255) UNIQUE NOT NULL,
                command_response TEXT NOT NULL,
                is_permanent BOOLEAN DEFAULT FALSE,
                created_by BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS redeem_codes (
                code TEXT PRIMARY KEY,
                code_type TEXT NOT NULL,
                amount BIGINT,
                waifu_id INT,
                max_uses INT DEFAULT 1,
                uses INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )`,
            `CREATE TABLE IF NOT EXISTS spawn_tracker (
                id SERIAL PRIMARY KEY,
                message_count INTEGER DEFAULT 0,
                active_spawn_waifu_id INTEGER,
                spawn_channel_id BIGINT,
                last_spawn_time TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS banned_users (
                user_id BIGINT PRIMARY KEY,
                banned_by BIGINT,
                reason TEXT,
                banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const tableSQL of additionalTables) {
            try {
                await pool.query(tableSQL);
                console.log('✅ Created additional table');
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.error('❌ Error creating table:', error.message);
                }
            }
        }

        console.log('✅ Database tables created successfully!');

    } catch (error) {
        console.error('❌ Failed to create tables:', error);
    } finally {
        await pool.end();
    }
}

createTables();