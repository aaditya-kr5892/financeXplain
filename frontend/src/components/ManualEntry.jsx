import React, { useState } from 'react';
import { Plus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const ManualEntry = ({ onTransactionAdded }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0], // Default to today
        description: '',
        amount: '',
        category: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error'
    const [message, setMessage] = useState('');

    const categories = [
        'Auto-categorize',
        'Income',
        'Food',
        'Transportation',
        'Utilities',
        'Entertainment',
        'Shopping',
        'Healthcare',
        'Education',
        'Other'
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear status when user starts typing
        if (status) {
            setStatus(null);
            setMessage('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.date || !formData.description || !formData.amount) {
            setStatus('error');
            setMessage('Please fill in all required fields');
            return;
        }

        if (parseFloat(formData.amount) === 0) {
            setStatus('error');
            setMessage('Amount cannot be zero');
            return;
        }

        setSubmitting(true);
        setStatus(null);
        setMessage('');

        try {
            const transactionData = {
                date: formData.date,
                description: formData.description,
                amount: parseFloat(formData.amount),
                category: formData.category === 'Auto-categorize' ? null : formData.category || null
            };

            const res = await axios.post('/api/transaction', transactionData);

            setStatus('success');
            setMessage(`Transaction added successfully! Category: ${res.data.transaction.category}`);

            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                description: '',
                amount: '',
                category: ''
            });

            // Notify parent component
            if (onTransactionAdded) onTransactionAdded();

        } catch (err) {
            console.error(err);
            setStatus('error');
            setMessage(err.response?.data?.detail || 'Failed to add transaction. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-slate-800/30 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="text-blue-400" size={24} />
                Add New Transaction
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date Input */}
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-2">
                        Date <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Description Input */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                        Description <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="e.g., Grocery shopping at Walmart"
                        required
                        className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Amount Input */}
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-2">
                        Amount <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="0.00"
                            step="0.01"
                            required
                            className="w-full pl-8 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Use negative values for expenses (e.g., -50) and positive for income (e.g., 1000)
                    </p>
                </div>

                {/* Category Select */}
                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
                        Category (Optional)
                    </label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat === 'Auto-categorize' ? '' : cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                        Leave as "Auto-categorize" to use AI categorization
                    </p>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${submitting
                            ? 'bg-slate-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                        } text-white`}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="animate-spin" size={20} />
                            Adding Transaction...
                        </>
                    ) : (
                        <>
                            <Plus size={20} />
                            Add Transaction
                        </>
                    )}
                </button>

                {/* Status Message */}
                {status && (
                    <div
                        className={`flex items-center gap-2 p-4 rounded-lg ${status === 'success'
                                ? 'bg-green-500/10 border border-green-500/20'
                                : 'bg-red-500/10 border border-red-500/20'
                            }`}
                    >
                        {status === 'success' ? (
                            <CheckCircle className="text-green-400" size={20} />
                        ) : (
                            <AlertCircle className="text-red-400" size={20} />
                        )}
                        <p
                            className={`text-sm ${status === 'success' ? 'text-green-400' : 'text-red-400'
                                }`}
                        >
                            {message}
                        </p>
                    </div>
                )}
            </form>
        </div>
    );
};

export default ManualEntry;
