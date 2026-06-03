import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Edit2, Check, X, Plus } from 'lucide-react';

const Budget = () => {
    const [budgets, setBudgets] = useState({});
    const [spending, setSpending] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [newBudget, setNewBudget] = useState({ category: 'Food', amount: '' });
    const [loading, setLoading] = useState(true);

    const categories = ['Food', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Healthcare', 'Transportation', 'Education', 'Other'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [budgetRes, txnRes] = await Promise.all([
                axios.get('/api/budget'),
                axios.get('/api/transactions')
            ]);

            setBudgets(budgetRes.data);

            // Calculate spending for current month
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const categorySpending = {};

            txnRes.data.forEach(txn => {
                const date = new Date(txn.date);
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear && txn.amount < 0) {
                    const cat = txn.category || 'Other';
                    categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(txn.amount);
                }
            });

            setSpending(categorySpending);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBudget = async () => {
        if (!newBudget.amount || parseFloat(newBudget.amount) <= 0) return;

        try {
            await axios.post('/api/budget', {
                category: newBudget.category,
                amount: parseFloat(newBudget.amount)
            });
            await fetchData(); // Refresh
            setNewBudget({ category: 'Food', amount: '' });
            setIsEditing(false);
        } catch (err) {
            console.error("Failed to save budget", err);
        }
    };

    const getProgressColor = (spent, limit) => {
        const percentage = (spent / limit) * 100;
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Target className="text-purple-400" size={24} />
                    Monthly Budgets
                </h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    {isEditing ? <X className="text-red-400" size={20} /> : <Plus className="text-blue-400" size={20} />}
                </button>
            </div>

            {/* Add Budget Form */}
            {isEditing && (
                <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-white/5 animate-in slide-in-from-top-2">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Category</label>
                            <select
                                value={newBudget.category}
                                onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                                className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 mb-1">Budget Amount (₹)</label>
                            <input
                                type="number"
                                value={newBudget.amount}
                                onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                                placeholder="5000"
                                className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <button
                            onClick={handleSaveBudget}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
                        >
                            <Check size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Budget List */}
            <div className="space-y-6">
                {Object.entries(budgets).length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No budgets set. Click + to add one.</p>
                ) : (
                    Object.entries(budgets).map(([category, limit]) => {
                        const spent = spending[category] || 0;
                        const percentage = Math.min((spent / limit) * 100, 100);

                        return (
                            <div key={category} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-200">{category}</span>
                                    <span className="text-slate-400">
                                        ₹{spent.toFixed(0)} / <span className="text-white">₹{limit}</span>
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${getProgressColor(spent, limit)} transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Budget;
