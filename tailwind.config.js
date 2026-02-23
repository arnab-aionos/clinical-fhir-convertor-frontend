/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        glass: "rgba(255,255,255,0.06)",
      },
      backdropBlur: { xs: "2px" },
      animation: {
        "spin-slow": "spin 2s linear infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
