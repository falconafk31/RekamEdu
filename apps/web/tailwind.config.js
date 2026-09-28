/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        brandgreen: '#047857',
        brandcyan: '#0e9db5',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        modal: '0 20px 50px -12px rgb(15 23 42 / 0.25)',
      },
    },
  },
  plugins: [],
}
