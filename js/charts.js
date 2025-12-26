/**
 * Charts Module
 * Engine: TradingView Lightweight Charts (v4.2.0)
 * Features: Floating Tooltip AND Static Legend for SMAs
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

function calculateSMA_Data(sortedData, window) {
    let result = [];
    for (let i = 0; i < sortedData.length; i++) {
        if (i < window - 1) continue;
        let sum = 0;
        for (let j = 0; j < window; j++) sum += sortedData[i - j].value;
        result.push({ time: sortedData[i].time, value: sum / window });
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

    if (!window.LightweightCharts) {
        console.warn("Warte auf Chart Lib...");
        setTimeout(() => renderChart(containerId, rawData, range, analysisData), 200);
        return;
    }

    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    currentCurrency = rawData.meta.currency || 'USD';

    // 1. DATA PREP
    let cleanData = [];
    const timeSet = new Set(); 

    for(let i=0; i<timestamps.length; i++) {
        const t = timestamps[i];
        const p = prices[i];
        if(p !== null && p !== undefined && t !== null && t !== undefined) {
            if(!timeSet.has(t)) {
                timeSet.add(t);
                cleanData.push({ time: t, value: p });
            }
        }
    }
    cleanData.sort((a, b) => a.time - b.time);

    if(cleanData.length === 0) {
        container.innerHTML = '<div class="text-slate-400 p-10 text-center">Keine Daten verfügbar</div>';
        return;
    }

    updateRangeInfo(cleanData[0].time, cleanData[cleanData.length-1].time, range);
    updatePerformance(cleanData[0].value, cleanData[cleanData.length-1].value);

    // 2. CLEANUP
    if (chart) {
        try { chart.remove(); } catch(e) {}
        chart = null;
    }
    container.innerHTML = '';
    // Wichtig: Relative Positionierung für absolute Kinder (Legende, Tooltip)
    container.style.position = 'relative';

    // 3. COLORS
    const isDark = document.documentElement.classList.contains('dark');
    const bg = 'transparent'; 
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    
    const startPrice = cleanData[0].value;
    const endPrice = cleanData[cleanData.length - 1].value;
    const isBullish = endPrice >= startPrice;
    
    const mainColor = isBullish ? '#22c55e' : '#ef4444'; 
    const topColor = isBullish ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const bottomColor = isBullish ? 'rgba(34, 197, 94, 0.0)' : 'rgba(239, 68, 68, 0.0)';

    // --- TOOLTIP (Maus) ---
    const toolTip = document.createElement('div');
    toolTip.style = `position: absolute; display: none; padding: 8px; box-sizing: border-box; font-size: 12px; text-align: left; z-index: 1000; top: 12px; left: 12px; pointer-events: none; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-family: 'Inter', sans-serif;`;
    if(isDark) {
        toolTip.style.background = 'rgba(30, 41, 59, 0.9)';
        toolTip.style.color = 'white';
        toolTip.style.border = '1px solid #334155';
    } else {
        toolTip.style.background = 'rgba(255, 255, 255, 0.95)';
        toolTip.style.color = 'black';
        toolTip.style.border = '1px solid #e2e8f0';
    }
    container.appendChild(toolTip);

    try {
        // 4. CHART CREATE
        chart = window.LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight || 400,
            layout: { background: { type: 'solid', color: bg }, textColor: textColor, fontFamily: 'Inter, sans-serif' },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.2, bottom: 0.1 } },
            timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
            crosshair: { vertLine: { width: 1, style: 3, color: textColor, labelVisible: false }, horzLine: { width: 1, style: 3, color: textColor, labelVisible: false } },
            handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
            handleScale: { axisPressedMouseMove: false, mouseWheel: false, pinch: true },
        });

        // 5. MAIN SERIES
        areaSeries = chart.addAreaSeries({
            lineColor: mainColor, topColor: topColor, bottomColor: bottomColor, lineWidth: 2,
            priceFormat: { type: 'custom', formatter: price => formatCurrencyValue(price, currentCurrency) },
        });
        areaSeries.setData(cleanData);

        // 6. SMAs & LEGENDE
        const isIntraday = (range === '1d' || range === '5d');
        
        // --- LEGENDE BAUEN ---
        const legendContainer = document.createElement('div');
        legendContainer.style = `position: absolute; left: 12px; top: 10px; z-index: 50; display: flex; gap: 12px; font-family: 'Inter'; font-size: 11px; font-weight: 500; pointer-events: none;`;
        
        // Helfer für Legenden-Items
        const addLegendItem = (label, color) => {
            const item = document.createElement('div');
            item.style = `display: flex; align-items: center; gap: 4px; color: ${textColor}`;
            item.innerHTML = `<div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}"></div><span>${label}</span>`;
            legendContainer.appendChild(item);
        };

        // Item 1: Kurs (Immer da)
        addLegendItem('Kurs', mainColor);

        // Item 2 & 3: SMAs (Nur wenn vorhanden)
        if (!isIntraday && cleanData.length > 50) {
            sma50Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false });
            sma50Series.setData(calculateSMA_Data(cleanData, 50));
            addLegendItem('Ø 50', '#3b82f6'); // Blau
        }
        if (!isIntraday && cleanData.length > 200) {
            sma200Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false });
            sma200Series.setData(calculateSMA_Data(cleanData, 200));
            addLegendItem('Ø 200', '#f59e0b'); // Orange
        }

        // Legende einfügen
        container.appendChild(legendContainer);


        // 7. EVENT HANDLERS
        chart.subscribeCrosshairMove(param => {
            if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > container.clientWidth || param.point.y < 0 || param.point.y > container.clientHeight) {
                toolTip.style.display = 'none';
            } else {
                toolTip.style.display = 'block';
                const price = param.seriesData.get(areaSeries);
                const dateObj = new Date(param.time * 1000);
                let dateStr = '';
                if(range === '1d' || range === '5d') dateStr = dateObj.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
                else dateStr = dateObj.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });

                if(price) {
                    const priceStr = formatCurrencyValue(price.value || price, currentCurrency);
                    toolTip.innerHTML = `<div style="font-weight: 600">${priceStr}</div><div style="opacity:0.7">${dateStr}</div>`;
                    
                    let left = param.point.x + 15;
                    let top = param.point.y + 15;
                    if (left + 100 > container.clientWidth) left = param.point.x - 115;
                    if (top + 50 > container.clientHeight) top = param.point.y - 65;
                    toolTip.style.left = left + 'px';
                    toolTip.style.top = top + 'px';
                }
            }
        });

        const resizeObserver = new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) return;
            const newRect = entries[0].contentRect;
            if (newRect.width > 0 && newRect.height > 0) chart.applyOptions({ width: newRect.width, height: newRect.height });
        });
        resizeObserver.observe(container);
        
        chart.timeScale().fitContent();

    } catch(err) {
        console.error("Critical Chart Error:", err);
        container.innerHTML = `<div class="text-red-400 p-10 text-center text-sm">Chart Error: ${err.message}</div>`;
    }
}