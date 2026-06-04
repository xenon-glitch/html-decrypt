const { Telegraf } = require('telegraf');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const express = require('express');

const execPromise = util.promisify(exec);
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is not set!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- Health check server (for SnapDeploy) ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/', (req, res) => res.status(200).send('Bot is running'));

const server = app.listen(PORT, () => {
    console.log(`Health check server listening on port ${PORT}`);
});

// --- Helper function to sleep (for realistic step timing) ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Telegram bot logic with progress steps ---
bot.start((ctx) => ctx.reply(
    `🔓 *HTML Deobfuscator Bot*\n\n` +
    `Send me any obfuscated \`.html\` file (PhpKobo style), and I'll return a clean, readable version.\n\n` +
    `⚡ *How it works:*\n` +
    `1️⃣ Launch headless browser\n` +
    `2️⃣ Execute all obfuscated scripts\n` +
    `3️⃣ Remove garbage code\n` +
    `4️⃣ Send you the clean file\n\n` +
    `✅ Private – files are deleted after processing.`,
    { parse_mode: 'Markdown' }
));

bot.on('document', async (ctx) => {
    const document = ctx.message.document;
    const fileId = document.file_id;

    if (!document.file_name.endsWith('.html')) {
        return ctx.reply('❌ Please send an HTML file (`.html` extension).');
    }

    // Initial progress message
    const progressMsg = await ctx.reply(
        `📥 *Step 1/4:* File received.\n` +
        `🔄 *Step 2/4:* Deobfuscating in headless browser...\n` +
        `🧹 *Step 3/4:* Cleaning output...\n` +
        `⏳ *Step 4/4:* Preparing download...`,
        { parse_mode: 'Markdown' }
    );

    const tempInputPath = path.join('/tmp', `input_${Date.now()}.html`);
    const tempOutputPath = path.join('/tmp', `output_${Date.now()}_decrypted.html`);

    try {
        // Step 1: Download file
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            null,
            `📥 *Step 1/4:* File received. Downloading...\n` +
            `⏳ *Step 2/4:* Deobfuscating in headless browser...\n` +
            `⏳ *Step 3/4:* Cleaning output...\n` +
            `⏳ *Step 4/4:* Preparing download...`,
            { parse_mode: 'Markdown' }
        );

        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(fileLink.href);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(tempInputPath, Buffer.from(buffer));
        await sleep(500);

        // Step 2: Deobfuscate
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            null,
            `✅ *Step 1/4:* File downloaded.\n` +
            `🔄 *Step 2/4:* Deobfuscating in headless browser... (this may take 10-20s)\n` +
            `⏳ *Step 3/4:* Cleaning output...\n` +
            `⏳ *Step 4/4:* Preparing download...`,
            { parse_mode: 'Markdown' }
        );

        const command = `node deobfuscator.js "${tempInputPath}" "${tempOutputPath}"`;
        await execPromise(command);
        await sleep(500);

        // Step 3: Cleaning (done inside deobfuscator.js, but we'll show step)
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            null,
            `✅ *Step 1/4:* File downloaded.\n` +
            `✅ *Step 2/4:* Deobfuscation complete.\n` +
            `🧹 *Step 3/4:* Cleaning output...\n` +
            `⏳ *Step 4/4:* Preparing download...`,
            { parse_mode: 'Markdown' }
        );
        await sleep(500);

        // Step 4: Send file
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            null,
            `✅ *Step 1/4:* File downloaded.\n` +
            `✅ *Step 2/4:* Deobfuscation complete.\n` +
            `✅ *Step 3/4:* Cleaning complete.\n` +
            `📤 *Step 4/4:* Uploading clean file...`,
            { parse_mode: 'Markdown' }
        );

        await ctx.replyWithDocument({
            source: tempOutputPath,
            filename: document.file_name.replace('.html', '_decrypted.html')
        });

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            null,
            `✅ *Success!* Your file has been deobfuscated.\n\n` +
            `✨ The clean HTML is attached above.\n` +
            `🔒 All temporary files have been deleted.`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        console.error(error);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            null,
            `❌ *Error:* ${error.message}\n\n` +
            `Please try again or contact support.`,
            { parse_mode: 'Markdown' }
        );
    } finally {
        // Cleanup
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    }
});

bot.launch();
console.log('🤖 Bot is running with progress steps...');

// Graceful shutdown
process.once('SIGINT', () => { server.close(); bot.stop('SIGINT'); });
process.once('SIGTERM', () => { server.close(); bot.stop('SIGTERM'); });
