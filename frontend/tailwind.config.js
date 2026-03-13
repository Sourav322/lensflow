/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal:   { DEFAULT:'#00a99d', dark:'#007f76', light:'#e6f7f6', mid:'#b3e8e5' },
        navy:   { DEFAULT:'#0d1b2e', dark:'#172a44' },
        ink:    { DEFAULT:'#1a2332', 2:'#3d4f63', 3:'#7b8fa3', 4:'#b8c4ce' },
        gold:   { DEFAULT:'#f5a623', dark:'#e09215', soft:'#fff8ed' },
        coral:  { DEFAULT:'#ff6b6b', soft:'#fff0f0' },
        border: { DEFAULT:'#e2e8ef', dark:'#c8d3de' },
        bg:     '#f4f6f9',
      },
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
    },
  },
  plugins: [],
};
