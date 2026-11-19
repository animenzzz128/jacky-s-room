import { ArchetypeId } from '../types/room';

export const MASTER_PALETTE = [
  '#1C1215', // ink-900
  '#2C161A', // plum-900
  '#3D202E', // plum-800
  '#4B243B', // plum-700
  '#582F44', // plum-600
  '#702F53', // mauve-500
  '#A62B66', // magenta-500
  '#95424A', // brick-500
  '#EA6949', // coral-400
  '#F5994A', // orange-400
  '#FDB644', // amber-300
  '#FBCDA6', // apricot-200
  '#F8F0E6', // cream-100
  '#FCB989', // skin-300
  '#D48A59', // skin-500
  '#A45939', // hair-500
  '#6B3A35', // hair-700
  '#A89060', // olive-400
  '#846030', // olive-600
  '#CCB49C', // oat-200
] as const;

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [166, 43, 102];
  const n = parseInt(clean, 16);
  if (Number.isNaN(n)) return [166, 43, 102];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const PALETTE_RGB: { hex: string; rgb: RGB }[] = MASTER_PALETTE.map((hex) => ({
  hex,
  rgb: hexToRgb(hex),
}));

export function quantizeRgbToMaster(r: number, g: number, b: number, excludeDark = false): string {
  let best = PALETTE_RGB[excludeDark ? 4 : 0].hex;
  let bestDist = Infinity;
  for (let i = excludeDark ? 3 : 0; i < PALETTE_RGB.length; i++) {
    const p = PALETTE_RGB[i];
    const dr = r - p.rgb[0];
    const dg = g - p.rgb[1];
    const db = b - p.rgb[2];
    const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (dist < bestDist) {
      bestDist = dist;
      best = p.hex;
    }
  }
  return best;
}

export function quantizeHexToMaster(hex: string, excludeDark = true): string {
  const [r, g, b] = hexToRgb(hex);
  return quantizeRgbToMaster(r, g, b, excludeDark);
}

/**
 * Strips EXIF/GPS metadata via canvas re-encoding and generates web + thumb URLs.
 */
export async function processPhotoPrivacy(file: File): Promise<{
  webDataUrl: string;
  thumbDataUrl: string;
  base64ForApi: string;
  mimeType: string;
  width: number;
  height: number;
}> {
  const bitmap = await createImageBitmap(file);
  const maxWeb = 1080;
  const scaleWeb = Math.min(1, maxWeb / Math.max(bitmap.width, bitmap.height));
  const webW = Math.max(1, Math.round(bitmap.width * scaleWeb));
  const webH = Math.max(1, Math.round(bitmap.height * scaleWeb));

  const webCanvas = document.createElement('canvas');
  webCanvas.width = webW;
  webCanvas.height = webH;
  const webCtx = webCanvas.getContext('2d')!;
  webCtx.drawImage(bitmap, 0, 0, webW, webH);
  const webDataUrl = webCanvas.toDataURL('image/jpeg', 0.86);

  const maxThumb = 360;
  const scaleThumb = Math.min(1, maxThumb / Math.max(bitmap.width, bitmap.height));
  const thumbW = Math.max(1, Math.round(bitmap.width * scaleThumb));
  const thumbH = Math.max(1, Math.round(bitmap.height * scaleThumb));

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const thumbCtx = thumbCanvas.getContext('2d')!;
  thumbCtx.drawImage(bitmap, 0, 0, thumbW, thumbH);
  const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.78);

  bitmap.close();

  const base64ForApi = thumbDataUrl.split(',')[1] || '';

  return {
    webDataUrl,
    thumbDataUrl,
    base64ForApi,
    mimeType: 'image/jpeg',
    width: webW,
    height: webH,
  };
}

/**
 * Generates a refined 64x64 cozy illustrated Polaroid collectible matching the lo-fi aesthetic.
 */
export async function generatePolaroidSprite(imageSrc: string): Promise<string> {
  const img = await loadImage(imageSrc);
  const out = document.createElement('canvas');
  out.width = 64;
  out.height = 64;
  const ctx = out.getContext('2d')!;

  // Soft drop shadow
  ctx.fillStyle = 'rgba(28, 18, 21, 0.35)';
  roundRect(ctx, 8, 8, 50, 52, 8);
  ctx.fill();

  // Cream Polaroid body with dark outline
  ctx.fillStyle = '#F8F0E6';
  ctx.strokeStyle = '#1C1215';
  ctx.lineWidth = 3;
  roundRect(ctx, 6, 5, 50, 52, 7);
  ctx.fill();
  ctx.stroke();

  // Inner cropped photo
  ctx.save();
  roundRect(ctx, 11, 10, 40, 34, 4);
  ctx.clip();
  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;
  ctx.drawImage(img, sx, sy, minDim, minDim, 11, 10, 40, 34);
  // Subtle warm sunset glaze
  ctx.fillStyle = 'rgba(245, 153, 74, 0.12)';
  ctx.fillRect(11, 10, 40, 34);
  ctx.restore();

  ctx.strokeStyle = '#3D202E';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 11, 10, 40, 34, 4);
  ctx.stroke();

  // Little tape pin at top
  ctx.fillStyle = '#FDB644';
  ctx.strokeStyle = '#1C1215';
  ctx.lineWidth = 2;
  roundRect(ctx, 25, 2, 12, 6, 2);
  ctx.fill();
  ctx.stroke();

  return out.toDataURL('image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function generateArchetypeSprite(
  archetype: ArchetypeId,
  keyColors: string[]
): string {
  const c1 = quantizeHexToMaster(keyColors[0] || '#EA6949', true);
  const c2 = quantizeHexToMaster(keyColors[1] || '#F5994A', true);
  const c3 = quantizeHexToMaster(keyColors[2] || '#FDB644', true);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const outline = '#1C1215';

  if (archetype === 'snow_globe') {
    // Base
    ctx.fillStyle = '#582F44';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    roundRect(ctx, 16, 42, 32, 14, 5);
    ctx.fill();
    ctx.stroke();
    // Globe
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.arc(32, 28, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Inner motif
    ctx.fillStyle = c1;
    roundRect(ctx, 25, 22, 14, 16, 4);
    ctx.fill();
    // Highlight & snowflakes
    ctx.fillStyle = '#F8F0E6';
    ctx.beginPath();
    ctx.arc(24, 20, 4, 0, Math.PI * 2);
    ctx.arc(38, 22, 2, 0, Math.PI * 2);
    ctx.arc(28, 32, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetype === 'vinyl_ticket') {
    ctx.fillStyle = '#2C161A';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#582F44';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(32, 32, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = c1;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(32, 32, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F8F0E6';
    ctx.beginPath();
    ctx.arc(32, 32, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetype === 'ramen_bowl') {
    // Steam
    ctx.strokeStyle = '#FBCDA6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(24, 18);
    ctx.quadraticCurveTo(21, 13, 25, 9);
    ctx.moveTo(36, 17);
    ctx.quadraticCurveTo(33, 12, 37, 8);
    ctx.stroke();
    // Topings
    ctx.fillStyle = c1;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(32, 30, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Bowl
    ctx.fillStyle = '#F8F0E6';
    ctx.beginPath();
    ctx.arc(32, 31, 20, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c3;
    ctx.fillRect(22, 34, 20, 4);
  } else if (archetype === 'shell_bottle') {
    ctx.fillStyle = '#A45939';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    roundRect(ctx, 26, 8, 12, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FBCDA6';
    roundRect(ctx, 18, 16, 28, 38, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c1;
    roundRect(ctx, 21, 32, 22, 19, 7);
    ctx.fill();
    ctx.fillStyle = '#F8F0E6';
    ctx.beginPath();
    ctx.arc(26, 24, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetype === 'plushie') {
    ctx.fillStyle = c1;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(20, 18, 7, 0, Math.PI * 2);
    ctx.arc(44, 18, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(32, 34, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F8F0E6';
    ctx.beginPath();
    ctx.ellipse(32, 39, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(25, 30, 2.5, 0, Math.PI * 2);
    ctx.arc(39, 30, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetype === 'cake') {
    ctx.fillStyle = c3;
    ctx.fillRect(30, 8, 4, 10);
    ctx.fillStyle = '#EA6949';
    ctx.beginPath();
    ctx.arc(32, 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c1;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    roundRect(ctx, 14, 24, 36, 28, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F8F0E6';
    roundRect(ctx, 14, 22, 36, 10, 5);
    ctx.fill();
    ctx.stroke();
  } else {
    // Cozy framed postcard / card / badge / medal
    ctx.fillStyle = '#F8F0E6';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;
    roundRect(ctx, 10, 14, 44, 36, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c1;
    roundRect(ctx, 15, 19, 34, 18, 4);
    ctx.fill();
    ctx.fillStyle = c3;
    ctx.beginPath();
    ctx.arc(39, 27, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c2;
    roundRect(ctx, 15, 41, 22, 4, 2);
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

export function renderCustomPixelGrid(
  grid: string[] | undefined,
  keyColors: string[],
  fallbackArchetype: ArchetypeId
): string {
  if (!Array.isArray(grid) || grid.length < 12) {
    return generateArchetypeSprite(fallbackArchetype, keyColors);
  }
  const c1 = quantizeHexToMaster(keyColors[0] || '#EA6949', true);
  const c2 = quantizeHexToMaster(keyColors[1] || '#F5994A', true);
  const c3 = quantizeHexToMaster(keyColors[2] || '#FDB644', true);

  const colorMap: Record<string, string> = {
    O: '#1C1215',
    '0': '#1C1215',
    W: '#F8F0E6',
    G: '#FBCDA6',
    M: '#582F44',
    D: '#3D202E',
    P: c1,
    S: c2,
    A: c3,
  };

  // Render on a smooth 64x64 canvas with cozy rounded cells (hi-bit illustration look)
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  let painted = 0;
  for (let y = 0; y < 16; y++) {
    const row = grid[y] || '';
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch && ch !== '.' && colorMap[ch]) {
        ctx.fillStyle = colorMap[ch];
        roundRect(ctx, x * 4, y * 4, 4.4, 4.4, 1.2);
        ctx.fill();
        painted++;
      }
    }
  }

  if (painted < 24) {
    return generateArchetypeSprite(fallbackArchetype, keyColors);
  }
  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
