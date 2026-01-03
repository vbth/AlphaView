import { useState, useEffect, useRef } from 'react';
import { Search, Moon, Sun, BarChart2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { searchSymbol } from '@/services/api';

export default function Header() {
    const { addSymbol } = useStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef(null);

    // Theme Logic
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        // Initial check from HTML class (set by init script if any, or default)
        if (document.documentElement.classList.contains('dark')) setTheme('dark');
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length > 1) {
                setIsSearching(true);
                const res = await searchSymbol(query);
                setResults(res);
                setIsSearching(false);
            } else {
                setResults([]);
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    // Click Outside to Close Search
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setResults([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchRef]);

    const handleSelect = (symbol) => {
        addSymbol(symbol);
        setQuery('');
        setResults([]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.length > 0) {
            // If results exist, pick first? Or just add query?
            // Let's add query if it looks like a symbol
            addSymbol(query.toUpperCase());
            setQuery('');
            setResults([]);
        }
    };

    return (
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-dark-surface/80 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

                {/* Logo */}
                <div className="flex items-center gap-2 flex-shrink-0 cursor-default select-none group">
                    <BarChart2 className="w-6 h-6 text-primary dark:text-neon-accent group-hover:scale-110 transition-transform" />
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Alpha<span className="text-primary dark:text-neon-accent">View</span>
                    </h1>
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-3 flex-grow justify-end max-w-xl">
                    <div className="relative w-full max-w-sm" ref={searchRef}>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search symbol..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder-slate-400"
                        />
                        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />

                        {/* Dropdown */}
                        {(results.length > 0 || isSearching) && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-80 overflow-y-auto">
                                {isSearching && <div className="p-3 text-xs text-center text-slate-400">Loading...</div>}
                                {!isSearching && results.map((item) => (
                                    <button
                                        key={item.symbol}
                                        onClick={() => handleSelect(item.symbol)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex justify-between items-center group transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{item.symbol}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-[200px]">{item.name}</div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{item.type}</span>
                                            <span className="text-[10px] text-slate-400 mt-1">{item.exchange}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </header>
    );
}
