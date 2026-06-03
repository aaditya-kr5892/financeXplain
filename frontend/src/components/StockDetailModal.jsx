import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, TrendingUp, Calendar, ExternalLink, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StockDetailModal = ({ symbol, isOpen, onClose }) => {
    if (!isOpen || !symbol) return null;

    const [period, setPeriod] = useState('1mo');
    const [chartData, setChartData] = useState([]);
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            <div className="bg-corporate-card border border-corporate-border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
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
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Chart Section */}
                    <div>
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

                        <div className="h-80 w-full bg-corporate-bg/30 rounded-lg p-4 border border-corporate-border relative">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-corporate-bg/50 z-10">
                                    <RefreshCw className="animate-spin text-corporate-primary" size={32} />
                                </div>
                            )}
                            {error ? (
                                <div className="flex items-center justify-center h-full text-red-400">{error}</div>
                            ) : chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
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
                                            formatter={(val) => [`₹${val.toFixed(2)}`, 'Price']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#3b82f6"
                                            fillOpacity={1}
                                            fill="url(#colorPrice)"
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-corporate-text-secondary">No data available</div>
                            )}
                        </div>
                    </div>

                    {/* News Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-corporate-text-main mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-corporate-primary" /> Latest News
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
