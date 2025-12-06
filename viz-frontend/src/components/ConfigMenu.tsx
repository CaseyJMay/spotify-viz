import React from "react";
import { Config } from "../types";

interface ConfigMenuProps {
  visible: boolean;
  expanded: boolean;
  config: Config;
  onToggleExpanded: () => void;
  onConfigChange: (updates: Partial<Config>) => void;
}

export const ConfigMenu: React.FC<ConfigMenuProps> = ({
  visible,
  expanded,
  config,
  onToggleExpanded,
  onConfigChange,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s",
        color: "#fff",
        textAlign: "right",
      }}
    >
      <button
        onClick={onToggleExpanded}
        style={{
          background: "transparent",
          border: "none",
          color: "#fff",
          fontSize: "24px",
          cursor: "pointer",
        }}
      >
        ...
      </button>
      {expanded && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.7)",
            padding: "10px",
            borderRadius: "5px",
            marginTop: "5px",
            textAlign: "left",
          }}
        >
          <div>
            <label>
              <input
                type="checkbox"
                checked={config.ripples}
                onChange={(e) => onConfigChange({ ripples: e.target.checked })}
              />
              Enable Ripples
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={config.bassThump}
                onChange={(e) => onConfigChange({ bassThump: e.target.checked })}
              />
              Enable Bass Thump
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

