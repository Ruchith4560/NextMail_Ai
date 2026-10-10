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
        background: {
          DEFAULT: '#F5EFE6', // Warm parchment canvas
          secondary: '#EFE8DC', // Sidebar & cards
          tertiary: '#E5DCCF', // Input fields, active pills
          dark: '#24302E', // Deep forest bronze window header
        },
        surface: {
          DEFAULT: '#FAF7F0', // Message reading surface
          hover: '#ECE4D7',
          active: '#E4D8C6',
          border: '#DFD5C4',
          sage: '#D2DCD0', // Sage green search & badges
          sageDark: '#4F614B',
        },
        terracotta: {
          DEFAULT: '#A85338',
          light: '#BF6347',
          dark: '#8B3F27',
          tint: '#F5EAE5',
        },
        forest: {
          DEFAULT: '#283533',
          dark: '#1F2B29',
          light: '#364543',
        },
        ink: {
          primary: '#2C241E',
          secondary: '#726558',
          muted: '#9E9184',
        },
        primary: {
          50: '#F5EAE5',
          100: '#EBD5CD',
          500: '#A85338',
          600: '#8E3F27',
          700: '#75321E',
        },
        accent: {
          ai: '#A85338',
          urgent: '#C04A2F',
          important: '#C57E35',
          secure: '#4F614B',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
