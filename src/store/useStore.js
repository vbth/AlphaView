import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchChartData, searchSymbol } from '@/services/api';
import { analyze } from '@/services/analysis';

/**
 * Global application store.
 * Manages Watchlist (persisted), Market Data, and UI State.
 */
export const useStore = create(
    persist(
        (set, get) => ({
            // --- WATCHLIST STATE (Persisted) ---
            watchlist: [], // Array of { symbol, qty, url, extraUrl }

            // Actions
            addSymbol: (symbol) => {
                const list = get().watchlist;
                if (!list.find((item) => item.symbol === symbol)) {
                    set({ watchlist: [{ symbol, qty: 0, url: '', extraUrl: '' }, ...list] });
                    get().fetchPortfolio(); // Trigger fetch for new item
                    return true;
                }
                return false;
            },

            removeSymbol: (symbol) => {
                set({ watchlist: get().watchlist.filter((item) => item.symbol !== symbol) });
                // Also remove data from dashboardData to clean up
                set({ dashboardData: get().dashboardData.filter((d) => d.symbol !== symbol) });
            },

            updateQuantity: (symbol, qty) => {
                set({
                    watchlist: get().watchlist.map((item) =>
                        item.symbol === symbol ? { ...item, qty: parseFloat(qty) || 0 } : item
                    ),
                });
                // Update dashboard data qty as well for immediate UI feedback
                const currentData = get().dashboardData;
                const idx = currentData.findIndex((d) => d.symbol === symbol);
                if (idx !== -1) {
                    const newData = [...currentData];
                    newData[idx] = { ...newData[idx], qty: parseFloat(qty) || 0 };
                    set({ dashboardData: newData });
                }
            },

            updateUrl: (symbol, url, type = 'primary') => {
                set({
                    watchlist: get().watchlist.map((item) => {
                        if (item.symbol !== symbol) return item;
                        return type === 'primary' ? { ...item, url } : { ...item, extraUrl: url };
                    }),
                });
                // Update dashboard data urls
                const currentData = get().dashboardData;
                const idx = currentData.findIndex((d) => d.symbol === symbol);
                if (idx !== -1) {
                    const newData = [...currentData];
                    if (type === 'primary') newData[idx].url = url;
                    else newData[idx].extraUrl = url;
                    set({ dashboardData: newData });
                }
            },

            // --- ALL DATA EXPORT/IMPORT ---
            importPortfolio: (jsonString) => {
                try {
                    const data = JSON.parse(jsonString);
                    if (Array.isArray(data)) {
                        // Sanitize
                        const cleanData = data.map(item => ({
                            symbol: item.symbol,
                            qty: parseFloat(item.qty) || 0,
                            url: item.url || '',
                            extraUrl: item.extraUrl || ''
                        }));
                        set({ watchlist: cleanData });
                        get().fetchPortfolio();
                        return true;
                    }
                } catch (e) {
                    console.error("Import failed", e);
                }
                return false;
            },

            // --- MARKET DATA STATE ---
            dashboardData: [],
            eurUsdRate: 1.08,
            isLoading: false,
            lastUpdated: null,
            currentRange: '1d', // '1d', '1W', '1mo', etc.

            setRange: (range) => {
                set({ currentRange: range });
                get().fetchPortfolio();
            },

            fetchPortfolio: async () => {
                set({ isLoading: true });
                const { watchlist, currentRange } = get();

                // Parallelize requests
                // 1. Fetch EURUSD Rate
                const ratePromise = fetchChartData('EURUSD=X', '5d', '1d').catch(() => null);

                // 2. Fetch all stocks
                const stockPromises = watchlist.map(async (item) => {
                    try {
                        let interval = '1d';
                        let apiRange = currentRange;
                        if (apiRange === '1W') { apiRange = '5d'; interval = '15m'; }
                        if (apiRange === '1d') interval = '5m';
                        if (apiRange === '1mo') interval = '1d';

                        const rawData = await fetchChartData(item.symbol, apiRange, interval);
                        if (!rawData) return { symbol: item.symbol, error: true, errorMsg: "No Data" };

                        const analysis = analyze(rawData);
                        if (!analysis) return { symbol: item.symbol, error: true, errorMsg: "Analysis Failed" };

                        // Merge with local user data
                        analysis.qty = item.qty;
                        analysis.url = item.url || `https://finance.yahoo.com/quote/${item.symbol}`;

                        if (!item.extraUrl) {
                            if (analysis.type === 'ETF' || analysis.type === 'MUTUALFUND') {
                                analysis.extraUrl = `https://finance.yahoo.com/quote/${item.symbol}/holdings`;
                            } else {
                                analysis.extraUrl = `https://finance.yahoo.com/quote/${item.symbol}/news`;
                            }
                        } else {
                            analysis.extraUrl = item.extraUrl;
                        }

                        return analysis;
                    } catch (e) {
                        return { symbol: item.symbol, error: true, errorMsg: e.message };
                    }
                });

                // Wait for all
                const [rateResult, ...stockResults] = await Promise.all([ratePromise, ...stockPromises]); // Wait, Promise.all needs array

                const resolvedStocks = await Promise.all(stockPromises);

                let newRate = get().eurUsdRate;
                if (rateResult) {
                    // Re-analyze rate? Or just grab close. Helper in analysis.js?
                    // Simple extraction:
                    try {
                        const closes = rateResult.indicators.quote[0].close;
                        const validCloses = closes.filter(c => c);
                        if (validCloses.length > 0) newRate = validCloses[validCloses.length - 1];
                    } catch (e) { }
                }

                set({
                    dashboardData: resolvedStocks,
                    eurUsdRate: newRate,
                    isLoading: false,
                    lastUpdated: new Date()
                });
            },

            // --- UI STATE ---
            viewMode: 'grid', // 'grid' | 'list'
            setViewMode: (mode) => set({ viewMode: mode }),

            sortField: 'value', // 'name', 'value', 'percent', 'performance'
            sortDirection: 'desc',
            setSort: (field) => {
                const current = get();
                if (current.sortField === field) {
                    set({ sortDirection: current.sortDirection === 'asc' ? 'desc' : 'asc' });
                } else {
                    set({ sortField: field, sortDirection: field === 'name' ? 'asc' : 'desc' });
                }
            },

            // Helper to return sorted data
            getSortedData: () => {
                const { dashboardData, sortField, sortDirection, eurUsdRate } = get();
                const data = [...dashboardData];

                return data.sort((a, b) => {
                    if (a.error && !b.error) return 1;
                    if (!a.error && b.error) return -1;
                    if (a.error && b.error) return 0;

                    // Calc Values
                    const valA_Eur = (a.currency === 'USD' ? a.price / eurUsdRate : a.price) * a.qty;
                    const valB_Eur = (b.currency === 'USD' ? b.price / eurUsdRate : b.price) * b.qty;

                    let valA, valB;
                    if (sortField === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
                    else if (sortField === 'performance') { valA = a.changePercent; valB = b.changePercent; }
                    else if (sortField === 'percent') { return 0; /* Percent sort same as value sort effectively */ }
                    else { valA = valA_Eur; valB = valB_Eur; }

                    if (sortField === 'percent') { valA = valA_Eur; valB = valB_Eur; }

                    if (sortDirection === 'asc') return valA > valB ? 1 : -1;
                    return valA < valB ? 1 : -1;
                });
            }
        }),
        {
            name: 'alphaview_storage', // localstorage key
            partialize: (state) => ({
                watchlist: state.watchlist,
                viewMode: state.viewMode,
                sortField: state.sortField,
                sortDirection: state.sortDirection
            }), // Only persist these
        }
    )
);
