export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#1e1b4b',
                },
                surface: {
                    DEFAULT: '#080d1a',
                    card: '#0f1729',
                    elevated: '#151f35',
                    border: 'rgba(255,255,255,0.08)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            backgroundImage: {
                'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                'surface-gradient': 'linear-gradient(180deg, #0f1729 0%, #080d1a 100%)',
            },
            boxShadow: {
                'brand-glow': '0 0 24px rgba(99,102,241,0.35)',
                'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
                'modal': '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
                'slide-down': 'slideDown 0.35s cubic-bezier(0.16,1,0.3,1)',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
                'bounce-dot': 'bounceDot 1.2s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
                slideDown: { '0%': { transform: 'translateY(-16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
                bounceDot: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
                glow: { '0%': { boxShadow: '0 0 8px rgba(99,102,241,0.3)' }, '100%': { boxShadow: '0 0 28px rgba(139,92,246,0.6)' } },
            },
        },
    },
    plugins: [],
};
