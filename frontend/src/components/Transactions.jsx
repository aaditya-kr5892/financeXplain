import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, ShoppingBag, Coffee, Home, Zap } from 'lucide-react';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Helper to get icon based on category
    const getIcon = (category) => {
        switch (category) {
            case 'Food': return <Coffee size={20} />;
            case 'Rent': return <Home size={20} />;
            case 'Utilities': return <Zap size={20} />;
            default: return <ShoppingBag size={20} />;
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
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-semibold">Recent Transactions</h3>
                <div className="flex space-x-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="bg-slate-900/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors w-64 placeholder-gray-500"
                        />
                    </div>
                    <button className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 font-medium">Description</th>
                            <th className="px-6 py-4 font-medium">Category</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {transactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                <td className="px-6 py-4 flex items-center space-x-4">
                                    <div className={`p-2 rounded-lg ${txn.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'} group-hover:scale-110 transition-transform`}>
                                        {getIcon(txn.category)}
                                    </div>
                                    <span className="font-medium text-slate-200">{txn.description}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-slate-300">
                                        {txn.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400 text-sm">{txn.date}</td>
                                <td className={`px-6 py-4 text-right font-bold ${txn.amount > 0 ? 'text-green-400' : 'text-slate-200'}`}>
                                    ₹{txn.amount > 0 ? '+' : ''}{Math.abs(txn.amount).toFixed(2)}
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
