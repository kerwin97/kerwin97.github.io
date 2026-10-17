import { useState, useEffect } from "react";

interface TypewriterOptions {
  typeSpeed?: number;   // ms per character when typing
  deleteSpeed?: number; // ms per character when deleting
  holdDuration?: number; // ms to pause at full word
}

export function useTypewriter(
  words: string[],
  { typeSpeed = 80, deleteSpeed = 45, holdDuration = 1500 }: TypewriterOptions = {}
) {
  const [display, setDisplay] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

  useEffect(() => {
    const word = words[wordIndex % words.length];

    if (phase === "typing") {
      if (display.length < word.length) {
        const t = setTimeout(
          () => setDisplay(word.slice(0, display.length + 1)),
          typeSpeed
        );
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("hold"), holdDuration);
        return () => clearTimeout(t);
      }
    }

    if (phase === "hold") {
      const t = setTimeout(() => setPhase("deleting"), holdDuration);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (display.length > 0) {
        const t = setTimeout(
          () => setDisplay((d) => d.slice(0, -1)),
          deleteSpeed
        );
        return () => clearTimeout(t);
      } else {
        setWordIndex((i) => i + 1);
        setPhase("typing");
      }
    }
  }, [display, phase, wordIndex, words, typeSpeed, deleteSpeed, holdDuration]);

  return display;
}
