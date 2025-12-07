require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');

const GUESS_BOT_TOKEN = process.env.GUESS_BOT_TOKEN || process.env.GUESS_TOKEN;
const OFFICIAL_GROUP = '-1002503593313';
const OFFICIAL_GROUP_LINK = 'https://t.me/AQUA_REALM';
const GUESS_REWARD = 100;

if (!GUESS_BOT_TOKEN) {
    console.error('⚠️ GUESS_BOT_TOKEN not found - Guess bot will not start');
    console.error('Add GUESS_BOT_TOKEN in Replit Secrets to enable guess game');
    console.log('Main bot will continue running...');
    // Don't exit - let main bot continue
    module.exports = { guessBot: null };
    return;
}

const guessBot = new TelegramBot(GUESS_BOT_TOKEN, { polling: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Store active guess sessions
const activeGuesses = new Map();

// Start command - only works in DM
guessBot.onText(/\/start/, async (msg) => {
    if (msg.chat.type !== 'private') return;

    const keyboard = {
        inline_keyboard: [
            [{ text: '🎮 JOIN AQUA REALM', url: OFFICIAL_GROUP_LINK }]
        ]
    };

    await guessBot.sendMessage(msg.chat.id, 
        '👋 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗧𝗢 𝗚𝗨𝗘𝗦𝗦 𝗕𝗢𝗧!\n\n🎯 Join AQUA REALM to play waifu guess game!\n\n💡 Earn 100 🩸 ᴄʀɪᴍsᴏɴ per correct guess!',
        { reply_markup: keyboard }
    );
});

// Guess command - only works in official group
guessBot.onText(/\/lguess/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    console.log(`[DEBUG] /lguess command received from chat: ${chatId}, official: ${OFFICIAL_GROUP}`);

    // Ignore command in private chats
    if (msg.chat.type === 'private') {
        return;
    }

    // Check if NOT in official group - show join message
    if (chatId.toString() !== OFFICIAL_GROUP) {
        const keyboard = {
            inline_keyboard: [
                [{ text: '𝗝𝗢𝗜𝗡 𝗔𝗤𝗨𝗔 𝗥𝗘𝗔𝗟𝗠 𝗧𝗢 𝗣𝗟𝗔𝗬!', url: OFFICIAL_GROUP_LINK }]
            ]
        };
        console.log(`[DEBUG] Chat ${chatId} is not official group ${OFFICIAL_GROUP}`);
        return guessBot.sendMessage(chatId, 
            '❌ This command only works in AQUA REALM!',
            { reply_markup: keyboard, reply_to_message_id: msg.message_id }
        );
    }

    try {
        console.log('[DEBUG] Fetching random waifu from database...');
        // Get random waifu from waifus table (shared with main bot)
        const result = await pool.query('SELECT * FROM waifus WHERE is_locked = FALSE ORDER BY RANDOM() LIMIT 1');

        if (result.rows.length === 0) {
            console.log('[DEBUG] No waifus found in database');
            return guessBot.sendMessage(chatId, '❌ No waifus available yet! Upload some in the main bot.', {
                reply_to_message_id: msg.message_id
            });
        }

        const waifu = result.rows[0];
        console.log(`[DEBUG] Selected waifu: ${waifu.name} (ID: ${waifu.waifu_id})`);

        // Send waifu image with spoiler
        await guessBot.sendPhoto(chatId, waifu.image_file_id, {
            caption: '🎯 𝗚𝗨𝗘𝗦𝗦 𝗧𝗛𝗘 𝗖𝗛𝗔𝗥𝗔𝗖𝗧𝗘𝗥!\n\nUse: /lg <name>',
            has_spoiler: true,
            reply_to_message_id: msg.message_id
        });

        // Store active guess
        activeGuesses.set(chatId.toString(), {
            waifuId: waifu.waifu_id,
            correctName: waifu.name.toLowerCase(),
            startTime: Date.now()
        });

        console.log(`[DEBUG] Active guess stored for chat ${chatId}`);

        // Auto-delete guess after 2 minutes
        setTimeout(() => {
            if (activeGuesses.has(chatId.toString())) {
                activeGuesses.delete(chatId.toString());
                console.log(`[DEBUG] Auto-deleted guess for chat ${chatId}`);
            }
        }, 120000);

    } catch (error) {
        console.error('[ERROR] Guess command error:', error);
        await guessBot.sendMessage(chatId, '❌ Error loading guess! Try again.', {
            reply_to_message_id: msg.message_id
        });
    }
});

// Answer guess command
guessBot.onText(/\/lg\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const guess = match[1].trim().toLowerCase();

    console.log(`[DEBUG] /lg command received: "${guess}" from chat ${chatId}`);

    // Check if in official group
    if (chatId.toString() !== OFFICIAL_GROUP) {
        return;
    }

    // Check if there's an active guess
    const activeGuess = activeGuesses.get(chatId.toString());
    if (!activeGuess) {
        console.log(`[DEBUG] No active guess for chat ${chatId}`);
        return guessBot.sendMessage(chatId, '❌ No active guess! Use /lguess first.', {
            reply_to_message_id: msg.message_id
        });
    }

    console.log(`[DEBUG] Comparing "${guess}" with "${activeGuess.correctName}"`);

    // Split the actual name into parts (words)
    const actualName = activeGuess.correctName;
    const nameParts = actualName.split(/\s+/);

    // Check if guess matches the full name OR any individual part of the name
    const isMatch = guess === actualName || 
                    nameParts.some(part => part === guess) ||
                    (guess.length >= 3 && nameParts.some(part => part.startsWith(guess)));

    if (isMatch) {
        console.log(`[DEBUG] Correct guess! Rewarding user ${userId}`);
        // Reward user with 100 Crimson
        try {
            // Check if user exists in database
            const userCheck = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);

            if (userCheck.rows.length === 0) {
                // Create user if doesn't exist
                await pool.query(
                    'INSERT INTO users (user_id, username, first_name, crimson) VALUES ($1, $2, $3, 100)',
                    [userId, msg.from.username, msg.from.first_name]
                );
                console.log(`[DEBUG] Created new user ${userId} with 100 crimson`);
            } else {
                // Update existing user
                await pool.query('UPDATE users SET crimson = crimson + 100 WHERE user_id = $1', [userId]);
                console.log(`[DEBUG] Added 100 crimson to user ${userId}`);
            }

            activeGuesses.delete(chatId.toString());

            return guessBot.sendMessage(chatId, 
                `🎉 𝗖𝗢𝗥𝗥𝗘𝗖𝗧!\n\n${msg.from.first_name} guessed it right!\n\n+100 🩸 ᴄʀɪᴍsᴏɴ`,
                { reply_to_message_id: msg.message_id }
            );
        } catch (error) {
            console.error('[ERROR] Reward error:', error);
            return guessBot.sendMessage(chatId, '❌ Error giving reward. Contact admin!', {
                reply_to_message_id: msg.message_id
            });
        }
    } else {
        console.log(`[DEBUG] Wrong guess`);
        return guessBot.sendMessage(chatId, '❌ Wrong guess! Try again.', {
            reply_to_message_id: msg.message_id
        });
    }
});

// Error handling
guessBot.on('polling_error', (error) => {
    console.error('[ERROR] Guess bot polling error:', error);
});

console.log('✅ Guess Bot started successfully!');
console.log('🎮 Official Group ID:', OFFICIAL_GROUP);
console.log('💡 Waifus are shared from main bot database');
console.log('Waiting for /lguess commands...');