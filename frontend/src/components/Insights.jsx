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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-500 h-full">

            {/* Input Section */}
            <div className="space-y-6 flex flex-col h-full">
                <div className="bg-corporate-card border border-corporate-border rounded-lg p-8 shadow-sm relative overflow-hidden flex-1 flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Sparkles size={150} className="text-corporate-primary" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 text-corporate-text-main tracking-tight">Financial AI Advisor</h2>
                    <p className="text-corporate-text-secondary mb-8 text-lg font-light leading-relaxed">
                        Your intelligent assistant. Ask about forecast trends, potential anomalies, or personalized budget advice.
                    </p>

                    <div className="relative w-full max-w-lg">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="e.g., Is my current spending sustainable?"
                            className="w-full bg-corporate-bg border border-corporate-border rounded-lg px-6 py-4 pr-14 text-corporate-text-main placeholder-corporate-text-muted focus:outline-none focus:border-corporate-primary focus:ring-1 focus:ring-corporate-primary transition-all shadow-inner"
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                        />
                        <button
                            onClick={handleAsk}
                            disabled={loading}
                            className="absolute right-2 top-2 p-2 bg-corporate-primary hover:bg-purple-600 text-white rounded-md transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>

                {/* Quick Prompts */}
                <div className="grid grid-cols-2 gap-4">
                    {['Analyze my spending', 'Forecast next month', 'Find subscriptions', 'Saving tips'].map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => setInput(prompt)}
                            className="p-4 bg-corporate-card hover:bg-corporate-bg border border-corporate-border hover:border-corporate-primary/50 text-left text-sm text-corporate-text-secondary hover:text-corporate-text-main transition-all rounded-lg shadow-sm"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Response Section */}
            <div className="bg-corporate-card rounded-lg p-8 border border-corporate-border h-full min-h-[400px] relative overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-corporate-border border-dashed">
                    <div className="p-2 bg-corporate-accent/10 rounded-lg text-corporate-accent">
                        <Bot size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-corporate-text-secondary uppercase tracking-wider">Advisor Response</h3>
                </div>

                <div className="mt-4">
                    {response ? (
                        <div className="prose prose-invert max-w-none">
                            <p className="text-lg leading-relaxed text-corporate-text-main animate-in fade-in font-light">
                                {response}
                            </p>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-corporate-text-muted space-y-4 opacity-50 py-20">
                            <Bot size={48} className="text-corporate-border" />
                            <p className="text-sm">Waiting for your financial queries...</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Insights;
