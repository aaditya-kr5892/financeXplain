import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

const StockSearch = ({ value, onChange, onSelect }) => {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query && query.length > 2 && isOpen) {
                fetchResults(query);
            }
        }, 500); // Debounce 500ms
        return () => clearTimeout(timeoutId);
    }, [query, isOpen]);

    const fetchResults = async (q) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/stocks/search?q=${q}`);
            setResults(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val); // Update parent state immediately
        setIsOpen(true);
    };

    const handleSelect = (item) => {
        // item: { symbol, shortname, exchange, ... }
        setQuery(item.symbol);
        setIsOpen(false);
        onSelect(item);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <input
                    type="text"
                    className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 pl-9 text-corporate-text-main focus:outline-none focus:border-corporate-primary uppercase"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search Symbol (e.g. RELIANCE, AAPL)"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-corporate-text-secondary" />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-corporate-card border border-corporate-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loading && <div className="p-2 text-sm text-center text-corporate-text-secondary">Searching...</div>}
                    {!loading && results.map((item) => (
                        <button
                            key={item.symbol}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-corporate-primary/10 transition-colors border-b border-corporate-border last:border-0"
                        >
                            <div className="font-bold text-corporate-text-main">{item.symbol}</div>
                            <div className="text-xs text-corporate-text-secondary truncate">
                                {item.shortname || item.longname} • {item.exchange}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StockSearch;
