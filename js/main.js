// ===== Theme Toggle =====
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

// Toggle theme
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// ===== Fetch Data with Cache Busting =====
async function fetchData(url) {
    try {
        // Add timestamp to prevent caching
        const response = await fetch(`${url}?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// ===== Format Numbers =====
function formatNumber(num) {
    return new Intl.NumberFormat('ar-SY').format(num);
}

// ===== Format Date =====
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('ar-SY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

// ===== Get Currency Flag =====
function getCurrencyFlag(currencyName) {
    const flags = {
        'دولار أمريكي': '🇺🇸',
        'يورو': '🇪🇺',
        'جنيه إسترليني': '🇬🇧',
        'ريال سعودي': '🇸🇦',
        'درهم إماراتي': '🇦🇪',
        'دينار كويتي': '🇰🇼',
        'دينار أردني': '🇯🇴',
        'ليرة تركية': '🇹🇷',
        'ريال قطري': '🇶🇦',
        'درهم مغربي': '🇲🇦',
        'ريال عماني': '🇴🇲',
        'دينار بحريني': '🇧🇭',
        'ريال يمني': '🇾🇪',
        'دينار عراقي': '🇮🇶',
        'جنيه مصري': '🇪🇬',
        'ريال سعودي': '🇸🇦',
        'ليرة لبنانية': '🇱🇧',
        'راند جنوب أفريقيا': '🇿🇦',
        'روبية هندية': '🇮🇳',
        'روبية باكستانية': '🇵🇰',
        'ين ياباني': '🇯🇵',
        'يوان صيني': '🇨🇳',
        'فرنك سويسري': '🇨🇭',
        'دولار كندي': '🇨🇦',
        'دولار أسترالي': '🇦🇺',
        'كرونة سويدية': '🇸🇪',
        'كرونة نرويجية': '🇳🇴',
        'كرونة دنماركية': '🇩🇰',
        'روبل روسي': '🇷🇺',
        'بيزو مكسيكي': '🇲🇽',
        'ريال برازيلي': '🇧🇷',
        'وون كوري جنوبي': '🇰🇷',
        'روبية إندونيسية': '🇮🇩',
        'بات تايلاندي': '🇹🇭',
        'بيزو فلبيني': '🇵🇭',
        'دولار سنغافوري': '🇸🇬',
        'درهم جزائري': '🇩🇿',
        'دينار تونسي': '🇹🇳',
        'دينار ليبي': '🇱🇾',
        'أوقية موريتانية': '🇲🇷',
        'شيلنج صومالي': '🇸🇴',
        'فرنك جيبوتي': '🇩🇯',
        'ريال سوداني': '🇸🇩',
        'نايرا نيجيري': '🇳🇬',
        'شيلنج كيني': '🇰🇪',
        'شيلنج أوغندي': '🇺🇬',
        'شيلنج تنزاني': '🇹🇿',
        'فرنك رواندي': '🇷🇼',
        'فرنك بوروندي': '🇧🇮',
        'كوادز أنغولي': '🇦🇴',
        'كوانزا زامبي': '🇿🇲',
        'بولا بوتسواني': '🇧🇼',
        'ليلانجيني سوازي': '🇸🇿',
        'لوتي ليسوتو': '🇱🇸',
        'راند ناميبي': '🇳🇦',
        'دولار زيمبابوي': '🇿🇼',
        'مالاوي كواشا': '🇲🇼',
        'موزامبيق متيكال': '🇲🇿',
        'كوموري فرنك': '🇰🇲',
        'روبي موريشيوسي': '🇲🇺',
        'روبي سيموري': '🇸🇨',
        'روبي سيشلي': '🇸🇨',
        'دولار فيجي': '🇫🇯',
        'بات لاو': '🇱🇦',
        'ريال كمبودي': '🇰🇭',
        'كيات ميانماري': '🇲🇲',
        'تيكال كامبودي': '🇰🇭',
        'روبي سريلانكي': '🇱🇰',
        'روبي نيبالي': '🇳🇵',
        'روبي بنغلادشي': '🇧🇩',
        'بيزو كولومبي': '🇨🇴',
        'سول بروي': '🇵🇪',
        'غواناراني باراغواي': '🇵🇾',
        'بيزو أوروغواي': '🇺🇾',
        'بيزو تشيلي': '🇨🇱',
        'بيزو أرجنتيني': '🇦🇷',
        'دولار جاياني': '🇬🇾',
        'دولار سورينامي': '🇸🇷',
        'غيلدر أنتيلي هولندي': '🇳🇱',
        'كوكونت بربادوس': '🇧🇧',
        'دولار باهامي': '🇧🇸',
        'دولار برمودي': '🇧🇲',
        'دولار بليزي': '🇧🇿',
        'كوستاريكان كولون': '🇨🇷',
        'دومينيكان بيسو': '🇩🇴',
        'غواتيمالا كوتزال': '🇬🇹',
        'لومبيرا هندوراسي': '🇭🇳',
        'جمايكاي دولار': '🇯🇲',
        'نيكاراغوا كوردوبا': '🇳🇮',
        'باما بانمي': '🇵🇦',
        'ترينيداد دولار': '🇹🇹',
        'دولار شرق الكاريبي': '🇪🇨',
        'روبي جزر القمر': '🇰🇲'
    };
    
    return flags[currencyName] || '💱';
}

// ===== Render Currencies =====
function renderCurrencies(data, containerId, badgeId) {
    const container = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    
    if (!data || !data.rates || data.rates.length === 0) {
        container.innerHTML = '<div class="error-message">لا توجد بيانات متاحة</div>';
        badge.textContent = '';
        return;
    }
    
    // Update badge with last update time
    if (data.lastUpdate) {
        badge.textContent = formatDate(data.lastUpdate);
    }
    
    // Render currency items
    container.innerHTML = data.rates.map(currency => `
        <div class="currency-item">
            <div class="currency-name">
                <span class="currency-flag">${getCurrencyFlag(currency.name)}</span>
                <span>${currency.name}</span>
            </div>
            <div class="currency-prices">
                <span class="buy-price">${formatNumber(currency.buy)} ل.س</span>
                <span class="price-label">شراء: ${formatNumber(currency.sell)} ل.س</span>
            </div>
        </div>
    `).join('');
}

// ===== Render Gold Prices =====
function renderGoldPrices(data, containerId, badgeId) {
    const container = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    
    if (!data || !data.prices || data.prices.length === 0) {
        container.innerHTML = '<div class="error-message">لا توجد بيانات متاحة</div>';
        badge.textContent = '';
        return;
    }
    
    // Update badge with last update time
    if (data.lastUpdate) {
        badge.textContent = formatDate(data.lastUpdate);
    }
    
    // Render gold items
    container.innerHTML = data.prices.map(item => `
        <div class="currency-item">
            <div class="currency-name">
                <span class="currency-flag">🥇</span>
                <span>${item.name}</span>
            </div>
            <div class="currency-prices">
                <span class="buy-price">${formatNumber(item.price)} ل.س</span>
                <span class="price-label">للكيلوغرام</span>
            </div>
        </div>
    `).join('');
}

// ===== Render Crypto Prices =====
function renderCryptoPrices(data, containerId, badgeId) {
    const container = document.getElementById(containerId);
    const badge = document.getElementById(badgeId);
    
    if (!data || !data.prices || data.prices.length === 0) {
        container.innerHTML = '<div class="error-message">لا توجد بيانات متاحة</div>';
        badge.textContent = '';
        return;
    }
    
    // Update badge with last update time
    if (data.lastUpdate) {
        badge.textContent = formatDate(data.lastUpdate);
    }
    
    // Render crypto items
    container.innerHTML = data.prices.map(item => `
        <div class="currency-item">
            <div class="currency-name">
                <span class="currency-flag">${item.symbol || '₿'}</span>
                <span>${item.name}</span>
            </div>
            <div class="currency-prices">
                <span class="buy-price">${formatNumber(item.price)} $</span>
                <span class="price-label">${formatNumber(item.price_syp)} ل.س</span>
            </div>
        </div>
    `).join('');
}

// ===== Update Last Update Display =====
function updateLastUpdateDisplay(currenciesData, goldData, cryptoData) {
    const lastUpdateDiv = document.getElementById('lastUpdate');
    
    // Find the most recent update time
    const updates = [];
    
    if (currenciesData?.lastUpdate) updates.push(currenciesData.lastUpdate);
    if (goldData?.lastUpdate) updates.push(goldData.lastUpdate);
    if (cryptoData?.lastUpdate) updates.push(cryptoData.lastUpdate);
    
    if (updates.length > 0) {
        const mostRecent = Math.max(...updates);
        lastUpdateDiv.innerHTML = `آخر تحديث: ${formatDate(mostRecent)}`;
    } else {
        lastUpdateDiv.innerHTML = '<span class="error-message">لا توجد بيانات محدثة</span>';
    }
}

// ===== Load All Data =====
async function loadAllData() {
    // Load currencies data
    const currenciesData = await fetchData('data/currencies.json');
    if (currenciesData) {
        renderCurrencies(currenciesData, 'currenciesContent', 'currenciesBadge');
    } else {
        document.getElementById('currenciesContent').innerHTML = '<div class="error-message">فشل تحميل بيانات العملات</div>';
        document.getElementById('currenciesBadge').textContent = '';
    }
    
    // Load gold data
    const goldData = await fetchData('data/gold.json');
    if (goldData) {
        renderGoldPrices(goldData, 'goldContent', 'goldBadge');
    } else {
        document.getElementById('goldContent').innerHTML = '<div class="error-message">فشل تحميل بيانات الذهب</div>';
        document.getElementById('goldBadge').textContent = '';
    }
    
    // Load crypto data
    const cryptoData = await fetchData('data/crypto.json');
    if (cryptoData) {
        renderCryptoPrices(cryptoData, 'cryptoContent', 'cryptoBadge');
    } else {
        document.getElementById('cryptoContent').innerHTML = '<div class="error-message">فشل تحميل بيانات العملات الرقمية</div>';
        document.getElementById('cryptoBadge').textContent = '';
    }
    
    // Update last update display
    updateLastUpdateDisplay(currenciesData, goldData, cryptoData);
}

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    
    // Refresh data every 5 minutes (optional)
    // setInterval(loadAllData, 5 * 60 * 1000);
});

// ===== Service Worker Registration (Optional) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}
