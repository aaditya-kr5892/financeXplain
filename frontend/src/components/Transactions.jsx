import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, ShoppingBag, Coffee, Home, Zap, ArrowDown, ArrowUp } from 'lucide-react';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Helper to get icon based on category
    const getIcon = (category) => {
        switch (category) {
            case 'Food': return <Coffee size={18} />;
            case 'Rent': return <Home size={18} />;
            case 'Utilities': return <Zap size={18} />;
            default: return <ShoppingBag size={18} />;
        }
    };

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await axios.get('/api/transactions');
                // The API returns transactions in chronological order (tail), so we might want to reverse to show newest first
                setTransactions(res.data.reverse());
            } catch (err) {
                console.error("Failed to fetch transactions", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredTransactions = transactions.filter(txn => {
        const matchesSearch = txn.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || txn.category === categoryFilter;
        return matchesSearch && matchesCategory;
    }).sort((a, b) => {
        if (sortConfig.key === 'date') {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (sortConfig.key === 'amount') {
            return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
        }
        return 0;
    });

    const categories = ['All', ...new Set(transactions.map(t => t.category))];

    return (
        <div className="bg-corporate-card border border-corporate-border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-5 duration-500 min-h-[500px]">
            <div className="p-6 border-b border-corporate-border flex justify-between items-center bg-corporate-bg/50">
                <h3 className="text-xl font-bold text-corporate-text-main">Recent Transactions</h3>
                <div className="flex space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-corporate-text-secondary" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-corporate-bg border border-corporate-border rounded px-9 py-2 text-sm focus:outline-none focus:border-corporate-primary transition-all w-64 text-corporate-text-main placeholder-corporate-text-secondary"
                        />
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className={`p-2 border border-corporate-border rounded transition-colors text-corporate-text-secondary hover:text-white flex items-center gap-2 ${showFilterMenu || categoryFilter !== 'All' ? 'bg-corporate-primary/20 text-corporate-primary border-corporate-primary/50' : 'bg-corporate-bg hover:bg-white/5'}`}
                        >
                            <Filter size={18} />
                            {categoryFilter !== 'All' && <span className="text-xs font-medium">{categoryFilter}</span>}
                        </button>

                        {showFilterMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-corporate-card border border-corporate-border rounded-lg shadow-xl z-10 py-1">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => {
                                            setCategoryFilter(cat);
                                            setShowFilterMenu(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${categoryFilter === cat ? 'text-corporate-primary font-medium' : 'text-corporate-text-secondary'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-corporate-bg text-corporate-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-corporate-border">
                        <tr>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Category</th>
                            <th
                                className="px-6 py-4 cursor-pointer hover:text-corporate-text-main transition-colors"
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center gap-1">
                                    Date
                                    {sortConfig.key === 'date' && (
                                        sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-4 text-right cursor-pointer hover:text-corporate-text-main transition-colors"
                                onClick={() => handleSort('amount')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Amount
                                    {sortConfig.key === 'amount' && (
                                        sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-corporate-border">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-corporate-text-secondary">Loading transactions...</td>
                            </tr>
                        ) : filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-corporate-text-secondary">No transactions found</td>
                            </tr>
                        ) : (
                            filteredTransactions.map((txn, index) => (
                                <tr key={index} className="hover:bg-corporate-bg/50 transition-colors group cursor-pointer text-sm">
                                    <td className="px-6 py-4 flex items-center space-x-4">
                                        <div className={`p-2 rounded ${txn.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-corporate-bg text-corporate-text-secondary'} group-hover:text-corporate-text-main transition-colors`}>
                                            {getIcon(txn.category)}
                                        </div>
                                        <span className="font-medium text-corporate-text-main">{txn.description}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-corporate-bg border border-corporate-border text-corporate-text-secondary">
                                            {txn.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-corporate-text-secondary">{txn.date}</td>
                                    <td className={`px-6 py-4 text-right font-semibold ${txn.amount > 0 ? 'text-emerald-400' : 'text-corporate-text-main'}`}>
                                        {txn.amount > 0 ? '+' : '-'} ₹{Math.abs(txn.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Transactions;
