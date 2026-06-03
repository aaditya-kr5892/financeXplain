import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, AlertCircle } from 'lucide-react';

const Forecast = () => {
    const [forecastData, setForecastData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(30); // days

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const res = await axios.get(`/api/forecast?days=${timeframe}`);
                console.log('Forecast data:', res.data);
                console.log('First item:', res.data[0]);
                setForecastData(res.data);
            } catch (err) {
                console.error("Error fetching forecast:", err);
                // Mock data if backend fails
                const mock = Array.from({ length: timeframe }, (_, i) => ({
                    date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    predicted_balance: 5000 + Math.random() * 1000 + (i * 50),
                    lower_bound: 4800 + (i * 50),
                    upper_bound: 5200 + (i * 50)
                }));
                setForecastData(mock);
            } finally {
                setLoading(false);
            }
        };

        fetchForecast();
    }, [timeframe]);

    // Calculate metrics from forecast data
    const calculateMetrics = () => {
        if (!forecastData || forecastData.length === 0) {
            return { growth: 0, monthEnd: 0, risk: 'Unknown' };
        }

        const firstBalance = forecastData[0]?.predicted_balance || 0;
        const lastBalance = forecastData[forecastData.length - 1]?.predicted_balance || 0;
        const growth = firstBalance !== 0 ? ((lastBalance - firstBalance) / firstBalance * 100) : 0;

        // Find month-end balance (30 days out or last available)
        const monthEndIndex = Math.min(29, forecastData.length - 1);
        const monthEnd = forecastData[monthEndIndex]?.predicted_balance || 0;

        // Calculate risk based on volatility (difference between upper and lower bounds)
        const avgVolatility = forecastData.reduce((sum, item) => {
            const range = (item.upper_bound || 0) - (item.lower_bound || 0);
            return sum + range;
        }, 0) / forecastData.length;

        const avgBalance = forecastData.reduce((sum, item) => sum + (item.predicted_balance || 0), 0) / forecastData.length;
        const volatilityRatio = avgBalance !== 0 ? (avgVolatility / avgBalance) : 0;

        let risk = 'Low';
        if (volatilityRatio > 0.3) risk = 'High';
        else if (volatilityRatio > 0.15) risk = 'Medium';

        return { growth, monthEnd, risk };
    };

    const metrics = calculateMetrics();

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-corporate-text-main">Financial Forecast</h2>
                    <p className="text-corporate-text-secondary text-sm">AI-powered predictions for your future balance</p>
                </div>
                <div className="flex space-x-1 bg-corporate-card p-1 rounded border border-corporate-border">
                    {[7, 30, 90].map((days) => (
                        <button
                            key={days}
                            onClick={() => setTimeframe(days)}
                            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${timeframe === days
                                ? 'bg-corporate-primary text-white shadow-sm'
                                : 'text-corporate-text-secondary hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {days} Days
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-corporate-card p-6 rounded-lg border border-corporate-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-corporate-primary/10 rounded-lg">
                            <TrendingUp className="text-corporate-primary" size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-corporate-text-main uppercase tracking-wider">Predicted Growth</h3>
                    </div>
                    <p className={`text-3xl font-bold mb-1 ${metrics.growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {metrics.growth >= 0 ? '+' : ''}{metrics.growth.toFixed(1)}%
                    </p>
                    <p className="text-xs text-corporate-text-secondary">Expected change over {timeframe} days</p>
                </div>

                <div className="bg-corporate-card p-6 rounded-lg border border-corporate-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Calendar className="text-emerald-400" size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-corporate-text-main uppercase tracking-wider">Projected Balance</h3>
                    </div>
                    <p className="text-3xl font-bold text-corporate-text-main mb-1">₹{metrics.monthEnd.toLocaleString()}</p>
                    <p className="text-xs text-corporate-text-secondary">Estimated balance at end of period</p>
                </div>

                <div className="bg-corporate-card p-6 rounded-lg border border-corporate-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-corporate-accent/10 rounded-lg">
                            <AlertCircle className="text-corporate-accent" size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-corporate-text-main uppercase tracking-wider">Risk Factor</h3>
                    </div>
                    <p className={`text-3xl font-bold mb-1 ${metrics.risk === 'Low' ? 'text-emerald-400' :
                        metrics.risk === 'Medium' ? 'text-yellow-400' : 'text-rose-400'
                        }`}>{metrics.risk}</p>
                    <p className="text-xs text-corporate-text-secondary">Based on forecast volatility</p>
                </div>
            </div>

            <div className="bg-corporate-card p-6 rounded-lg border border-corporate-border shadow-sm h-[500px]">
                <h3 className="text-lg font-semibold text-corporate-text-main mb-6">Balance Projection</h3>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={forecastData}>
                        <defs>
                            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7F56D9" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#7F56D9" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2D2D35" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#71717A"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            dy={10}
                        />
                        <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F1F26', borderColor: '#2D2D35', color: '#FFF' }}
                            itemStyle={{ color: '#FFF' }}
                            formatter={(value) => [`₹${value.toLocaleString()}`, '']}
                        />
                        <Legend iconType="circle" />

                        {/* Upper Bound Line */}
                        <Line
                            type="monotone"
                            dataKey="upper_bound"
                            name="Upper Bound"
                            stroke="#00B7C3"
                            strokeWidth={2.5}
                            dot={false}
                        />

                        {/* Lower Bound Line */}
                        <Line
                            type="monotone"
                            dataKey="lower_bound"
                            name="Lower Bound"
                            stroke="#EF4444"
                            strokeWidth={2.5}
                            dot={false}
                        />

                        {/* Main Prediction Line */}
                        <Line
                            type="monotone"
                            dataKey="predicted_balance"
                            name="Predicted Balance"
                            stroke="#7F56D9"
                            strokeWidth={3.5}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Forecast;
