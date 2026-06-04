const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Get input/output from command line arguments
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
    console.error('Usage: node deobfuscator.js <input.html> <output.html>');
    process.exit(1);
}

if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    process.exit(1);
}

(async () => {
    let browser;
    try {
        // Launch Puppeteer – it will automatically use the Chromium installed in the Docker container
        // because the environment variable PUPPETEER_EXECUTABLE_PATH is set in the Dockerfile.
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        const fileUrl = 'file:///' + path.resolve(inputFile).replace(/\\/g, '/');
        console.log(`Loading: ${fileUrl}`);
        
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(5000); // extra time for scripts to run
        
        const finalHtml = await page.content();
        fs.writeFileSync(outputFile, finalHtml);
        console.log(`✅ Deobfuscated saved to: ${outputFile}`);
        
    } catch (err) {
        console.error('❌ Deobfuscation error:', err.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
