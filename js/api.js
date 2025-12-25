/**
 * API Module
 * Handles network requests to Yahoo Finance via CORS Proxy.
 * Updated: Robust error handling & Timeouts.
 */

// Alternativer Proxy (AllOrigins), falls corsproxy.io hakt
const PROXY_URL = 'https://api.allorigins.win/raw?url='; 
const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

/**
 * Wrapper für Fetch mit Timeout
 */
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options; // 8 Sekunden Timeout
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
  
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal  
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

/**
 * Holt Historische Daten und Metadaten für ein Symbol.
 */
export async function fetchChartData(symbol, range = '1mo', interval = '1d') {
    try {
        const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
        // WICHTIG: encodeURIComponent damit der Proxy die URL richtig liest
        const requestUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

        console.log(`API: Fetching ${symbol}...`);

        const response = await fetchWithTimeout(requestUrl);

        if (!response.ok) {
            throw new Error(`API Error Status: ${response.status}`);
        }

        const data = await response.json();

        // Yahoo Struktur Check
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            // Manchmal liefert der Proxy Fehler als JSON zurück
            console.error('API Data Invalid:', data);
            throw new Error('Invalid Data Structure from Yahoo');
        }

        return data.chart.result[0];

    } catch (error) {
        console.error('Fetch Chart Data Failed:', error);
        return null; // Return null damit UI Bescheid weiß
    }
}

/**
 * Sucht nach Symbolen.
 */
export async function searchSymbol(query) {
    if (!query || query.length < 1) return [];

    try {
        const targetUrl = `${BASE_URL_SEARCH}?q=${query}&quotesCount=5&newsCount=0`;
        const requestUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

        const response = await fetchWithTimeout(requestUrl);
        const data = await response.json();

        if (!data.quotes) return [];

        return data.quotes
            .filter(q => q.isYahooFinance)
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname,
                type: q.quoteType,
                exchange: q.exchange
            }));

    } catch (error) {
        console.error('Search Failed:', error);
        return [];
    }
}