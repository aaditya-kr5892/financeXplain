import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, TrendingUp, Calendar, ExternalLink, RefreshCw, Activity, Layers } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Bar, ReferenceLine, Legend } from 'recharts';

const StockDetailModal = ({ symbol, isOpen, onClose }) => {
    if (!isOpen || !symbol) return null;

    const [period, setPeriod] = useState('1mo');
    const [chartData, setChartData] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [indicators, setIndicators] = useState({
        sma: false,
        ema: false,
        rsi: false,
        macd: false
    });

    const periods = [
        { label: '1D', val: '1d' },
        { label: '5D', val: '5d' },
        { label: '1M', val: '1mo' },
        { label: '6M', val: '6mo' },
        { label: '1Y', val: '1y' },
        { label: '5Y', val: '5y' },
        { label: 'Max', val: 'max' }
    ];

    useEffect(() => {
        fetchData();
        // Reset period to 1mo on new symbol? Or keep?
        // Let's keep unless symbol changes.
    }, [symbol, period]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [histRes, newsRes] = await Promise.all([
                axios.get(`/api/stocks/${symbol}/history?period=${period}`),
                axios.get(`/api/stocks/${symbol}/news`)
            ]);
            setChartData(histRes.data);
            setNews(newsRes.data);
        } catch (err) {
            console.error("Failed to fetch stock details", err);
            setError("Failed to load data. Please check connection or symbol.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        if (period === '1d' || period === '5d') {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-corporate-card border border-corporate-border rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-corporate-border flex justify-between items-center bg-corporate-bg/50">
                    <div>
                        <h2 className="text-2xl font-bold text-corporate-text-main flex items-center gap-2">
                            {symbol} <span className="text-sm font-normal text-corporate-text-secondary bg-corporate-border/30 px-2 py-0.5 rounded">Stock Analysis</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-corporate-text-secondary hover:text-corporate-text-main transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart Section */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-corporate-text-main flex items-center gap-2">
                                <TrendingUp size={18} className="text-corporate-primary" /> Price History
                            </h3>
                            <div className="flex bg-corporate-bg rounded-lg p-1 border border-corporate-border">
                                {periods.map((p) => (
                                    <button
                                        key={p.val}
                                        onClick={() => setPeriod(p.val)}
                                        className={`px-3 py-1 text-xs font-medium rounded transition-all ${period === p.val
                                            ? 'bg-corporate-primary text-white shadow-sm'
                                            : 'text-corporate-text-secondary hover:text-corporate-text-main hover:bg-white/5'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => setIndicators(prev => ({ ...prev, sma: !prev.sma }))}
                                className={`px-3 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${indicators.sma ? 'bg-orange-500/20 text-orange-500 border-orange-500/50' : 'bg-corporate-bg border-corporate-border text-corporate-text-secondary'}`}
                            >
                                <Activity size={12} /> SMA (20)
                            </button>
                            <button
                                onClick={() => setIndicators(prev => ({ ...prev, ema: !prev.ema }))}
                                className={`px-3 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${indicators.ema ? 'bg-purple-500/20 text-purple-500 border-purple-500/50' : 'bg-corporate-bg border-corporate-border text-corporate-text-secondary'}`}
                            >
                                <Activity size={12} /> EMA (20)
                            </button>
                            <button
                                onClick={() => setIndicators(prev => ({ ...prev, rsi: !prev.rsi }))}
                                className={`px-3 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${indicators.rsi ? 'bg-teal-500/20 text-teal-500 border-teal-500/50' : 'bg-corporate-bg border-corporate-border text-corporate-text-secondary'}`}
                            >
                                <Layers size={12} /> RSI
                            </button>
                            <button
                                onClick={() => setIndicators(prev => ({ ...prev, macd: !prev.macd }))}
                                className={`px-3 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${indicators.macd ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/50' : 'bg-corporate-bg border-corporate-border text-corporate-text-secondary'}`}
                            >
                                <Layers size={12} /> MACD
                            </button>
                        </div>

                        <div className="w-full bg-corporate-bg/30 rounded-lg p-4 border border-corporate-border relative flex flex-col gap-4">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-corporate-bg/50 z-10 w-full h-full rounded-lg">
                                    <RefreshCw className="animate-spin text-corporate-primary" size={32} />
                                </div>
                            )}
                            {error ? (
                                <div className="flex items-center justify-center h-full text-red-400 p-8">{error}</div>
                            ) : chartData.length > 0 ? (
                                <>
                                    <div className="w-full h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={formatDate}
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    minTickGap={30}
                                                    hide={indicators.rsi || indicators.macd} // Hide X axis if other charts below
                                                />
                                                <YAxis
                                                    domain={['auto', 'auto']}
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    tickFormatter={(val) => `₹${val}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                                    labelFormatter={(label) => new Date(label).toLocaleString()}
                                                    formatter={(val, name) => [typeof val === 'number' ? val.toFixed(2) : val, name === 'price' ? 'Price' : name.toUpperCase()]}
                                                />
                                                <Legend />
                                                <Area
                                                    type="monotone"
                                                    dataKey="price"
                                                    stroke="#3b82f6"
                                                    fillOpacity={1}
                                                    fill="url(#colorPrice)"
                                                    strokeWidth={2}
                                                    name="Price"
                                                />
                                                {indicators.sma && <Line type="monotone" dataKey="sma_20" stroke="#f97316" dot={false} strokeWidth={1.5} name="SMA (20)" />}
                                                {indicators.ema && <Line type="monotone" dataKey="ema_20" stroke="#a855f7" dot={false} strokeWidth={1.5} name="EMA (20)" />}
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* RSI Chart */}
                                    {indicators.rsi && (
                                        <div className="h-32 w-full border-t border-corporate-border pt-2">
                                            <p className="text-xs text-corporate-text-secondary mb-1">Relative Strength Index (14)</p>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                                    <XAxis dataKey="date" hide />
                                                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} ticks={[30, 70]} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b' }} itemStyle={{ color: '#14b8a6' }} formatter={(val) => val.toFixed(2)} />
                                                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                                                    <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
                                                    <Line type="monotone" dataKey="rsi" stroke="#14b8a6" dot={false} strokeWidth={1.5} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {/* MACD Chart */}
                                    {indicators.macd && (
                                        <div className="h-32 w-full border-t border-corporate-border pt-2">
                                            <p className="text-xs text-corporate-text-secondary mb-1">MACD (12, 26, 9)</p>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                                                    <XAxis dataKey="date" hide />
                                                    <YAxis stroke="#94a3b8" fontSize={10} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b' }} formatter={(val) => val.toFixed(2)} />
                                                    <ReferenceLine y={0} stroke="#64748b" />
                                                    <Line type="monotone" dataKey="macd" stroke="#6366f1" dot={false} strokeWidth={1.5} />
                                                    <Line type="monotone" dataKey="signal" stroke="#f43f5e" dot={false} strokeWidth={1.5} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-corporate-text-secondary p-8">No data available</div>
                            )}
                        </div>
                    </div>

                    {/* News Section */}
                    <div className="lg:col-span-1 h-full overflow-y-auto pr-2">
                        <h3 className="text-lg font-semibold text-corporate-text-main mb-4 flex items-center gap-2 sticky top-0 bg-corporate-card py-2 z-10">
                            <Calendar size={18} className="text-corporate-primary" /> Latest News
                        </h3>
                        <div className="space-y-4">
                            {news.length > 0 ? (
                                news.map((item, idx) => {
                                    const content = item.content || item;
                                    const title = content.title;
                                    const link = content.clickThroughUrl?.url || content.canonicalUrl?.url || item.link;
                                    const publisher = content.provider?.displayName || item.publisher;
                                    const thumb = content.thumbnail?.resolutions?.[0]?.url || item.thumbnail?.resolutions?.[0]?.url;

                                    let dateDisplay = 'Recent';
                                    const time = content.pubDate || item.providerPublishTime;
                                    if (time) {
                                        const d = new Date(typeof time === 'number' ? time * 1000 : time);
                                        if (!isNaN(d.getTime())) {
                                            dateDisplay = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                                        }
                                    }

                                    return (
                                        <a
                                            key={idx}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-corporate-bg border border-corporate-border rounded-lg p-4 hover:border-corporate-primary/50 transition-colors group"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <h4 className="font-medium text-corporate-text-main group-hover:text-corporate-primary transition-colors line-clamp-2">
                                                        {title}
                                                    </h4>
                                                    <p className="text-xs text-corporate-text-secondary mt-2">
                                                        {publisher} • {dateDisplay}
                                                    </p>
                                                </div>
                                                {thumb && (
                                                    <img
                                                        src={thumb}
                                                        alt="Thumbnail"
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                )}
                                            </div>
                                        </a>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 text-center py-8 text-corporate-text-secondary bg-corporate-bg/30 rounded-lg">
                                    No recent news found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockDetailModal;
