import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, ShoppingBag, Coffee, Home, Zap, ArrowDown, ArrowUp } from 'lucide-react';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="bg-corporate-card border border-corporate-border rounded-lg overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="p-6 border-b border-corporate-border flex justify-between items-center bg-corporate-bg/50">
                <h3 className="text-xl font-bold text-corporate-text-main">Recent Transactions</h3>
                <div className="flex space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-corporate-text-secondary" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="bg-corporate-bg border border-corporate-border rounded px-9 py-2 text-sm focus:outline-none focus:border-corporate-primary transition-all w-64 text-corporate-text-main placeholder-corporate-text-secondary"
                        />
                    </div>
                    <button className="p-2 bg-corporate-bg hover:bg-white/5 border border-corporate-border rounded transition-colors text-corporate-text-secondary hover:text-white">
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-corporate-bg text-corporate-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-corporate-border">
                        <tr>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-corporate-border">
                        {transactions.map((txn, index) => (
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
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Transactions;
