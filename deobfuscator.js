// deobfuscator.js
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
    console.error('Usage: node deobfuscator.js <inputPath> <outputPath>');
    process.exit(1);
}

// ... your browser path finding logic ...

(async () => {
    let browser;
    try {
        const browserPath = getBrowserPath(); // reuse your existing function
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: browserPath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        const fileUrl = 'file:///' + path.resolve(inputFile).replace(/\\/g, '/');
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(2000);
        const finalHtml = await page.content();
        fs.writeFileSync(outputFile, finalHtml);
    } finally {
        if (browser) await browser.close();
    }
})();