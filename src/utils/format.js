/**
 * Formats a value as currency.
 * by default uses USD if currency not provided, but we handle it.
 */
export function formatMoney(value, currency = 'USD') {
    if (value === undefined || value === null) return '-';
    // Handle some common mappings if needed, or rely on Intl
    let locale = 'en-US';
    if (currency === 'EUR') locale = 'de-DE';

    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
    } catch (e) {
        return value.toFixed(2);
    }
}
