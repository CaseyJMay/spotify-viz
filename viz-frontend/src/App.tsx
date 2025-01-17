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
    const previousAlbumCoverRef = useRef<string | null>(null);
    const albumImageRef = useRef<HTMLImageElement | null>(null);
    const [song, setSong] = useState<Song>({
        title: "No Title",
        artists: "Unknown Artist",
        album_cover: "",
    });
    const [bands, setBands] = useState<Bands>({});
    const [gradientColors, setGradientColors] = useState<string[]>(["#000", "#000"]);
    const gradientColorsRef = useRef<string[]>(["#000", "#000"]);
    const transitionProgressRef = useRef(0);
    const TOTAL_BARS = 25;

    const { lastJsonMessage } = useWebSocket("ws://localhost:5000/ws", {
        shouldReconnect: () => true,
    });

    useEffect(() => {
        if (lastJsonMessage) {
            const data = lastJsonMessage as WebSocketData;

            if (data.song) {
                setSong((prev) => {
                    if (prev.album_cover !== data.song.album_cover) {
                        previousAlbumCoverRef.current = null;
                    }
                    return {
                        title: data.song.title || "No Title",
                        artists: data.song.artists || "Unknown Artist",
                        album_cover: data.song.album_cover || "",
                    };
                });
            }

            if (data.bands) {
                setBands(data.bands);
            }
        }
    }, [lastJsonMessage]);

    useEffect(() => {
        if (!song.album_cover || previousAlbumCoverRef.current === song.album_cover) return;

        previousAlbumCoverRef.current = song.album_cover;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = song.album_cover;

        img.onload = () => {
            albumImageRef.current = img;

            const offscreenCanvas = document.createElement("canvas");
            offscreenCanvas.width = img.width;
            offscreenCanvas.height = img.height;
            const ctx = offscreenCanvas.getContext("2d");

            if (ctx) {
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const primaryColors = extractPrimaryColors(imageData);

                gradientColorsRef.current = primaryColors;
                setGradientColors(primaryColors);
                transitionProgressRef.current = 0;
            }
        };
    }, [song.album_cover]);

    const extractPrimaryColors = (imageData: ImageData): string[] => {
        const { data } = imageData;
        const colorBuckets: { [key: string]: number } = {};
    
        for (let i = 0; i < data.length; i += 4) {
            const r = Math.round(data[i] / 32) * 32;
            const g = Math.round(data[i + 1] / 32) * 32;
            const b = Math.round(data[i + 2] / 32) * 32;
    
            // Exclude near-white colors
            if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) {
                continue; // Skip near-white or white colors
            }
    
            const key = `${r},${g},${b}`;
            colorBuckets[key] = (colorBuckets[key] || 0) + 1;
        }
    
        return Object.entries(colorBuckets)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3) // Top 3 most frequent colors
            .map(([key]) => `rgb(${key})`);
    };
    

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 150;
            const barWidth = 8;
            const maxBarLength = 100;

            // Draw gradient background
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradientColorsRef.current.forEach((color, index) => {
                gradient.addColorStop(index / (gradientColorsRef.current.length - 1), color);
            });
            ctx.globalAlpha = Math.min(transitionProgressRef.current, 1);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;

            // Draw bars
            const angles = Array.from({ length: TOTAL_BARS }, (_, i) => (i / TOTAL_BARS) * Math.PI * 2);
            angles.forEach((angle, i) => {
                const bucketKey = `bucket${i + 1}`;
                const amplitude = bands[bucketKey] || 0;
                const barLength = Math.min(amplitude * 6, maxBarLength);

                const xStart = centerX + Math.cos(angle) * radius;
                const yStart = centerY + Math.sin(angle) * radius;
                const xEnd = centerX + Math.cos(angle) * (radius + barLength);
                const yEnd = centerY + Math.sin(angle) * (radius + barLength);

                ctx.strokeStyle = `rgba(255, 255, 255, 0.7)`;
                ctx.lineWidth = barWidth;
                ctx.lineCap = "round";
                ctx.shadowBlur = 5;
                ctx.shadowColor = "rgba(255, 255, 255, 0.5)";

                ctx.beginPath();
                ctx.moveTo(xStart, yStart);
                ctx.lineTo(xEnd, yEnd);
                ctx.stroke();
                ctx.closePath();

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

            // Draw album cover
            if (albumImageRef.current) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(albumImageRef.current, centerX - radius, centerY - radius, radius * 2, radius * 2);
                ctx.restore();
            }

            // Draw song title and artist
            const gradientHeight = 200;
            const gradientBox = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
            gradientBox.addColorStop(1, "rgba(0, 0, 0, 0.6)");
            gradientBox.addColorStop(0, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = gradientBox;
            ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

            ctx.fillStyle = "#fff";
            ctx.font = "bold 40px Arial";
            ctx.textAlign = "left";
            ctx.fillText(song.title, 40, canvas.height - 100);

            ctx.font = "26px Arial";
            ctx.fillText(song.artists, 40, canvas.height - 60);
        };

        const animationFrame = () => {
            draw();
            if (transitionProgressRef.current < 1) {
                transitionProgressRef.current += 0.01;
            }
            requestAnimationFrame(animationFrame);
        };

        animationFrame();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
        };
    }, [bands, gradientColors, song]);

    return <canvas ref={canvasRef} style={{ display: "block" }} />;
};

export default App;
