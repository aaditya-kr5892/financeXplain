import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Send, Bot } from 'lucide-react';

const Insights = () => {
    const [input, setInput] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAsk = async () => {
        if (!input.trim()) return;
        setLoading(true);
        try {
            // Use relative path via Vite Proxy
            const res = await axios.post('/api/ask-advisor', { context: input });
            setResponse(res.data.advice);
            setLoading(false);

        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.detail || error.message || "Connection failed";
            setResponse(`Error: ${errMsg}. Check backend logs.`);
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-500">

            {/* Input Section */}
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Sparkles size={100} />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Financial AI Advisor</h2>
                    <p className="text-indigo-100 mb-8 text-lg">
                        Ask me anything about your finances. I can analyze your spending patterns, forecast liquidity, and help you budget better.
                    </p>

                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="e.g., How can I save more on food?"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 pr-14 text-white placeholder-indigo-200 focus:outline-none focus:bg-white/20 transition-all"
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                        />
                        <button
                            onClick={handleAsk}
                            disabled={loading}
                            className="absolute right-2 top-2 p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                        >
                            {loading ? <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>

                {/* Quick Prompts */}
                <div className="grid grid-cols-2 gap-4">
                    {['Analyze my spending', 'Forecast next month', 'Find subscriptions', 'Saving tips'].map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => setInput(prompt)}
                            className="p-4 bg-slate-800/50 hover:bg-slate-700 rounded-xl border border-white/5 text-left text-sm text-slate-300 transition-colors"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Response Section */}
            <div className="bg-slate-800/30 rounded-3xl p-8 border border-white/5 h-full min-h-[400px] relative">
                <div className="absolute top-4 left-4 p-2 bg-green-500/20 rounded-lg text-green-400">
                    <Bot size={24} />
                </div>

                <div className="mt-12">
                    {response ? (
                        <div className="prose prose-invert max-w-none">
                            <p className="text-lg leading-relaxed text-slate-200 animate-in fade-in">
                                {response}
                            </p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
                            <Bot size={48} />
                            <p>Waiting for your question...</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Insights;
