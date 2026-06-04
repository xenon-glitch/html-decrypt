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
        await page.waitForTimeout(5000);

        const cleanedHTML = await page.evaluate(() => {
            // Remove all HTML comments
            const removeComments = (node) => {
                const iterator = document.createNodeIterator(node, NodeFilter.SHOW_COMMENT, null);
                let comment;
                while (comment = iterator.nextNode()) {
                    comment.remove();
                }
            };
            removeComments(document.head);
            removeComments(document.body);

            // Remove obfuscated scripts
            const allScripts = Array.from(document.querySelectorAll('script'));
            for (const script of allScripts) {
                const src = script.src || '';
                const inner = script.innerHTML || '';
                if (src.includes('firebase') ||
                    src.includes('gstatic.com') ||
                    inner.includes('encodedContent') ||
                    inner.includes('decryptData') ||
                    inner.includes('rCZOQOSbx') ||
                    inner.includes('DNEW2cUe3sUZ6BjaLNzQ5InS1gTdnhjWw9ka5A3SrkzYC9CTzN2b5VzUHFFaOR2VQJ3RLljdxYHOwtyLj5GSzoEOURWOz8iVNFDZ') ||
                    (inner.includes('atob') && (inner.includes('split') || inner.includes('reverse') || inner.includes('fromCharCode'))) ||
                    (inner.length > 5000 && inner.includes('document.write'))) {
                    script.remove();
                }
            }

            // Remove empty or tiny style blocks
            const allStyles = Array.from(document.querySelectorAll('style'));
            for (const style of allStyles) {
                if (style.innerText.trim().length === 0 || (style.innerText.includes('display:none') && style.innerText.length < 200)) {
                    style.remove();
                }
            }

            // Remove duplicate meta charset
            const metas = Array.from(document.querySelectorAll('meta[charset]'));
            if (metas.length > 1) {
                for (let i = 1; i < metas.length; i++) {
                    metas[i].remove();
                }
            }

            // Remove stray text nodes with ENCRYPTION or long hex strings
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
                acceptNode: (node) => {
                    if (node.nodeValue && (node.nodeValue.includes('ENCRYPTION') ||
                        node.nodeValue.includes('DNEW') ||
                        /[0-9A-Fa-f]{64,}/.test(node.nodeValue))) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            });
            let textNode;
            while (textNode = walker.nextNode()) {
                textNode.remove();
            }

            return '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
        });

        // Final regex cleanup
        let finalHTML = cleanedHTML;
        finalHTML = finalHTML.replace(/<!--[\s\S]*?-->/g, '');
        finalHTML = finalHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
            if (match.includes('switchTab') && match.includes('sync') && match.includes('setInterval')) {
                return match;
            }
            return '';
        });
        finalHTML = finalHTML.replace(/(<meta charset="UTF-8">)+/, '<meta charset="UTF-8">');
        finalHTML = finalHTML.replace(/\n\s*\n/g, '\n');

        fs.writeFileSync(outputFile, finalHTML);
        console.log(`✅ Completely clean file saved to: ${outputFile}`);
    } catch (err) {
        console.error('❌ Deobfuscation error:', err.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
})();
