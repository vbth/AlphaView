/**
 * Charts Module
 * Renders interactive charts using Chart.js
 */

let chartInstance = null;

export function renderChart(canvasId, rawData) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Daten vorbereiten
    const timestamps = rawData.timestamp;
    const prices = rawData.indicators.quote[0].close;
    
    // Labels (Datum) formatieren
    const labels = timestamps.map(t => {
        const date = new Date(t * 1000);
        return date.toLocaleDateString();
    });

    // Alte Chart-Instanz zerstören, falls vorhanden (sonst flackert es)
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Farben basierend auf Trend (Erster vs Letzter Preis)
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const isBullish = endPrice >= startPrice;
    
    const lineColor = isBullish ? '#22c55e' : '#ef4444'; // Green-500 : Red-500
    const areaColor = isBullish ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    // Chart Konfiguration
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Price',
                data: prices,
                borderColor: lineColor,
                backgroundColor: areaColor,
                borderWidth: 2,
                pointRadius: 0, // Keine Punkte für cleanen Look
                pointHoverRadius: 4,
                fill: true,
                tension: 0.1 // Leichte Kurve
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: false, // Keine X-Achse Beschriftung (cleaner)
                    grid: { display: false }
                },
                y: {
                    position: 'right',
                    grid: {
                        color: 'rgba(200, 200, 200, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8' // Slate-400
                    }
                }
            }
        }
    });
}