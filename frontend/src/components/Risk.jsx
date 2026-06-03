import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, AlertTriangle, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Risk = () => {
    const [step, setStep] = useState(0); // 0 = Loading/Check, 1 = Quiz, 2 = Result
    const [answers, setAnswers] = useState({});
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const questions = [
        {
            id: 1,
            text: "What is your age?",
            options: [
                { text: "Under 30", points: 3 },
                { text: "30-45", points: 2 },
                { text: "Over 45", points: 1 }
            ]
        },
        {
            id: 2,
            text: "What is your investment horizon?",
            options: [
                { text: "Over 10 years", points: 3 },
                { text: "5-10 years", points: 2 },
                { text: "Less than 5 years", points: 1 }
            ]
        },
        {
            id: 3,
            text: "Market drops 20% in a month. What do you do?",
            options: [
                { text: "Buy more (Opportunity!)", points: 3 },
                { text: "Hold (Wait it out)", points: 2 },
                { text: "Sell (Protect remaining)", points: 1 }
            ]
        },
        {
            id: 4,
            text: "What is your primary goal?",
            options: [
                { text: "Maximum Growth", points: 3 },
                { text: "Balanced Growth", points: 2 },
                { text: "Capital Preservation", points: 1 }
            ]
        },
        {
            id: 5,
            text: "How stable is your income?",
            options: [
                { text: "Very Stable", points: 3 },
                { text: "Somewhat Stable", points: 2 },
                { text: "Unstable/Variable", points: 1 }
            ]
        },
        {
            id: 6,
            text: "Do you have an emergency fund?",
            options: [
                { text: "Yes (> 6 months expenses)", points: 3 },
                { text: "Yes (3-6 months)", points: 2 },
                { text: "No / Small fund", points: 1 }
            ]
        },
        {
            id: 7,
            text: "Investment knowledge?",
            options: [
                { text: "Expert / Advanced", points: 3 },
                { text: "Intermediate", points: 2 },
                { text: "Beginner", points: 1 }
            ]
        }
    ];

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/risk-profile');
            if (res.data) {
                setProfile(res.data);
                setStep(2); // Show result directly
            } else {
                setStep(1); // Start quiz
            }
        } catch (err) {
            console.error("Failed to fetch profile", err);
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (questionId, points) => {
        setAnswers({ ...answers, [questionId]: points });
    };

    const calculateScore = async () => {
        let totalPoints = 0;
        Object.values(answers).forEach(p => totalPoints += p);

        // Max points = 7 * 3 = 21. Min = 7.
        // Scale to 1-10.
        // ((Score - Min) / (Max - Min)) * 9 + 1
        const normalizedScore = Math.round(((totalPoints - 7) / (21 - 7)) * 9 + 1);

        let type = "Moderate";
        if (normalizedScore >= 8) type = "Aggressive";
        if (normalizedScore <= 3) type = "Conservative";

        const newProfile = {
            score: normalizedScore,
            profile_type: type,
            answers: JSON.stringify(answers)
        };

        try {
            await axios.post('/api/risk-profile', newProfile);
            setProfile(newProfile);
            setStep(2);
        } catch (err) {
            console.error("Failed to save profile", err);
            alert("Error saving profile");
        }
    };

    const getRecommendation = (type) => {
        switch (type) {
            case 'Aggressive':
                return [
                    { name: 'Equity', value: 80 },
                    { name: 'Debt', value: 15 },
                    { name: 'Gold', value: 5 }
                ];
            case 'Moderate':
                return [
                    { name: 'Equity', value: 50 },
                    { name: 'Debt', value: 40 },
                    { name: 'Gold', value: 10 }
                ];
            default: // Conservative
                return [
                    { name: 'Equity', value: 20 },
                    { name: 'Debt', value: 70 },
                    { name: 'Gold', value: 10 }
                ];
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-corporate-text-main">
                        Risk Assessment
                    </h2>
                    <p className="text-corporate-text-secondary">Understand your investment personality</p>
                </div>
                {step === 2 && (
                    <button onClick={() => setStep(1)} className="text-corporate-primary hover:underline text-sm">
                        Retake Quiz
                    </button>
                )}
            </div>

            {step === 1 && (
                <div className="bg-corporate-card border border-corporate-border rounded-lg p-8 shadow-sm max-w-2xl mx-auto">
                    <h3 className="text-xl font-semibold text-corporate-text-main mb-6">Investment Questionnaire</h3>
                    <div className="space-y-8">
                        {questions.map((q) => (
                            <div key={q.id} className="space-y-3">
                                <p className="font-medium text-corporate-text-main">{q.id}. {q.text}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {q.options.map((opt) => (
                                        <button
                                            key={opt.text}
                                            onClick={() => handleAnswer(q.id, opt.points)}
                                            className={`p-3 rounded border text-sm text-left transition-all ${answers[q.id] === opt.points
                                                    ? 'bg-corporate-primary/20 border-corporate-primary text-corporate-primary'
                                                    : 'bg-corporate-bg border-corporate-border text-corporate-text-secondary hover:bg-white/5'
                                                }`}
                                        >
                                            {opt.text}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 pt-6 border-t border-corporate-border flex justify-end">
                        <button
                            disabled={Object.keys(answers).length < questions.length}
                            onClick={calculateScore}
                            className="bg-corporate-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-corporate-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            See Parameters <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && profile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Result Card */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-8 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="mb-4">
                            {profile.profile_type === 'Aggressive' ? <TrendingUp size={64} className="text-rose-500" /> :
                                profile.profile_type === 'Conservative' ? <Shield size={64} className="text-emerald-500" /> :
                                    <AlertTriangle size={64} className="text-yellow-500" />}
                        </div>
                        <h3 className="text-2xl font-bold text-corporate-text-main mb-2">
                            {profile.profile_type} Investor
                        </h3>
                        <p className="text-corporate-text-secondary max-w-sm">
                            Risk Score: <span className="font-mono font-bold text-corporate-text-main">{profile.score}/10</span>
                        </p>
                        <p className="mt-4 text-sm text-corporate-text-secondary">
                            {profile.profile_type === 'Aggressive' ? "You maximize growth over stability. You can handle market volatility." :
                                profile.profile_type === 'Conservative' ? "You prioritize safety over returns. You prefer stable investments." :
                                    "You balance growth and safety. You take calculated risks."}
                        </p>
                    </div>

                    {/* Allocation Recommendation */}
                    <div className="bg-corporate-card border border-corporate-border rounded-lg p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-corporate-text-main mb-4">Recommended Allocation</h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={getRecommendation(profile.profile_type)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {getRecommendation(profile.profile_type).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Risk;
