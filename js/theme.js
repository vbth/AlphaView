/**
 * Modul: Theme
 * ============
 * Verwaltet den Hell/Dunkel-Modus.
 * - Speichert Präferenz im LocalStorage.
 * - Berücksichtigt Systemeinstellungen (prefers-color-scheme).
 */

// Initialisiert das Theme beim Start (Laden aus Storage oder System)
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Wenn 'dark' gespeichert ist, oder keine Präferenz vorliegt aber das System 'dark' ist
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        return 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        return 'light';
    }
}

// Schaltet zwischen Hell- und Dunkelmodus um
export function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        return 'light';
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        return 'dark';
    }
}