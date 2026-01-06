const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Base URL
const BASE_URL = 'https://sp-today.com';

// ===== Helper Functions =====

// Format timestamp
function getTimestamp() {
    return Date.now();
}

// Parse currency prices
function parseCurrencies(html) {
    const $ = cheerio.load(html);
    const rates = [];
    
    // Find currency table rows
    $('table tbody tr').each((index, element) => {
        const $row = $(element);
        const cells = $row.find('td');
        
        if (cells.length >= 3) {
            const name = $(cells[0]).text().trim();
            const buy = $(cells[1]).text().trim().replace(/,/g, '');
            const sell = $(cells[2]).text().trim().replace(/,/g, '');
            
            if (name && buy && sell) {
                rates.push({
                    name: name,
                    buy: parseFloat(buy),
                    sell: parseFloat(sell)
                });
            }
        }
    });
    
    return rates;
}

// Parse gold prices
function parseGoldPrices(html) {
    const $ = cheerio.load(html);
    const prices = [];
    
    // Find gold price elements
    $('.price-item, .gold-price, .currency-row').each((index, element) => {
        const $item = $(element);
        const name = $item.find('.name, .title, h3, h4').first().text().trim();
        const price = $item.find('.price, .value, .amount').first().text().trim().replace(/,/g, '');
        
        if (name && price) {
            prices.push({
                name: name,
                price: parseFloat(price)
            });
        }
    });
    
    return prices;
}

// Parse crypto prices
function parseCryptoPrices(html) {
    const $ = cheerio.load(html);
    const prices = [];
    
    // Find crypto price elements
    $('.crypto-row, .currency-item, .price-row').each((index, element) => {
        const $item = $(element);
        const name = $item.find('.name, .title, h3, h4').first().text().trim();
        const symbol = $item.find('.symbol, .code').first().text().trim();
        const price = $item.find('.price, .value, .amount').first().text().trim().replace(/,/g, '').replace('$', '');
        const priceSYP = $item.find('.syp-price, .syrian-price').first().text().trim().replace(/,/g, '');
        
        if (name && price) {
            prices.push({
                name: name,
                symbol: symbol || '',
                price: parseFloat(price),
                price_syp: priceSYP ? parseFloat(priceSYP) : parseFloat(price) * 12500 // Default to USD * 12500
            });
        }
    });
    
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

// Fetch currencies
async function fetchCurrencies() {
    try {
        console.log('📊 Fetching currencies...');
        
        const response = await axios.get(`${BASE_URL}/currencies`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const rates = parseCurrencies(response.data);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: `${BASE_URL}/currencies`,
            rates: rates
        };
        
        saveJSON('data/currencies.json', data);
        console.log(`✅ Currencies updated: ${rates.length} currencies`);
        
    } catch (error) {
        console.error('❌ Error fetching currencies:', error.message);
        // Keep existing data if fetch fails
        if (fs.existsSync('data/currencies.json')) {
            console.log('📌 Keeping existing currencies data');
        }
    }
}

// Fetch gold prices
async function fetchGold() {
    try {
        console.log('🥇 Fetching gold prices...');
        
        const response = await axios.get(`${BASE_URL}/gold`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const prices = parseGoldPrices(response.data);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: `${BASE_URL}/gold`,
            prices: prices
        };
        
        saveJSON('data/gold.json', data);
        console.log(`✅ Gold prices updated: ${prices.length} items`);
        
    } catch (error) {
        console.error('❌ Error fetching gold prices:', error.message);
        if (fs.existsSync('data/gold.json')) {
            console.log('📌 Keeping existing gold data');
        }
    }
}

// Fetch crypto prices
async function fetchCrypto() {
    try {
        console.log('₿ Fetching crypto prices...');
        
        const response = await axios.get(`${BASE_URL}/crypto`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const prices = parseCryptoPrices(response.data);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: `${BASE_URL}/crypto`,
            prices: prices
        };
        
        saveJSON('data/crypto.json', data);
        console.log(`✅ Crypto prices updated: ${prices.length} currencies`);
        
    } catch (error) {
        console.error('❌ Error fetching crypto prices:', error.message);
        if (fs.existsSync('data/crypto.json')) {
            console.log('📌 Keeping existing crypto data');
        }
    }
}

// ===== Main Execution =====
async function main() {
    console.log('🚀 Starting data fetch...');
    console.log('='.repeat(50));
    
    // Fetch all data
    await Promise.all([
        fetchCurrencies(),
        fetchGold(),
        fetchCrypto()
    ]);
    
    console.log('='.repeat(50));
    console.log('✨ All data fetch completed!');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    fetchCurrencies,
    fetchGold,
    fetchCrypto
};
