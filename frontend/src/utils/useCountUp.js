import { useState, useEffect, useRef } from 'react';

/**
 * Hook: Animated counter with easeOutExpo easing
 * @param {number} target - Target value to animate to
 * @param {number} duration - Animation duration in ms (default 1500)
 * @param {boolean} enabled - Whether animation is enabled. When false, returns target immediately.
 * @returns {number} Current animated value
 */
export function useCountUp(target, duration = 1500, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const prevTarget = useRef(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) {
      // Mode statique : afficher la valeur cible immédiatement
      setValue(target);
      prevTarget.current = target;
      return;
    }
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) { setValue(target); return; }
    const startTime = performance.now();
    let raf;
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(start + diff * ease));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    prevTarget.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return value;
}

export default useCountUp;
