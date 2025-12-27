/**
 * Store Module
 * Manages Portfolio in LocalStorage.
 * Updated: Auto-generates Yahoo Finance URLs.
 */
const STORAGE_KEY = 'alphaview_portfolio';

function getPortfolio() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    let data = JSON.parse(json);
    
    // MIGRATION & AUTO-FILL
    // Wir prüfen bei jedem Laden, ob Daten fehlen und ergänzen sie
    if (data.length > 0) {
        let changed = false;
        data = data.map(item => {
            // Fall 1: Altes Format (nur String)
            if (typeof item === 'string') { 
                changed = true; 
                return { 
                    symbol: item, 
                    qty: 0, 
                    url: `https://finance.yahoo.com/quote/${item}/` // Auto-URL
                }; 
            }
            // Fall 2: URL fehlt oder ist undefined
            if (!item.url) { 
                changed = true; 
                return { 
                    ...item, 
                    url: `https://finance.yahoo.com/quote/${item.symbol}/` // Auto-URL nachrüsten
                }; 
            }
            return item;
        });
        
        if(changed) savePortfolio(data);
    }
    return data;
}

function savePortfolio(portfolio) { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); 
}

export function getWatchlist() { return getPortfolio(); }

export function addSymbol(symbol) {
    const portfolio = getPortfolio();
    const upperSymbol = symbol.toUpperCase();
    
    if (!portfolio.find(p => p.symbol === upperSymbol)) {
        portfolio.push({ 
            symbol: upperSymbol, 
            qty: 0, 
            // HIER NEU: Automatische URL beim Hinzufügen
            url: `https://finance.yahoo.com/quote/${upperSymbol}/` 
        });
        savePortfolio(portfolio);
        return true;
    }
    return false;
}

export function removeSymbol(symbol) {
    const newPortfolio = getPortfolio().filter(p => p.symbol !== symbol);
    savePortfolio(newPortfolio);
}

export function updateQuantity(symbol, quantity) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.qty = parseFloat(quantity) || 0;
        savePortfolio(portfolio);
    }
}

export function updateUrl(symbol, url) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.url = url ? url.trim() : '';
        savePortfolio(portfolio);
    }
}