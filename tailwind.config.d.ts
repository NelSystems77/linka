declare const _default: {
    content: string[];
    darkMode: "class";
    theme: {
        extend: {
            colors: {
                brand: {
                    50: string;
                    100: string;
                    200: string;
                    300: string;
                    400: string;
                    500: string;
                    600: string;
                    700: string;
                    800: string;
                    900: string;
                };
                surface: {
                    DEFAULT: string;
                    card: string;
                    elevated: string;
                    border: string;
                };
            };
            fontFamily: {
                sans: [string, string, string];
            };
            backgroundImage: {
                'brand-gradient': string;
                'surface-gradient': string;
            };
            boxShadow: {
                'brand-glow': string;
                card: string;
                modal: string;
            };
            animation: {
                'fade-in': string;
                'slide-up': string;
                'slide-down': string;
                'pulse-slow': string;
                'bounce-dot': string;
                glow: string;
            };
            keyframes: {
                fadeIn: {
                    '0%': {
                        opacity: string;
                    };
                    '100%': {
                        opacity: string;
                    };
                };
                slideUp: {
                    '0%': {
                        transform: string;
                        opacity: string;
                    };
                    '100%': {
                        transform: string;
                        opacity: string;
                    };
                };
                slideDown: {
                    '0%': {
                        transform: string;
                        opacity: string;
                    };
                    '100%': {
                        transform: string;
                        opacity: string;
                    };
                };
                bounceDot: {
                    '0%,100%': {
                        transform: string;
                    };
                    '50%': {
                        transform: string;
                    };
                };
                glow: {
                    '0%': {
                        boxShadow: string;
                    };
                    '100%': {
                        boxShadow: string;
                    };
                };
            };
        };
    };
    plugins: never[];
};
export default _default;
