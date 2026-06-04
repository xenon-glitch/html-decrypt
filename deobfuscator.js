const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        const fileUrl = 'file:///' + path.resolve(inputFile).replace(/\\/g, '/');
        console.log(`Loading: ${fileUrl}`);
        
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(5000); // allow all scripts to finish
        
        // --- Clean the DOM: remove all script tags and obfuscation artifacts ---
        const cleanedHtml = await page.evaluate(() => {
            // Remove all <script> tags
            document.querySelectorAll('script').forEach(el => el.remove());
            
            // Remove <style> tags that are likely part of obfuscation (optional)
            document.querySelectorAll('style').forEach(el => {
                if (el.innerText.includes('display:none') || el.innerText.includes('visibility:hidden')) {
                    el.remove();
                }
            });
            
            // Remove empty divs or spans that might be wrappers (common in PhpKobo)
            document.querySelectorAll('div, span').forEach(el => {
                if (el.innerText.trim() === '' && el.children.length === 0) {
                    el.remove();
                }
            });
            
            // Return the body's inner HTML (or full HTML if you prefer)
            return document.body.innerHTML;
        });
        
        // Wrap the cleaned content into a basic HTML structure
        const finalHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Decrypted Document</title></head>
<body>${cleanedHtml}</body>
</html>`;
        
        fs.writeFileSync(outputFile, finalHtml);
        console.log(`✅ Clean decrypted file saved to: ${outputFile}`);
        
    } catch (err) {
        console.error('❌ Deobfuscation error:', err.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
