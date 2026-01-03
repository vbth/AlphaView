/**
 * API Service
 * ===========
 * Handles data fetching from Yahoo Finance via various proxies.
 * Implements fallback strategies for maximum reliability.
 */

// List of CORS proxies for higher availability
const PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest='
];

const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

/**
 * Executes an HTTP request via a list of proxies.
 * Sequentially tries each defined proxy until a successful request (Status 200 + valid JSON) occurs.
 * Includes a timeout mechanism for slow responses.
 * @param {string} targetUrl - The target URL to fetch.
 * @returns {Promise<Object>} The parsed JSON result.
 * @throws {Error} If all proxies fail.
 */
async function fetchViaProxy(targetUrl) {
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // Try all proxies
        for (const proxyBase of PROXIES) {
            try {
                const requestUrl = `${proxyBase}${encodeURIComponent(targetUrl)}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s Fail-Fast Timeout

                const response = await fetch(requestUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`Status ${response.status}`);

                const text = await response.text();
                if (!text || text.trim().length === 0) throw new Error("Empty Response");

                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error("Invalid JSON");
                }
            } catch (error) {
                lastError = error;
                // console.warn(`Proxy ${proxyBase} failed: ${error.message}`);
            }
        }

        // Exponential Backoff if retrying
        if (attempt < MAX_RETRIES) {
            const delay = 1000 * attempt;
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError || new Error('All proxies and retries failed');
}

/**
 * Helper for the actual chart data fetch.
 * Constructs the Yahoo Finance URL and executes the proxy fetch.
 * Validates the data structure integrity.
 * @param {string} symbol - Ticker symbol.
 * @param {string} range - Time range.
 * @param {string} interval - Time interval.
 * @returns {Promise<Object>} The 'result' object from Yahoo Chart API.
 */
async function tryFetch(symbol, range, interval) {
    const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
    const data = await fetchViaProxy(targetUrl);

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error('Invalid Data Structure');
    }

    // VALIDATION: Check for real price data.
    const res = data.chart.result[0];
    const quote = res.indicators.quote[0];
    const hasPrices = quote.close && quote.close.some(p => p !== null && p !== undefined);

    // Accept cases WITHOUT historical prices if we have current price metadata.
    // Important for exotic funds (e.g. UIV7.SG) that often return empty charts.
    const hasCurrentPrice = res.meta && (res.meta.regularMarketPrice !== undefined || res.meta.chartPreviousClose !== undefined);

    if (!hasPrices && !hasCurrentPrice) {
        throw new Error('No Price Data Included');
    }

    return res;
}

/**
 * Fetches chart data (with caching and fallback strategy).
 * 
 * Strategy:
 * 1. Check Session Cache (TTL: 5 Min)
 * 2. Attempt: Requested Range & Interval
 * 3. Fallback: 5 Days Daily (Standard Fallback)
 * 4. Emergency Fallback: 1 Month Daily (Funds often have data gaps)
 * 
 * @param {string} symbol - Ticker symbol (e.g., "AAPL", "btc-usd")
 * @param {string} range - Range (1d, 5d, 1mo, 1y, etc.)
 * @param {string} interval - Interval (5m, 15m, 1d, 1wk)
 * @returns {Promise<Object|null>}
 */
export async function fetchChartData(symbol, range = '1y', interval = '1d') {
    const cacheKey = `alphaview_cache_${symbol}_${range}_${interval}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 Min TTL
            return data;
        }
    }

    try {
        const data = await tryFetch(symbol, range, interval);
        sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
        return data;
    } catch (error) {
        // Fallback Logic
        if (interval !== '1d' && interval !== '1wk' && interval !== '1mo') {
            try {
                // 2. Fallback: 5d 1d
                return await tryFetch(symbol, '5d', '1d');
            } catch (fallbackError) {
                try {
                    // 3. Emergency Fallback: 1mo 1d
                    return await tryFetch(symbol, '1mo', '1d');
                } catch (finalErr) {
                    console.error(`All attempts failed for ${symbol}`);
                    return null;
                }
            }
        }
        return null;
    }
}

/**
 * Searches for securities via Yahoo Finance Auto-Complete API.
 * Used for the Header Search Bar.
 * Filters results to favor relevant hits (Stocks, ETFs, Funds).
 * @param {string} query - Search term.
 * @returns {Promise<Array>} List of found assets (symbol, name, type, exchange).
 */
export async function searchSymbol(query) {
    if (!query || query.length < 1) return [];
    try {
        const targetUrl = `${BASE_URL_SEARCH}?q=${query}&quotesCount=10&newsCount=0`;
        const data = await fetchViaProxy(targetUrl);
        if (!data.quotes) return [];

        return data.quotes
            .filter(q => q.isYahooFinance)
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                type: q.quoteType || 'UNKNOWN',
                exchange: q.exchange
            }));
    } catch (error) {
        console.error("Search Error:", error);
        return [];
    }
}
