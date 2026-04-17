// tailwind.config.js
// Extendemos Tailwind con los tokens del sistema de diseño OL Group Lab.
// Esto nos permite usar clases como bg-primary, text-accent, font-display
// directamente en JSX sin CSS adicional.

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal
        'primary':      '#05101a',
        'primary-mid':  '#1a2530',
        'primary-soft': '#3d4854',
        // Acento teal — el color de identidad del laboratorio
        'accent':       '#41D2C9',
        'accent-dim':   '#00897b',
        'accent-bg':    'rgba(65,210,201,0.15)',
        // Superficies
        'lab-bg':       '#f7f9ff',
        'lab-surface':  '#ffffff',
        'lab-low':      '#edf4ff',
        'lab-high':     '#dee9f8',
        'lab-dim':      '#d0dbea',
        // Texto
        'lab-muted':    '#44474b',
        'lab-outline':  '#74777c',
        'lab-border':   '#c4c6cc',
        'lab-border-soft': '#e3effe',
      },
      fontFamily: {
        // Manrope para títulos — igual al diseño de referencia
        'display': ['Manrope', 'sans-serif'],
        // Inter para cuerpo — limpio y legible
        'body':    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.125rem',
        'lg':  '0.5rem',
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'lab-sm': '0 1px 3px rgba(5,16,26,0.08), 0 1px 2px rgba(5,16,26,0.04)',
        'lab-md': '0 4px 16px rgba(5,16,26,0.10), 0 2px 4px rgba(5,16,26,0.06)',
        'lab-lg': '0 12px 40px rgba(5,16,26,0.14), 0 4px 8px rgba(5,16,26,0.08)',
        'accent': '0 8px 32px rgba(65,210,201,0.25)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
        'pulse-teal': 'pulse-teal 2s ease infinite',
      },
    },
  },
  plugins: [],
}