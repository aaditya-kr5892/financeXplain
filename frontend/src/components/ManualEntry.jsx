import React, { useState } from 'react';
import { Plus, CheckCircle, AlertCircle, Loader2, Feather, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
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
            setMessage('Please fill in all required fields.');
            return;
        }

        if (parseFloat(formData.amount) === 0) {
            setStatus('error');
            setMessage('Transaction amount cannot be zero.');
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
        <div className="h-full">
            <h3 className="text-lg font-semibold text-corporate-text-main mb-4 flex items-center gap-2 pb-2 border-b border-corporate-border">
                <Plus className="text-corporate-primary" size={20} />
                Quick Entry
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Date Input */}
                    <div>
                        <label className="block text-xs font-medium text-corporate-text-secondary mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 bg-corporate-bg border border-corporate-border rounded text-corporate-text-main text-sm focus:outline-none focus:border-corporate-primary"
                        />
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-medium text-corporate-text-secondary mb-1">
                            Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-corporate-text-secondary font-bold text-xs">₹</span>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                                className="w-full pl-6 pr-3 py-2 bg-corporate-bg border border-corporate-border rounded text-corporate-text-main text-sm focus:outline-none focus:border-corporate-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Description Input */}
                <div>
                    <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Description (e.g. Grocery)"
                        required
                        className="w-full px-3 py-2 bg-corporate-bg border border-corporate-border rounded text-corporate-text-main text-sm focus:outline-none focus:border-corporate-primary"
                    />
                </div>

                {/* Category Select */}
                <div>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-corporate-bg border border-corporate-border rounded text-corporate-text-main text-sm focus:outline-none focus:border-corporate-primary appearance-none"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat === 'Auto-categorize' ? '' : cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-2 px-4 rounded font-medium transition-all flex items-center justify-center gap-2 text-sm ${submitting
                        ? 'bg-corporate-bg border border-corporate-border text-corporate-text-muted cursor-not-allowed'
                        : 'bg-corporate-primary hover:bg-purple-700 text-white'
                        }`}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Adding...
                        </>
                    ) : (
                        <>
                            <CheckCircle size={16} />
                            Save
                        </>
                    )}
                </button>

                {/* Status Message */}
                {status && (
                    <div
                        className={`flex items-center gap-2 p-2 rounded border animate-in fade-in slide-in-from-bottom-2 ${status === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-rose-500/10 border-rose-500/20'
                            }`}
                    >
                        {status === 'success' ? (
                            <CheckCircle className="text-emerald-400" size={16} />
                        ) : (
                            <AlertCircle className="text-rose-400" size={16} />
                        )}
                        <p
                            className={`text-xs font-medium ${status === 'success' ? 'text-emerald-400' : 'text-rose-400'
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
