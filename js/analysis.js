/**
 * Analysis Module
 * Calculates financial metrics (Volatility, SMA, Returns).
 */

/**
 * Hauptfunktion zur Analyse eines Datensatzes.
 * @param {Object} chartResult - Das Rohobjekt von Yahoo Finance
 */
export function analyze(chartResult) {
    const prices = extractPrices(chartResult);
    const meta = chartResult.meta;
    
    if (prices.length < 2) return null;

    const currentPrice = prices[prices.length - 1];
    const prevClose = meta.chartPreviousClose || prices[prices.length - 2];
    
    // 1. Basis Performance
    const change = currentPrice - prevClose;
    const changePercent = (change / prevClose) * 100;

    // 2. Trend (SMA)
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    
    // Trend-Einschätzung
    let trend = 'neutral';
    if (currentPrice > sma50 && currentPrice > sma200) trend = 'bullish'; // Aufwärtstrend
    if (currentPrice < sma50 && currentPrice < sma200) trend = 'bearish'; // Abwärtstrend

    // 3. Volatilität (Risiko) - Annualisiert auf 252 Handelstage
    const returns = calculateDailyReturns(prices);
    const stdDev = calculateStdDev(returns);
    const volatility = stdDev * Math.sqrt(252) * 100; // in Prozent

    return {
        symbol: meta.symbol,
        price: currentPrice,
        currency: meta.currency,
        change: change,
        changePercent: changePercent,
        trend: trend, // 'bullish', 'bearish', 'neutral'
        volatility: volatility, // Zahl (z.B. 15.5)
        sma50: sma50,
        sma200: sma200,
        timestamp: new Date().toLocaleTimeString()
    };
}

// --- HELPER FUNCTIONS ---

function extractPrices(chartResult) {
    // Yahoo schachtelt die Preise tief: chart.result[0].indicators.quote[0].close
    // Wir filtern null-Werte heraus (passiert an Feiertagen oder bei Fehlern)
    const adjClose = chartResult.indicators.adjclose?.[0]?.adjclose;
    const close = chartResult.indicators.quote[0].close;
    
    // Bevorzuge Adjusted Close, fallback auf Close
    const prices = adjClose || close;
    return prices.filter(p => p !== null && p !== undefined);
}

function calculateSMA(data, window) {
    if (data.length < window) return null;
    // Nimm nur die letzten 'window' Preise
    const slice = data.slice(-window);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / window;
}

function calculateDailyReturns(prices) {
    let returns = [];
    for (let i = 1; i < prices.length; i++) {
        const ret = Math.log(prices[i] / prices[i - 1]); // Log Returns für Genauigkeit
        returns.push(ret);
    }
    return returns;
}

function calculateStdDev(data) {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    return Math.sqrt(variance);
}