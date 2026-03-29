/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink': '#212121',
        'paper': '#F9F6EE',
        'parchment': '#FDF6E3',
        'aged-paper': '#F5F1E8',
        'murky-green': '#7A8A68',
        'dusty-red': '#A84F4F',
        'faded-blue': '#5E7B8A',
        'slime-green': '#9CFF00',
        'toxic-orange': '#FF6B00',
        'deep-magenta': '#8B0F47'
      },
      fontFamily: {
        'comic': ['Permanent Marker', 'cursive'],
        'comic-rough': ['Creepster', 'cursive'],
        'newsprint': ['Roboto Slab', 'serif'],
        'typewriter': ['Special Elite', 'monospace']
      },
      boxShadow: {
        'comic': '4px 4px 0px #000000',
        'comic-thick': '6px 6px 0px #000000',
        'comic-double': '4px 4px 0px #000000, 8px 8px 0px #333333'
      },
      backgroundImage: {
        'paper-texture': "url('/paper-texture.png')",
        'noise': "url('/noise-texture.png')"
      }
    },
  },
  plugins: [],
};