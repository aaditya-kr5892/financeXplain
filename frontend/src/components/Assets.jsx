import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Plus, Minus, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet, Building, Landmark, Bitcoin, Briefcase, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import StockSearch from './StockSearch';
import StockDetailModal from './StockDetailModal';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Assets = () => {
    const [assets, setAssets] = useState([]);
    const [netWorthData, setNetWorthData] = useState({ total_net_worth: 0, breakdown: {} });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [newAsset, setNewAsset] = useState({
        name: '',
        symbol: '',
        type: 'Stock',
        quantity: '',
        purchase_price: '',
        current_price: '',
        purchase_date: new Date().toISOString().split('T')[0]
    });

    const assetTypes = ['Stock', 'Mutual Fund', 'Gold', 'Real Estate', 'Crypto', 'Fixed Deposit'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [assetsRes, netWorthRes] = await Promise.all([
                axios.get('/api/assets'),
                axios.get('/api/net-worth')
            ]);
            setAssets(assetsRes.data);
            setNetWorthData(netWorthRes.data);
        } catch (err) {
            console.error("Failed to fetch asset data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAsset = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...newAsset,
                purchase_price: newAsset.purchase_price ? Number(newAsset.purchase_price) : 0,
                current_price: newAsset.current_price ? Number(newAsset.current_price) : 0
            };
            await axios.post('/api/assets', payload);
            setIsAddModalOpen(false);
            setNewAsset({
                name: '',
                type: 'Stock',
                quantity: '',
                purchase_price: '',
                current_price: '',
                purchase_date: new Date().toISOString().split('T')[0]
            });
            fetchData();
        } catch (err) {
            console.error("Failed to add asset", err);
            const msg = err.response?.data?.detail || "Failed to add asset";
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAsset = async (id) => {
        try {
            console.log("Deleting:", id);
            await axios.delete(`/api/assets/${id}`);
            fetchData();
        } catch (err) {
            console.error("Failed to delete asset", err);
            alert(`Delete failed: ${err.message}`);
        }
    };

    const formatCurrency = (val, asset) => {
        let currency = 'INR';
        try {
            if (asset.metrics) {
                const m = JSON.parse(asset.metrics);
                if (m.currency) currency = m.currency.toUpperCase();
            }
        } catch (e) { }
        return val.toLocaleString('en-US', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 2
        });
    };

    const handleRefreshPrices = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/assets/refresh-prices');
            if (res.data.errors && res.data.errors.length > 0) {
                alert(`Refreshed with errors:\n${res.data.errors.join('\n')}`);
            }
            fetchData();
        } catch (err) {
            console.error("Failed to refresh prices", err);
            alert("Failed to refresh prices");
        } finally {
            setLoading(false);
        }
    };

    const getLotSize = (asset) => {
        try {
            if (asset.metrics) {
                const m = JSON.parse(asset.metrics);
                return m.lot_size && m.lot_size > 0 ? m.lot_size : 1;
            }
        } catch (e) { }
        return 1;
    };

    const handleUpdateQuantity = async (asset, delta) => {
        const newQty = (Number(asset.quantity) || 0) + delta;
        if (newQty < 0) return;
        try {
            // Optimistic update
            setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, quantity: newQty } : a));
            await axios.put(`/api/assets/${asset.id}`, { quantity: newQty });
            fetchData();
        } catch (err) {
            console.error(err);
            fetchData(); // Revert
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'Stock': return <TrendingUp size={18} />;
            case 'Mutual Fund': return <Briefcase size={18} />;
            case 'Gold': return <Landmark size={18} />;
            case 'Real Estate': return <Building size={18} />;
            case 'Crypto': return <Bitcoin size={18} />;
            default: return <Wallet size={18} />;
        }
    };

    const pieData = Object.entries(netWorthData.breakdown).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-corporate-text-main">
                        Asset Management
                    </h2>
                    <p className="text-corporate-text-secondary">Track your net worth and portfolio</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefreshPrices}
                        disabled={loading}
                        className="bg-corporate-card border border-corporate-border text-corporate-text-secondary hover:text-corporate-text-main px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? "Refreshing..." : "Refresh Prices"}
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-corporate-primary hover:bg-corporate-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
                    >
                        <Plus size={16} /> Add Asset
                    </button>
                </div>
            </div>

            {/* Net Worth Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={48} className="text-corporate-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-corporate-text-secondary text-sm font-medium uppercase tracking-wider">Total Net Worth</p>
                        <h3 className="text-3xl font-bold text-corporate-text-main mt-2">
                            ₹{netWorthData.total_net_worth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </h3>
                        <div className="flex items-center mt-2 text-emerald-400 text-sm font-medium">
                            <TrendingUp size={14} className="mr-1" />
                            <span>+12.5% this year</span> {/* Placeholder for now */}
                        </div>
                    </div>
                </div>

                {/* Allocation Chart */}
                <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm md:col-span-2 h-64 flex items-center">
                    <div className="w-full h-full flex items-center">
                        <div className="w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        formatter={(value) => `₹${value.toLocaleString()}`}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 pl-8">
                            <h4 className="text-lg font-semibold text-corporate-text-main mb-4">Asset Allocation</h4>
                            <div className="space-y-2">
                                {pieData.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-corporate-text-secondary">{entry.name}</span>
                                        </div>
                                        <span className="font-medium text-corporate-text-main">
                                            {Math.round((entry.value / netWorthData.total_net_worth) * 100)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assets List */}
            <div className="bg-corporate-card border border-corporate-border rounded-lg overflow-hidden shadow-sm">
                <div className="p-6 border-b border-corporate-border">
                    <h3 className="text-xl font-bold text-corporate-text-main">Your Assets</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-corporate-bg text-corporate-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-corporate-border">
                            <tr>
                                <th className="px-6 py-4">Asset Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4 text-right">Quantity</th>
                                <th className="px-6 py-4 text-right">Avg. Buy Price</th>
                                <th className="px-6 py-4 text-right">Current Price</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-corporate-text-secondary uppercase tracking-wider">Day P&L</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-corporate-text-secondary uppercase tracking-wider">Total P&L</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-corporate-text-secondary uppercase tracking-wider">Total Value</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-corporate-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-corporate-border">
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-corporate-text-secondary">
                                        No assets found. Add your first asset to track your wealth.
                                    </td>
                                </tr>
                            ) : (
                                assets.map((asset) => {
                                    const m = (() => { try { return JSON.parse(asset.metrics || '{}'); } catch { return {}; } })();
                                    const prevClose = m.previous_close || asset.current_price;

                                    const totalPL = (asset.current_price - asset.purchase_price) * asset.quantity;
                                    const dayPL = (asset.current_price - prevClose) * asset.quantity;
                                    const isProfit = totalPL >= 0;
                                    const isDayProfit = dayPL >= 0;

                                    return (
                                        <tr
                                            key={asset.id}
                                            className="transition-colors hover:bg-corporate-bg/50"
                                        >
                                            <td
                                                className={`px-6 py-4 ${asset.symbol ? 'cursor-pointer' : ''}`}
                                                onClick={() => asset.symbol && setSelectedAsset(asset)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded ${isProfit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-corporate-text-main">
                                                            {asset.name}
                                                            {asset.symbol && <span className="ml-2 text-xs text-corporate-text-secondary bg-corporate-bg px-1.5 py-0.5 rounded border border-corporate-border">{asset.symbol}</span>}
                                                        </div>
                                                        {asset.metrics && (() => {
                                                            try {
                                                                const m = JSON.parse(asset.metrics);
                                                                return (
                                                                    <div className="text-[10px] text-corporate-text-secondary mt-1 flex gap-2">
                                                                        <span title="P/E Ratio">P/E: {m.pe?.toFixed(1) || 'N/A'}</span>
                                                                        <span title="Dividend Yield">Yield: {m.dividend_yield ? (m.dividend_yield * 100).toFixed(2) + '%' : 'N/A'}</span>
                                                                    </div>
                                                                );
                                                            } catch (e) { return null; }
                                                        })()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-corporate-text-secondary text-sm ${asset.symbol ? 'cursor-pointer' : ''}`}
                                                onClick={() => asset.symbol && setSelectedAsset(asset)}
                                            >
                                                {asset.type}
                                            </td>
                                            <td className="px-6 py-4 text-right text-corporate-text-main font-mono">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(asset, -getLotSize(asset)); }}
                                                        className="p-1 hover:bg-white/10 rounded text-corporate-text-secondary hover:text-white transition-colors"
                                                        title={`Decrease by ${getLotSize(asset)}`}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span>{asset.quantity}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(asset, getLotSize(asset)); }}
                                                        className="p-1 hover:bg-white/10 rounded text-corporate-text-secondary hover:text-white transition-colors"
                                                        title={`Increase by ${getLotSize(asset)}`}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-right text-corporate-text-secondary font-mono ${asset.symbol ? 'cursor-pointer' : ''}`}
                                                onClick={() => asset.symbol && setSelectedAsset(asset)}
                                            >
                                                {formatCurrency(asset.purchase_price, asset)}
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-right text-corporate-text-main font-mono ${asset.symbol ? 'cursor-pointer' : ''}`}
                                                onClick={() => asset.symbol && setSelectedAsset(asset)}
                                            >
                                                {formatCurrency(asset.current_price, asset)}
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-right font-mono ${asset.symbol ? 'cursor-pointer' : ''} ${isDayProfit ? 'text-emerald-500' : 'text-red-500'}`}
                                                onClick={() => asset.symbol && setSelectedAsset(asset)}
                                            >
                                                {formatCurrency(dayPL, asset)}
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-right font-mono ${asset.symbol ? 'cursor-pointer' : ''} ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}
                                                onClick={() => asset.symbol && setSelectedAsset(asset)}
                                            >
                                                {formatCurrency(totalPL, asset)}
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-right font-bold font-mono ${asset.symbol ? 'cursor-pointer' : ''} ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}
                                                onClick={() => asset.symbol && setSelectedAsset(asset)}
                                            >
                                                {formatCurrency(asset.quantity * asset.current_price, asset)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteAsset(asset.id);
                                                    }}
                                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                                                >
                                                    DELETE
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Asset Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Asset">
                <form onSubmit={handleAddAsset} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Asset Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                            value={newAsset.name}
                            onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                            placeholder="e.g. Reliance Industries"
                        />
                    </div>
                    {(newAsset.type === 'Stock' || newAsset.type === 'Crypto' || newAsset.type === 'Mutual Fund' || newAsset.type === 'Gold') && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Ticker Search (Auto-Complete)</label>
                            <StockSearch
                                value={newAsset.symbol}
                                onChange={(val) => setNewAsset({ ...newAsset, symbol: val.toUpperCase() })}
                                onSelect={(item) => {
                                    setNewAsset(prev => ({
                                        ...prev,
                                        symbol: item.symbol,
                                        name: prev.name || item.shortname || item.longname || item.symbol
                                    }));
                                }}
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Asset Type</label>
                        <select
                            className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                            value={newAsset.type}
                            onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                        >
                            {assetTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Quantity</label>
                            <input
                                type="number"
                                step="any"
                                required
                                className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                value={newAsset.quantity}
                                onChange={(e) => setNewAsset({ ...newAsset, quantity: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Purchase Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                value={newAsset.purchase_date}
                                onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">Buy Price (Per Unit)</label>
                            <input
                                type="number"
                                step="any"
                                required
                                className="w-full bg-corporate-bg border border-corporate-border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary"
                                value={newAsset.purchase_price}
                                onChange={(e) => setNewAsset({ ...newAsset, purchase_price: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-corporate-text-secondary mb-1">
                                Current Price (Per Unit) {newAsset.symbol && <span className="text-emerald-400 text-xs">- Auto-fetch enabled</span>}
                            </label>
                            <input
                                type="number"
                                step="any"
                                required={!newAsset.symbol}
                                className={`w-full bg-corporate-bg border rounded px-3 py-2 text-corporate-text-main focus:outline-none focus:border-corporate-primary ${!newAsset.symbol ? 'border-corporate-border' : 'border-emerald-500/30'}`}
                                value={newAsset.current_price}
                                onChange={(e) => setNewAsset({ ...newAsset, current_price: parseFloat(e.target.value) })}
                                placeholder={newAsset.symbol ? "Leave blank to auto-fetch" : "Required"}
                            />
                        </div>
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full bg-corporate-primary hover:bg-corporate-primary/90 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="animate-spin" size={20} />
                                    Parsing & Adding...
                                </>
                            ) : (
                                "Add Asset"
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Asset Detail Modal */}
            <StockDetailModal
                symbol={selectedAsset?.symbol}
                isOpen={!!selectedAsset}
                onClose={() => setSelectedAsset(null)}
            />
        </div>
    );
};

export default Assets;
