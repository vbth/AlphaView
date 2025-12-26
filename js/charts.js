/**
 * Charts Module
 * Engine: TradingView Lightweight Charts
 * Fix: Dedup timestamps to prevent crashes
 */

let chart = null;
let areaSeries = null;
let sma50Series = null;
let sma200Series = null;
let currentCurrency = 'USD';

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

function updatePerformance(startVal, endVal) {
    const el = document.getElementById('chart-performance');
    if (!el || !startVal) return;
    const diff = endVal - startVal;
    const pct = (diff / startVal) * 100;
    const sign = pct >= 0 ? '+' : '';
    const colorClass = pct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    el.innerHTML = `<span class="${colorClass}">${sign}${pct.toFixed(2).replace('.',',')}%</span>`;
}

export function renderChart(containerId, rawData, range = '1y', analysisData = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    currentCurrency = rawData.meta.currency || 'USD';

    // 1. Data Cleaning & Dedup
    const lineData = [];
    const uniqueTimeMap = new Set();
    let validTimestamps = [];
    let validPrices = [];

    for(let i=0; i<timestamps.length; i++) {
        if(prices[i] !== null && prices[i] !== undefined) {
            // Dedup Check: Yahoo sends duplicate seconds sometimes
            if(uniqueTimeMap.has(timestamps[i])) continue;
            uniqueTimeMap.add(timestamps[i]);

            lineData.push({ time: timestamps[i], value: prices[i] });
            validTimestamps.push(timestamps[i]);
            validPrices.push(prices[i]);
        }
    }

    if(lineData.length === 0) return;

    // Sorting (just to be safe)
    lineData.sort((a,b) => a.time - b.time);

    updateRangeInfo(validTimestamps[0], validTimestamps[validTimestamps.length-1], range);
    updatePerformance(validPrices[0], validPrices[validPrices.length-1]);

    if (chart) { chart.remove(); chart = null; }
    container.innerHTML = '';

    const isDark = document.documentElement.classList.contains('dark');
    const bg = 'transparent';
    const gridColor = isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.5)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
    const startPrice = validPrices[0];
    const endPrice = validPrices[validPrices.length - 1];
    const isBullish = endPrice >= startPrice;
    
    const mainColor = isBullish ? '#22c55e' : '#ef4444'; 
    const topColor = isBullish ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const bottomColor = isBullish ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: { background: { type: 'solid', color: bg }, textColor: textColor, fontFamily: 'Inter' },
        grid: { vertLines: { color: gridColor, style: 2 }, horzLines: { color: gridColor, style: 2 } },
        rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
        crosshair: { vertLine: { labelVisible: false } },
        handleScroll: false, handleScale: false, 
    });

    areaSeries = chart.addAreaSeries({
        lineColor: mainColor, topColor: topColor, bottomColor: bottomColor, lineWidth: 2,
        priceFormat: { type: 'custom', formatter: price => formatCurrencyValue(price, currentCurrency) },
    });
    areaSeries.setData(lineData);

    const isIntraday = (range === '1d' || range === '5d');
    if (!isIntraday && validPrices.length > 50) {
        sma50Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const sma50Data = calculateSMA_Data(validTimestamps, validPrices, 50);
        sma50Series.setData(sma50Data);
    }
    if (!isIntraday && validPrices.length > 200) {
        sma200Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        const sma200Data = calculateSMA_Data(validTimestamps, validPrices, 200);
        sma200Series.setData(sma200Data);
    }

    const resizeObserver = new ResizeObserver(entries => {
        if (entries.length === 0 || entries[0].target !== container) return;
        const newRect = entries[0].contentRect;
        chart.applyOptions({ width: newRect.width, height: newRect.height });
    });
    resizeObserver.observe(container);
    
    chart.timeScale().fitContent();
}