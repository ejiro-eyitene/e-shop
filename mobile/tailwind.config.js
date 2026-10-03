/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    // Matches the daisyUI "light" theme used by the web storefront, so the two
    // surfaces look like one product.
    extend: {
      colors: {
        primary: {
          DEFAULT: "#570df8",
          content: "#ffffff",
        },
        "base-100": "#ffffff",
        "base-200": "#f2f2f2",
        "base-300": "#e5e5e5",
        "base-content": "#1f2937",
      },
    },
  },
  plugins: [],
};