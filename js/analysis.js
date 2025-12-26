/**
 * Analysis Module
 * Calculates metrics based on the full loaded range.
 */
export function analyze(chartResult) {
    const prices = extractPrices(chartResult);
    const meta = chartResult.meta;
    
    if (prices.length < 2) return null;

    const currentPrice = prices[prices.length - 1];
    
    // WICHTIG: Wir vergleichen jetzt Start vs. Ende des geladenen Zeitraums
    // (außer bei 1T/Intraday, da nehmen wir den Close vom Vortag als Referenz für die %-Anzeige)
    let refPrice = prices[0];
    
    // Sonderfall: Wenn chartPreviousClose existiert (bei Intraday), ist das genauer für Tagesperformance
    if (meta.range === '1d' && meta.chartPreviousClose) {
        refPrice = meta.chartPreviousClose;
    }

    const change = currentPrice - refPrice;
    const changePercent = (refPrice !== 0) ? (change / refPrice) * 100 : 0;
    
    // Trend & Volatilität
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    
    let trend = 'neutral';
    if (currentPrice > sma50 && currentPrice > sma200) trend = 'bullish';
    if (currentPrice < sma50 && currentPrice < sma200) trend = 'bearish';

    const returns = calculateDailyReturns(prices);
    const stdDev = calculateStdDev(returns);
    const volatility = stdDev * Math.sqrt(252) * 100;

    const fullName = meta.shortName || meta.longName || meta.symbol;
    const type = meta.instrumentType || 'EQUITY';

    return {
        symbol: meta.symbol, 
        name: fullName, 
        type: type,
        price: currentPrice, 
        currency: meta.currency,
        change: change, 
        changePercent: changePercent, 
        trend: trend, 
        volatility: volatility,
        sma50: sma50, 
        sma200: sma200, 
        timestamp: new Date().toLocaleTimeString(),
        // Wir speichern auch die URL hier nicht, das macht der Store/App Merge
    };
}

function extractPrices(chartResult) {
    const adjClose = chartResult.indicators.adjclose?.[0]?.adjclose;
    const close = chartResult.indicators.quote[0].close;
    return (adjClose || close).filter(p => p !== null && p !== undefined);
}

function calculateSMA(data, window) {
    if (data.length < window) return null;
    return data.slice(-window).reduce((a, b) => a + b, 0) / window;
}

function calculateDailyReturns(prices) {
    let returns = [];
    for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i - 1]));
    return returns;
}

function calculateStdDev(data) {
    const n = data.length;
    if (n === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n);
}