/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                corporate: {
                    bg: 'var(--bg-corporate)',
                    card: 'var(--card-corporate)',
                    border: 'var(--border-corporate)',
                    primary: 'var(--primary-corporate)',
                    accent: 'var(--accent-corporate)',
                    text: {
                        main: 'var(--text-main)',
                        secondary: 'var(--text-secondary)',
                        muted: 'var(--text-muted)'
                    }
                }
            },
            boxShadow: {
                'glow': '0 0 20px rgba(139, 92, 246, 0.15)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [],
}
