/**
 * Store Module
 * Manages Portfolio/Watchlist persistence in LocalStorage.
 * Updated: Exporting updateUrl
 */
const STORAGE_KEY = 'alphaview_portfolio';

function getPortfolio() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    let data = JSON.parse(json);
    
    // Migration: Falls alte Daten (String-Array) vorhanden sind
    if (data.length > 0 && typeof data[0] === 'string') {
        data = data.map(symbol => ({ symbol: symbol, qty: 0, url: '' }));
        savePortfolio(data);
    }
    return data;
}

function savePortfolio(portfolio) { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); 
}

export function getWatchlist() { 
    return getPortfolio(); 
}

export function addSymbol(symbol) {
    const portfolio = getPortfolio();
    const upperSymbol = symbol.toUpperCase();
    if (!portfolio.find(p => p.symbol === upperSymbol)) {
        // Init with empty URL
        portfolio.push({ symbol: upperSymbol, qty: 0, url: '' });
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

// DIESE FUNKTION FEHLTE:
export function updateUrl(symbol, url) {
    let portfolio = getPortfolio();
    const item = portfolio.find(p => p.symbol === symbol);
    if (item) {
        item.url = url ? url.trim() : '';
        savePortfolio(portfolio);
    }
}