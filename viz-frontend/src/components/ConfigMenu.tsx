import React from "react";
import { Config } from "../types";
import { VISUALIZERS } from "../visualizers";

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
        top: 20,
        right: 20,
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <button
        onClick={onToggleExpanded}
        onMouseDown={(e) => e.preventDefault()}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "none",
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          color: "#ffffff",
          fontSize: "20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          userSelect: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        ⚙
      </button>
      {expanded && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            minWidth: "240px",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
          
          <div style={{ marginBottom: "20px" }}>
            <div style={{ 
              fontSize: "11px", 
              fontWeight: 600, 
              color: "rgba(255, 255, 255, 0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px"
            }}>
              Effects
            </div>
            <ToggleSwitch
              label="Ripples"
              checked={config.ripples}
              onChange={(checked) => onConfigChange({ ripples: checked })}
            />
            <div style={{ marginTop: "12px" }}>
              <ToggleSwitch
                label="Bass Thump"
                checked={config.bassThump}
                onChange={(checked) => onConfigChange({ bassThump: checked })}
              />
            </div>
            <div style={{ marginTop: "12px" }}>
              <ToggleSwitch
                label="Piano Particles"
                checked={config.pianoParticles}
                onChange={(checked) => onConfigChange({ pianoParticles: checked })}
              />
            </div>
          </div>

          <div style={{ 
            marginTop: "20px", 
            paddingTop: "20px", 
            borderTop: "1px solid rgba(255, 255, 255, 0.1)" 
          }}>
            <div style={{ 
              fontSize: "11px", 
              fontWeight: 600, 
              color: "rgba(255, 255, 255, 0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px"
            }}>
              Visualizer
            </div>
            <select
              value={config.visualizer || "radialBars"}
              onChange={(e) => onConfigChange({ visualizer: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "14px",
                fontFamily: "'Segoe UI', -apple-system, sans-serif",
                cursor: "pointer",
                outline: "none",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              }}
            >
              {Object.entries(VISUALIZERS).map(([id, viz]) => (
                <option 
                  key={id} 
                  value={id}
                  style={{
                    background: "#1a1a1a",
                    color: "#fff",
                  }}
                >
                  {viz.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, checked, onChange }) => {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span style={{ 
        fontSize: "14px", 
        color: "#ffffff",
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
      }}>
        {label}
      </span>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: "44px",
          height: "24px",
          borderRadius: "12px",
          background: checked ? "#1db954" : "rgba(255, 255, 255, 0.2)",
          position: "relative",
          transition: "background 0.2s ease",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#ffffff",
            position: "absolute",
            top: "2px",
            left: checked ? "22px" : "2px",
            transition: "left 0.2s ease",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        />
      </div>
    </label>
  );
};

