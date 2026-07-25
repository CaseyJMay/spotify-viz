import React from "react";
import { CaptureStatus } from "../hooks/useAudioCapture";

interface AudioCapturePromptProps {
  status: CaptureStatus;
  error: string | null;
  onStart: () => void;
}

export const AudioCapturePrompt: React.FC<AudioCapturePromptProps> = ({
  status,
  error,
  onStart,
}) => {
  if (status === "capturing") return null;

  const unsupported = status === "unsupported";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          textAlign: "center",
          color: "#ffffff",
          padding: "32px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "26px", marginBottom: "12px" }}>
          VizJam
        </h1>

        {unsupported ? (
          <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
            Audio capture needs a Chromium-based browser (Chrome or Edge).
            Firefox and Safari don&apos;t support sharing tab audio.
          </p>
        ) : (
          <>
            <p style={{ opacity: 0.8, lineHeight: 1.5, marginBottom: "20px" }}>
              Play music in the Spotify Web Player tab, then click below and pick
              that tab with <strong>&quot;Share tab audio&quot;</strong> checked.
            </p>
            <p
              style={{
                opacity: 0.55,
                lineHeight: 1.45,
                margin: "-8px 0 20px",
                fontSize: "13px",
              }}
            >
              For reliable cover art, open Spotify&apos;s fullscreen/Now Playing view
              so the large artwork is centered, and keep Spotify at 100% zoom. After
              sharing, return here and leave Spotify unfocused while its bottom-left
              song label is read. Everything is read locally.
            </p>
            <button
              onClick={onStart}
              style={{
                background: "#1db954",
                color: "#ffffff",
                border: "none",
                borderRadius: "24px",
                padding: "12px 28px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {status === "error" ? "Try again" : "Start audio"}
            </button>
            {error && (
              <p style={{ color: "#ff6b6b", marginTop: "16px", fontSize: "14px" }}>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
