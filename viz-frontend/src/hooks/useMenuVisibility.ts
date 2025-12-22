import { useState } from "react";

export function useMenuVisibility() {
  const [menuVisible] = useState(true); // Always visible
  const [menuExpanded, setMenuExpanded] = useState(false);

  return { menuVisible, menuExpanded, setMenuExpanded };
}

