import type { Config } from "tailwindcss";

// Design tokens: black and white for content, night-vision green for header and footer bands only.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#101211",
        "black-2": "#17191a",
        "black-3": "#1d1f20",
        white: "#f2f3ef",
        "white-2": "#e7e9e4",
        ash: "#9a9e98",
        "ash-dark": "#5d625d",
        "ash-light": "#c4c7c1",
        "line-dark": "#2a2d2b",
        "line-light": "#d3d6d0",
        nv: "#8fd98a",
        "nv-deep": "#0c170f",
        "nv-deep-2": "#102013",
        "nv-ink": "#c9efc4",
        "nv-line": "#1f3a24",
        "nv-muted": "#6f9a6b",
        // legacy aliases kept so inner pages resolve to the new palette
        bg: "#101211",
        "bg-2": "#17191a",
        panel: "#17191a",
        rule: "#2a2d2b",
        grey: "#9a9e98",
        "grey-2": "#5d625d",
        ink: "#f2f3ef",
      },
      fontFamily: {
        display: ["var(--font-sans)", "Geist", "system-ui", "sans-serif"],
        body: ["var(--font-sans)", "Geist", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "ui-monospace", "monospace"],
      },
      borderRadius: { none: "0", sm: "0", DEFAULT: "0", md: "0", lg: "0", xl: "0", "2xl": "0", "3xl": "0", full: "0" },
      boxShadow: { none: "none", DEFAULT: "none", sm: "none", md: "none", lg: "none", xl: "none" },
    },
  },
  plugins: [],
};

export default config;
