/**
 * AlphaView Main Controller
 * Step 3: Integrating Analysis Engine
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData } from './api.js';
import { analyze } from './analysis.js';
import { getWatchlist, addSymbol } from './store.js';

// DOM Elements
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = themeBtn.querySelector('i');
const rootEl = document.getElementById('app-root');

function updateThemeIcon(mode) {
    if(!themeIcon) return;
    if (mode === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// Format Helper
const formatMoney = (val, currency) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(val);
};

const formatPercent = (val) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Theme Setup
    const currentTheme = initTheme();
    if(themeBtn) {
        updateThemeIcon(currentTheme);
        themeBtn.addEventListener('click', () => {
            updateThemeIcon(toggleTheme());
        });
    }

    // 2. Fetch & Analyze Data
    // Wir holen 1 Jahr Daten (1y) für bessere Analyse-Werte (SMA200)
    try {
        const symbol = 'AAPL'; // Demo Symbol
        
        // UI Lade-Status
        rootEl.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary dark:border-neon-accent mb-4"></div>
                <div class="text-slate-500">Analysiere ${symbol}...</div>
            </div>
        `;

        // API Call (1 Jahr History für SMA200)
        const rawData = await fetchChartData(symbol, '1y', '1d');
        
        if (!rawData) throw new Error("Keine Daten erhalten");

        // ANALYSE STARTEN
        const data = analyze(rawData);
        
        if (!data) throw new Error("Analyse fehlgeschlagen (zu wenig Daten)");

        // UI RENDER (Preview Card)
        const isUp = data.change >= 0;
        const colorClass = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        const trendIcon = data.trend === 'bullish' ? 'fa-arrow-trend-up' : (data.trend === 'bearish' ? 'fa-arrow-trend-down' : 'fa-minus');

        rootEl.innerHTML = `
            <div class="max-w-md mx-auto bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden mt-8">
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">${data.symbol}</h2>
                        <span class="text-xs font-mono text-slate-500">NASDAQ</span>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold font-mono ${colorClass}">
                            ${formatMoney(data.price, data.currency)}
                        </div>
                        <div class="text-sm font-medium ${colorClass}">
                            ${formatPercent(data.changePercent)}
                        </div>
                    </div>
                </div>

                <!-- Key Metrics Grid -->
                <div class="grid grid-cols-2 gap-4 p-6 bg-slate-50 dark:bg-slate-800/50">
                    
                    <!-- Trend -->
                    <div class="p-3 bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Markttrend</div>
                        <div class="flex items-center gap-2">
                            <i class="fa-solid ${trendIcon} ${data.trend === 'bullish' ? 'text-green-500' : (data.trend === 'bearish' ? 'text-red-500' : 'text-yellow-500')}"></i>
                            <span class="font-semibold capitalize dark:text-slate-200">${data.trend}</span>
                        </div>
                    </div>

                    <!-- Volatility -->
                    <div class="p-3 bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Volatilität (Risk)</div>
                        <div class="font-mono font-semibold dark:text-slate-200">${data.volatility.toFixed(1)}%</div>
                        <div class="text-[10px] text-slate-400">Jahresschwankung</div>
                    </div>

                    <!-- SMA 200 -->
                    <div class="p-3 bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Ø 200 Tage</div>
                        <div class="font-mono text-sm dark:text-slate-200">${data.sma200 ? formatMoney(data.sma200, data.currency) : 'N/A'}</div>
                    </div>

                    <!-- SMA 50 -->
                    <div class="p-3 bg-white dark:bg-dark-surface rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Ø 50 Tage</div>
                        <div class="font-mono text-sm dark:text-slate-200">${data.sma50 ? formatMoney(data.sma50, data.currency) : 'N/A'}</div>
                    </div>
                </div>
                
                <div class="bg-slate-100 dark:bg-slate-800 px-6 py-3 text-xs text-center text-slate-400">
                    Last Update: ${data.timestamp}
                </div>
            </div>
        `;

    } catch (e) {
        rootEl.innerHTML = `<div class="p-4 text-center text-red-500">Error: ${e.message}</div>`;
        console.error(e);
    }
});