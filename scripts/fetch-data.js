const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Base URLs
const BASE_URL = 'https://www.sp-today.com';
const SOURCE_URL = `${BASE_URL}/currencies`;
const GOLD_URL = `${BASE_URL}/gold`;
const CRYPTO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple,dogecoin,cardano,tron,avalanche-2&vs_currencies=usd&include_24hr_change=true';

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

// Output function
function output(message, type = 'info') {
    const emojis = {
        'info': '📊',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️'
    };
    console.log(`${emojis[type] || ''} ${message}`);
}

// Fetch HTML with fetch (like curl in PHP)
async function fetchHTML(url, timeout = 15000) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            },
            timeout: timeout,
            compress: true
        });
        
        if (!response.ok) {
            return false;
        }
        
        const html = await response.text();
        return html;
        
    } catch (error) {
        return false;
    }
}

// Parse currency rates (similar to PHP version)
function parseCurrencyRates(html) {
    const rates = {};
    const $ = cheerio.load(html);
    
    // Method 1: Try parsing from table structure first
    const tables = $('table, tbody');
    
    tables.each((i, table) => {
        const rows = $(table).find('tr');
        
        rows.each((j, tr) => {
            const cells = $(tr).find('th, td, div[data-currency], div[class*="currency"], div[class*="rate"], div[class*="exchange"]');
            
            if (cells.length < 2) return;
            
            let code = null;
            let name = '';
            const nums = [];
            
            cells.each((k, cell) => {
                const text = $(cell).text().trim();
                
                // Look for currency code
                const codeMatch = text.match(/\(([A-Z]{3})\)/);
                const currencyMatch = text.match(/\b(USD|EUR|GBP|SAR|AED|KWD|BHD|QAR|OMR|JOD|TRY|EGP|IQD|IRR|DZD|TND|MAD|LYD|RUB|SEK|NOK|DKK|CAD|AUD|NZD|CHF|SGD|MYR|BRL|ZAR|CNY|INR)\b/i);
                
                if (codeMatch) {
                    code = codeMatch[1].toUpperCase();
                    name = text.replace(/\s*\([A-Z]{3}\).*/, '').replace(/\b[A-Z]{3}\b/i, '').trim();
                } else if (currencyMatch) {
                    code = currencyMatch[0].toUpperCase();
                    name = text.replace(/\b[A-Z]{3}\b/i, '').trim();
                }
                
                // Extract numbers
                const numMatch = text.match(/[\d\.,]+/);
                if (numMatch) {
                    const val = numMatch[0].replace(/,/g, '');
                    if (!isNaN(parseFloat(val))) {
                        nums.push(parseFloat(val));
                    }
                }
            });
            
            // If we found a code and at least 2 numbers, save it
            if (code && nums.length >= 2) {
                rates[code] = {
                    name: name || code,
                    buy: nums[0],
                    sell: nums[1],
                    average: (nums[0] + nums[1]) / 2,
                    spread: nums[1] - nums[0],
                    spread_percent: ((nums[1] - nums[0]) / nums[0]) * 100
                };
            }
        });
    });
    
    // Method 2: Try parsing from div structures
    if (Object.keys(rates).length === 0) {
        const divs = $('div[class*="currency"], div[class*="rate"], div[class*="exchange"], div[data-currency]');
        
        divs.each((i, div) => {
            const text = $(div).text().trim();
            const match = text.match(/([^\n\r]{2,50})\s*\(([A-Z]{3})\)[^\d\r\n]*?([\d\.,]{1,20})[^\d\r\n]*?([\d\.,]{1,20})/u);
            
            if (match) {
                const code = match[2].toUpperCase();
                const name = match[1].trim();
                const buy = parseFloat(match[3].replace(/,/g, ''));
                const sell = parseFloat(match[4].replace(/,/g, ''));
                
                if (!isNaN(buy) && !isNaN(sell)) {
                    rates[code] = {
                        name: name || code,
                        buy: buy,
                        sell: sell,
                        average: (buy + sell) / 2,
                        spread: sell - buy,
                        spread_percent: ((sell - buy) / buy) * 100
                    };
                }
            }
        });
    }
    
    // Method 3: Try comprehensive regex patterns
    if (Object.keys(rates).length === 0) {
        const patterns = [
            /([^\n\r<]{2,60})\s*\(([A-Z]{3})\)[^\d\n\r]*?([\d\.,]{2,20})[^\d\n\r]*?([\d\.,]{2,20})/u,
            /([^\n\r<]{2,60})\s*[A-Z]{3}[^\d\n\r]*?([\d\.,]{2,20})[^\d\n\r]*?([\d\.,]{2,20})/u,
            /(USD|EUR|GBP|SAR|AED|KWD|BHD|QAR|OMR|JOD|TRY|EGP|IQD|IRR|DZD|TND|MAD|LYD|RUB|SEK|NOK|DKK|CAD|AUD|NZD|CHF|SGD|MYR|BRL|ZAR|CNY|INR)[^\d\n\r]*?([\d\.,]{2,20})[^\d\n\r]*?([\d\.,]{2,20})/i
        ];
        
        for (const pattern of patterns) {
            const matches = html.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
            
            for (const match of matches) {
                if (match.length >= 4) {
                    const isCode = /^[A-Z]{3}$/i.test(match[1]);
                    const code = isCode ? match[1].toUpperCase() : (/^[A-Z]{3}$/i.test(match[2]) ? match[2].toUpperCase() : null);
                    const name = isCode ? '' : (match[1]?.trim() || '');
                    const buy = parseFloat(match[match.length - 2]?.replace(/,/g, '') || 0);
                    const sell = parseFloat(match[match.length - 1]?.replace(/,/g, '') || 0);
                    
                    if (code && !isNaN(buy) && !isNaN(sell)) {
                        rates[code] = {
                            name: name || code,
                            buy: buy,
                            sell: sell,
                            average: (buy + sell) / 2,
                            spread: sell - buy,
                            spread_percent: ((sell - buy) / buy) * 100
                        };
                    }
                }
            }
            
            if (Object.keys(rates).length > 0) break;
        }
    }
    
    return rates;
}

// Parse gold rates (similar to PHP version)
function parseGoldRates(html) {
    const gold = {};
    const $ = cheerio.load(html);
    
    // Method 1: Try parsing from table structure
    const tables = $('table, tbody');
    
    tables.each((i, table) => {
        const rows = $(table).find('tr');
        
        rows.each((j, tr) => {
            const cells = $(tr).find('th, td, div');
            
            if (cells.length < 2) return;
            
            let carat = null;
            const nums = [];
            
            cells.each((k, cell) => {
                const text = $(cell).text().trim();
                
                // Look for gold carat patterns
                const caratMatch = text.match(/عيار\s*(24|21|18|22|14)/u);
                if (caratMatch) {
                    carat = caratMatch[1];
                }
                
                // Extract numbers (gold prices are typically > 100)
                const numMatch = text.match(/([\d\.,]+)/);
                if (numMatch) {
                    const val = parseFloat(numMatch[0].replace(/,/g, ''));
                    if (!isNaN(val) && val > 100 && val < 10000000) {
                        nums.push(val);
                    }
                }
            });
            
            // If we found a carat and at least 2 numbers, save it
            if (carat && nums.length >= 2) {
                gold[`GOLD_${carat}`] = {
                    name: `ذهب عيار ${carat}`,
                    buy: nums[0],
                    sell: nums[1],
                    average: (nums[0] + nums[1]) / 2,
                    spread: nums[1] - nums[0]
                };
            }
        });
    });
    
    // Method 2: Try parsing from div structures
    if (Object.keys(gold).length === 0) {
        const divs = $('div[class*="gold"], div[class*="carat"], div[class*="price"]');
        
        divs.each((i, div) => {
            const text = $(div).text().trim();
            const match = text.match(/عيار\s*(24|21|18|22|14)[^\d\n\r]*?([\d\.,]+)[^\d\n\r]*?([\d\.,]+)/u);
            
            if (match) {
                const carat = match[1];
                const buy = parseFloat(match[2].replace(/,/g, ''));
                const sell = parseFloat(match[3].replace(/,/g, ''));
                
                if (!isNaN(buy) && !isNaN(sell) && buy > 100 && sell > 100) {
                    gold[`GOLD_${carat}`] = {
                        name: `ذهب عيار ${carat}`,
                        buy: buy,
                        sell: sell,
                        average: (buy + sell) / 2,
                        spread: sell - buy
                    };
                }
            }
        });
    }
    
    // Method 3: Try comprehensive regex patterns
    if (Object.keys(gold).length === 0) {
        const patterns = [
            /عيار\s*24[^\d\n\r]{0,100}([\d\.,]+)[^\d\n\r]{0,50}([\d\.,]+)/u,
            /عيار\s*21[^\d\n\r]{0,100}([\d\.,]+)[^\d\n\r]{0,50}([\d\.,]+)/u,
            /عيار\s*18[^\d\n\r]{0,100}([\d\.,]+)[^\d\n\r]{0,50}([\d\.,]+)/u,
            /(\d{1,2})\s*عيار[^\d\n\r]{0,100}([\d\.,]+)[^\d\n\r]{0,50}([\d\.,]+)/u,
            /(24|21|18)\s*k[^\d\n\r]{0,100}([\d\.,]+)[^\d\n\r]{0,50}([\d\.,]+)/ui
        ];
        
        for (const pattern of patterns) {
            const matches = html.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
            
            for (const match of matches) {
                const carat = match[1];
                const buy = parseFloat(match[2]?.replace(/,/g, '') || 0);
                const sell = parseFloat(match[3]?.replace(/,/g, '') || 0);
                
                if (carat && !isNaN(buy) && !isNaN(sell) && buy > 100 && sell > 100) {
                    gold[`GOLD_${carat}`] = {
                        name: `ذهب عيار ${carat}`,
                        buy: buy,
                        sell: sell,
                        average: (buy + sell) / 2,
                        spread: sell - buy
                    };
                }
            }
            
            if (Object.keys(gold).length > 0) break;
        }
    }
    
    return gold;
}

// Fetch crypto prices (from CoinGecko API)
async function fetchCryptoPrices() {
    try {
        const response = await fetch(CRYPTO_URL, {
            timeout: 10000
        });
        
        if (!response.ok) {
            return {};
        }
        
        const data = await response.json();
        
        const cryptoNames = {
            'bitcoin': 'بيتكوين',
            'ethereum': 'إيثريوم',
            'tether': 'تيثر',
            'binancecoin': 'بينانس كوين',
            'solana': 'سولانا',
            'ripple': 'ريبل',
            'dogecoin': 'دوجكوين',
            'cardano': 'كاردانو',
            'tron': 'ترون',
            'avalanche-2': 'أفالانش'
        };
        
        const cryptoSymbols = {
            'bitcoin': 'BTC',
            'ethereum': 'ETH',
            'tether': 'USDT',
            'binancecoin': 'BNB',
            'solana': 'SOL',
            'ripple': 'XRP',
            'dogecoin': 'DOGE',
            'cardano': 'ADA',
            'tron': 'TRX',
            'avalanche-2': 'AVAX'
        };
        
        const crypto = {};
        
        for (const [id, info] of Object.entries(data)) {
            const symbol = cryptoSymbols[id] || id.substring(0, 3).toUpperCase();
            const price = info.usd || 0;
            const change = info.usd_24h_change || 0;
            
            crypto[symbol] = {
                name: cryptoNames[id] || id.charAt(0).toUpperCase() + id.slice(1),
                symbol: symbol,
                price_usd: price,
                change_24h: Math.round(change * 100) / 100,
                trend: change >= 0 ? 'up' : 'down'
            };
        }
        
        return crypto;
        
    } catch (error) {
        return {};
    }
}

// ===== Main Functions =====

// Fetch currencies
async function fetchCurrencies() {
    try {
        output(`📊 Fetching currencies from: ${SOURCE_URL}`);
        
        const html = await fetchHTML(SOURCE_URL);
        
        if (html === false) {
            output('❌ Failed to fetch currencies!', 'error');
            
            if (fs.existsSync('data/currencies.json')) {
                output('📌 Keeping existing currencies data', 'warning');
                return 0;
            }
            
            return 0;
        }
        
        output(`✅ HTML fetched successfully (${html.length} bytes)`);
        output('🔍 Parsing currency data...', 'info');
        
        const rates = parseCurrencyRates(html);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: SOURCE_URL,
            fetched_at: new Date().toISOString(),
            rates: rates
        };
        
        saveJSON('data/currencies.json', data);
        output(`✅ Currencies updated: ${Object.keys(rates).length} currencies`, 'success');
        
        return Object.keys(rates).length;
        
    } catch (error) {
        console.error('❌ Error fetching currencies:', error.message);
        
        if (fs.existsSync('data/currencies.json')) {
            output('📌 Keeping existing currencies data', 'warning');
            return 0;
        }
        
        return 0;
    }
}

// Fetch gold prices
async function fetchGold() {
    try {
        output('🥇 Fetching gold prices...');
        
        const html = await fetchHTML(GOLD_URL);
        
        if (html === false) {
            output('❌ Failed to fetch gold prices!', 'error');
            
            if (fs.existsSync('data/gold.json')) {
                output('📌 Keeping existing gold data', 'warning');
                return 0;
            }
            
            return 0;
        }
        
        output('🔍 Parsing gold data...', 'info');
        
        const gold = parseGoldRates(html);
        
        const data = {
            lastUpdate: getTimestamp(),
            source: GOLD_URL,
            fetched_at: new Date().toISOString(),
            prices: gold
        };
        
        saveJSON('data/gold.json', data);
        output(`✅ Gold prices updated: ${Object.keys(gold).length} types`, 'success');
        
        return Object.keys(gold).length;
        
    } catch (error) {
        console.error('❌ Error fetching gold prices:', error.message);
        
        if (fs.existsSync('data/gold.json')) {
            output('📌 Keeping existing gold data', 'warning');
            return 0;
        }
        
        return 0;
    }
}

// Fetch crypto prices
async function fetchCrypto() {
    try {
        output('₿ Fetching crypto prices...');
        
        const crypto = await fetchCryptoPrices();
        
        if (Object.keys(crypto).length === 0) {
            output('⚠️ Failed to fetch crypto prices (will try later)', 'warning');
            
            if (fs.existsSync('data/crypto.json')) {
                output('📌 Keeping existing crypto data', 'warning');
                return 0;
            }
            
            return 0;
        }
        
        const data = {
            lastUpdate: getTimestamp(),
            source: CRYPTO_URL,
            fetched_at: new Date().toISOString(),
            prices: crypto
        };
        
        saveJSON('data/crypto.json', data);
        output(`✅ Crypto prices updated: ${Object.keys(crypto).length} currencies`, 'success');
        
        return Object.keys(crypto).length;
        
    } catch (error) {
        console.error('❌ Error fetching crypto prices:', error.message);
        
        if (fs.existsSync('data/crypto.json')) {
            output('📌 Keeping existing crypto data', 'warning');
            return 0;
        }
        
        return 0;
    }
}

// ===== Main Execution =====
async function main() {
    console.log('🚀 Starting data fetch...');
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
        // Fetch all data in parallel
        const [currenciesCount, goldCount, cryptoCount] = await Promise.all([
            fetchCurrencies(),
            fetchGold(),
            fetchCrypto()
        ]);
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('='.repeat(50));
        console.log('✨ All data fetch completed!');
        console.log(`📊 Currencies: ${currenciesCount}`);
        console.log(`🥇 Gold items: ${goldCount}`);
        console.log(`₿ Crypto currencies: ${cryptoCount}`);
        console.log(`⏱️ Duration: ${duration} seconds`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        
        const totalFetched = currenciesCount + goldCount + cryptoCount;
        if (totalFetched === 0) {
            console.log('⚠️ Warning: No new data was fetched (existing data kept)');
        }
        
    } catch (error) {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    }
}

// Run script
if (require.main === module || !module.parent) {
    main();
}

module.exports = {
    fetchCurrencies,
    fetchGold,
    fetchCrypto
};
