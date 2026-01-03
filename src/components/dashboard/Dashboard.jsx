import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import StockCard from './StockCard';
import StockRow from './StockRow';
import { LayoutGrid, List as ListIcon, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatMoney } from '@/utils/format'; // Need to create utils or use inline
import ChartModal from '@/components/charts/ChartModal';
import { AnimatePresence, motion } from 'framer-motion';

export default function Dashboard() {
    const {
        watchlist,
        fetchPortfolio,
        dashboardData,
        isLoading,
        viewMode,
        setViewMode,
        currentRange,
        setRange,
        sortField,
        sortDirection,
        setSort,
        getSortedData,
        eurUsdRate
    } = useStore();

    const [modalSymbol, setModalSymbol] = useState(null);

    useEffect(() => {
        fetchPortfolio();
        // Poll every 60s
        const interval = setInterval(fetchPortfolio, 60000);
        return () => clearInterval(interval);
    }, [fetchPortfolio]);

    const sortedData = getSortedData();

    // Calculate Totals
    let totalEUR = 0;
    dashboardData.forEach(d => {
        if (d.error) return;
        let val = d.price * d.qty;
        if (d.currency === 'USD') val /= eurUsdRate;
        totalEUR += val;
    });
    const totalUSD = totalEUR * eurUsdRate;

    if (watchlist.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <LayoutGrid className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Watchlist Empty</h3>
                <p className="text-slate-500 mt-2 max-w-sm">Use the search bar above to add stocks, ETFs, or crypto to your portfolio.</p>
            </div>
        );
    }

    return (
        <div>
            {/* SUMMARY HEADER */}
            <div className="mb-8 bg-white dark:bg-dark-surface rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Balance</h2>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalEUR)}
                    </div>
                    <div className="text-lg font-mono font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalUSD)}
                    </div>
                </div>

                <div className="flex flex-col md:items-end gap-1">
                    <div className="text-xs text-slate-500">Positions</div>
                    <div className="text-xl font-mono font-medium dark:text-slate-200">{dashboardData.length}</div>
                    {isLoading && <div className="flex items-center gap-1 text-xs text-primary animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Updating</div>}
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Ranges */}
                <div className="flex bg-white dark:bg-dark-surface p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
                    {['1d', '1W', '1mo', '6mo', '1y', '5y', 'max'].map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${currentRange === r ? 'bg-slate-100 dark:bg-slate-700 text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* Sort */}
                    <div className="flex bg-white dark:bg-dark-surface p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        {[
                            { id: 'name', label: 'Name' },
                            { id: 'value', label: 'Value' },
                            { id: 'percent', label: 'Share' }, // % of portfolio
                            { id: 'performance', label: 'Perf' }
                        ].map(field => (
                            <button
                                key={field.id}
                                onClick={() => setSort(field.id)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${sortField === field.id ? 'bg-slate-100 dark:bg-slate-700 text-primary dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                {field.label}
                                {sortField === field.id && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                {sortField !== field.id && <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                            </button>
                        ))}
                    </div>

                    {/* View Mode */}
                    <div className="flex bg-white dark:bg-dark-surface p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-primary dark:text-white' : 'text-slate-400'}`}>
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-primary dark:text-white' : 'text-slate-400'}`}>
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <AnimatePresence mode="wait">
                {viewMode === 'grid' ? (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {sortedData.map(item => (
                            <StockCard key={item.symbol} data={item} openModal={setModalSymbol} />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">Asset</th>
                                        <th className="px-6 py-3 text-right">Qty</th>
                                        <th className="px-6 py-3 text-right">Price</th>
                                        <th className="px-6 py-3 text-right">Value</th>
                                        <th className="px-6 py-3 text-right">Perf</th>
                                        <th className="px-6 py-3 text-center">Trend</th>
                                        <th className="px-6 py-3 text-right">Vol</th>
                                        <th className="px-6 py-3 text-right">Share</th>
                                        <th className="px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {sortedData.map(item => (
                                        <StockRow key={item.symbol} data={item} totalEUR={totalEUR} openModal={setModalSymbol} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {modalSymbol && <ChartModal symbol={modalSymbol} onClose={() => setModalSymbol(null)} />}
        </div>
    );
}
