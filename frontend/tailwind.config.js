/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#060C08',
        sidebar: '#08110A',
        card: '#0D1711',
        cardBorder: '#1A2E20',
        accentMint: '#34D399',
        accentEmerald: '#10B981',
        accentGlow: 'rgba(52, 211, 153, 0.15)',
        textDim: '#8A9E91',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
