import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Sparkles, Send, Bot, Plus, MessageSquare, Trash2, Menu } from 'lucide-react';

const Insights = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        if (currentSessionId) {
            fetchHistory(currentSessionId);
            // On mobile, close sidebar when session selected
            if (window.innerWidth < 1024) setSidebarOpen(false);
        }
    }, [currentSessionId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchSessions = async () => {
        try {
            const res = await axios.get('/api/chat/sessions');
            setSessions(res.data);
            if (res.data.length > 0 && !currentSessionId) {
                // Auto-select most recent
                setCurrentSessionId(res.data[0].id);
            } else if (res.data.length === 0) {
                createNewChat();
            }
        } catch (err) {
            console.error("Failed to fetch sessions", err);
        }
    };

    const fetchHistory = async (sessionId) => {
        try {
            const res = await axios.get(`/api/chat/${sessionId}`);
            setMessages(res.data.messages);
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const createNewChat = async () => {
        try {
            setLoading(true);
            const res = await axios.post('/api/chat/sessions', { title: "New Chat" });
            setSessions([res.data, ...sessions]); // Prepend new session
            setCurrentSessionId(res.data.id);
            setMessages(res.data.messages);
        } catch (err) {
            console.error("Failed to create chat", err);
        } finally {
            setLoading(false);
        }
    };

    const deleteSession = async (e, sessionId) => {
        e.stopPropagation();
        if (!window.confirm("Delete this chat?")) return;
        try {
            await axios.delete(`/api/chat/${sessionId}`);
            const newSessions = sessions.filter(s => s.id !== sessionId);
            setSessions(newSessions);
            if (currentSessionId === sessionId) {
                if (newSessions.length > 0) setCurrentSessionId(newSessions[0].id);
                else {
                    setCurrentSessionId(null);
                    setMessages([]); // Or create new
                    createNewChat();
                }
            }
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const handleAsk = async () => {
        if (!input.trim() || !currentSessionId) return;

        const userMsgContent = input;
        const tempId = Date.now();

        // Optimistic Update
        const userMsg = { id: tempId, role: 'user', content: userMsgContent };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`/api/chat/${currentSessionId}/message`, { context: userMsgContent });

            // AI Response from Backend
            const aiMsg = { id: res.data.id || Date.now() + 1, role: 'assistant', content: res.data.content };
            setMessages(prev => [...prev, aiMsg]);

            // Relaxed refresh of sessions to update titles if changed
            if (messages.length < 3) fetchSessions();

        } catch (error) {
            console.error(error);
            const errMsg = error.response?.data?.detail || error.message || "Connection failed";
            const errorMsg = { id: Date.now() + 1, role: 'assistant', content: `Error: ${errMsg}. Please check connection.` };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-corporate-card border border-corporate-border rounded-lg shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300 relative">

            {/* Sidebar Toggle (Mobile) */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute top-4 left-4 z-20 lg:hidden p-2 bg-corporate-card border border-corporate-border rounded-md text-corporate-text-secondary"
            >
                <Menu size={20} />
            </button>

            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'} transition-all duration-300 border-r border-corporate-border bg-corporate-bg/50 flex flex-col absolute lg:relative h-full z-10 glass-effect`}>
                <div className="p-4 border-b border-corporate-border">
                    <button
                        onClick={createNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-corporate-primary hover:bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm group"
                    >
                        <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                        New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => setCurrentSessionId(session.id)}
                            className={`group flex items-center justify-between p-3 rounded-lg text-sm cursor-pointer transition-all ${currentSessionId === session.id
                                    ? 'bg-corporate-primary/10 text-corporate-text-main border border-corporate-primary/20'
                                    : 'text-corporate-text-secondary hover:bg-white/5 hover:text-corporate-text-main'
                                }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare size={16} className={`shrink-0 ${currentSessionId === session.id ? 'text-corporate-primary' : 'text-corporate-text-muted'}`} />
                                <span className="truncate">{session.title}</span>
                            </div>
                            <button
                                onClick={(e) => deleteSession(e, session.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative">

                {/* Header */}
                <div className="p-4 border-b border-corporate-border bg-corporate-bg/50 backdrop-blur-sm flex items-center gap-3 pl-14 lg:pl-4 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-corporate-primary/10 rounded-lg text-corporate-primary">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-corporate-text-main">AI Advisor</h2>
                            <p className="text-xs text-corporate-text-secondary flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Online & Remembering
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-corporate-bg/30">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] lg:max-w-[70%] p-4 rounded-2xl shadow-sm ${msg.role === 'user'
                                        ? 'bg-corporate-primary text-white rounded-tr-sm'
                                        : 'bg-corporate-card border border-corporate-border text-corporate-text-main rounded-tl-sm'
                                    }`}
                            >
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start w-full">
                            <div className="bg-corporate-card border border-corporate-border p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center">
                                <div className="w-2 h-2 bg-corporate-text-muted rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                                <div className="w-2 h-2 bg-corporate-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                <div className="w-2 h-2 bg-corporate-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-corporate-card border-t border-corporate-border">
                    {messages.length < 3 && (
                        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
                            {['Analyze my spending', 'Forecast next month', 'Find subscriptions', 'Saving tips'].map(prompt => (
                                <button
                                    key={prompt}
                                    onClick={() => setInput(prompt)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-corporate-bg border border-corporate-border hover:border-corporate-primary text-xs text-corporate-text-secondary hover:text-corporate-text-main rounded-full transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative max-w-4xl mx-auto w-full">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask anything about your finances..."
                            className="w-full bg-corporate-bg border border-corporate-border rounded-xl pl-4 pr-12 py-3 text-corporate-text-main focus:outline-none focus:border-corporate-primary focus:ring-1 focus:ring-corporate-primary transition-all shadow-inner"
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                        />
                        <button
                            onClick={handleAsk}
                            disabled={loading || !input.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-corporate-primary hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Insights;
