import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          green: '#00ff88',
          blue: '#00d4ff',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      backdropBlur: {
        'glass': '30px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 20px 60px rgba(0, 255, 136, 0.05)',
        'neon-green': '0 0 30px rgba(0, 255, 136, 0.3)',
        'neon-blue': '0 0 30px rgba(0, 212, 255, 0.3)',
      },
      animation: {
        'gradient-shift': 'gradientShift 20s ease infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        gradientShift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-10%, -10%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 4px 20px rgba(255, 0, 0, 0.25)' },
          '50%': { boxShadow: '0 4px 30px rgba(255, 0, 0, 0.4)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
