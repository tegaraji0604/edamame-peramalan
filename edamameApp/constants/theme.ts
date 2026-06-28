import { Platform } from "react-native";

const webNavy = "#1e2b3c";
const webDark = "#1a2535";
const webGreen = "#27ae60";

export const Colors = {
  light: {
    text: "#2c3e50",
    subText: "#64748b",
    mutedText: "#7b8794",

    background: "#f0f2f5",
    card: "#ffffff",
    softCard: "#f8fafc",
    input: "#f8fafc",

    border: "#e8ecf0",
    strongBorder: "#dde4ed",

    primary: webNavy,
    dark: webDark,
    tint: webGreen,
    green: webGreen,
    greenDark: "#219150",
    greenSoft: "#eaf7ef",
    red: "#e74c3c",
    redSoft: "#fff0f0",
    blue: "#2980b9",
    amber: "#f39c12",

    chartActual: webNavy,
    chartForecast: webGreen,
    chartGrid: "#edf1f5",

    icon: "#64748b",
    tabIconDefault: "#93a0ad",
    tabIconSelected: webGreen,
    header: webNavy,
  },
  dark: {
    text: "#f8fafc",
    subText: "#cbd5e1",
    mutedText: "#94a3b8",
    background: "#0f172a",
    card: webNavy,
    softCard: webDark,
    input: webDark,
    border: "#334155",
    strongBorder: "#475569",
    primary: webNavy,
    dark: webDark,
    tint: "#ffffff",
    green: webGreen,
    greenDark: "#219150",
    greenSoft: "#123322",
    red: "#e74c3c",
    redSoft: "#3a1818",
    blue: "#60a5fa",
    amber: "#fbbf24",
    chartActual: "#ffffff",
    chartForecast: webGreen,
    chartGrid: "#334155",
    icon: "#cbd5e1",
    tabIconDefault: "#94a3b8",
    tabIconSelected: "#ffffff",
    header: webNavy,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    serif: "Georgia, serif",
    rounded: "system-ui",
    mono: "monospace",
  },
});

export const Layout = {
  padding: 16,
  radius: 8,
  gap: 10,
};

export const Shadow = {
  shadowColor: "#1a2535",
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

export const SoftShadow = {
  shadowColor: "#1a2535",
  shadowOpacity: 0.05,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
