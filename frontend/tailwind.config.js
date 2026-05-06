module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [],
};
