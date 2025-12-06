/**
 * Compute median from an array of numbers
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Extract primary colors from image data
 */
export function extractPrimaryColors(imageData: ImageData): string[] {
  const { data } = imageData;
  const colorBuckets: { [key: string]: number } = {};
  
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32;
    const g = Math.round(data[i + 1] / 32) * 32;
    const b = Math.round(data[i + 2] / 32) * 32;
    
    // Skip very light/white colors
    if (r > 200 && g > 200 && b > 200 && Math.abs(r - g) < 10 && Math.abs(g - b) < 10) continue;
    
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness > 220) continue;
    
    const key = `${r},${g},${b}`;
    colorBuckets[key] = (colorBuckets[key] || 0) + 1;
  }
  
  return Object.entries(colorBuckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => `rgb(${key})`);
}

/**
 * Draw a rounded rectangle on canvas
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw text with ellipsis if it exceeds maxWidth
 */
export function drawEllipsedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): void {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
  } else {
    let truncated = text;
    while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    ctx.fillText(truncated + "...", x, y);
  }
}

