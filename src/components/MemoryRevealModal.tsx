import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Archive, Sparkles, Type as TypeIcon, X } from 'lucide-react';
import { Lang, Memory } from '../types/room';
import { ARCHETYPE_LABELS, t } from '../data/roomData';
import { soundEngine } from '../utils/soundEngine';

interface MemoryRevealModalProps {
  memory: Memory;
  memories: Memory[];
  lang: Lang;
  reducedMotion: boolean;
  onClose: () => void;
  onSelectMemory: (memoryId: string) => void;
  onApplyStyleAdaptation: (memory: Memory) => void;
  onToggleArchive: (memoryId: string) => void;
}

export const MemoryRevealModal: React.FC<MemoryRevealModalProps> = ({
  memory,
  memories,
  lang,
  reducedMotion,
  onClose,
  onSelectMemory,
  onApplyStyleAdaptation,
  onToggleArchive,
}) => {
  const [revealStep, setRevealStep] = useState<number>(reducedMotion ? 4 : 0);
  const [typedLen, setTypedLen] = useState<number>(reducedMotion ? 9999 : 0);
  const [cleanFont, setCleanFont] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const storyText = t(memory.story, lang);

  // 4-step mosaic-to-clear pixel reveal (8px -> 4px -> 2px -> crisp)
  useEffect(() => {
    if (reducedMotion) {
      setRevealStep(4);
      setTypedLen(storyText.length);
      return;
    }
    setRevealStep(0);
    setTypedLen(0);
    const t1 = setTimeout(() => setRevealStep(1), 150);
    const t2 = setTimeout(() => setRevealStep(2), 300);
    const t3 = setTimeout(() => setRevealStep(3), 450);
    const t4 = setTimeout(() => setRevealStep(4), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [memory.id, reducedMotion, storyText.length]);

  // Draw pixel-mosaic step onto photo canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = 320;
      const h = 240;
      canvas.width = w;
      canvas.height = h;
      const blockSizes = [16, 8, 4, 2, 1];
      const block = blockSizes[Math.min(4, revealStep)];

      if (block <= 1) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        const sw = Math.max(1, Math.floor(w / block));
        const sh = Math.max(1, Math.floor(h / block));
        const temp = document.createElement('canvas');
        temp.width = sw;
        temp.height = sh;
        const tCtx = temp.getContext('2d')!;
        tCtx.drawImage(img, 0, 0, sw, sh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(temp, 0, 0, sw, sh, 0, 0, w, h);
      }
    };
    img.src = memory.photo.web;
  }, [memory.photo.web, revealStep]);

  // Typewriter story effect (25ms per character)
  useEffect(() => {
    if (reducedMotion || revealStep < 2) return;
    if (typedLen >= storyText.length) return;
    const timer = setTimeout(() => {
      setTypedLen((n) => n + 1);
      if (typedLen % 4 === 0) soundEngine.playType();
    }, 24);
    return () => clearTimeout(timer);
  }, [typedLen, storyText.length, revealStep, reducedMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const idx = memories.findIndex((m) => m.id === memory.id);
  const prevMem = memories[(idx - 1 + memories.length) % memories.length];
  const nextMem = memories[(idx + 1) % memories.length];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 pixel-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={t(memory.title, lang)}
      onClick={onClose}
    >
      <div
        className="pixel-panel w-full md:max-w-[740px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-[#3D202E] border-b-2 border-[#1C1215]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={memory.sprite.dataUrl || memory.sprite.polaroidDataUrl}
              alt=""
              className="w-7 h-7 pixelated shrink-0"
            />
            <div className="min-w-0">
              <h2 className="font-pixel text-sm md:text-base text-[#F8F0E6] truncate">
                {t(memory.title, lang)}
              </h2>
              <div className="text-xs text-[#CCB49C] truncate">
                {memory.date.value}
                {memory.place ? ` · ${t(memory.place, lang)}` : ''}
                {` · ${t(ARCHETYPE_LABELS[memory.archetype], lang)}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCleanFont((v) => !v)}
              className={`pixel-btn px-2.5 py-1.5 text-xs flex items-center gap-1 whitespace-nowrap ${
                cleanFont ? 'bg-[#FDB644] text-[#1C1215]' : 'bg-[#4B243B] text-[#F8F0E6]'
              }`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span>Aa</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="pixel-btn p-1.5 bg-[#95424A] text-[#F8F0E6]"
              aria-label={lang === 'zh' ? '关闭记忆' : 'Close memory'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content: Polaroid Photo left + Typewriter Story right */}
        <div className="flex-1 overflow-y-auto pixel-scroll p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Polaroid frame with 4-step pixel reveal */}
            <div className="bg-[#F8F0E6] text-[#1C1215] border-2 border-[#1C1215] p-3 pb-4 shadow-[0_6px_0_#1C1215]">
              <div className="relative bg-[#1C1215] overflow-hidden aspect-[4/3]">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-cover pixelated block"
                  aria-label={t(memory.photo.alt, lang)}
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#3D202E]">
                <span className="font-pixel truncate">{t(memory.title, lang)}</span>
                <span className="tabular-nums shrink-0">{memory.date.value}</span>
              </div>
            </div>

            {/* Story + Adaptive controls */}
            <div
              className={`space-y-4 cursor-pointer ${cleanFont ? 'font-body-clean' : 'font-display'}`}
              onClick={() => setTypedLen(storyText.length)}
              title={lang === 'zh' ? '点击显示完整文字' : 'Click to reveal full text'}
            >
              <div className="text-xs text-[#FDB644]">
                {memory.tags.join(' · ')}
              </div>

              <p className="text-sm md:text-base leading-relaxed text-[#FBCDA6] min-h-[100px]">
                {storyText.slice(0, typedLen)}
                {typedLen < storyText.length && (
                  <span className="inline-block w-2 h-4 bg-[#FDB644] ml-0.5 align-middle animate-pulse" />
                )}
              </p>

              {/* Extracted Palette Swatches */}
              <div className="pt-2 border-t border-[#582F44] flex items-center justify-between gap-3">
                <span className="text-xs text-[#CCB49C]">
                  {lang === 'zh' ? '提取照片色板' : 'Photo Palette'}
                </span>
                <div className="flex items-center gap-1.5">
                  {memory.keyColors.map((hex, i) => (
                    <span
                      key={i}
                      className="w-5 h-5 border-2 border-[#1C1215]"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {memory.styleAdaptation && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playClick();
                      onApplyStyleAdaptation(memory);
                    }}
                    className="pixel-btn px-3 py-1.5 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'zh' ? '以此照片优化房间风格' : 'Adapt Room to Photo'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    soundEngine.playClick();
                    onToggleArchive(memory.id);
                  }}
                  className="pixel-btn px-3 py-1.5 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>
                    {memory.slotId
                      ? lang === 'zh'
                        ? '收进收藏箱'
                        : 'Move to Chest'
                      : lang === 'zh'
                      ? '摆回房间槽位'
                      : 'Place in Room'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-[#3D202E] border-t-2 border-[#1C1215] text-xs">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSelectMemory(prevMem.id);
            }}
            className="text-[#FBCDA6] hover:text-[#FDB644] flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '上一个记忆' : 'Prev Memory'}</span>
          </button>
          <span className="text-[#CCB49C] tabular-nums">
            {idx + 1} / {memories.length}
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSelectMemory(nextMem.id);
            }}
            className="text-[#FBCDA6] hover:text-[#FDB644] flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{lang === 'zh' ? '下一个记忆' : 'Next Memory'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
