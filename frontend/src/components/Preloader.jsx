import React, { useEffect, useState } from 'react';
import './Preloader.css';

const Preloader = ({ setLoading }) => {
    const [fading, setFading] = useState(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        // Start fading out after 3.5 seconds
        const fadeTimer = setTimeout(() => {
            setFading(true);
        }, 3500);

        // Remove from DOM after fade completes (0.8s transition)
        const closeTimer = setTimeout(() => {
            setVisible(false);
            if (setLoading) setLoading(false);
        }, 4300);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(closeTimer);
        };
    }, [setLoading]);

    if (!visible) return null;

    return (
        <div className={`loader-container ${fading ? 'fade-out' : ''}`}>
            <video
                autoPlay
                loop
                muted
                playsInline
                className="loader-video"
                onError={(e) => console.error("Video failed to load", e)}
            >
                <source src="/loader.webm" type="video/webm" />
            </video>

            <div className="loading-text-overlay">
                <h3 className="font-bold text-white tracking-widest uppercase text-sm mb-1">FinSight AI</h3>
                <p className="text-xs font-light text-corporate-text-secondary">Consulting the Archives...</p>
            </div>
        </div>
    );
};

export default Preloader;