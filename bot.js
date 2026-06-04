// bot.js
const { Telegraf } = require('telegraf');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is not set!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => ctx.reply('👋 Welcome! Send me any HTML file, and I will remove the PhpKobo obfuscation for you.'));

bot.on('document', async (ctx) => {
    const document = ctx.message.document;
    const fileId = document.file_id;

    if (!document.file_name.endsWith('.html')) {
        return ctx.reply('❌ Please send an HTML file (.html)');
    }

    const processingMsg = await ctx.reply('⏳ Processing your file... This might take up to 30 seconds.');
    const tempInputPath = path.join('/tmp', `input_${Date.now()}.html`);
    const tempOutputPath = path.join('/tmp', `output_${Date.now()}_decrypted.html`);

    try {
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(fileLink.href);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(tempInputPath, Buffer.from(buffer));

        // Run the deobfuscator script
        const command = `node deobfuscator.js "${tempInputPath}" "${tempOutputPath}"`;
        await execPromise(command);

        // Send the resulting file back
        await ctx.replyWithDocument({ source: tempOutputPath, filename: document.file_name.replace('.html', '_decrypted.html') });
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, '✅ Success! Here is your deobfuscated file.');
    } catch (error) {
        console.error(error);
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, `❌ Error: ${error.message}`);
    } finally {
        // Clean up temporary files
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    }
});

bot.launch();
console.log('🤖 Bot is running...');