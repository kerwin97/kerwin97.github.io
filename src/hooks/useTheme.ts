import { useState } from "react";

export type Theme = "dark" | "light";

// The page background in each theme, as hex for the theme-color meta tag (also set in index.html).
const THEME_COLOR: Record<Theme, string> = { dark: "#09090b", light: "#f9f7f3" };

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark"
  );

  const toggle = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[nextTheme]);
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {}
    setTheme(nextTheme);
  };

  return { theme, toggle };
}
