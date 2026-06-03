/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                corporate: {
                    bg: '#111116',
                    card: '#1F1F26',
                    border: '#2D2D35',
                    primary: '#7F56D9', // Purple
                    accent: '#00B7C3',  // Teal
                    text: {
                        main: '#FFFFFF',
                        secondary: '#A1A1AA',
                        muted: '#71717A'
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
