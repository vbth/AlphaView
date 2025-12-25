/**
 * AlphaView Main Controller
 * Debug Mode
 */
import { initTheme, toggleTheme } from './theme.js';
import { fetchChartData } from './api.js';
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

// Main Init
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App starting...');
    
    try {
        // Theme init
        const currentTheme = initTheme();
        if(themeBtn) {
            updateThemeIcon(currentTheme);
            themeBtn.addEventListener('click', () => {
                const newTheme = toggleTheme();
                updateThemeIcon(newTheme);
            });
        }

        // Test API Connection
        console.log('Testing connection...');
        
        // Timeout Promise falls API zu lange braucht (3 Sekunden)
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("API Timeout")), 3000)
        );

        // API Call versuchen
        try {
            const data = await Promise.race([
                fetchChartData('AAPL'),
                timeout
            ]);

            if (data) {
                const price = data.meta.regularMarketPrice;
                rootEl.innerHTML = `
                    <div class="bg-green-100 dark:bg-green-900 border border-green-500 p-4 rounded text-green-800 dark:text-green-100">
                        <h2 class="font-bold text-lg"><i class="fa-solid fa-wifi mr-2"></i>Online</h2>
                        <p>Verbindung erfolgreich! AAPL: $${price}</p>
                    </div>
                `;
            } else {
                throw new Error("Keine Daten erhalten");
            }

        } catch (apiError) {
            console.warn("API Error (using fallback mode):", apiError);
            // FALLBACK MODUS (Damit die App trotzdem startet)
            rootEl.innerHTML = `
                <div class="bg-yellow-100 dark:bg-yellow-900 border border-yellow-500 p-4 rounded text-yellow-800 dark:text-yellow-100">
                    <h2 class="font-bold text-lg"><i class="fa-solid fa-triangle-exclamation mr-2"></i>Eingeschränkter Modus</h2>
                    <p>API Verbindung instabil oder blockiert: ${apiError.message}</p>
                    <p class="text-sm mt-2">Wir nutzen Mock-Daten für die Entwicklung.</p>
                </div>
            `;
        }

    } catch (e) {
        console.error("Critical App Error:", e);
        rootEl.innerHTML = `<div class="text-red-500 font-bold">App Error: ${e.message}</div>`;
    }
});