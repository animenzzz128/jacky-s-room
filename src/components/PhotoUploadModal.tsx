import React, { useState } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles, Upload, X } from 'lucide-react';
import { ArchetypeId, Lang, Memory, PhotoAnalysisResult, RoomThemeConfig, ZoneId } from '../types/room';
import { ARCHETYPE_LABELS, pickBestSlot, ROOM_SLOTS, t } from '../data/roomData';
import {
  generateArchetypeSprite,
  generatePolaroidSprite,
  processPhotoPrivacy,
  renderCustomPixelGrid,
} from '../utils/pixelSpriteEngine';
import { soundEngine } from '../utils/soundEngine';

interface PhotoAnalysisApiResponse extends PhotoAnalysisResult {
  custom_pixel_grid?: string[];
}

interface PhotoUploadModalProps {
  lang: Lang;
  memories: Memory[];
  theme: RoomThemeConfig;
  onClose: () => void;
  onPublishMemory: (memory: Memory, applyAdaptation: boolean) => void;
}

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  lang,
  memories,
  theme,
  onClose,
  onPublishMemory,
}) => {
  const [titleInput, setTitleInput] = useState('');
  const [placeInput, setPlaceInput] = useState('');
  const [dateInput, setDateInput] = useState('2026-11');
  const [storyInput, setStoryInput] = useState('');

  const [photoData, setPhotoData] = useState<{
    webDataUrl: string;
    thumbDataUrl: string;
    base64ForApi: string;
    mimeType: string;
    width: number;
    height: number;
  } | null>(null);

  const [polaroidUrl, setPolaroidUrl] = useState<string>('');
  const [aiSpriteUrl, setAiSpriteUrl] = useState<string>('');
  const [archetypeSpriteUrl, setArchetypeSpriteUrl] = useState<string>('');
  const [selectedCandidate, setSelectedCandidate] = useState<'ai' | 'archetype' | 'polaroid'>('ai');

  const [analysis, setAnalysis] = useState<PhotoAnalysisApiResponse | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeId>('polaroid_frame');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [applyStyleAdapt, setApplyStyleAdapt] = useState(true);
  const [peopleConsent, setPeopleConsent] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runAnalysis = async (processed: {
    webDataUrl: string;
    thumbDataUrl: string;
    base64ForApi: string;
    mimeType: string;
    width: number;
    height: number;
  }) => {
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const pUrl = await generatePolaroidSprite(processed.thumbDataUrl);
      setPolaroidUrl(pUrl);

      const res = await fetch('/api/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: processed.base64ForApi,
          mimeType: processed.mimeType,
          title: titleInput,
          story: storyInput,
          place: placeInput,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as PhotoAnalysisApiResponse;
      setAnalysis(data);
      setSelectedArchetype(data.archetype);

      const archUrl = generateArchetypeSprite(data.archetype, data.key_colors);
      const customUrl = renderCustomPixelGrid(
        data.custom_pixel_grid,
        data.key_colors,
        data.archetype
      );
      setArchetypeSpriteUrl(archUrl);
      setAiSpriteUrl(customUrl);
      setSelectedCandidate('ai');

      if (!titleInput) setTitleInput(lang === 'zh' ? data.suggested_title.zh : data.suggested_title.en);
      if (!storyInput) setStoryInput(lang === 'zh' ? data.suggested_story.zh : data.suggested_story.en);

      const bestSlot = pickBestSlot(
        memories,
        data.recommended_zone,
        data.archetype,
        theme.expandedShelves || memories.length >= 24
      );
      setSelectedSlotId(bestSlot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setErrorMsg(msg);
      // Still allow deterministic Polaroid fallback!
      const pUrl = await generatePolaroidSprite(processed.thumbDataUrl);
      setPolaroidUrl(pUrl);
      setSelectedCandidate('polaroid');
      setSelectedSlotId(pickBestSlot(memories, 'cork', 'polaroid_frame', theme.expandedShelves));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = async (file: File) => {
    soundEngine.playClick();
    const processed = await processPhotoPrivacy(file);
    setPhotoData(processed);
    await runAnalysis(processed);
  };

  const handleSamplePhoto = async () => {
    soundEngine.playClick();
    // Create a rich sample seaside twilight photo on canvas for instant testing
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 480);
    grad.addColorStop(0, '#4B243B');
    grad.addColorStop(0.45, '#A62B66');
    grad.addColorStop(0.75, '#F5994A');
    grad.addColorStop(1, '#2C161A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#FDB644';
    ctx.beginPath();
    ctx.arc(320, 210, 68, 0, Math.PI * 2);
    ctx.fill();
    // Ocean reflection & lighthouse silhouette
    ctx.fillStyle = '#2C161A';
    ctx.fillRect(0, 300, 640, 180);
    ctx.fillStyle = '#F8F0E6';
    ctx.fillRect(460, 170, 32, 130);
    ctx.fillStyle = '#EA6949';
    ctx.fillRect(454, 150, 44, 24);
    ctx.fillStyle = '#FDB644';
    ctx.fillRect(468, 156, 16, 12);

    const blob = await new Promise<Blob>((resolve) =>
      c.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
    );
    const file = new File([blob], 'seaside-lighthouse.jpg', { type: 'image/jpeg' });
    await handleFile(file);
  };

  const handleArchetypeChange = (nextArch: ArchetypeId) => {
    setSelectedArchetype(nextArch);
    const colors = analysis?.key_colors || ['#EA6949', '#F5994A', '#FDB644'];
    setArchetypeSpriteUrl(generateArchetypeSprite(nextArch, colors));
  };

  const handlePublish = () => {
    if (!photoData) return;
    if (analysis?.has_people && !peopleConsent) return;

    soundEngine.playOpenPanel();

    const spriteDataUrl =
      selectedCandidate === 'ai'
        ? aiSpriteUrl || polaroidUrl
        : selectedCandidate === 'archetype'
        ? archetypeSpriteUrl || polaroidUrl
        : polaroidUrl;

    const newMemory: Memory = {
      id: `mem-${Date.now()}`,
      status: selectedSlotId ? 'published' : 'archived',
      title: {
        zh: titleInput || analysis?.suggested_title.zh || '新的房间记忆',
        en: titleInput || analysis?.suggested_title.en || 'New Room Memory',
      },
      story: {
        zh: storyInput || analysis?.suggested_story.zh || '记录在像素小屋里的一段瞬间。',
        en: storyInput || analysis?.suggested_story.en || 'A quiet moment preserved in the Pixel Study.',
      },
      date: { value: dateInput || '2026-11', precision: 'month' },
      place: placeInput ? { zh: placeInput, en: placeInput } : undefined,
      tags: [analysis?.category || 'memory'],
      category: analysis?.category || 'other',
      archetype: selectedArchetype,
      keyColors: analysis?.key_colors || ['#EA6949', '#F5994A', '#FDB644'],
      photo: {
        web: photoData.webDataUrl,
        thumb: photoData.thumbDataUrl,
        width: photoData.width,
        height: photoData.height,
        alt: analysis?.alt_text || { zh: titleInput || '记忆照片', en: titleInput || 'Memory photo' },
      },
      sprite: {
        dataUrl: spriteDataUrl,
        polaroidDataUrl: polaroidUrl,
        size: 16,
        source: selectedCandidate === 'polaroid' ? 'fallback_polaroid' : 'ai',
      },
      slotId: selectedSlotId,
      isNew: true,
      hasPeople: analysis?.has_people,
      styleAdaptation: analysis?.style_adaptation,
      createdAt: new Date().toISOString(),
    };

    onPublishMemory(newMemory, applyStyleAdapt);
  };

  const occupiedSlots = new Set(memories.map((m) => m.slotId).filter(Boolean));
  const freeSlots = ROOM_SLOTS.filter((s) => !occupiedSlots.has(s.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 pixel-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'zh' ? '上传照片生成房间摆件' : 'Upload Photo to Room'}
      onClick={onClose}
    >
      <div
        className="pixel-panel w-full md:max-w-[780px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#3D202E] border-b-2 border-[#1C1215]">
          <div>
            <h2 className="font-pixel text-sm md:text-base text-[#F8F0E6]">
              {lang === 'zh' ? '照片 → 像素摆件 & 自适应布局' : 'Photo → Pixel Object & Adaptive Layout'}
            </h2>
            <p className="text-xs text-[#CCB49C] mt-0.5">
              {lang === 'zh'
                ? '自动剥离 GPS EXIF，由 Gemini 分析并生成房间摆件与配色优化'
                : 'Strips GPS EXIF locally, analyzes via Gemini, and adapts room layout & style'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn p-1.5 bg-[#95424A] text-[#F8F0E6]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pixel-scroll p-5 md:p-6 space-y-5">
          {!photoData ? (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed border-[#FDB644] bg-[#3D202E]/60 hover:bg-[#3D202E] cursor-pointer transition-colors text-center">
                <Upload className="w-8 h-8 text-[#FDB644]" />
                <div className="text-sm font-bold text-[#F8F0E6]">
                  {lang === 'zh' ? '点击选择或拖拽一张照片到这里' : 'Click or drop a photo here'}
                </div>
                <div className="text-xs text-[#CCB49C]">
                  {lang === 'zh' ? '支持 JPG / PNG / WebP，仅在本地保留隐私' : 'JPG / PNG / WebP · Privacy GPS scrubbed automatically'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-[#CCB49C]">
                  {lang === 'zh' ? '想立刻体验？使用预设示例照片：' : 'Want an instant demo? Try a sample sunset photo:'}
                </span>
                <button
                  type="button"
                  onClick={handleSamplePhoto}
                  className="pixel-btn px-3.5 py-2 bg-[#4B243B] text-[#F8F0E6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FDB644]" />
                  <span>{lang === 'zh' ? '生成海边灯塔示例照' : 'Try Sample Lighthouse Photo'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top split: Photo preview + Sprite Candidates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="bg-[#1C1215] border-2 border-[#1C1215] aspect-[4/3] overflow-hidden">
                    <img
                      src={photoData.thumbDataUrl}
                      alt="Uploaded preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#CCB49C]">
                    <span>
                      {photoData.width}×{photoData.height} · EXIF GPS Removed
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoData(null);
                        setAnalysis(null);
                        setErrorMsg(null);
                      }}
                      className="text-[#FDB644] hover:underline"
                    >
                      {lang === 'zh' ? '重选照片' : 'Replace'}
                    </button>
                  </div>
                </div>

                {/* Candidates */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F8F0E6]">
                      {lang === 'zh' ? '选择像素摆件样式' : 'Choose Pixel Collectible'}
                    </span>
                    {analyzing && (
                      <span className="text-xs text-[#FDB644] flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{lang === 'zh' ? 'Gemini 分析中…' : 'Analyzing…'}</span>
                      </span>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 bg-[#95424A]/40 border border-[#EA6949] text-xs text-[#F8F0E6]">
                      {lang === 'zh'
                        ? `AI 分析遇到问题（已自动启用像素拍立得兜底）：${errorMsg}`
                        : `AI analysis fallback active (Polaroid ready): ${errorMsg}`}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCandidate('ai')}
                      disabled={!aiSpriteUrl}
                      className={`p-3 border-2 flex flex-col items-center gap-2 ${
                        selectedCandidate === 'ai'
                          ? 'border-[#FDB644] bg-[#4B243B]'
                          : 'border-[#1C1215] bg-[#3D202E]'
                      }`}
                    >
                      {aiSpriteUrl ? (
                        <img src={aiSpriteUrl} alt="" className="w-10 h-10 pixelated" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2C161A]" />
                      )}
                      <span className="text-[11px] text-[#F8F0E6] whitespace-nowrap">
                        {lang === 'zh' ? 'AI 定制像素' : 'AI Custom'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCandidate('archetype')}
                      disabled={!archetypeSpriteUrl}
                      className={`p-3 border-2 flex flex-col items-center gap-2 ${
                        selectedCandidate === 'archetype'
                          ? 'border-[#FDB644] bg-[#4B243B]'
                          : 'border-[#1C1215] bg-[#3D202E]'
                      }`}
                    >
                      {archetypeSpriteUrl ? (
                        <img src={archetypeSpriteUrl} alt="" className="w-10 h-10 pixelated" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2C161A]" />
                      )}
                      <span className="text-[11px] text-[#F8F0E6] whitespace-nowrap">
                        {lang === 'zh' ? '原型摆件' : 'Archetype'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCandidate('polaroid')}
                      className={`p-3 border-2 flex flex-col items-center gap-2 ${
                        selectedCandidate === 'polaroid'
                          ? 'border-[#FDB644] bg-[#4B243B]'
                          : 'border-[#1C1215] bg-[#3D202E]'
                      }`}
                    >
                      {polaroidUrl ? (
                        <img src={polaroidUrl} alt="" className="w-10 h-10 pixelated" />
                      ) : (
                        <div className="w-10 h-10 bg-[#2C161A]" />
                      )}
                      <span className="text-[11px] text-[#F8F0E6] whitespace-nowrap">
                        {lang === 'zh' ? '像素拍立得' : 'Polaroid'}
                      </span>
                    </button>
                  </div>

                  {/* Manual Archetype & Slot overrides */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <label className="text-xs space-y-1">
                      <span className="text-[#CCB49C] block">
                        {lang === 'zh' ? '摆件原型' : 'Archetype'}
                      </span>
                      <select
                        value={selectedArchetype}
                        onChange={(e) => handleArchetypeChange(e.target.value as ArchetypeId)}
                        className="w-full bg-[#2C161A] border-2 border-[#1C1215] px-2 py-1.5 text-xs text-[#F8F0E6]"
                      >
                        {(Object.keys(ARCHETYPE_LABELS) as ArchetypeId[]).map((id) => (
                          <option key={id} value={id}>
                            {t(ARCHETYPE_LABELS[id], lang)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs space-y-1">
                      <span className="text-[#CCB49C] block">
                        {lang === 'zh' ? '放置槽位' : 'Room Slot'}
                      </span>
                      <select
                        value={selectedSlotId || ''}
                        onChange={(e) => setSelectedSlotId(e.target.value || null)}
                        className="w-full bg-[#2C161A] border-2 border-[#1C1215] px-2 py-1.5 text-xs text-[#F8F0E6]"
                      >
                        {freeSlots.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.id} ({s.zone})
                          </option>
                        ))}
                        <option value="">
                          {lang === 'zh' ? '存入收藏箱 (Archived)' : 'Archive in Chest'}
                        </option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {/* Adaptive Room Style Preview */}
              {analysis?.style_adaptation && (
                <div className="p-3.5 bg-[#3D202E] border-2 border-[#1C1215] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#FDB644] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'zh'
                          ? `自适应氛围建议：${analysis.style_adaptation.moodName}`
                          : `Adaptive Room Style: ${analysis.style_adaptation.moodName}`}
                      </span>
                    </div>
                    <p className="text-xs text-[#FBCDA6]">
                      {t(analysis.style_adaptation.description, lang)}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#F8F0E6] shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyStyleAdapt}
                      onChange={(e) => setApplyStyleAdapt(e.target.checked)}
                      className="accent-[#FDB644] w-4 h-4"
                    />
                    <span className="whitespace-nowrap">
                      {lang === 'zh' ? '同步优化房间配色与布局' : 'Adapt room style & layout'}
                    </span>
                  </label>
                </div>
              )}

              {/* Metadata fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-xs space-y-1">
                  <span className="text-[#CCB49C] block">{lang === 'zh' ? '标题' : 'Title'}</span>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder={lang === 'zh' ? '例如：京都的春天' : 'e.g. Spring in Kyoto'}
                    className="w-full bg-[#2C161A] border-2 border-[#1C1215] px-2.5 py-1.5 text-sm text-[#F8F0E6]"
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-[#CCB49C] block">{lang === 'zh' ? '日期' : 'Date'}</span>
                  <input
                    type="text"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full bg-[#2C161A] border-2 border-[#1C1215] px-2.5 py-1.5 text-sm text-[#F8F0E6]"
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-[#CCB49C] block">{lang === 'zh' ? '地点（仅文字）' : 'Place'}</span>
                  <input
                    type="text"
                    value={placeInput}
                    onChange={(e) => setPlaceInput(e.target.value)}
                    placeholder={lang === 'zh' ? '城市或地点' : 'City or place'}
                    className="w-full bg-[#2C161A] border-2 border-[#1C1215] px-2.5 py-1.5 text-sm text-[#F8F0E6]"
                  />
                </label>
              </div>

              <label className="text-xs space-y-1 block">
                <span className="text-[#CCB49C] block">{lang === 'zh' ? '背后的故事' : 'Story behind the photo'}</span>
                <textarea
                  rows={3}
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  className="w-full bg-[#2C161A] border-2 border-[#1C1215] px-3 py-2 text-sm text-[#F8F0E6]"
                />
              </label>

              {analysis?.has_people && (
                <label className="flex items-start gap-2.5 p-3 bg-[#95424A]/30 border-2 border-[#EA6949] text-xs text-[#F8F0E6] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={peopleConsent}
                    onChange={(e) => setPeopleConsent(e.target.checked)}
                    className="accent-[#FDB644] mt-0.5 w-4 h-4 shrink-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#FDB644] shrink-0" />
                    <span>
                      {lang === 'zh'
                        ? '检测到照片中有其他人，确认已经取得出镜人同意展示吗？'
                        : 'People detected in this photo. Please confirm you have consent to publish.'}
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-[#3D202E] border-t-2 border-[#1C1215]">
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn px-4 py-2 bg-[#4B243B] text-[#F8F0E6] text-xs whitespace-nowrap"
          >
            {lang === 'zh' ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={!photoData || analyzing || (Boolean(analysis?.has_people) && !peopleConsent)}
            onClick={handlePublish}
            className="pixel-btn px-4 py-2 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1.5 disabled:opacity-45 whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '发布到房间并实时适配' : 'Publish & Adapt Room'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
