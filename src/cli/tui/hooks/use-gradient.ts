import { useEffect, useState } from 'react';

/**
 * Creates a gradient shimmer effect for text - useful for showing ongoing progress
 * Currently unused but kept for potential future use in progress indicators
 */
export function useGradient(text: string, enabled: boolean) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    // Increment the phase to create the "ongoing" movement
    const id = setInterval(() => {
      setPhase(p => p + 0.1);
    }, 75);

    return () => clearInterval(id);
  }, [enabled]);

  if (!enabled) return text;

  return text.split('').map((ch, i) => {
    // Math to create the "moving" shimmer
    const t = phase + i * 0.4;
    const wave = (Math.sin(t) + 1) / 2;

    // Subtle Professional Yellow Hue
    const r = Math.round(210 + wave * 45);
    const g = Math.round(170 + wave * 40);
    const b = Math.round(40 + wave * 30);

    return {
      char: ch,
      color: `rgb(${r},${g},${b})`,
    };
  });
}
