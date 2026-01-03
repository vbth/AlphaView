import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) { return twMerge(clsx(inputs)); }

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

export default function StockRow({ data, totalEUR, openModal }) {
    const { updateQuantity, removeSymbol, eurUsdRate } = useStore();

    if (data.error) return null; // Or specific error row

    const isUp = data.change >= 0;
    const style = ASSET_TYPES[data.type] || DEFAULT_STYLE;
    const posValueNative = data.price * data.qty;
    const posValueEUR = (data.currency === 'USD') ? posValueNative / eurUsdRate : posValueNative;
    const weight = totalEUR > 0 ? (posValueEUR / totalEUR) * 100 : 0;

    const trendColor = data.trend === 'bullish' ? 'text-green-500' : (data.trend === 'bearish' ? 'text-red-500' : 'text-slate-400');
    const TrendIcon = data.trend === 'bullish' ? TrendingUp : (data.trend === 'bearish' ? TrendingDown : Minus);

    return (
        <motion.tr
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
            onClick={() => openModal(data.symbol)}
        >
            <td className="px-6 py-4">
                <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={data.name}>{data.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wide leading-none", style.color)}>
                            {style.label}
                        </span>
                        <span className="text-xs font-mono text-slate-500 ml-0.5">{data.symbol}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-right">
                <input
                    type="number"
                    className="w-16 text-right bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded px-1 py-0.5 text-sm focus:ring-1 focus:ring-primary outline-none font-mono text-slate-900 dark:text-white"
                    value={data.qty}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateQuantity(data.symbol, e.target.value)}
                />
            </td>
            <td className="px-6 py-4 text-right font-mono text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: data.currency }).format(data.price)}
            </td>
            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">
                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: data.currency }).format(posValueNative)}
            </td>
            <td className={cn("px-6 py-4 text-right font-mono text-sm font-medium whitespace-nowrap", isUp ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {isUp ? '+' : ''}{data.changePercent.toFixed(2)}%
            </td>
            <td className="px-6 py-4 text-center">
                <span className={cn("inline-flex justify-center", trendColor)}><TrendIcon className="w-4 h-4" /></span>
            </td>
            <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                {data.volatility ? data.volatility.toFixed(1) + '%' : '-'}
            </td>
            <td className="px-6 py-4 text-right font-mono text-xs text-slate-500 whitespace-nowrap">
                {weight.toFixed(1).replace('.', ',')}%
            </td>
            <td className="px-6 py-4 text-right">
                <button
                    onClick={(e) => { e.stopPropagation(); removeSymbol(data.symbol); }}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </motion.tr>
    );
}
