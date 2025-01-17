import React, { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";

interface Song {
    title: string;
    artists: string;
    album_cover: string;
}

interface Bands {
    [key: string]: number;
}

interface WebSocketData {
    song: Song;
    bands: Bands;
}

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [song, setSong] = useState<Song>({
        title: "No Title",
        artists: "Unknown Artist",
        album_cover: "",
    });

    const [bands, setBands] = useState<Bands>({});
    const [albumImage, setAlbumImage] = useState<HTMLImageElement | null>(null); // Store preloaded image
    const TOTAL_BARS = 25; // 25 buckets mirrored for 50 total

    // Connect to WebSocket
    const { lastJsonMessage } = useWebSocket("ws://localhost:5000/ws", {
        shouldReconnect: () => true,
    });

    useEffect(() => {
        if (lastJsonMessage) {
            const data = lastJsonMessage as WebSocketData;

            if (data.song) {
                setSong({
                    title: data.song.title || "No Title",
                    artists: data.song.artists || "Unknown Artist",
                    album_cover: data.song.album_cover || "",
                });
            }

            if (data.bands) {
                setBands(data.bands);
            }
        }
    }, [lastJsonMessage]);

    // Preload album cover image
    useEffect(() => {
        if (song.album_cover) {
            const img = new Image();
            img.src = song.album_cover;
            img.onload = () => setAlbumImage(img); // Set the image when loaded
        } else {
            setAlbumImage(null); // Clear image if no album cover
        }
    }, [song.album_cover]);

    // Draw Circular Equalizer
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 150; // Radius of the inner circle
            const barWidth = 8; // Width of each bar
            const maxBarLength = 100; // Max height of bars

            // Draw bars first
            const angles = Array.from({ length: TOTAL_BARS }, (_, i) => (i / TOTAL_BARS) * Math.PI * 2);
            angles.forEach((angle, i) => {
                const bucketKey = `bucket${i + 1}`;
                const amplitude = bands[bucketKey] || 0;
                const barLength = Math.min(amplitude * 10, maxBarLength);

                const xStart = centerX + Math.cos(angle) * radius;
                const yStart = centerY + Math.sin(angle) * radius;
                const xEnd = centerX + Math.cos(angle) * (radius + barLength);
                const yEnd = centerY + Math.sin(angle) * (radius + barLength);

                ctx.strokeStyle = `rgba(255, 255, 255, 0.7)`;
                ctx.lineWidth = barWidth;
                ctx.lineCap = "round";
                ctx.shadowBlur = 5;
                ctx.shadowColor = "rgba(255, 255, 255, 0.5)";

                // Draw bar
                ctx.beginPath();
                ctx.moveTo(xStart, yStart);
                ctx.lineTo(xEnd, yEnd);
                ctx.stroke();
                ctx.closePath();

                // Mirror bar
                const mirrorAngle = Math.PI + angle;
                const xStartMirror = centerX + Math.cos(mirrorAngle) * radius;
                const yStartMirror = centerY + Math.sin(mirrorAngle) * radius;
                const xEndMirror = centerX + Math.cos(mirrorAngle) * (radius + barLength);
                const yEndMirror = centerY + Math.sin(mirrorAngle) * (radius + barLength);

                ctx.beginPath();
                ctx.moveTo(xStartMirror, yStartMirror);
                ctx.lineTo(xEndMirror, yEndMirror);
                ctx.stroke();
                ctx.closePath();
            });

            // Draw album cover on top of bars
            if (albumImage) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(albumImage, centerX - radius, centerY - radius, radius * 2, radius * 2);
                ctx.restore();
            }

            // Draw song details
            ctx.fillStyle = "#fff";
            ctx.font = "18px Arial";
            ctx.textAlign = "center";
            ctx.fillText(song.title, centerX, centerY + radius + 120);
            ctx.fillText(song.artists, centerX, centerY + radius + 150);
        };

        const animationFrame = () => {
            draw();
            requestAnimationFrame(animationFrame);
        };

        animationFrame();
    }, [bands, albumImage, song]);

    return (
        <div style={{ textAlign: "center", background: "#000", color: "#fff", height: "100vh" }}>
            <canvas ref={canvasRef} width={800} height={800} style={{ marginTop: "20px" }} />
        </div>
    );
};

export default App;
