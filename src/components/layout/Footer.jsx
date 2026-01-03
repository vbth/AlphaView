import { Download, Upload, Copy, Link, List } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useRef } from 'react';

export default function Footer() {
    const { watchlist, importPortfolio, fetchPortfolio } = useStore();
    const fileInputRef = useRef(null);

    const handleExport = () => {
        if (watchlist.length === 0) return alert("Portfolio is empty.");
        const json = JSON.stringify(watchlist, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alphaview_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (importPortfolio(ev.target.result)) {
                alert("Import successful!");
            } else {
                alert("Import failed. Invalid format.");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };

    return (
        <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-surface transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">

                {/* Actions */}
                <div className="flex flex-wrap justify-center gap-3">
                    <ActionButton icon={List} label="Copy Context" onClick={() => alert("Coming soon")} />
                    <ActionButton icon={Link} label="Copy Links" onClick={() => alert("Coming soon")} />
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden sm:block mx-2"></div>
                    <ActionButton icon={Download} label="Export Data" onClick={handleExport} />
                    <ActionButton icon={Upload} label="Import Data" onClick={handleImportClick} />
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                </div>

                <div className="text-center text-xs text-slate-400">
                    <p>Local-First Personal Finance. Running on GitHub Pages.</p>
                    <p className="mt-1">© 2026 AlphaView Analytics</p>
                </div>
            </div>
        </footer>
    );
}

function ActionButton({ icon: Icon, label, onClick }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:border-primary dark:hover:border-neon-accent hover:text-primary dark:hover:text-neon-accent transition-all shadow-sm active:scale-95"
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
        </button>
    );
}
