import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Edit2, Check, X, Plus, Save } from 'lucide-react';

const Budget = () => {
    const [budgets, setBudgets] = useState({});
    const [spending, setSpending] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editAmount, setEditAmount] = useState('');
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

    const startEdit = (category, currentAmount) => {
        setEditingCategory(category);
        setEditAmount(currentAmount.toString());
    };

    const cancelEdit = () => {
        setEditingCategory(null);
        setEditAmount('');
    };

    const saveEdit = async () => {
        if (!editAmount || parseFloat(editAmount) <= 0) return;

        try {
            await axios.post('/api/budget', {
                category: editingCategory,
                amount: parseFloat(editAmount)
            });
            await fetchData();
            setEditingCategory(null);
            setEditAmount('');
        } catch (err) {
            console.error("Failed to update budget", err);
        }
    };

    const getProgressColor = (spent, limit) => {
        const percentage = (spent / limit) * 100;
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-corporate-text-main">
                    <Target className="text-corporate-primary" size={20} />
                    Monthly Budgets
                </h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="p-1.5 hover:bg-corporate-bg rounded transition-colors text-corporate-text-secondary hover:text-white"
                >
                    {isEditing ? <X size={18} /> : <Plus size={18} />}
                </button>
            </div>

            {/* Add Budget Form */}
            {isEditing && (
                <div className="mb-6 p-4 bg-corporate-bg rounded-lg border border-corporate-border animate-in slide-in-from-top-2">
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-corporate-text-secondary mb-1">Category</label>
                            <select
                                value={newBudget.category}
                                onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                                className="w-full bg-corporate-card border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-corporate-text-secondary mb-1">Budget Amount (₹)</label>
                            <input
                                type="number"
                                value={newBudget.amount}
                                onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                                placeholder="5000"
                                className="w-full bg-corporate-card border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                            />
                        </div>
                        <button
                            onClick={handleSaveBudget}
                            className="bg-corporate-primary hover:bg-purple-700 text-white px-3 py-2 rounded transition-colors"
                        >
                            <Check size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Budget List */}
            <div className="space-y-5 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {Object.entries(budgets).length === 0 ? (
                    <p className="text-corporate-text-muted text-sm text-center py-4">No budgets set. Click + to add one.</p>
                ) : (
                    Object.entries(budgets).map(([category, limit]) => {
                        const spent = spending[category] || 0;
                        const percentage = Math.min((spent / limit) * 100, 100);
                        const isEditingThis = editingCategory === category;

                        return (
                            <div key={category} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-medium">
                                    <span className="text-corporate-text-secondary">{category}</span>
                                    <div className="flex items-center gap-2">
                                        {isEditingThis ? (
                                            <>
                                                <input
                                                    type="number"
                                                    value={editAmount}
                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                    className="w-20 bg-corporate-bg border border-corporate-primary rounded px-2 py-1 text-xs text-corporate-text-main focus:outline-none"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={saveEdit}
                                                    className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                                    title="Save"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                                    title="Cancel"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-corporate-text-muted">
                                                    ₹{spent.toFixed(0)} / <span className="text-corporate-text-main">₹{limit}</span>
                                                </span>
                                                <button
                                                    onClick={() => startEdit(category, limit)}
                                                    className="p-1 hover:bg-corporate-primary/20 text-corporate-primary rounded transition-colors"
                                                    title="Edit budget"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="h-1.5 bg-corporate-bg rounded-full overflow-hidden">
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
