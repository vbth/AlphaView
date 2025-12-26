/**
 * Charts Module
 * Engine: TradingView Lightweight Charts
 * Features: Interactive Crosshair, Area Chart, SMAs, ResizeObserver
 */

let chart = null;
let areaSeries = null;
let sma50Series = null;
let sma200Series = null;
let currentCurrency = 'USD'; // State for formatter

// --- HELPERS ---

const formatCurrencyValue = (val, currency) => {
    const locale = (currency === 'EUR') ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

function calculateSMA_Data(timestamps, prices, window) {
    let result = [];
    for (let i = 0; i < prices.length; i++) {
        if (i < window - 1) continue;
        let sum = 0;
        for (let j = 0; j < window; j++) sum += prices[i - j];
        result.push({ time: timestamps[i], value: sum / window });
    }
    return result;
}

// Update Text UI (Badge)
function updateRangeInfo(startTs, endTs, range) {
    const el = document.getElementById('dynamic-range-text');
    if (!el) return;

    try {
        const start = new Date(startTs * 1000);
        const end = new Date(endTs * 1000);
        
        const fDate = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const fMonthYear = (d) => d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
        const fYear = (d) => d.getFullYear(); 
        const fmtTime = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

        let text = "";
        if (range === '1d') text = `Handelstag: ${fDate(end)} <span class="opacity-50 ml-1 font-normal">(${fmtTime.format(end)})</span>`;
        else if (range === '5d') text = `${fDate(start)} – ${fDate(end)}`;
        else if (range === '1mo' || range === '6mo') text = `${fMonthYear(start).replace('.','/')} – ${fMonthYear(end).replace('.','/')}`;
        else if (range === '1y') { const y1 = fYear(start); const y2 = fYear(end); text = (y1 === y2) ? `${y1}` : `${y1} – ${y2}`; } 
        else text = `${fYear(start)} – ${fYear(end)}`;
        
        el.innerHTML = text;
    } catch (err) { console.error(err); }
}

// Update Performance Badge
function updatePerformance(startVal, endVal) {
    const el = document.getElementById('chart-performance');
    if (!el || !startVal) return;

    const diff = endVal - startVal;
    const pct = (diff / startVal) * 100;
    const sign = pct >= 0 ? '+' : '';
    const colorClass = pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    el.innerHTML = `<span class="${colorClass}">${sign}${pct.toFixed(2)}%</span>`;
}

// --- MAIN RENDER FUNCTION ---

export function renderChart(containerId, rawData, range = '1y', analysisData = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Data Preparation
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    currentCurrency = rawData.meta.currency || 'USD';

    // Filter nulls and create LWC format objects
    const lineData = [];
    let validTimestamps = [];
    let validPrices = [];

    for(let i=0; i<timestamps.length; i++) {
        if(prices[i] !== null && prices[i] !== undefined) {
            lineData.push({ time: timestamps[i], value: prices[i] });
            validTimestamps.push(timestamps[i]);
            validPrices.push(prices[i]);
        }
    }

    if(lineData.length === 0) return;

    // UI Updates (Text)
    updateRangeInfo(validTimestamps[0], validTimestamps[validTimestamps.length-1], range);
    updatePerformance(validPrices[0], validPrices[validPrices.length-1]);

    // 2. Chart Cleanup (if re-rendering)
    if (chart) {
        chart.remove();
        chart = null;
    }
    container.innerHTML = ''; // Ensure clean slate

    // 3. Colors Setup (Dark/Light)
    const isDark = document.documentElement.classList.contains('dark');
    const bg = 'transparent'; // Transparent damit es sich einfügt
    const gridColor = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.5)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
    // Determine Line Color based on Trend
    const startPrice = validPrices[0];
    const endPrice = validPrices[validPrices.length - 1];
    const isBullish = endPrice >= startPrice;
    
    const mainColor = isBullish ? '#22c55e' : '#ef4444'; // Green or Red
    const topColor = isBullish ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const bottomColor = isBullish ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    // 4. Create Chart
    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
            background: { type: 'solid', color: bg },
            textColor: textColor,
            fontFamily: 'Inter',
        },
        grid: {
            vertLines: { color: gridColor, style: 2 }, // Dashed
            horzLines: { color: gridColor, style: 2 },
        },
        rightPriceScale: {
            borderVisible: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
            borderVisible: false,
            timeVisible: true, // Shows time for intraday
            secondsVisible: false,
        },
        crosshair: {
            vertLine: { labelVisible: false },
        },
        handleScroll: false,
        handleScale: false, 
    });

    // 5. Add Main Series (Area)
    areaSeries = chart.addAreaSeries({
        lineColor: mainColor,
        topColor: topColor,
        bottomColor: bottomColor,
        lineWidth: 2,
        priceFormat: {
            type: 'custom',
            formatter: price => formatCurrencyValue(price, currentCurrency),
        },
    });
    areaSeries.setData(lineData);

    // 6. Add SMAs (if applicable)
    const isIntraday = (range === '1d' || range === '5d');
    
    if (!isIntraday && validPrices.length > 50) {
        sma50Series = chart.addLineSeries({
            color: '#3b82f6', // Blue
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        const sma50Data = calculateSMA_Data(validTimestamps, validPrices, 50);
        sma50Series.setData(sma50Data);
    }

    if (!isIntraday && validPrices.length > 200) {
        sma200Series = chart.addLineSeries({
            color: '#f59e0b', // Orange
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        const sma200Data = calculateSMA_Data(validTimestamps, validPrices, 200);
        sma200Series.setData(sma200Data);
    }

    // 7. Responsive Resizing
    const resizeObserver = new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) return;
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width, height: newRect.height });
    });
    resizeObserver.observe(container);

    // 8. Crosshair Handler (Updates Header Price on Hover)
    // Optional: Could implement dynamic header update here
    
    chart.timeScale().fitContent();
}