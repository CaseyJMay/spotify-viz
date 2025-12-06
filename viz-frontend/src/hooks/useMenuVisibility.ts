import { useEffect, useState } from "react";

export function useMenuVisibility() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);

  useEffect(() => {
    let timeoutId: number;
    let lastCheck = 0;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Throttle to reduce CPU usage
      if (now - lastCheck < 100) return;
      lastCheck = now;

      // Only show controls near bottom of screen
      if (e.clientY > window.innerHeight - 150) {
        setMenuVisible(true);
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => setMenuVisible(false), 3000);
      }
    };

    document.addEventListener("mousemove", handleGlobalMouseMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  return { menuVisible, menuExpanded, setMenuExpanded };
}

