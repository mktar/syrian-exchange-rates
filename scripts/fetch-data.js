const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Add stealth plugin
puppeteer.use(StealthPlugin());

// Base URL
const BASE_URL = 'https://sp-today.com';

// ===== Helper Functions =====

// Format timestamp
function getTimestamp() {
    return Date.now();
}

// Save JSON data
function saveJSON(filepath, data) {
    const dir = path.dirname(filepath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Saved: ${filepath}`);
}

// Parse currency prices from page content
function parseCurrencies(pageContent) {
    const rates = [];
    
    // Method 1: Try to find data in JSON scripts
    const jsonScriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
    let match;
    
    while ((match = jsonScriptRegex.exec(pageContent)) !== null) {
        try {
            const scriptContent = match[1].trim();
            if (scriptContent.startsWith('window.') || scriptContent.startsWith('var ') || scriptContent.startsWith('const ')) {
                // Try to parse as JSON
                const jsonMatch = scriptContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const jsonData = JSON.parse(jsonMatch[0]);
                    if (jsonData.rates || jsonData.currencies || jsonData.data) {
                        const dataArray = jsonData.rates || jsonData.currencies || jsonData.data;
                        if (Array.isArray(dataArray)) {
                            dataArray.forEach(item => {
                                if (item.name && (item.buy || item.sell)) {
                                    rates.push({
                                        name: item.name,
                                        buy: parseFloat(item.buy) || 0,
                                        sell: parseFloat(item.sell) || 0
                                    });
                                }
                            });
                        }
                    }
                }
            }
        } catch (e) {
            // Continue trying
        }
    }
    
    // Method 2: If JSON parsing fails, extract from HTML tables
    if (rates.length === 0) {
        const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
        let tableMatch;
        
        while ((tableMatch = tableRegex.exec(pageContent)) !== null) {
            const row = tableMatch[0];
            const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g;
            const cells = [];
            let cellMatch;
            
            while ((cellMatch = cellRegex.exec(row)) !== null) {
                const cellText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
                cells.push(cellText);
            }
            
            if (cells.length >= 3) {
                const name = cells[0];
                const buy = parseFloat(cells[1].replace(/,/g, ''));
                const sell = parseFloat(cells[2].replace(/,/g, ''));
                
                if (name && !isNaN(buy) && !isNaN(sell) && buy > 0 && sell > 0) {
                    rates.push({ name, buy, sell });
                }
            }
        }
    }
    
    return rates;
}

// Parse gold prices from page content
function parseGoldPrices(pageContent) {
    const prices = [];
    
    // Method 1: Try JSON data
    const jsonScriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
    let match;
    
    while ((match = jsonScriptRegex.exec(pageContent)) !== null) {
        try {
            const scriptContent = match[1].trim();
            const jsonMatch = scriptContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[0]);
                if (jsonData.prices || jsonData.gold || jsonData.data) {
                    const dataArray = jsonData.prices || jsonData.gold || jsonData.data;
                    if (Array.isArray(dataArray)) {
                        dataArray.forEach(item => {
                            if (item.name && item.price) {
                                prices.push({
                                    name: item.name,
                                    price: parseFloat(item.price) || 0
                                });
                            }
                        });
                    }
                }
            }
        } catch (e) {
            // Continue
        }
    }
    
    // Method 2: Extract from HTML
    if (prices.length === 0) {
        const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
        let tableMatch;
        
        while ((tableMatch = tableRegex.exec(pageContent)) !== null) {
            const row = tableMatch[0];
            const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g;
            const cells = [];
            let cellMatch;
            
            while ((cellMatch = cellRegex.exec(row)) !== null) {
                const cellText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
                cells.push(cellText);
            }
            
            if (cells.length >= 2) {
                const name = cells[0];
                const price = parseFloat(cells[1].replace(/,/g, ''));
                
                if (name && !isNaN(price) && price > 0) {
                    prices.push({ name, price });
                }
            }
        }
    }
    
    return prices;
}

// Parse crypto prices from page content
function parseCryptoPrices(pageContent) {
    const prices = [];
    
    // Method 1: Try JSON data
    const jsonScriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
    let match;
    
    while ((match = jsonScriptRegex.exec(pageContent)) !== null) {
        try {
            const scriptContent = match[1].trim();
            const jsonMatch = scriptContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[0]);
                if (jsonData.prices || jsonData.crypto || jsonData.data) {
                    const dataArray = jsonData.prices || jsonData.crypto || jsonData.data;
                    if (Array.isArray(dataArray)) {
                        dataArray.forEach(item => {
                            if (item.name && (item.price || item.price_usd)) {
                                prices.push({
                                    name: item.name,
                                    symbol: item.symbol || '',
                                    price: parseFloat(item.price || item.price_usd) || 0,
                                    price_syp: item.price_syp ? parseFloat(item.price_syp) : null
                                });
                            }
                        });
                    }
                }
            }
        } catch (e) {
            // Continue
        }
    }
    
    // Method 2: Extract from HTML
    if (prices.length === 0) {
        const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
        let tableMatch;
        
        while ((tableMatch = tableRegex.exec(pageContent)) !== null) {
            const row = tableMatch[0];
            const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/g;
            const cells = [];
            let cellMatch;
            
            while ((cellMatch = cellRegex.exec(row)) !== null) {
                const cellText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
                cells.push(cellText);
            }
            
            if (cells.length >= 2) {
                const name = cells[0];
                const symbol = cells[1] || '';
                const price = parseFloat(cells[2]?.replace(/,/g, '').replace('$', '') || 0);
                
                if (name && !isNaN(price) && price > 0) {
                    prices.push({
                        name,
                        symbol,
                        price,
                        price_syp: cells[3] ? parseFloat(cells[3].replace(/,/g, '')) : null
                    });
                }
            }
        }
    }
    
    return prices;
}

// ===== Main Functions =====

// Fetch currencies using Puppeteer
async function fetchCurrencies(page) {
    try {
        console.log('📊 Fetching currencies...');
        
        await page.goto(`${BASE_URL}/currencies`, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        // Wait a bit more for dynamic content
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const content = await page.content();
        const rates = parseCurrencies(content);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: `${BASE_URL}/currencies`,
            rates: rates
        };
        
        saveJSON('data/currencies.json', data);
        console.log(`✅ Currencies updated: ${rates.length} currencies`);
        
        return rates.length;
        
    } catch (error) {
        console.error('❌ Error fetching currencies:', error.message);
        
        if (fs.existsSync('data/currencies.json')) {
            console.log('📌 Keeping existing currencies data');
            return 0;
        }
        
        return 0;
    }
}

// Fetch gold prices using Puppeteer
async function fetchGold(page) {
    try {
        console.log('🥇 Fetching gold prices...');
        
        await page.goto(`${BASE_URL}/gold`, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const content = await page.content();
        const prices = parseGoldPrices(content);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: `${BASE_URL}/gold`,
            prices: prices
        };
        
        saveJSON('data/gold.json', data);
        console.log(`✅ Gold prices updated: ${prices.length} items`);
        
        return prices.length;
        
    } catch (error) {
        console.error('❌ Error fetching gold prices:', error.message);
        
        if (fs.existsSync('data/gold.json')) {
            console.log('📌 Keeping existing gold data');
            return 0;
        }
        
        return 0;
    }
}

// Fetch crypto prices using Puppeteer
async function fetchCrypto(page) {
    try {
        console.log('₿ Fetching crypto prices...');
        
        await page.goto(`${BASE_URL}/crypto`, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const content = await page.content();
        const prices = parseCryptoPrices(content);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: `${BASE_URL}/crypto`,
            prices: prices
        };
        
        saveJSON('data/crypto.json', data);
        console.log(`✅ Crypto prices updated: ${prices.length} currencies`);
        
        return prices.length;
        
    } catch (error) {
        console.error('❌ Error fetching crypto prices:', error.message);
        
        if (fs.existsSync('data/crypto.json')) {
            console.log('📌 Keeping existing crypto data');
            return 0;
        }
        
        return 0;
    }
}

// ===== Main Execution =====
async function main() {
    console.log('🚀 Starting data fetch...');
    console.log('='.repeat(50));
    
    let browser;
    
    try {
        // Launch browser
        console.log('🌐 Launching browser...');
        
        // Try to find Chrome executable
        let launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        };
        
        // In production (GitHub Actions), use Chrome from path
        if (process.env.NODE_ENV === 'production') {
            // GitHub Actions will have Chrome installed
            launchOptions.executablePath = '/usr/bin/google-chrome';
        } else {
            // Try to find local Chrome
            const possiblePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
                process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe'
            ];
            
            for (const chromePath of possiblePaths) {
                if (require('fs').existsSync(chromePath)) {
                    console.log(`✅ Found Chrome at: ${chromePath}`);
                    launchOptions.executablePath = chromePath;
                    break;
                }
            }
            
            if (!launchOptions.executablePath) {
                console.log('⚠️  Using Puppeteer bundled browser');
            }
        }
        
        browser = await puppeteer.launch(launchOptions);
        
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set extra headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Referer': 'https://www.google.com/',
            'Origin': 'https://sp-today.com'
        });
        
        console.log('✅ Browser ready');
        
        // Visit homepage first to establish session
        console.log('🏠 Visiting homepage...');
        await page.goto(BASE_URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Homepage loaded');
        
        // Fetch all data
        const results = await Promise.all([
            fetchCurrencies(page),
            fetchGold(page),
            fetchCrypto(page)
        ]);
        
        const [currenciesCount, goldCount, cryptoCount] = results;
        
        console.log('='.repeat(50));
        console.log('✨ All data fetch completed!');
        console.log(`📊 Currencies: ${currenciesCount}`);
        console.log(`🥇 Gold items: ${goldCount}`);
        console.log(`₿ Crypto currencies: ${cryptoCount}`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        
        const totalFetched = currenciesCount + goldCount + cryptoCount;
        if (totalFetched === 0) {
            console.log('⚠️  Warning: No new data was fetched (existing data kept)');
        }
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

// Run script
if (require.main === module) {
    main();
}

module.exports = {
    fetchCurrencies,
    fetchGold,
    fetchCrypto
};
