import React from "react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onBack: () => void;
  visible: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlayPause,
  onNext,
  onBack,
  visible,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        bottom: visible ? "60px" : "30px", // Closer to bottom, above footer
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transition: "all 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Backdrop blur container for readability */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "32px",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
        }}
      >
        <ControlButton onClick={onBack} icon="⏮" size={36} />
        <PlayPauseButton onClick={onPlayPause} isPlaying={isPlaying} />
        <ControlButton onClick={onNext} icon="⏭" size={36} />
      </div>
    </div>
  );
};

interface ControlButtonProps {
  onClick: () => void;
  icon: string;
  size: number;
}

const ControlButton: React.FC<ControlButtonProps> = ({ onClick, icon, size }) => {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: "none",
        background: "transparent",
        color: "#ffffff",
        fontSize: "18px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.2s ease",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {icon}
    </button>
  );
};

interface PlayPauseButtonProps {
  onClick: () => void;
  isPlaying: boolean;
}

const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({ onClick, isPlaying }) => {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: "none",
        background: "#ffffff",
        color: "#000000",
        fontSize: "22px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.2s ease",
        userSelect: "none",
        lineHeight: 1,
        padding: 0,
        margin: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          transform: isPlaying ? "none" : "translateX(1px)",
        }}
      >
        {isPlaying ? "⏸" : "▶"}
      </span>
    </button>
  );
};

