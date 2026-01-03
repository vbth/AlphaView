import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { X, TrendingUp, TrendingDown, Share2 } from 'lucide-react';
import { fetchChartData } from '@/services/api';
import { analyze } from '@/services/analysis';
import { motion } from 'framer-motion';

export default function ChartModal({ symbol, onClose }) {
    const chartContainerRef = useRef(null);
    const [range, setRange] = useState('1y');
    const [data, setData] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        setData(null);
        try {
            let interval = '1d';
            let apiRange = range;
            if (range === '1mo') { apiRange = '1y'; interval = '1d'; }
            if (range === '5y') { apiRange = '5y'; interval = '1wk'; }
            if (range === 'max') { apiRange = 'max'; interval = '1mo'; }
            if (range === '1d') { apiRange = '1d'; interval = '5m'; }
            if (range === '1W') { apiRange = '5d'; interval = '15m'; }

            console.log(`Fetching data for ${symbol} (${range})...`);
            const raw = await fetchChartData(symbol, apiRange, interval);

            if (raw) {
                const ana = analyze(raw);
                setAnalysis(ana);

                const quotes = raw.indicators.quote[0];
                const timestamps = raw.timestamp;

                if (timestamps && quotes.close) {
                    const chartData = timestamps.map((t, i) => ({
                        time: t,
                        value: quotes.close[i],
                    })).filter(d => d.value !== null && d.value !== undefined);

                    // Remove duplicates & Sort
                    const uniqueData = [];
                    const seen = new Set();
                    chartData.forEach(p => {
                        if (!seen.has(p.time)) {
                            seen.add(p.time);
                            uniqueData.push(p);
                        }
                    });
                    uniqueData.sort((a, b) => a.time - b.time);

                    if (uniqueData.length === 0) throw new Error("No price data found");
                    setData(uniqueData);
                } else {
                    throw new Error("Invalid data format from API");
                }
            } else {
                throw new Error("Unable to fetch data via proxies");
            }
        } catch (e) {
            console.error("Chart Load Error:", e);
            setError(e.message || "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [symbol, range]);

    useEffect(() => {
        if (!chartContainerRef.current || !data) return;

        // Cleanup previous chart instance if any (handled by return cleanup mostly, but good practice)
        chartContainerRef.current.innerHTML = '';

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b',
            },
            grid: {
                vertLines: { color: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0' },
                horzLines: { color: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            }
        });

        const isPositive = data.length > 0 && data[data.length - 1].value >= data[0].value;
        const color = isPositive ? '#16a34a' : '#dc2626';

        const series = chart.addAreaSeries({
            lineColor: color,
            topColor: isPositive ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)',
            bottomColor: isPositive ? 'rgba(22, 163, 74, 0.0)' : 'rgba(220, 38, 38, 0.0)',
        });

        series.setData(data);
        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            try { chart.remove(); } catch (e) { }
        };
    }, [data]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-5xl bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {analysis?.name || symbol}
                            {loading && <LoaderSkeleton className="w-20 h-6" />}
                        </h2>
                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold">{symbol}</span>
                            <span>{analysis?.exchange}</span>
                            {analysis && (
                                <span className={analysis.change >= 0 ? "text-green-600" : "text-red-600"}>
                                    {analysis.changePercent.toFixed(2)}% ({range})
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-grow flex flex-col">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {['1d', '1W', '1mo', '6mo', '1y', '5y', 'max'].map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${range === r ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                            >
                                {r.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full h-[400px] bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-[1px] bg-white/50 dark:bg-slate-900/50">
                                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                        )}

                        {error && !loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/90 dark:bg-slate-900/90 text-center p-4">
                                <div className="text-red-500 mb-2"><TrendingDown className="w-8 h-8" /></div>
                                <p className="text-slate-900 dark:text-white font-bold">Failed to load chart</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">{error}</p>
                                <button onClick={loadData} className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3" /> Retry
                                </button>
                            </div>
                        )}

                        <div ref={chartContainerRef} className="w-full h-full" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function LoaderSkeleton({ className }) {
    return <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`} />
}
