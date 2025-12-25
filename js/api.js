/**
 * API Module
 * Handles network requests to Yahoo Finance via CORS Proxy.
 */

const PROXY_URL = 'https://corsproxy.io/?';
const BASE_URL_V8 = 'https://query1.finance.yahoo.com/v8/finance/chart';
const BASE_URL_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search';

/**
 * Holt Historische Daten und Metadaten für ein Symbol.
 * @param {string} symbol - Ticker Symbol (z.B. AAPL)
 * @param {string} range - Zeitraum (1d, 5d, 1mo, 6mo, 1y, 5y, max)
 * @param {string} interval - Kerzen-Intervall (1m, 5m, 15m, 1d, 1wk, 1mo)
 */
export async function fetchChartData(symbol, range = '1mo', interval = '1d') {
    try {
        // URL zusammenbauen
        const targetUrl = `${BASE_URL_V8}/${symbol}?interval=${interval}&range=${range}`;
        // Durch Proxy schleusen (URL encoding ist sicherer)
        const requestUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

        console.log(`Fetching: ${symbol} [${range}]`);

        const response = await fetch(requestUrl);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            throw new Error('No data found for symbol');
        }

        return data.chart.result[0];

    } catch (error) {
        console.error('Fetch Chart Data Failed:', error);
        return null; // UI muss damit umgehen
    }
}

/**
 * Sucht nach Symbolen (Autocomplete).
 * @param {string} query - Suchbegriff
 */
export async function searchSymbol(query) {
    if (!query || query.length < 1) return [];

    try {
        const targetUrl = `${BASE_URL_SEARCH}?q=${query}&quotesCount=5&newsCount=0`;
        const requestUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;

        const response = await fetch(requestUrl);
        const data = await response.json();

        if (!data.quotes) return [];

        // Filtern wir irrelevante Ergebnisse raus
        return data.quotes
            .filter(q => q.isYahooFinance) // Nur echte handelbare Instrumente
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