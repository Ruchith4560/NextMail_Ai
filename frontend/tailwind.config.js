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
        mojo: {
          sidebar: '#0E1318',
          sidebarHover: '#161E26',
          sidebarActive: '#1A2530',
          green: '#00D084',
          greenHover: '#00B874',
          greenLight: '#E6FAF2',
          canvas: '#F8FAFC',
          card: '#FFFFFF',
          border: '#EAECF0',
          borderDark: '#1E293B',
          ink: '#0F172A',
          inkMuted: '#64748B',
          inkLight: '#94A3B8',
        },
        priority: {
          urgentBg: '#FEF2F2',
          urgentText: '#DC2626',
          urgentBorder: '#FECACA',
          importantBg: '#FFFBEB',
          importantText: '#D97706',
          importantBorder: '#FDE68A',
          normalBg: '#F1F5F9',
          normalText: '#475569',
          normalBorder: '#E2E8F0',
          spamBg: '#FFF1F2',
          spamText: '#E11D48',
          spamBorder: '#FECDD3',
          aiBg: '#ECFDF5',
          aiText: '#059669',
          aiBorder: '#A7F3D0',
          taskBg: '#F5F3FF',
          taskText: '#7C3AED',
          taskBorder: '#DDD6FE',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
