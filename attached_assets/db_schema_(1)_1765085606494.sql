-- Database Schema for Waifu Collection Bot
-- Run this script to initialize all required tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    berries INTEGER DEFAULT 50000,
    gems INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    weekly_streak INTEGER DEFAULT 0,
    last_daily_claim TIMESTAMP,
    last_weekly_claim TIMESTAMP,
    last_claim_date DATE,
    favorite_waifu_id INTEGER,
    harem_filter_rarity INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waifus table
CREATE TABLE IF NOT EXISTS waifus (
    waifu_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    anime VARCHAR(255) NOT NULL,
    rarity INTEGER NOT NULL CHECK (rarity >= 1 AND rarity <= 16),
    image_file_id TEXT,
    price INTEGER DEFAULT 5000,
    is_locked BOOLEAN DEFAULT FALSE,
    uploaded_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Harem table (users' waifu collections)
CREATE TABLE IF NOT EXISTS harem (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    waifu_id INTEGER REFERENCES waifus(waifu_id),
    acquired_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owned_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table (dev, sudo, uploader)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    role_type VARCHAR(50) NOT NULL,
    UNIQUE (user_id, role_type)
);

-- Group settings table
CREATE TABLE IF NOT EXISTS group_settings (
    group_id BIGINT PRIMARY KEY,
    spawn_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spawn tracker table
CREATE TABLE IF NOT EXISTS spawn_tracker (
    group_id BIGINT PRIMARY KEY,
    message_count INTEGER DEFAULT 0,
    active_spawn_waifu_id INTEGER,
    active_spawn_name VARCHAR(255),
    bid_message_count INTEGER DEFAULT 0,
    last_spawn TIMESTAMP
);

-- Group bids table (for auction system)
CREATE TABLE IF NOT EXISTS group_bids (
    id SERIAL PRIMARY KEY,
    group_id BIGINT,
    waifu_id INTEGER REFERENCES waifus(waifu_id),
    current_bid INTEGER DEFAULT 0,
    current_bidder_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bazaar items table (marketplace)
CREATE TABLE IF NOT EXISTS bazaar_items (
    item_id SERIAL PRIMARY KEY,
    waifu_id INTEGER REFERENCES waifus(waifu_id),
    seller_id BIGINT REFERENCES users(user_id),
    price INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cooldowns table
CREATE TABLE IF NOT EXISTS cooldowns (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    command VARCHAR(50),
    last_used TIMESTAMP,
    UNIQUE (user_id, command)
);

-- Spam blocks table
CREATE TABLE IF NOT EXISTS spam_blocks (
    user_id BIGINT PRIMARY KEY,
    blocked_until TIMESTAMP,
    spam_count INTEGER DEFAULT 1
);

-- Banned users table
CREATE TABLE IF NOT EXISTS banned_users (
    user_id BIGINT PRIMARY KEY,
    banned_by BIGINT,
    reason TEXT,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bot settings table
CREATE TABLE IF NOT EXISTS bot_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_harem_user ON harem(user_id);
CREATE INDEX IF NOT EXISTS idx_harem_waifu ON harem(waifu_id);
CREATE INDEX IF NOT EXISTS idx_waifus_rarity ON waifus(rarity);
CREATE INDEX IF NOT EXISTS idx_roles_user ON roles(user_id);
CREATE INDEX IF NOT EXISTS idx_bazaar_status ON bazaar_items(status);
CREATE INDEX IF NOT EXISTS idx_spawn_tracker_group ON spawn_tracker(group_id);

CREATE TABLE IF NOT EXISTS user_goals (
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guess_waifus (
    guess_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_file_id VARCHAR(255) NOT NULL,
    uploaded_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);