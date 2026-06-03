import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, DollarSign, Plus, Edit2, Trash2, Check, X, Bell, AlertCircle } from 'lucide-react';

const RecurringPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newPayment, setNewPayment] = useState({
        name: '',
        amount: '',
        category: 'Utilities',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        auto_pay: false,
        description: ''
    });

    const categories = ['Utilities', 'Rent', 'EMI', 'Insurance', 'Subscription', 'Healthcare', 'Education', 'Other'];
    const frequencies = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' }
    ];

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const res = await axios.get('/api/recurring-payments');
            setPayments(res.data);
        } catch (err) {
            console.error("Error fetching recurring payments:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newPayment.name || !newPayment.amount) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            await axios.post('/api/recurring-payments', newPayment);
            await fetchPayments();
            setNewPayment({
                name: '',
                amount: '',
                category: 'Utilities',
                frequency: 'monthly',
                start_date: new Date().toISOString().split('T')[0],
                auto_pay: false,
                description: ''
            });
            setIsAdding(false);
        } catch (err) {
            console.error("Error creating payment:", err);
            alert("Failed to create recurring payment");
        }
    };

    const handleMarkAsPaid = async (paymentId) => {
        try {
            const res = await axios.post(`/api/recurring-payments/${paymentId}/pay`);
            alert(`Payment marked as paid! Next due: ${res.data.next_due_date}`);
            await fetchPayments();
        } catch (err) {
            console.error("Error marking payment as paid:", err);
            alert("Failed to mark payment as paid");
        }
    };

    const handleDelete = async (paymentId) => {
        if (!confirm("Are you sure you want to delete this recurring payment?")) return;

        try {
            await axios.delete(`/api/recurring-payments/${paymentId}`);
            await fetchPayments();
        } catch (err) {
            console.error("Error deleting payment:", err);
            alert("Failed to delete payment");
        }
    };

    const handleToggleActive = async (payment) => {
        try {
            await axios.put(`/api/recurring-payments/${payment.id}`, {
                is_active: !payment.is_active
            });
            await fetchPayments();
        } catch (err) {
            console.error("Error toggling payment status:", err);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'overdue': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
            case 'due': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
            case 'upcoming': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
        }
    };

    const duePayments = payments.filter(p => p.status === 'overdue' || p.status === 'due');
    const upcomingPayments = payments.filter(p => p.status === 'upcoming');

    return (
        <div className="bg-corporate-bg min-h-full p-6 animate-in fade-in zoom-in duration-300">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-corporate-text-main">Recurring Payments</h2>
                        <p className="text-corporate-text-secondary text-sm">Manage your bills, EMIs, and subscriptions</p>
                    </div>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 bg-corporate-primary hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                    >
                        {isAdding ? <X size={18} /> : <Plus size={18} />}
                        {isAdding ? 'Cancel' : 'Add Payment'}
                    </button>
                </div>

                {/* Add Payment Form */}
                {isAdding && (
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 mb-6 animate-in slide-in-from-top-2">
                        <h3 className="text-lg font-semibold text-corporate-text-main mb-4">New Recurring Payment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-corporate-text-secondary mb-1">Payment Name *</label>
                                <input
                                    type="text"
                                    value={newPayment.name}
                                    onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                                    placeholder="e.g., Electricity Bill"
                                    className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-corporate-text-secondary mb-1">Amount (₹) *</label>
                                <input
                                    type="number"
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                    placeholder="5000"
                                    className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-corporate-text-secondary mb-1">Category</label>
                                <select
                                    value={newPayment.category}
                                    onChange={(e) => setNewPayment({ ...newPayment, category: e.target.value })}
                                    className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                >
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-corporate-text-secondary mb-1">Frequency</label>
                                <select
                                    value={newPayment.frequency}
                                    onChange={(e) => setNewPayment({ ...newPayment, frequency: e.target.value })}
                                    className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                >
                                    {frequencies.map(freq => <option key={freq.value} value={freq.value}>{freq.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-corporate-text-secondary mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={newPayment.start_date}
                                    onChange={(e) => setNewPayment({ ...newPayment, start_date: e.target.value })}
                                    className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={newPayment.auto_pay}
                                    onChange={(e) => setNewPayment({ ...newPayment, auto_pay: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label className="text-sm text-corporate-text-main">Auto-pay (create transaction automatically)</label>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-xs text-corporate-text-secondary mb-1">Description (Optional)</label>
                            <textarea
                                value={newPayment.description}
                                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                                placeholder="Additional notes..."
                                className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-sm text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                rows={2}
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-sm text-corporate-text-secondary hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 bg-corporate-primary hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                            >
                                <Check size={16} />
                                Create Payment
                            </button>
                        </div>
                    </div>
                )}

                {/* Due Payments Section */}
                {duePayments.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Bell className="text-rose-400" size={20} />
                            <h3 className="text-lg font-semibold text-corporate-text-main">Payments Due</h3>
                            <span className="bg-rose-500/20 text-rose-400 text-xs px-2 py-0.5 rounded-full">{duePayments.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {duePayments.map(payment => (
                                <div key={payment.id} className="bg-corporate-card border border-rose-500/30 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold text-corporate-text-main">{payment.name}</h4>
                                            <p className="text-xs text-corporate-text-secondary">{payment.category} • {payment.frequency}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(payment.status)}`}>
                                            {payment.status === 'overdue' ? `${Math.abs(payment.days_until_due)} days overdue` : 'Due today'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <span className="text-2xl font-bold text-corporate-text-main">₹{payment.amount.toLocaleString()}</span>
                                        <button
                                            onClick={() => handleMarkAsPaid(payment.id)}
                                            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-sm transition-colors"
                                        >
                                            <Check size={14} />
                                            Mark as Paid
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Payments List */}
                <div>
                    <h3 className="text-lg font-semibold text-corporate-text-main mb-3">All Recurring Payments</h3>
                    {loading ? (
                        <p className="text-corporate-text-secondary text-center py-8">Loading...</p>
                    ) : payments.length === 0 ? (
                        <div className="bg-corporate-card border border-corporate-border rounded-lg p-8 text-center">
                            <Calendar className="mx-auto text-corporate-text-muted mb-2" size={48} />
                            <p className="text-corporate-text-secondary">No recurring payments set up yet</p>
                            <p className="text-xs text-corporate-text-muted mt-1">Click "Add Payment" to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingPayments.map(payment => (
                                <div key={payment.id} className="bg-corporate-card border border-corporate-border rounded-lg p-4 hover:border-corporate-primary/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-corporate-text-main">{payment.name}</h4>
                                                {!payment.is_active && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">Paused</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-corporate-text-secondary mb-2">{payment.category} • {payment.frequency}</p>
                                            <div className="flex items-center gap-4 text-xs text-corporate-text-muted">
                                                <span>Next due: {payment.next_due_date}</span>
                                                <span className={getStatusColor(payment.status) + ' px-2 py-0.5 rounded border'}>
                                                    {payment.days_until_due} days
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-bold text-corporate-text-main">₹{payment.amount.toLocaleString()}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleToggleActive(payment)}
                                                    className="p-2 hover:bg-corporate-bg rounded transition-colors text-corporate-text-secondary hover:text-white"
                                                    title={payment.is_active ? "Pause" : "Resume"}
                                                >
                                                    {payment.is_active ? <X size={16} /> : <Check size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(payment.id)}
                                                    className="p-2 hover:bg-rose-500/20 rounded transition-colors text-corporate-text-secondary hover:text-rose-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecurringPayments;
