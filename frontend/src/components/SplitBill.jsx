import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Check, DollarSign, ArrowRight, UserPlus, Receipt } from 'lucide-react';

const SplitBill = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({ description: '', amount: '' });

    // Current User for logic
    const currentUser = localStorage.getItem('fintech_user');

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (selectedGroup) {
            fetchGroupDetails(selectedGroup.id);
        }
    }, [selectedGroup?.id]);

    const fetchGroups = async () => {
        try {
            const res = await axios.get('/api/groups');
            setGroups(res.data);
            if (res.data.length > 0 && !selectedGroup) {
                setSelectedGroup(res.data[0]);
            }
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch groups", err);
            setLoading(false);
        }
    };

    const fetchGroupDetails = async (groupId) => {
        setLoading(true);
        try {
            // Parallel fetch details and balances
            const [detailsRes, balanceRes] = await Promise.all([
                axios.get(`/api/groups/${groupId}`),
                axios.get(`/api/groups/${groupId}/balances`)
            ]);
            setSelectedGroup({ ...detailsRes.data, balances: balanceRes.data });
        } catch (err) {
            console.error("Failed to fetch details", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            const res = await axios.post('/api/groups', { name: newGroupName });
            setGroups([...groups, res.data]);
            setSelectedGroup(res.data);
            setNewGroupName('');
            setShowCreateGroup(false);
        } catch (err) {
            alert("Failed to create group");
        }
    };

    const handleAddMember = async () => {
        if (!newMemberName.trim()) return;
        try {
            await axios.post(`/api/groups/${selectedGroup.id}/members`, { username: newMemberName });
            fetchGroupDetails(selectedGroup.id); // Refresh
            setNewMemberName('');
            setShowAddMember(false);
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to add member");
        }
    };

    const handleAddExpense = async () => {
        if (!newExpense.description || !newExpense.amount) return;
        try {
            await axios.post(`/api/groups/${selectedGroup.id}/expenses`, {
                description: newExpense.description,
                amount: parseFloat(newExpense.amount)
            });
            fetchGroupDetails(selectedGroup.id); // Refresh
            setNewExpense({ description: '', amount: '' });
            setShowAddExpense(false);
        } catch (err) {
            alert("Failed to add expense");
        }
    };
    const handleAction = async (splitId, action) => {
        try {
            await axios.post(`/api/splits/${splitId}/action`, { action });
            fetchGroupDetails(selectedGroup.id);
        } catch (err) {
            alert(err.response?.data?.detail || "Action failed");
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in zoom-in duration-300">
            {/* Sidebar: Groups List */}
            <div className="w-1/3 min-w-[250px] bg-corporate-card border border-corporate-border rounded-lg flex flex-col overflow-hidden">
                <div className="p-4 border-b border-corporate-border flex justify-between items-center bg-corporate-bg/50">
                    <h3 className="font-bold text-corporate-text-main flex items-center gap-2">
                        <Users size={18} className="text-corporate-primary" /> Groups
                    </h3>
                    <button onClick={() => setShowCreateGroup(true)} className="p-1.5 rounded-md hover:bg-corporate-primary/10 text-corporate-text-secondary hover:text-corporate-primary transition-all">
                        <Plus size={18} />
                    </button>
                </div>

                {/* Create Group Input */}
                {showCreateGroup && (
                    <div className="p-3 bg-corporate-primary/5 border-b border-corporate-border">
                        <input
                            autoFocus
                            placeholder="Group Name..."
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                            className="w-full bg-corporate-bg border border-corporate-border rounded px-2 py-1 text-sm mb-2 focus:outline-none focus:border-corporate-primary"
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowCreateGroup(false)} className="text-xs text-corporate-text-secondary hover:text-corporate-text-main">Cancel</button>
                            <button onClick={handleCreateGroup} className="text-xs bg-corporate-primary text-white px-2 py-1 rounded">Create</button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {groups.map(g => (
                        <div
                            key={g.id}
                            onClick={() => setSelectedGroup(g)}
                            className={`p-3 rounded-md cursor-pointer flex items-center justify-between transition-all ${selectedGroup?.id === g.id ? 'bg-corporate-primary/10 border border-corporate-primary/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <span className={`text-sm font-medium ${selectedGroup?.id === g.id ? 'text-corporate-text-main' : 'text-corporate-text-secondary'}`}>{g.name}</span>
                            {selectedGroup?.id === g.id && <ArrowRight size={14} className="text-corporate-primary" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Area: Details */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                {selectedGroup ? (
                    <>
                        {/* Header & Balance Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Group Info */}
                            <div className="bg-corporate-card border border-corporate-border rounded-lg p-5 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-corporate-text-main mb-1">{selectedGroup.name}</h2>
                                    <div className="flex items-center gap-2 text-sm text-corporate-text-secondary mb-3">
                                        <Users size={14} />
                                        <span>{selectedGroup.members?.length || 0} Members</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedGroup.members?.map(m => (
                                            <span key={m.id} className="text-xs px-2 py-1 bg-corporate-bg border border-corporate-border rounded-full text-corporate-text-secondary">
                                                {m.username}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => setShowAddMember(true)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-corporate-bg border border-corporate-border rounded-md text-xs hover:border-corporate-primary transition-all"
                                    >
                                        <UserPlus size={14} /> Add Member
                                    </button>
                                </div>
                                {showAddMember && (
                                    <div className="mt-2 flex gap-2 animate-in slide-in-from-top-1">
                                        <input
                                            autoFocus
                                            placeholder="Username"
                                            value={newMemberName}
                                            onChange={e => setNewMemberName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                                            className="flex-1 bg-corporate-bg border border-corporate-border rounded px-2 py-1 text-sm focus:outline-none focus:border-corporate-primary"
                                        />
                                        <button onClick={handleAddMember} className="bg-corporate-primary text-white p-1 rounded"><Check size={14} /></button>
                                        <button onClick={() => setShowAddMember(false)} className="text-corporate-text-secondary p-1 hover:text-white">✕</button>
                                    </div>
                                )}
                            </div>

                            {/* My Balance */}
                            <div className={`border rounded-lg p-5 flex flex-col justify-center items-center relative overflow-hidden ${selectedGroup.balances?.status === 'Settled' ? 'bg-corporate-card border-corporate-border' :
                                selectedGroup.balances?.net_balance > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
                                }`}>
                                <h4 className="text-sm font-medium text-corporate-text-secondary uppercase tracking-wider mb-2">Your Position</h4>
                                <div className={`text-3xl font-bold ${selectedGroup.balances?.net_balance > 0 ? 'text-emerald-400' :
                                    selectedGroup.balances?.net_balance < 0 ? 'text-rose-400' : 'text-corporate-text-muted'
                                    }`}>
                                    ₹{Math.abs(selectedGroup.balances?.net_balance || 0).toFixed(2)}
                                </div>
                                <span className={`text-xs mt-1 ${selectedGroup.balances?.net_balance > 0 ? 'text-emerald-300' :
                                    selectedGroup.balances?.net_balance < 0 ? 'text-rose-300' : 'text-corporate-text-muted'
                                    }`}>
                                    {selectedGroup.balances?.status}
                                </span>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-corporate-card border border-corporate-border rounded-lg flex-1 flex flex-col overflow-hidden">
                            <div className="p-4 border-b border-corporate-border flex justify-between items-center bg-corporate-bg/30">
                                <h3 className="font-bold text-corporate-text-main flex items-center gap-2">
                                    <Receipt size={18} className="text-corporate-accent" /> Expenses
                                </h3>
                                <button
                                    onClick={() => setShowAddExpense(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-corporate-primary hover:bg-purple-600 text-white rounded-md text-xs shadow-sm transition-all"
                                >
                                    <Plus size={14} /> Add Expense
                                </button>
                            </div>

                            {showAddExpense && (
                                <div className="p-4 bg-corporate-bg/50 border-b border-corporate-border grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-2">
                                    <input
                                        placeholder="Description (e.g. Lunch)"
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        className="bg-corporate-card border border-corporate-border rounded px-3 py-2 text-sm focus:outline-none focus:border-corporate-primary"
                                    />
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-corporate-text-secondary text-sm">₹</span>
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={newExpense.amount}
                                            onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                            className="w-full bg-corporate-card border border-corporate-border rounded pl-6 pr-3 py-2 text-sm focus:outline-none focus:border-corporate-primary"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddExpense} className="flex-1 bg-corporate-primary text-white rounded text-sm hover:bg-purple-600">Save</button>
                                        <button onClick={() => setShowAddExpense(false)} className="px-3 border border-corporate-border rounded text-corporate-text-secondary hover:text-white">Cancel</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                                {selectedGroup.expenses?.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-corporate-text-muted opacity-50">
                                        <Receipt size={48} className="mb-2" />
                                        <p className="text-sm">No expenses yet</p>
                                    </div>
                                ) : (
                                    selectedGroup.expenses?.map(exp => (
                                        <div key={exp.id} className="p-4 bg-corporate-bg/30 rounded-lg border border-corporate-border/50 hover:bg-corporate-bg/50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-medium text-corporate-text-main text-lg">{exp.description}</div>
                                                    <div className="text-xs text-corporate-text-secondary">Paid by <span className="text-corporate-primary font-semibold">{exp.payer}</span> • {new Date(exp.date).toLocaleDateString()}</div>
                                                </div>
                                                <div className="font-bold text-corporate-text-main text-lg">
                                                    ₹{exp.amount.toFixed(2)}
                                                </div>
                                            </div>

                                            {/* Splits Detail */}
                                            <div className="mt-3 pt-3 border-t border-corporate-border/30 space-y-2">
                                                {exp.splits?.map(split => {
                                                    const isMySplit = split.username === currentUser;
                                                    const isPayer = exp.payer === currentUser;

                                                    return (
                                                        <div key={split.id} className="flex items-center justify-between text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-corporate-text-secondary">{isMySplit ? "You" : split.username}</span>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${split.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                    split.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                                                                        'bg-yellow-500/10 text-yellow-400'
                                                                    }`}>
                                                                    {split.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-corporate-text-main">₹{split.amount.toFixed(2)}</span>

                                                                {/* Actions for Ower */}
                                                                {isMySplit && split.status === 'pending' && (
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => handleAction(split.id, 'pay')}
                                                                            className="text-xs px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded transition-colors"
                                                                            title="Mark as Paid"
                                                                        >
                                                                            Pay
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleAction(split.id, 'reject')}
                                                                            className="text-xs px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded transition-colors"
                                                                            title="Reject"
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Actions for Payer (Mark Received) */}
                                                                {isPayer && !isMySplit && split.status === 'pending' && (
                                                                    <button
                                                                        onClick={() => handleAction(split.id, 'pay')}
                                                                        className="text-xs px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded transition-colors"
                                                                        title="Confirm Receipt"
                                                                    >
                                                                        Mark Received
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-corporate-text-muted opacity-50 space-y-4">
                        <Users size={64} className="text-corporate-border" />
                        <p className="text-lg">Select or Create a Group to start splitting bills</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SplitBill;
