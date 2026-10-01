/** PostCSS pipeline: Tailwind first, then vendor-prefixing. */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
