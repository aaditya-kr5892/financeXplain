import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Insights from './components/Insights';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'transactions':
                return <Transactions />;
            case 'insights':
                return <Insights />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-900 text-white overflow-hidden font-sans">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen relative">
                {/* Background Gradients */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px]" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto">
                    <header className="flex justify-between items-center mb-10">
                        <div>
                            <h1 className="text-3xl font-bold">Welcome back, User</h1>
                            <p className="text-slate-400 mt-1">Here's your financial health overview</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => document.getElementById('file-upload-section').scrollIntoView({ behavior: 'smooth' })}
                                className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25"
                            >
                                + Add Transaction (Upload)
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
