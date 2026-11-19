import React, { useEffect, useRef } from 'react';
import { Hotspot, Memory, RoomThemeConfig, Slot } from '../types/room';
import { ROOM_HOTSPOTS, ROOM_SLOTS } from '../data/roomData';

interface PixelRoomCanvasProps {
  theme: RoomThemeConfig;
  memories: Memory[];
  hoveredHotspotId: string | null;
  hoveredMemoryId: string | null;
  focusedId: string | null;
  activeEffect: {
    waving: boolean;
    sipping: boolean;
    pettingCat: boolean;
    frogDancing: boolean;
    frogClickCount: number;
    bgmOn: boolean;
  };
  reducedMotion: boolean;
  placementMode?: boolean;
  onSelectSlot?: (slotId: string) => void;
}

const LOGICAL_W = 480;
const LOGICAL_H = 270;
const CANVAS_W = 960;
const CANVAS_H = 540;
const S = 2; // Hi-bit 2x detail scale over 480x270 coordinates

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export const PixelRoomCanvas: React.FC<PixelRoomCanvasProps> = ({
  theme,
  memories,
  hoveredHotspotId,
  hoveredMemoryId,
  focusedId,
  activeEffect,
  reducedMotion,
  placementMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    memories.forEach((m) => {
      const url = m.sprite.dataUrl || m.sprite.polaroidDataUrl;
      if (url && !spriteCacheRef.current.has(url)) {
        const img = new Image();
        img.src = url;
        spriteCacheRef.current.set(url, img);
      }
    });
  }, [memories]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let frameCount = 0;
    let lastDraw = 0;

    const dust = Array.from({ length: 12 }, (_, i) => ({
      x: 130 + ((i * 53) % 320),
      y: 60 + ((i * 37) % 210),
      r: 1.5 + (i % 2),
      speed: 0.25 + (i % 3) * 0.12,
    }));

    const isNight = theme.mode === 'night';
    const hour = new Date().getHours();
    const isLateNight = hour >= 23 || hour < 5;

    const renderFrame = (time: number) => {
      const frameInterval = reducedMotion ? 500 : 66; // ~15fps smooth cozy animation
      if (lastDraw !== 0 && time - lastDraw < frameInterval) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }
      lastDraw = time;
      frameCount++;

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // 1. WALL & COZY AMBIENT BACKGROUND
      const wallBase = isNight ? lerpHex(theme.wallColor, '#1C1215', 0.45) : theme.wallColor;
      const wallDark = lerpHex(wallBase, '#1C1215', 0.28);
      const wallGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      wallGrad.addColorStop(0, wallDark);
      wallGrad.addColorStop(0.5, wallBase);
      wallGrad.addColorStop(1, '#2C161A');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle vertical wall paneling
      ctx.fillStyle = 'rgba(28, 18, 21, 0.16)';
      for (let x = 28; x < CANVAS_W; x += 48) {
        ctx.fillRect(x, 0, 2, 370);
      }

      // 2. SUNSET WINDOW (Back-Left: x 96..466, y 16..296)
      const wx = 96;
      const wy = 16;
      const ww = 370;
      const wh = 276;

      // Window sky gradient + subtle stylized dither band like reference image
      const skyGrad = ctx.createLinearGradient(0, wy, 0, wy + wh);
      if (isNight) {
        skyGrad.addColorStop(0, '#1C1215');
        skyGrad.addColorStop(0.5, '#2C161A');
        skyGrad.addColorStop(1, '#4B243B');
      } else {
        skyGrad.addColorStop(0, theme.skyTop);
        skyGrad.addColorStop(0.32, theme.skyMid);
        skyGrad.addColorStop(0.58, '#A62B66');
        skyGrad.addColorStop(0.8, theme.skyHorizon);
        skyGrad.addColorStop(1, '#FDB644');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(wx, wy, ww, wh);

      // Signature stylized lo-fi horizontal pixel-dither shimmer band in sunset sky
      if (!isNight) {
        ctx.fillStyle = 'rgba(245, 153, 74, 0.35)';
        for (let dx = wx + 4; dx < wx + ww - 8; dx += 10) {
          ctx.fillRect(dx, wy + 114, 5, 5);
          ctx.fillRect(dx + 5, wy + 119, 5, 5);
          ctx.fillRect(dx, wy + 124, 5, 5);
        }

        // Drifting cozy clouds
        const cloudDrift = reducedMotion ? 0 : (frameCount * 0.35) % (ww + 60);
        const drawCloud = (cx: number, cy: number, cw: number) => {
          ctx.fillStyle = '#FBCDA6';
          drawRoundedRect(ctx, cx, cy, cw, 12, 6);
          ctx.fill();
          ctx.fillStyle = '#F5994A';
          drawRoundedRect(ctx, cx + 8, cy - 6, cw * 0.55, 10, 5);
          ctx.fill();
        };
        drawCloud(wx + ((30 + cloudDrift) % (ww - 70)), wy + 52, 58);
        drawCloud(wx + ((185 + cloudDrift * 0.7) % (ww - 56)), wy + 34, 46);
      } else {
        // Twinkling stars & crescent moon
        const stars = [
          [135, 54], [200, 38], [275, 72], [350, 44], [410, 82], [175, 96],
        ];
        stars.forEach(([sx, sy], i) => {
          const on = reducedMotion || (frameCount + i * 5) % 24 > 4;
          if (on) {
            ctx.fillStyle = i % 2 === 0 ? '#F8F0E6' : '#FDB644';
            ctx.beginPath();
            ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.fillStyle = '#F8F0E6';
        ctx.beginPath();
        ctx.arc(400, 66, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1C1215';
        ctx.beginPath();
        ctx.arc(407, 62, 13, 0, Math.PI * 2);
        ctx.fill();
      }

      // City Skyline silhouette inside window
      const skyline = [
        [96, 198, 42, 94],
        [134, 174, 44, 118],
        [176, 208, 34, 84],
        [206, 162, 48, 130],
        [252, 188, 40, 104],
        [290, 212, 36, 80],
        [324, 170, 50, 122],
        [372, 195, 44, 97],
        [414, 180, 52, 112],
      ];
      skyline.forEach(([bx, by, bw, bh], i) => {
        ctx.fillStyle = i % 2 === 0 ? '#2C161A' : '#3D202E';
        drawRoundedRect(ctx, bx, by, bw, bh, 3);
        ctx.fill();
        // Lit windows
        for (let ly = by + 12; ly < wy + wh - 24; ly += 16) {
          for (let lx = bx + 9; lx < bx + bw - 10; lx += 13) {
            const lit = (lx * 7 + ly * 3 + (reducedMotion ? 0 : Math.floor(frameCount / 36))) % 11;
            if (lit < (isNight ? 4 : 2)) {
              ctx.fillStyle = lit === 0 ? '#FDB644' : '#F5994A';
              drawRoundedRect(ctx, lx, ly, 5, 7, 1.5);
              ctx.fill();
            }
          }
        }
      });

      // Window Frame & Mullions
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 8;
      ctx.strokeRect(wx, wy, ww, wh);
      ctx.strokeStyle = '#4B243B';
      ctx.lineWidth = 4;
      ctx.strokeRect(wx, wy, ww, wh);
      // Cross mullions
      ctx.fillStyle = '#2C161A';
      ctx.fillRect(wx + Math.floor(ww * 0.45), wy, 7, wh);
      ctx.fillRect(wx, wy + Math.floor(wh * 0.48), ww, 7);

      // Window Sill
      ctx.fillStyle = '#582F44';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, wx - 12, wy + wh - 12, ww + 24, 24, 5);
      ctx.fill();
      ctx.stroke();

      // Window Plant (on left window sill)
      const sway = reducedMotion ? 0 : Math.sin(frameCount * 0.12) * 2.5;
      ctx.fillStyle = '#95424A';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 128, 258, 30, 24, 5);
      ctx.fill();
      ctx.stroke();
      const leaves = [
        [130 + sway, 246], [142, 242], [154 - sway, 248], [136 + sway, 254], [149, 254],
      ];
      leaves.forEach(([lx, ly], idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#A89060' : '#846030';
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(lx, ly, 8, 5, (idx - 2) * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Left Wall: Mini Calendar & Sticky Notes
      ctx.fillStyle = '#F8F0E6';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 20, 36, 52, 58, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EA6949';
      drawRoundedRect(ctx, 20, 36, 52, 16, 5);
      ctx.fill();
      ctx.fillStyle = '#1C1215';
      ctx.font = 'bold 18px "Pixelify Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('18', 46, 78);

      // Sticky notes below calendar
      ctx.fillStyle = '#FDB644';
      drawRoundedRect(ctx, 18, 148, 34, 34, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FBCDA6';
      drawRoundedRect(ctx, 32, 162, 34, 34, 4);
      ctx.fill();
      ctx.stroke();

      // Center-right Wall: Certificate & Memory Frame Strip
      ctx.fillStyle = '#582F44';
      drawRoundedRect(ctx, 484, 24, 78, 56, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F8F0E6';
      drawRoundedRect(ctx, 492, 32, 62, 40, 3);
      ctx.fill();
      ctx.fillStyle = '#EA6949';
      ctx.beginPath();
      ctx.arc(540, 56, 6, 0, Math.PI * 2);
      ctx.fill();

      // Corkboard Memory Strip (x 576..676, y 24..114)
      ctx.fillStyle = '#582F44';
      drawRoundedRect(ctx, 574, 22, 102, 86, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#D48A59';
      drawRoundedRect(ctx, 581, 29, 88, 72, 4);
      ctx.fill();

      // 3. RIGHT BOOKSHELF (x 688..948, y 12..328)
      ctx.fillStyle = '#3D202E';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, 690, 12, 260, 318, 8);
      ctx.fill();
      ctx.stroke();

      // Inner dark shelf cavity
      ctx.fillStyle = '#241216';
      drawRoundedRect(ctx, 704, 22, 234, 298, 4);
      ctx.fill();

      // Shelf boards
      [112, 206, 298].forEach((sy) => {
        ctx.fillStyle = '#582F44';
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 3;
        ctx.fillRect(692, sy, 256, 12);
        ctx.strokeRect(692, sy, 256, 12);
      });

      // Top shelf books (left) + Chubby Frog Plushie (right, matching reference image!)
      const topBooks = [
        [712, 42, 22, 70, '#582F44'],
        [736, 36, 20, 76, '#EA6949'],
        [758, 46, 18, 66, '#702F53'],
        [778, 40, 20, 72, '#4B243B'],
      ];
      topBooks.forEach(([bx, by, bw, bh, col]) => {
        ctx.fillStyle = col as string;
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, bx as number, by as number, bw as number, bh as number, 3);
        ctx.fill();
        ctx.stroke();
      });

      // Chubby Frog Plushie on top-right shelf (x 844..930, y 42..112)
      const frogHop = activeEffect.frogDancing && !reducedMotion ? (frameCount % 6 < 3 ? -8 : 0) : 0;
      const fx = 886;
      const fy = 84 + frogHop;
      ctx.fillStyle = '#A89060';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3.5;
      // Frog eye bumps
      ctx.beginPath();
      ctx.arc(fx - 18, fy - 24, 11, 0, Math.PI * 2);
      ctx.arc(fx + 18, fy - 24, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Frog chubby body
      drawRoundedRect(ctx, fx - 34, fy - 24, 68, 52, 20);
      ctx.fill();
      ctx.stroke();
      // Cream belly patch
      ctx.fillStyle = '#CCB49C';
      drawRoundedRect(ctx, fx - 20, fy - 4, 40, 26, 12);
      ctx.fill();
      // Eyes & cute flat smile
      ctx.fillStyle = '#1C1215';
      const frogBlink = frameCount % 60 === 0;
      if (frogBlink) {
        ctx.fillRect(fx - 22, fy - 24, 8, 2.5);
        ctx.fillRect(fx + 14, fy - 24, 8, 2.5);
      } else {
        ctx.beginPath();
        ctx.arc(fx - 18, fy - 24, 3.5, 0, Math.PI * 2);
        ctx.arc(fx + 18, fy - 24, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx - 14, fy - 10);
      ctx.quadraticCurveTo(fx, fy - 5, fx + 14, fy - 10);
      ctx.stroke();
      if (activeEffect.frogDancing) {
        ctx.strokeStyle = '#FDB644';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fx, fy - 14, 34, Math.PI, 0);
        ctx.stroke();
      }

      // Middle shelf books + Trophy
      const midBooks = [
        [710, 140, 18, 66, '#702F53'],
        [730, 134, 22, 72, '#95424A'],
        [754, 144, 16, 62, '#A45939'],
      ];
      midBooks.forEach(([bx, by, bw, bh, col]) => {
        ctx.fillStyle = col as string;
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, bx as number, by as number, bw as number, bh as number, 3);
        ctx.fill();
        ctx.stroke();
      });
      // Trophy on middle shelf
      ctx.fillStyle = '#FDB644';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 782, 154, 24, 24, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(790, 178, 8, 14);
      ctx.fillStyle = '#582F44';
      drawRoundedRect(ctx, 778, 190, 32, 14, 3);
      ctx.fill();
      ctx.stroke();

      // Vinyl Player on 3rd shelf (x 704..760, y 234..294)
      ctx.fillStyle = '#4B243B';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, 706, 250, 56, 46, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1C1215';
      ctx.beginPath();
      ctx.arc(734, 266, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EA6949';
      ctx.beginPath();
      ctx.arc(734, 266, 6, 0, Math.PI * 2);
      ctx.fill();
      if (activeEffect.bgmOn && !reducedMotion) {
        const ny = 236 - ((frameCount * 2) % 24);
        ctx.fillStyle = '#FDB644';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('♪', 754, ny);
      }

      // Adaptive Expansion Shelf when enabled
      if (theme.expandedShelves) {
        ctx.fillStyle = '#582F44';
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 3;
        drawRoundedRect(ctx, 480, 182, 110, 12, 4);
        ctx.fill();
        ctx.stroke();
      }

      // 4. SUNSET LIGHT CONE & DUST MOTES
      if (!isNight) {
        ctx.save();
        const beamGrad = ctx.createLinearGradient(180, 40, 480, 400);
        beamGrad.addColorStop(0, 'rgba(253, 182, 68, 0.14)');
        beamGrad.addColorStop(1, 'rgba(234, 105, 73, 0.0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(96, 20);
        ctx.lineTo(466, 20);
        ctx.lineTo(540, 400);
        ctx.lineTo(180, 400);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        dust.forEach((d, i) => {
          const dy = reducedMotion ? d.y : 40 + ((d.y + frameCount * d.speed) % 240);
          const dx = reducedMotion ? d.x : d.x + Math.sin(frameCount * 0.05 + i) * 6;
          ctx.fillStyle = 'rgba(251, 205, 166, 0.65)';
          ctx.beginPath();
          ctx.arc(dx, dy, d.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 5. GAMING CHAIR & CHIBI CHARACTER (Center-Right, matching reference image!)
      const charX = 528;
      const charY = 232;
      const headBob = isLateNight && !activeEffect.waving ? 14 : Math.sin(frameCount * 0.16) * 1.8;

      // Ergonomic Chair backrest behind character
      ctx.fillStyle = '#3D202E';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, charX - 64, charY - 30, 198, 220, 46);
      ctx.fill();
      ctx.stroke();
      // Chair side bolster accent
      ctx.fillStyle = '#4B243B';
      drawRoundedRect(ctx, charX + 46, charY - 10, 74, 170, 28);
      ctx.fill();

      // Gaze direction tracking
      const hoveredObj = ROOM_HOTSPOTS.find((h) => h.id === hoveredHotspotId);
      let lookX = 0;
      if (hoveredObj?.side === 'left') lookX = -4;
      if (hoveredObj?.side === 'right') lookX = 4;
      if (hoveredMemoryId) {
        const mem = memories.find((m) => m.id === hoveredMemoryId);
        const slot = ROOM_SLOTS.find((sl) => sl.id === mem?.slotId);
        if (slot) lookX = slot.pos.x < 220 ? -4 : slot.pos.x > 290 ? 4 : 0;
      }

      // Hoodie Torso & Shoulders
      ctx.fillStyle = '#3D202E';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(charX - 66, charY + 188);
      ctx.quadraticCurveTo(charX - 62, charY + 88, charX, charY + 86);
      ctx.quadraticCurveTo(charX + 96, charY + 88, charX + 106, charY + 188);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sunset orange rim highlight along left hoodie shoulder
      ctx.strokeStyle = '#F5994A';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(charX - 54, charY + 132);
      ctx.quadraticCurveTo(charX - 42, charY + 98, charX - 18, charY + 94);
      ctx.stroke();

      // Inner dark shirt collar
      ctx.fillStyle = '#1C1215';
      drawRoundedRect(ctx, charX - 24, charY + 96, 46, 68, 12);
      ctx.fill();

      // Back Headphone Arch
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.arc(charX + 4, charY - 2 + headBob, 96, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();
      ctx.strokeStyle = '#4B243B';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(charX + 4, charY - 2 + headBob, 96, Math.PI * 1.06, Math.PI * 1.94);
      ctx.stroke();

      // Face Base
      ctx.fillStyle = '#FCB989';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, charX - 72, charY - 56 + headBob, 144, 134, 52);
      ctx.fill();
      ctx.stroke();

      // Chin warm shadow
      ctx.fillStyle = '#D48A59';
      drawRoundedRect(ctx, charX - 36, charY + 66 + headBob, 72, 10, 5);
      ctx.fill();

      // Rosy diagonal cheek blushes
      ctx.strokeStyle = 'rgba(234, 105, 73, 0.58)';
      ctx.lineWidth = 4;
      for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        ctx.moveTo(charX - 50 + b * 7, charY + 42 + headBob);
        ctx.lineTo(charX - 46 + b * 7, charY + 34 + headBob);
        ctx.moveTo(charX + 32 + b * 7, charY + 42 + headBob);
        ctx.lineTo(charX + 36 + b * 7, charY + 34 + headBob);
        ctx.stroke();
      }

      // Eyes & Wink (signature look from reference image!)
      const isWink =
        hoveredHotspotId === 'character' || activeEffect.waving || frameCount % 96 < 86;
      const isBlink = !isWink && frameCount % 48 >= 45;

      if (isLateNight && !activeEffect.waving) {
        // Sleepy closed arcs + Zzz
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(charX - 30, charY + 20 + headBob, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(charX + 26, charY + 20 + headBob, 12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        const zOff = (frameCount * 1.5) % 32;
        ctx.fillStyle = '#FBCDA6';
        ctx.font = 'bold 20px "Pixelify Sans", sans-serif';
        ctx.fillText('Zzz', charX + 78, charY - 60 - zOff);
      } else {
        // Left eye: big sparkling round brown eye
        if (isBlink) {
          ctx.strokeStyle = '#1C1215';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(charX - 42, charY + 18 + headBob);
          ctx.lineTo(charX - 18, charY + 18 + headBob);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.ellipse(charX - 30, charY + 17 + headBob, 15, 17, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4B243B';
          ctx.beginPath();
          ctx.ellipse(charX - 27 + lookX, charY + 17 + headBob, 11, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1C1215';
          ctx.beginPath();
          ctx.ellipse(charX - 27 + lookX, charY + 17 + headBob, 6, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eye specular catchlights
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(charX - 31 + lookX, charY + 11 + headBob, 3.8, 0, Math.PI * 2);
          ctx.arc(charX - 23 + lookX, charY + 23 + headBob, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Right eye: signature happy wink arc!
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 5;
        ctx.beginPath();
        if (isWink) {
          ctx.arc(charX + 26 + lookX * 0.5, charY + 22 + headBob, 14, Math.PI * 1.15, Math.PI * 1.85);
        } else {
          ctx.arc(charX + 26, charY + 18 + headBob, 12, 0, Math.PI * 2);
        }
        ctx.stroke();
      }

      // Eyebrows
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(charX - 44, charY - 5 + headBob);
      ctx.quadraticCurveTo(charX - 28, charY - 12 + headBob, charX - 16, charY - 6 + headBob);
      ctx.moveTo(charX + 12, charY - 8 + headBob);
      ctx.quadraticCurveTo(charX + 26, charY - 14 + headBob, charX + 42, charY - 6 + headBob);
      ctx.stroke();

      // Cute curved smile
      ctx.strokeStyle = '#6B3A35';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(charX - 2, charY + 46 + headBob, 10, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      // Thick Rounded Square Glasses
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 5.5;
      drawRoundedRect(ctx, charX - 58 + lookX * 0.4, charY - 2 + headBob, 52, 40, 10);
      ctx.stroke();
      drawRoundedRect(ctx, charX + 2 + lookX * 0.4, charY - 2 + headBob, 52, 40, 10);
      ctx.stroke();
      // Glasses bridge & temple arms
      ctx.beginPath();
      ctx.moveTo(charX - 6 + lookX * 0.4, charY + 14 + headBob);
      ctx.lineTo(charX + 2 + lookX * 0.4, charY + 14 + headBob);
      ctx.stroke();

      // Fluffy Organic Brown Hair + Sunset Orange Rim Highlights (matching reference image!)
      ctx.fillStyle = '#6B3A35';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(charX - 78, charY - 12 + headBob);
      ctx.quadraticCurveTo(charX - 96, charY - 40 + headBob, charX - 74, charY - 58 + headBob);
      ctx.quadraticCurveTo(charX - 102, charY - 76 + headBob, charX - 60, charY - 86 + headBob);
      ctx.quadraticCurveTo(charX - 42, charY - 118 + headBob, charX - 8, charY - 104 + headBob);
      ctx.quadraticCurveTo(charX + 16, charY - 134 + headBob, charX + 34, charY - 104 + headBob);
      ctx.quadraticCurveTo(charX + 78, charY - 106 + headBob, charX + 86, charY - 58 + headBob);
      ctx.quadraticCurveTo(charX + 94, charY - 28 + headBob, charX + 76, charY - 6 + headBob);
      // Bangs scallops across forehead
      ctx.quadraticCurveTo(charX + 46, charY - 36 + headBob, charX + 24, charY - 18 + headBob);
      ctx.quadraticCurveTo(charX + 6, charY - 46 + headBob, charX - 14, charY - 16 + headBob);
      ctx.quadraticCurveTo(charX - 38, charY - 42 + headBob, charX - 78, charY - 12 + headBob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Warm Sunset Orange Hair Highlights on left bangs & crown
      ctx.fillStyle = '#F5994A';
      ctx.beginPath();
      ctx.moveTo(charX - 72, charY - 54 + headBob);
      ctx.quadraticCurveTo(charX - 42, charY - 88 + headBob, charX - 8, charY - 86 + headBob);
      ctx.quadraticCurveTo(charX - 24, charY - 62 + headBob, charX - 58, charY - 42 + headBob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#A45939';
      ctx.beginPath();
      ctx.ellipse(charX - 4, charY - 94 + headBob, 24, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Right Foreground Headphone Earcup (silver hinge + cream ring + dark pad)
      ctx.fillStyle = '#F8F0E6';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, charX + 72, charY - 28 + headBob, 14, 24, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2C161A';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(charX + 82, charY + 14 + headBob, 24, 34, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#F8F0E6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(charX + 82, charY + 14 + headBob, 15, 23, 0.15, 0, Math.PI * 2);
      ctx.stroke();

      // Waving hand when active
      if (activeEffect.waving) {
        const wyOff = frameCount % 6 < 3 ? -8 : 0;
        ctx.fillStyle = '#FCB989';
        ctx.strokeStyle = '#1C1215';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(charX + 106, charY + 72 + wyOff, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 6. FOREGROUND DESK (y 386..540)
      const deskGrad = ctx.createLinearGradient(0, 386, 0, CANVAS_H);
      deskGrad.addColorStop(0, '#582F44');
      deskGrad.addColorStop(0.25, '#3D202E');
      deskGrad.addColorStop(1, '#2C161A');
      ctx.fillStyle = deskGrad;
      ctx.fillRect(0, 386, CANVAS_W, CANVAS_H - 386);
      ctx.fillStyle = '#95424A';
      ctx.fillRect(0, 386, CANVAS_W, 4);
      ctx.fillStyle = '#1C1215';
      ctx.fillRect(0, 384, CANVAS_W, 3);

      // 7. GLOWING CUBE DESK LAMP (Front-Left: x 14..126, y 264..424)
      if (theme.lampOn) {
        const glowRadius = 190 * theme.lampGlow;
        const lampGlowGrad = ctx.createRadialGradient(72, 326, 12, 72, 326, glowRadius);
        lampGlowGrad.addColorStop(0, isNight ? 'rgba(253, 182, 68, 0.45)' : 'rgba(253, 182, 68, 0.28)');
        lampGlowGrad.addColorStop(1, 'rgba(253, 182, 68, 0)');
        ctx.fillStyle = lampGlowGrad;
        ctx.beginPath();
        ctx.arc(72, 326, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lamp wooden stand
      ctx.fillStyle = '#6B3A35';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, 22, 388, 98, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(42, 376, 16, 14);
      ctx.strokeRect(42, 376, 16, 14);
      ctx.fillRect(86, 376, 16, 14);
      ctx.strokeRect(86, 376, 16, 14);

      // Lamp glowing cube shade
      ctx.fillStyle = theme.lampOn ? '#F5994A' : '#582F44';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, 20, 266, 102, 112, 18);
      ctx.fill();
      ctx.stroke();

      if (theme.lampOn) {
        ctx.fillStyle = '#FDB644';
        drawRoundedRect(ctx, 28, 272, 74, 96, 12);
        ctx.fill();
        // Bright cream core
        ctx.fillStyle = '#F8F0E6';
        drawRoundedRect(ctx, 56, 314, 18, 28, 7);
        ctx.fill();
      }

      // 8. FROGGY MUG (Front-Left Desk: x 116..204, y 428..524)
      ctx.fillStyle = '#3D202E';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3.5;
      // Handle
      ctx.beginPath();
      ctx.arc(192, 476, 14, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      // Mug body
      drawRoundedRect(ctx, 122, 434, 68, 86, 10);
      ctx.fill();
      ctx.stroke();
      // Mug rim
      ctx.fillStyle = '#702F53';
      drawRoundedRect(ctx, 124, 434, 64, 10, 4);
      ctx.fill();
      // Cute frog face decal on mug!
      ctx.fillStyle = '#D48A59';
      drawRoundedRect(ctx, 140, 464, 32, 24, 8);
      ctx.fill();
      ctx.fillStyle = '#1C1215';
      ctx.beginPath();
      ctx.arc(149, 473, 2.5, 0, Math.PI * 2);
      ctx.arc(163, 473, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(152, 479, 8, 2.5);
      // Rising steam
      if (!reducedMotion) {
        const st = (frameCount * 0.8) % 24;
        ctx.strokeStyle = 'rgba(251, 205, 166, 0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(146, 424 - st);
        ctx.quadraticCurveTo(140, 412 - st, 148, 400 - st);
        ctx.stroke();
      }

      // 9. ANGLED SATURN-LOGO LAPTOP (Center-Front: x 186..478, y 322..514)
      ctx.fillStyle = '#582F44';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(190, 344);
      ctx.quadraticCurveTo(190, 328, 208, 328);
      ctx.lineTo(448, 352);
      ctx.quadraticCurveTo(466, 354, 464, 372);
      ctx.lineTo(454, 514);
      ctx.lineTo(208, 514);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Laptop top highlight edge
      ctx.strokeStyle = '#CCB49C';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(204, 333);
      ctx.lineTo(448, 357);
      ctx.stroke();

      // Iconic Saturn-ring planet logo on laptop back!
      const lx = 330;
      const ly = 426;
      ctx.strokeStyle = hoveredHotspotId === 'laptop' ? '#FDB644' : '#CCB49C';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(lx, ly, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(lx, ly, 32, 9, -0.45, 0, Math.PI * 2);
      ctx.stroke();

      // Laptop lower keyboard deck + Typing hand
      ctx.fillStyle = '#3D202E';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, 454, 492, 184, 24, 6);
      ctx.fill();
      ctx.stroke();
      const typeBounce = !reducedMotion && frameCount % 8 < 4 ? -2 : 0;
      ctx.fillStyle = '#FCB989';
      drawRoundedRect(ctx, 494, 466 + typeBounce, 56, 30, 12);
      ctx.fill();
      ctx.stroke();

      // 10. PHONE ON RIGHT DESK (x 640..714, y 444..506)
      ctx.fillStyle = '#2C161A';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, 642, 448, 66, 46, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = hoveredHotspotId === 'phone' ? '#FDB644' : '#702F53';
      drawRoundedRect(ctx, 648, 454, 54, 34, 4);
      ctx.fill();
      ctx.fillStyle = '#F8F0E6';
      drawRoundedRect(ctx, 656, 464, 26, 6, 3);
      ctx.fill();

      // 11. TREASURE CHEST / ARCHIVE BOX (Far-Left Bottom: x 14..96, y 444..524)
      ctx.fillStyle = '#95424A';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 3.5;
      drawRoundedRect(ctx, 14, 446, 82, 68, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FDB644';
      drawRoundedRect(ctx, 46, 472, 18, 16, 4);
      ctx.fill();
      ctx.stroke();

      // 12. SLEEPING CALICO CAT (Front-Right Desk: x 730..944, y 406..534)
      const catBreath = !reducedMotion ? Math.sin(frameCount * 0.14) * 2.2 : 0;
      const catX = 834;
      const catY = 472 + catBreath;

      // Cat curled body
      ctx.fillStyle = '#F8F0E6';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(catX + 18, catY + 14, 86, 44 - catBreath * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Calico back patches (dark plum-brown & warm ginger)
      ctx.fillStyle = '#3D202E';
      ctx.beginPath();
      ctx.ellipse(catX + 66, catY - 4, 22, 18, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D48A59';
      ctx.beginPath();
      ctx.ellipse(catX + 42, catY - 10, 16, 13, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Cat head
      ctx.fillStyle = '#F8F0E6';
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      // Left ear (ginger) & Right ear (dark brown)
      ctx.beginPath();
      ctx.moveTo(catX - 72, catY - 22);
      ctx.lineTo(catX - 64, catY - 56);
      ctx.lineTo(catX - 38, catY - 34);
      ctx.closePath();
      ctx.fillStyle = '#D48A59';
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(catX - 4, catY - 34);
      ctx.lineTo(catX + 14, catY - 56);
      ctx.lineTo(catX + 20, catY - 20);
      ctx.closePath();
      ctx.fillStyle = '#3D202E';
      ctx.fill();
      ctx.stroke();

      // Head dome
      ctx.fillStyle = '#F8F0E6';
      ctx.beginPath();
      ctx.ellipse(catX - 28, catY + 2, 50, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ginger forehead patch
      ctx.fillStyle = '#D48A59';
      ctx.beginPath();
      ctx.ellipse(catX - 52, catY - 12, 18, 16, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Closed peaceful eyes & blush
      ctx.strokeStyle = '#1C1215';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(catX - 48, catY + 4, 10, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(catX - 10, catY + 4, 10, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = 'rgba(234, 105, 73, 0.45)';
      ctx.beginPath();
      ctx.ellipse(catX - 58, catY + 14, 8, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(catX + 2, catY + 14, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (activeEffect.pettingCat && !reducedMotion) {
        ctx.fillStyle = '#EA6949';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('♥', catX - 28, catY - 48 - (frameCount % 12));
      }

      // 13. PLACEMENT MODE SLOT RINGS
      if (placementMode) {
        const occupied = new Set(memories.map((m) => m.slotId).filter(Boolean));
        ROOM_SLOTS.filter((sl) => !sl.isExpansion || theme.expandedShelves).forEach((slot: Slot) => {
          const isFree = !occupied.has(slot.id);
          ctx.strokeStyle = isFree ? '#FDB644' : '#A62B66';
          ctx.lineWidth = 2.5;
          drawRoundedRect(ctx, slot.pos.x * S - 4, slot.pos.y * S - 4, 42, 42, 8);
          ctx.stroke();
        });
      }

      // 14. PLACED MEMORY COLLECTIBLES (rendered smoothly at 36x36 inside 960x540!)
      memories.forEach((mem) => {
        if (!mem.slotId) return;
        const slot = ROOM_SLOTS.find((sl) => sl.id === mem.slotId);
        if (!slot) return;
        if (slot.isExpansion && !theme.expandedShelves) return;

        const spriteUrl = mem.sprite.dataUrl || mem.sprite.polaroidDataUrl;
        const img = spriteCacheRef.current.get(spriteUrl);
        const sx = slot.pos.x * S;
        const sy = slot.pos.y * S;
        const isHov = hoveredMemoryId === mem.id || focusedId === mem.id;
        const liftY = isHov ? -3 : 0;

        if (isHov) {
          ctx.strokeStyle = '#FDB644';
          ctx.lineWidth = 3;
          drawRoundedRect(ctx, sx - 3, sy - 3 + liftY, 40, 40, 8);
          ctx.stroke();
        }

        if (img && img.complete) {
          ctx.drawImage(img, sx, sy + liftY, 34, 34);
        } else {
          ctx.fillStyle = '#F8F0E6';
          ctx.strokeStyle = '#1C1215';
          ctx.lineWidth = 2.5;
          drawRoundedRect(ctx, sx, sy + liftY, 34, 34, 6);
          ctx.fill();
          ctx.stroke();
        }

        // Subtle warm "New" sparkle dot
        if (mem.isNew && (reducedMotion || frameCount % 20 < 12)) {
          ctx.fillStyle = '#EA6949';
          ctx.strokeStyle = '#1C1215';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx + 32, sy + 2 + liftY, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // 15. SOFT CORNER BRACKET HIGHLIGHT FOR HOVERED HOTSPOT
      if (hoveredHotspotId || (focusedId && ROOM_HOTSPOTS.some((h) => h.id === focusedId))) {
        const targetId = hoveredHotspotId || focusedId;
        const hs: Hotspot | undefined = ROOM_HOTSPOTS.find((h) => h.id === targetId);
        if (hs) {
          const x = hs.hitbox.x * S;
          const y = hs.hitbox.y * S;
          const w = hs.hitbox.w * S;
          const h = hs.hitbox.h * S;
          ctx.strokeStyle = 'rgba(253, 182, 68, 0.85)';
          ctx.lineWidth = 3;
          const corner = 16;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(x, y + corner);
          ctx.lineTo(x, y);
          ctx.lineTo(x + corner, y);
          // Top-right
          ctx.moveTo(x + w - corner, y);
          ctx.lineTo(x + w, y);
          ctx.lineTo(x + w, y + corner);
          // Bottom-left
          ctx.moveTo(x, y + h - corner);
          ctx.lineTo(x, y + h);
          ctx.lineTo(x + corner, y + h);
          // Bottom-right
          ctx.moveTo(x + w - corner, y + h);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x + w, y + h - corner);
          ctx.stroke();
        }
      }

      // 16. NIGHT ATMOSPHERE TINT
      if (isNight) {
        ctx.save();
        ctx.fillStyle = theme.lampOn ? 'rgba(28, 18, 21, 0.24)' : 'rgba(28, 18, 21, 0.52)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.restore();
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [theme, memories, hoveredHotspotId, hoveredMemoryId, focusedId, activeEffect, reducedMotion, placementMode]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="w-full h-full block select-none"
      aria-hidden="true"
    />
  );
};
