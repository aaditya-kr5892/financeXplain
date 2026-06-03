import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Insights from './components/Insights';
import Login from './components/Login';
import Forecast from './components/Forecast';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [user, setUser] = useState(localStorage.getItem('fintech_user'));

    useEffect(() => {
        if (user) {
            // Set header for all requests
            axios.defaults.headers.common['X-User-ID'] = user;
            localStorage.setItem('fintech_user', user);
        } else {
            delete axios.defaults.headers.common['X-User-ID'];
            localStorage.removeItem('fintech_user');
        }
    }, [user]);

    const handleLogout = () => {
        setUser(null);
    };

    if (!user) {
        return <Login onLogin={setUser} />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'transactions':
                return <Transactions />;
            case 'insights':
                return <Insights />;
            case 'forecast':
                return <Forecast />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="flex min-h-screen bg-corporate-bg text-corporate-text-main overflow-hidden font-sans selection:bg-corporate-primary selection:text-white">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative scroll-smooth bg-corporate-bg">
                {/* Modern Background Gradient - Subtle */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-[0%] right-[0%] w-[600px] h-[600px] bg-corporate-primary/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[0%] left-[0%] w-[500px] h-[500px] bg-corporate-accent/5 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto">
                    <header className="flex justify-between items-center mb-8 pb-4 border-b border-corporate-border">
                        <div>
                            <h1 className="text-2xl font-bold text-corporate-text-main tracking-tight">
                                Overview
                            </h1>
                            <p className="text-corporate-text-secondary mt-1 text-sm">
                                Financial performance summary for {user}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={handleLogout}
                                className="bg-corporate-card hover:bg-rose-500/10 text-corporate-text-secondary hover:text-rose-400 px-4 py-2 rounded-md border border-corporate-border hover:border-rose-500/30 transition-all flex items-center gap-2 text-sm font-medium"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                            <button
                                onClick={() => document.getElementById('file-upload-section').scrollIntoView({ behavior: 'smooth' })} // Maintain functionality
                                className="bg-corporate-primary hover:bg-purple-700 text-white px-5 py-2 rounded-md font-medium transition-all shadow-sm flex items-center gap-2 text-sm"
                            >
                                + New Entry
                            </button>
                        </div>
                    </header>

                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

export default App;
