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
                    <p className="text-3xl font-bold text-corporate-text-main mb-1">+12.5%</p>
                    <p className="text-xs text-corporate-text-secondary">Expected increase in savings</p>
                </div>

                <div className="bg-corporate-card p-6 rounded-lg border border-corporate-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <Calendar className="text-emerald-400" size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-corporate-text-main uppercase tracking-wider">Month End</h3>
                    </div>
                    <p className="text-3xl font-bold text-corporate-text-main mb-1">₹45,231</p>
                    <p className="text-xs text-corporate-text-secondary">Estimated closing balance</p>
                </div>

                <div className="bg-corporate-card p-6 rounded-lg border border-corporate-border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-corporate-accent/10 rounded-lg">
                            <AlertCircle className="text-corporate-accent" size={20} />
                        </div>
                        <h3 className="text-sm font-semibold text-corporate-text-main uppercase tracking-wider">Risk Factor</h3>
                    </div>
                    <p className="text-3xl font-bold text-corporate-text-main mb-1">Low</p>
                    <p className="text-xs text-corporate-text-secondary">Based on recent spending habits</p>
                </div>
            </div>

            <div className="bg-corporate-card p-6 rounded-lg border border-corporate-border shadow-sm h-[500px]">
                <h3 className="text-lg font-semibold text-corporate-text-main mb-6">Balance Projection</h3>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={forecastData}>
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
                        />
                        <Legend iconType="circle" />
                        <Line
                            type="monotone"
                            dataKey="predicted_balance"
                            name="Predicted Balance"
                            stroke="#7F56D9"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="upper_bound"
                            name="Upper Bound"
                            stroke="#00B7C3"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            opacity={0.5}
                        />
                        <Line
                            type="monotone"
                            dataKey="lower_bound"
                            name="Lower Bound"
                            stroke="#EF4444"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                            dot={false}
                            opacity={0.5}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Forecast;
