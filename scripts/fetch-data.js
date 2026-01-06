const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Base URL
const BASE_URL = 'https://sp-today.com';

// Common headers to mimic browser requests
const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://sp-today.com/',
    'Origin': 'https://sp-today.com',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
    'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"'
};

// ===== Helper Functions =====

// Format timestamp
function getTimestamp() {
    return Date.now();
}

// Store cookies globally
let cookies = '';

// Get cookies from homepage
async function getCookies() {
    try {
        const response = await axios.get(BASE_URL, {
            headers: COMMON_HEADERS,
            timeout: 30000,
            withCredentials: true
        });
        
        // Extract cookies from response
        const setCookieHeaders = response.headers['set-cookie'];
        if (setCookieHeaders) {
            cookies = setCookieHeaders.map(c => c.split(';')[0]).join('; ');
        }
        
        return cookies;
    } catch (error) {
        console.log('⚠️  Could not get cookies, continuing without them');
        return '';
    }
}

// Parse currency prices from sp-today.com
function parseCurrencies(html) {
    const $ = cheerio.load(html);
    const rates = [];
    
    // Try multiple selectors for currency tables
    // The website structure might change, so we try different approaches
    
    // Method 1: Table with specific class
    $('table tbody tr, .currency-table tr, .rates-table tr').each((index, element) => {
        const $row = $(element);
        const cells = $row.find('td, div.currency-cell');
        
        if (cells.length >= 3) {
            const name = $(cells[0]).text().trim();
            const buy = $(cells[1]).text().trim().replace(/,/g, '');
            const sell = $(cells[2]).text().trim().replace(/,/g, '');
            
            // Skip if essential data is missing
            if (!name || !buy || !sell) return;
            if (name === '' || buy === '' || sell === '') return;
            
            // Parse numbers
            const buyPrice = parseFloat(buy);
            const sellPrice = parseFloat(sell);
            
            if (!isNaN(buyPrice) && !isNaN(sellPrice)) {
                rates.push({
                    name: name,
                    buy: buyPrice,
                    sell: sellPrice
                });
            }
        }
    });
    
    // Method 2: If table parsing fails, try card-based layout
    if (rates.length === 0) {
        $('.currency-card, .rate-card, .price-card').each((index, element) => {
            const $card = $(element);
            const name = $card.find('.name, .currency-name, h3, h4').first().text().trim();
            const buy = $card.find('.buy, .buy-price, .rate-buy').first().text().trim().replace(/,/g, '');
            const sell = $card.find('.sell, .sell-price, .rate-sell').first().text().trim().replace(/,/g, '');
            
            if (name && buy && sell) {
                const buyPrice = parseFloat(buy);
                const sellPrice = parseFloat(sell);
                
                if (!isNaN(buyPrice) && !isNaN(sellPrice)) {
                    rates.push({
                        name: name,
                        buy: buyPrice,
                        sell: sellPrice
                    });
                }
            }
        });
    }
    
    return rates;
}

// Parse gold prices from sp-today.com
function parseGoldPrices(html) {
    const $ = cheerio.load(html);
    const prices = [];
    
    // Try multiple selectors for gold prices
    
    // Method 1: Table rows
    $('table tbody tr, .gold-table tr').each((index, element) => {
        const $row = $(element);
        const cells = $row.find('td');
        
        if (cells.length >= 2) {
            const name = $(cells[0]).text().trim();
            const price = $(cells[1]).text().trim().replace(/,/g, '');
            
            if (name && price) {
                const priceNum = parseFloat(price);
                if (!isNaN(priceNum)) {
                    prices.push({
                        name: name,
                        price: priceNum
                    });
                }
            }
        }
    });
    
    // Method 2: Card-based layout
    if (prices.length === 0) {
        $('.gold-card, .price-item, .gold-price-item').each((index, element) => {
            const $item = $(element);
            const name = $item.find('.name, .title, h3, h4').first().text().trim();
            const price = $item.find('.price, .value, .amount').first().text().trim().replace(/,/g, '');
            
            if (name && price) {
                const priceNum = parseFloat(price);
                if (!isNaN(priceNum)) {
                    prices.push({
                        name: name,
                        price: priceNum
                    });
                }
            }
        });
    }
    
    return prices;
}

// Parse crypto prices from sp-today.com
function parseCryptoPrices(html) {
    const $ = cheerio.load(html);
    const prices = [];
    
    // Try multiple selectors for crypto prices
    
    // Method 1: Table rows
    $('table tbody tr, .crypto-table tr').each((index, element) => {
        const $row = $(element);
        const cells = $row.find('td');
        
        if (cells.length >= 3) {
            const name = $(cells[0]).text().trim();
            const symbol = $(cells[1]).text().trim();
            const price = $(cells[2]).text().trim().replace(/,/g, '').replace('$', '');
            const priceSYP = $(cells[3]).text().trim().replace(/,/g, '');
            
            if (name && price) {
                const priceNum = parseFloat(price);
                const sypPrice = priceSYP ? parseFloat(priceSYP) : null;
                
                if (!isNaN(priceNum)) {
                    prices.push({
                        name: name,
                        symbol: symbol || '',
                        price: priceNum,
                        price_syp: sypPrice
                    });
                }
            }
        }
    });
    
    // Method 2: Card-based layout
    if (prices.length === 0) {
        $('.crypto-card, .crypto-item, .currency-card').each((index, element) => {
            const $item = $(element);
            const name = $item.find('.name, .title, h3, h4').first().text().trim();
            const symbol = $item.find('.symbol, .code').first().text().trim();
            const price = $item.find('.price, .value, .amount').first().text().trim().replace(/,/g, '').replace('$', '');
            const priceSYP = $item.find('.syp-price, .syrian-price').first().text().trim().replace(/,/g, '');
            
            if (name && price) {
                const priceNum = parseFloat(price);
                const sypPrice = priceSYP ? parseFloat(priceSYP) : null;
                
                if (!isNaN(priceNum)) {
                    prices.push({
                        name: name,
                        symbol: symbol || '',
                        price: priceNum,
                        price_syp: sypPrice
                    });
                }
            }
        });
    }
    
    return prices;
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

// ===== Main Functions =====

// Helper function to fetch with retry
async function fetchWithRetry(url, maxRetries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const headers = { ...COMMON_HEADERS };
            if (cookies) {
                headers['Cookie'] = cookies;
            }
            
            const response = await axios.get(url, {
                headers,
                timeout: 30000
            });
            return response;
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            console.log(`⚠️  Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
}

// Fetch currencies
async function fetchCurrencies() {
    try {
        console.log('📊 Fetching currencies...');
        
        const response = await fetchWithRetry(`${BASE_URL}/currencies`);
        
        const rates = parseCurrencies(response.data);
        
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
        
        // Keep existing data if fetch fails
        if (fs.existsSync('data/currencies.json')) {
            console.log('📌 Keeping existing currencies data');
            return 0;
        }
        
        return 0;
    }
}

// Fetch gold prices
async function fetchGold() {
    try {
        console.log('🥇 Fetching gold prices...');
        
        const response = await fetchWithRetry(`${BASE_URL}/gold`);
        
        const prices = parseGoldPrices(response.data);
        
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
        
        // Keep existing data if fetch fails
        if (fs.existsSync('data/gold.json')) {
            console.log('📌 Keeping existing gold data');
            return 0;
        }
        
        return 0;
    }
}

// Fetch crypto prices
async function fetchCrypto() {
    try {
        console.log('₿ Fetching crypto prices...');
        
        const response = await fetchWithRetry(`${BASE_URL}/crypto`);
        
        const prices = parseCryptoPrices(response.data);
        
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
        
        // Keep existing data if fetch fails
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
    
    // Get cookies first
    console.log('🍪 Fetching cookies...');
    await getCookies();
    if (cookies) {
        console.log('✅ Cookies obtained');
    }
    
    // Fetch all data in parallel
    const results = await Promise.all([
        fetchCurrencies(),
        fetchGold(),
        fetchCrypto()
    ]);
    
    const [currenciesCount, goldCount, cryptoCount] = results;
    
    console.log('='.repeat(50));
    console.log('✨ All data fetch completed!');
    console.log(`📊 Currencies: ${currenciesCount}`);
    console.log(`🥇 Gold items: ${goldCount}`);
    console.log(`₿ Crypto currencies: ${cryptoCount}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    
    // Exit successfully even if no new data was fetched
    // (keeping existing data is not a failure)
    const totalFetched = currenciesCount + goldCount + cryptoCount;
    if (totalFetched === 0) {
        console.log('⚠️ Warning: No new data was fetched (existing data kept)');
    }
}

// Run the script
if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

module.exports = {
    fetchCurrencies,
    fetchGold,
    fetchCrypto
};
