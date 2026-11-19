import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          primary: '#46b1e1',
          primaryDark: '#2563eb',
          ink: '#0a0f1d',
          neutralDark: '#1e293b',
          muted: '#64748b',
          darkAnchor: '#0c1527',
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 20px 40px -15px rgba(70, 177, 225, 0.12), 0 1px 3px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
