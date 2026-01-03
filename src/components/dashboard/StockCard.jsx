import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trash2, RotateCw, ExternalLink, Newspaper, ListChecks } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ASSET_TYPES = {
    'EQUITY': { label: 'STOCK', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    'ETF': { label: 'ETF', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
    'MUTUALFUND': { label: 'FUND', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
    'INDEX': { label: 'INDEX', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
    'CRYPTOCURRENCY': { label: 'CRYPTO', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    'CURRENCY': { label: 'FX', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    'FUTURE': { label: 'FUT', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
};

const DEFAULT_STYLE = { label: 'OTHER', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' };

export default function StockCard({ data, openModal }) {
    const { updateQuantity, updateUrl, removeSymbol, eurUsdRate } = useStore();

    if (data.error) return <ErrorCard data={data} removeSymbol={removeSymbol} />;

    const isUp = data.change >= 0;
    const style = ASSET_TYPES[data.type] || DEFAULT_STYLE;

    // Values
    const posValueNative = data.price * data.qty;
    // const posValueEUR = (data.currency === 'USD') ? posValueNative / eurUsdRate : posValueNative;

    const trendColor = data.trend === 'bullish' ? 'text-green-500' : (data.trend === 'bearish' ? 'text-red-500' : 'text-slate-400');
    const TrendIcon = data.trend === 'bullish' ? TrendingUp : (data.trend === 'bearish' ? TrendingDown : Minus);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="group relative bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary/50 dark:hover:border-neon-accent/50 transition-all duration-300 flex flex-col h-full overflow-hidden"
            onClick={(e) => {
                // Prevent modal if clicking inputs/links
                if (!e.target.closest('input') && !e.target.closest('a') && !e.target.closest('button')) {
                    openModal(data.symbol);
                }
            }}
        >
            {/* Header */}
            <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="min-w-0 pr-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate" title={data.name}>{data.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wide", style.color)}>
                                {style.label || data.type}
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide">
                                {data.exchange}
                            </span>
                            <span className="font-bold text-xs text-slate-400 dark:text-slate-500 ml-0.5">{data.symbol}</span>
                        </div>
                    </div>
                    <div className="text-right whitespace-nowrap pt-1">
                        <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: data.currency }).format(data.price)}
                        </div>
                        <div className={cn("text-sm font-medium font-mono", isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                            {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
                        </div>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                    {data.type !== 'INDEX' && (
                        <>
                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Value</span>
                                </div>
                                <div className="font-mono font-bold text-slate-900 dark:text-white text-right">
                                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: data.currency }).format(posValueNative)}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm mb-2">
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Quantity</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-20 text-right bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono text-slate-900 dark:text-white"
                                    value={data.qty}
                                    onChange={(e) => updateQuantity(data.symbol, e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* Links */}
                    <div className="flex items-center gap-2 pt-1">
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <input
                            type="text"
                            className="w-full text-xs bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 placeholder-slate-400 p-0"
                            placeholder="Info Link"
                            value={data.url}
                            onChange={(e) => updateUrl(data.symbol, e.target.value, 'primary')}
                        />
                        {data.url && <a href={data.url} target="_blank" rel="noreferrer" className="text-primary hover:text-blue-600"><ExternalLink className="w-3 h-3" /></a>}
                    </div>
                    <div className="flex items-center gap-2 pt-1 mt-1 border-t border-slate-200 dark:border-slate-700">
                        {data.type === 'ETF' || data.type === 'MUTUALFUND' ? <ListChecks className="w-3 h-3 text-slate-400" /> : <Newspaper className="w-3 h-3 text-slate-400" />}
                        <input
                            type="text"
                            className="w-full text-xs bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 placeholder-slate-400 p-0"
                            placeholder={data.type === 'ETF' ? "Holdings Link" : "News Link"}
                            value={data.extraUrl}
                            onChange={(e) => updateUrl(data.symbol, e.target.value, 'extra')}
                        />
                        {data.extraUrl && <a href={data.extraUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-blue-600"><ExternalLink className="w-3 h-3" /></a>}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-auto border-t border-slate-50 dark:border-slate-800 pt-3">
                    <div className="flex items-center gap-2">
                        {data.trend && (
                            <>
                                <div className={cn("flex items-center gap-1", trendColor)}>
                                    <TrendIcon className="w-3 h-3" /> {data.trend.toUpperCase()}
                                </div>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <div>Vol: {data.volatility ? data.volatility.toFixed(1) : '-'}%</div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); removeSymbol(data.symbol); }}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            {/* Color Strip */}
            <div className={cn("h-1 w-full", isUp ? "bg-green-500" : "bg-red-500")} />
        </motion.div>
    );
}

function ErrorCard({ data, removeSymbol }) {
    return (
        <motion.div
            layout
            className="bg-red-50 dark:bg-red-900/10 rounded-xl shadow-sm border border-red-200 dark:border-red-800/50 p-5 flex flex-col justify-between min-h-[200px]"
        >
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-red-700 dark:text-red-400 tracking-tight">{data.symbol}</h3>
                </div>
                <p className="text-xs text-red-600 dark:text-red-300 font-medium">Data Fetch Failed</p>
                <div className="text-[10px] font-mono mt-1 text-red-400 break-words">{data.errorMsg}</div>
            </div>
            <div className="mt-4 border-t border-red-100 dark:border-red-800/50 pt-3 flex justify-between items-end">
                <button onClick={() => removeSymbol(data.symbol)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-100 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
}
