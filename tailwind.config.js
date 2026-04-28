/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f8f1e8',
        mist: '#a9b8c8',
        mistDeep: '#8ea2b4',
        blush: '#ecdadd',
        sand: '#ddc6b2',
        petal: '#fffaf7',
        sage: '#d9e7d5',
        sageDeep: '#c7dcc1',
        sun: '#f7edb3',
        sunDeep: '#eadc98',
        rose: '#ead1d9',
        roseDeep: '#dfbcc7',
        danger: '#e8bcc0',
        dangerDeep: '#d9a2a7',
      },
      fontFamily: {
        brand: ['"Parisienne"', 'cursive'],
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['"Nunito Sans"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 45px -26px rgba(119, 104, 96, 0.42)',
        card: '0 18px 40px -30px rgba(123, 138, 153, 0.58)',
      },
      backgroundImage: {
        paper:
          'radial-gradient(circle at top left, rgba(255,255,255,0.85), transparent 35%), radial-gradient(circle at bottom right, rgba(236,218,221,0.22), transparent 28%), linear-gradient(180deg, rgba(248,241,232,0.98), rgba(252,248,243,0.98))',
      },
    },
  },
  plugins: [],
}
