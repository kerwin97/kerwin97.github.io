import { useState } from "react";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark"
  );

  const toggle = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("theme", nextTheme);
    } catch {}
    setTheme(nextTheme);
  };

  return { theme, toggle };
}
