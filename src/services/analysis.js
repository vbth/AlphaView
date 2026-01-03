/**
 * Analysis Service
 * ================
 * Calculates financial metrics such as Performance, Trend, and Volatility.
 * Transforms raw data for UI presentation.
 */

/**
 * Extracts pure price data from the Yahoo object.
 * @param {Object} chartResult - Raw data object.
 * @returns {Array<number>} Array of price values.
 */
function extractPrices(chartResult) {
    const adjClose = chartResult.indicators.adjclose?.[0]?.adjclose;
    const close = chartResult.indicators.quote[0].close;

    // Try AdjClose first, but only if valid data exists
    let arr = adjClose;
    let valid = (arr && arr.length > 0) ? arr.filter(p => p !== null && p !== undefined) : [];

    // If AdjClose empty, use Close
    if (valid.length === 0 && close) {
        arr = close;
    }

    if (!arr) return [];
    return arr.filter(p => p !== null && p !== undefined);
}

/**
 * Calculates Simple Moving Average (SMA).
 * @param {Array<number>} data - Price data.
 * @param {number} window - Time window.
 * @returns {number|null} SMA value or null.
 */
function calculateSMA(data, window) {
    if (data.length < window) return null;
    return data.slice(-window).reduce((a, b) => a + b, 0) / window;
}

/**
 * Calculates daily logarithmic returns.
 * @param {Array<number>} prices - Price data.
 * @returns {Array<number>} Log returns.
 */
function calculateDailyReturns(prices) {
    let returns = [];
    for (let i = 1; i < prices.length; i++) returns.push(Math.log(prices[i] / prices[i - 1]));
    return returns;
}

/**
 * Calculates Standard Deviation (Volatility).
 * @param {Array<number>} data - Returns data.
 * @returns {number} Standard Deviation.
 */
function calculateStdDev(data) {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
}

/**
 * Performs technical analysis based on fetched chart data.
 * Extracts prices, calculates Performance, SMA 50/200, Trend Signal, and Volatility.
 * Combines metrics with Metadata for UI.
 * 
 * @param {Object} chartResult - Yahoo API Raw Data.
 * @returns {Object|null} Analysis result object or null if data missing.
 */
export function analyze(chartResult) {
    const prices = extractPrices(chartResult);
    const meta = chartResult.meta;

    // Without prices: Check fallback (only current price in Meta?)
    if (!prices || prices.length < 1) {
        if (meta && meta.regularMarketPrice) {
            return {
                symbol: meta.symbol,
                name: meta.shortName || meta.longName || meta.symbol,
                type: meta.instrumentType || 'EQUITY',
                exchange: meta.exchangeName || meta.fullExchangeName || 'N/A',
                price: meta.regularMarketPrice,
                currency: meta.currency,
                change: 0,
                changePercent: 0,
                trend: 'neutral',
                volatility: 0,
                sma50: null,
                sma200: null,
                timestamp: new Date().toLocaleTimeString()
            };
        }
        return null; // Not enough data
    }

    const currentPrice = prices[prices.length - 1];

    // Performance Calculation
    let refPrice = prices[0];

    // Exception: For Intraday (1d), use previous close if available
    if (meta.range === '1d' && meta.chartPreviousClose) {
        refPrice = meta.chartPreviousClose;
    }

    const change = currentPrice - refPrice;
    if (prices.length === 1 && !meta.chartPreviousClose) refPrice = currentPrice;

    const changePercent = (refPrice !== 0 && refPrice !== currentPrice) ? (change / refPrice) * 100 : 0;

    // Moving Averages
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);

    // Trend Determination
    let trend = 'neutral';
    if (currentPrice > sma50 && currentPrice > sma200) trend = 'bullish';
    if (currentPrice < sma50 && currentPrice < sma200) trend = 'bearish';

    // Volatility (Annualized)
    const returns = calculateDailyReturns(prices);
    const stdDev = calculateStdDev(returns);
    const volatility = stdDev * Math.sqrt(252) * 100;

    const fullName = meta.shortName || meta.longName || meta.symbol;
    const type = meta.instrumentType || 'EQUITY';

    return {
        symbol: meta.symbol,
        name: fullName,
        type: type,
        exchange: meta.exchangeName || meta.fullExchangeName || 'N/A',
        price: currentPrice,
        currency: meta.currency,
        change: change,
        changePercent: changePercent,
        trend: trend,
        volatility: volatility,
        sma50: sma50,
        sma200: sma200,
        timestamp: new Date().toLocaleTimeString()
    };
}
