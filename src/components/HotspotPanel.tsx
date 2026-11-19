import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Folder,
  FileText,
  Monitor,
  Music,
  Pause,
  Play,
  Trash2,
  Type as TypeIcon,
  X,
  Plus,
  Move,
  Archive,
} from 'lucide-react';
import { Hotspot, Lang, Memory, PanelTemplate } from '../types/room';
import { ARCHETYPE_LABELS, ROOM_HOTSPOTS, SHOWCASE_CONTENT, t } from '../data/roomData';
import { soundEngine } from '../utils/soundEngine';

interface HotspotPanelProps {
  hotspot: Hotspot;
  lang: Lang;
  memories: Memory[];
  bgmPlaying: boolean;
  onToggleBgm: () => void;
  onClose: () => void;
  onNavigateHotspot: (hotspotId: string) => void;
  onOpenMemory: (memoryId: string) => void;
  onOpenUpload: () => void;
  onTogglePlacementMode: () => void;
  onToggleArchiveMemory: (memoryId: string) => void;
  onOpenQuickBrowse: () => void;
}

export const HotspotPanel: React.FC<HotspotPanelProps> = ({
  hotspot,
  lang,
  memories,
  bgmPlaying,
  onToggleBgm,
  onClose,
  onNavigateHotspot,
  onOpenMemory,
  onOpenUpload,
  onTogglePlacementMode,
  onToggleArchiveMemory,
  onOpenQuickBrowse,
}) => {
  const [cleanFont, setCleanFont] = useState(false);
  const [osTab, setOsTab] = useState<'desktop' | 'work' | 'projects' | 'trash'>('desktop');
  const [timelinePage, setTimelinePage] = useState(0);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [selectedCityIdx, setSelectedCityIdx] = useState(0);
  const [memoryFilter, setMemoryFilter] = useState<string>('all');

  useEffect(() => {
    setOsTab('desktop');
    setTimelinePage(0);
  }, [hotspot.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const panelHotspots = ROOM_HOTSPOTS.filter((h) => h.action.type === 'panel');
  const currentIdx = panelHotspots.findIndex((h) => h.id === hotspot.id);
  const prevHotspot = panelHotspots[(currentIdx - 1 + panelHotspots.length) % panelHotspots.length];
  const nextHotspot = panelHotspots[(currentIdx + 1) % panelHotspots.length];

  const template: PanelTemplate =
    hotspot.action.type === 'panel' ? hotspot.action.template : 'about';

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SHOWCASE_CONTENT.contact.email);
      setCopiedEmail(true);
      soundEngine.playClick();
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      setCopiedEmail(true);
    }
  };

  const downloadResumeTxt = () => {
    soundEngine.playClick();
    const lines = [
      `${SHOWCASE_CONTENT.owner.name[lang]} — ${SHOWCASE_CONTENT.owner.role[lang]}`,
      SHOWCASE_CONTENT.contact.email,
      '',
      'EXPERIENCE:',
      ...SHOWCASE_CONTENT.experience.flatMap((e) => [
        `* ${e.org} | ${e.role[lang]} (${e.period})`,
        ...e.bullets[lang].map((b) => `  - ${b}`),
      ]),
      '',
      'EDUCATION:',
      `${SHOWCASE_CONTENT.education.school[lang]} — ${SHOWCASE_CONTENT.education.degree[lang]}`,
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Jacky_Yao_Resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fontClass = cleanFont ? 'font-body-clean' : 'font-display';

  return (
    <div
      className="fixed inset-0 z-40 flex items-end md:items-center justify-center p-0 md:p-6 pixel-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={t(hotspot.label, lang)}
      onClick={onClose}
    >
      <div
        className="pixel-panel w-full md:max-w-[720px] max-h-[88vh] md:max-h-[82vh] flex flex-col overflow-hidden text-[#FBCDA6]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-[#3D202E] border-b-2 border-[#1C1215]">
          <div className="min-w-0">
            <h2 className="font-pixel text-sm md:text-base text-[#F8F0E6] truncate">
              {t(hotspot.label, lang)}
            </h2>
            <p className="text-xs text-[#CCB49C] truncate mt-0.5">{t(hotspot.description, lang)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setCleanFont((v) => !v);
              }}
              className={`pixel-btn px-2.5 py-1.5 text-xs flex items-center gap-1 whitespace-nowrap ${
                cleanFont ? 'bg-[#FDB644] text-[#1C1215]' : 'bg-[#4B243B] text-[#F8F0E6]'
              }`}
              title={lang === 'zh' ? '切换清晰无衬线字体' : 'Toggle clean sans-serif font'}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span>Aa</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="pixel-btn p-1.5 bg-[#95424A] text-[#F8F0E6] hover:bg-[#EA6949]"
              aria-label={lang === 'zh' ? '关闭面板' : 'Close panel'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto pixel-scroll p-5 md:p-6 space-y-5 ${fontClass}`}>
          {template === 'about' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#582F44]">
                <div>
                  <h3 className="text-xl font-bold text-[#F8F0E6]">
                    {t(SHOWCASE_CONTENT.owner.name, lang)}
                  </h3>
                  <p className="text-sm text-[#FDB644] mt-1">
                    {t(SHOWCASE_CONTENT.owner.role, lang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenQuickBrowse();
                  }}
                  className="pixel-btn px-3.5 py-2 bg-[#FDB644] text-[#1C1215] text-xs font-bold whitespace-nowrap self-start sm:self-auto"
                >
                  {lang === 'zh' ? '切换简历速览' : 'Open Resume Mode'}
                </button>
              </div>
              <p className="text-sm md:text-base leading-relaxed text-[#FBCDA6]">
                {t(SHOWCASE_CONTENT.owner.bio, lang)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {SHOWCASE_CONTENT.owner.stats.map((st, idx) => (
                  <div key={idx} className="bg-[#3D202E] border-2 border-[#1C1215] p-3.5">
                    <div className="text-xs text-[#CCB49C]">{t(st.label, lang)}</div>
                    <div className="text-lg font-pixel text-[#F8F0E6] mt-1 tabular-nums">{st.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {template === 'os' && (
            <div className="border-2 border-[#1C1215] bg-[#3D202E] overflow-hidden">
              {/* Retro Pixel OS bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-[#582F44] border-b-2 border-[#1C1215]">
                <div className="flex items-center gap-2 text-xs font-pixel text-[#F8F0E6]">
                  <Monitor className="w-3.5 h-3.5 text-[#FDB644]" />
                  <span>PIXEL OS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOsTab('desktop')}
                    className={`px-2.5 py-1 text-xs whitespace-nowrap ${
                      osTab === 'desktop' ? 'bg-[#FDB644] text-[#1C1215] font-bold' : 'bg-[#2C161A] text-[#FBCDA6]'
                    }`}
                  >
                    {lang === 'zh' ? '桌面' : 'Desktop'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOsTab('work')}
                    className={`px-2.5 py-1 text-xs whitespace-nowrap ${
                      osTab === 'work' ? 'bg-[#FDB644] text-[#1C1215] font-bold' : 'bg-[#2C161A] text-[#FBCDA6]'
                    }`}
                  >
                    {lang === 'zh' ? '经历' : 'Work'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOsTab('projects')}
                    className={`px-2.5 py-1 text-xs whitespace-nowrap ${
                      osTab === 'projects' ? 'bg-[#FDB644] text-[#1C1215] font-bold' : 'bg-[#2C161A] text-[#FBCDA6]'
                    }`}
                  >
                    {lang === 'zh' ? '项目' : 'Projects'}
                  </button>
                </div>
              </div>

              {osTab === 'desktop' && (
                <div className="p-6 min-h-[260px] bg-gradient-to-b from-[#4B243B] via-[#702F53] to-[#EA6949]/40 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setOsTab('work');
                    }}
                    className="flex flex-col items-center gap-2 p-3 bg-[#2C161A]/85 border-2 border-[#1C1215] hover:border-[#FDB644] transition-colors"
                  >
                    <Monitor className="w-8 h-8 text-[#FDB644]" />
                    <span className="text-xs font-pixel text-[#F8F0E6]">
                      {lang === 'zh' ? '工作经历.exe' : 'Work.exe'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setOsTab('projects');
                    }}
                    className="flex flex-col items-center gap-2 p-3 bg-[#2C161A]/85 border-2 border-[#1C1215] hover:border-[#FDB644] transition-colors"
                  >
                    <Folder className="w-8 h-8 text-[#F5994A]" />
                    <span className="text-xs font-pixel text-[#F8F0E6]">
                      {lang === 'zh' ? '项目集/' : 'Projects/'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadResumeTxt}
                    className="flex flex-col items-center gap-2 p-3 bg-[#2C161A]/85 border-2 border-[#1C1215] hover:border-[#FDB644] transition-colors"
                  >
                    <FileText className="w-8 h-8 text-[#FBCDA6]" />
                    <span className="text-xs font-pixel text-[#F8F0E6]">Resume.txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setOsTab('trash');
                    }}
                    className="flex flex-col items-center gap-2 p-3 bg-[#2C161A]/85 border-2 border-[#1C1215] hover:border-[#EA6949] transition-colors"
                  >
                    <Trash2 className="w-8 h-8 text-[#CCB49C]" />
                    <span className="text-xs font-pixel text-[#F8F0E6]">
                      {lang === 'zh' ? '回收站' : 'Trash'}
                    </span>
                  </button>
                </div>
              )}

              {osTab === 'work' && (
                <div className="p-5 space-y-5 bg-[#2C161A]">
                  {SHOWCASE_CONTENT.experience.map((exp) => (
                    <div key={exp.id} className="pb-4 border-b border-[#4B243B] last:border-b-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-base font-bold text-[#F8F0E6]">{exp.org}</h4>
                        <span className="text-xs text-[#FDB644] tabular-nums">{exp.period}</span>
                      </div>
                      <p className="text-sm text-[#EA6949] mt-0.5">{t(exp.role, lang)}</p>
                      <ul className="mt-2.5 space-y-1.5 text-sm text-[#FBCDA6] list-disc list-inside">
                        {exp.bullets[lang].map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {osTab === 'projects' && (
                <div className="p-5 space-y-4 bg-[#2C161A]">
                  {SHOWCASE_CONTENT.projects.map((p) => (
                    <div key={p.id} className="p-4 bg-[#3D202E] border-2 border-[#1C1215] space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-base font-bold text-[#F8F0E6]">{t(p.name, lang)}</h4>
                        <span className="text-xs text-[#FDB644]">{t(p.highlight, lang)}</span>
                      </div>
                      <p className="text-sm text-[#FBCDA6]">{t(p.oneLiner, lang)}</p>
                      <div className="text-xs text-[#CCB49C]">
                        <span>{t(p.myRole, lang)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{p.stack.join(' / ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {osTab === 'trash' && (
                <div className="p-5 space-y-3 bg-[#2C161A]">
                  <p className="text-xs text-[#CCB49C]">
                    {lang === 'zh'
                      ? '彩蛋目录：那些有趣但半途而废的实验小玩具。'
                      : 'Easter egg folder: fun abandoned experiments.'}
                  </p>
                  {SHOWCASE_CONTENT.trashProjects.map((tp, i) => (
                    <div key={i} className="p-3 bg-[#3D202E] border border-[#582F44]">
                      <div className="text-sm font-bold text-[#F8F0E6]">{t(tp.name, lang)}</div>
                      <div className="text-xs text-[#CCB49C] mt-1">{t(tp.note, lang)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {template === 'timeline' && (
            <div className="space-y-4">
              <div className="bg-[#F8F0E6] text-[#1C1215] border-2 border-[#1C1215] p-5 shadow-[inset_0_0_0_2px_#CCB49C]">
                <div className="flex items-center justify-between text-xs text-[#6B3A35] pb-2 border-b border-[#CCB49C]">
                  <span className="font-pixel tabular-nums">
                    {SHOWCASE_CONTENT.timeline[timelinePage].year}
                  </span>
                  <span>{SHOWCASE_CONTENT.timeline[timelinePage].place}</span>
                </div>
                <h3 className="text-lg font-bold mt-3 text-[#1C1215]">
                  {t(SHOWCASE_CONTENT.timeline[timelinePage].title, lang)}
                </h3>
                <p className="text-sm leading-relaxed mt-2 text-[#3D202E]">
                  {t(SHOWCASE_CONTENT.timeline[timelinePage].detail, lang)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setTimelinePage((p) => (p - 1 + SHOWCASE_CONTENT.timeline.length) % SHOWCASE_CONTENT.timeline.length);
                  }}
                  className="pixel-btn px-3 py-1.5 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '上一页' : 'Prev Page'}</span>
                </button>
                <span className="text-xs text-[#CCB49C] tabular-nums">
                  {timelinePage + 1} / {SHOWCASE_CONTENT.timeline.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setTimelinePage((p) => (p + 1) % SHOWCASE_CONTENT.timeline.length);
                  }}
                  className="pixel-btn px-3 py-1.5 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{lang === 'zh' ? '下一页' : 'Next Page'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {template === 'grid' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {['all', 'published', 'archived'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setMemoryFilter(f)}
                      className={`px-3 py-1.5 text-xs border-2 border-[#1C1215] whitespace-nowrap ${
                        memoryFilter === f ? 'bg-[#FDB644] text-[#1C1215] font-bold' : 'bg-[#3D202E] text-[#FBCDA6]'
                      }`}
                    >
                      {f === 'all'
                        ? lang === 'zh'
                          ? '全部'
                          : 'All'
                        : f === 'published'
                        ? lang === 'zh'
                          ? '房间展出'
                          : 'In Room'
                        : lang === 'zh'
                        ? '收藏箱'
                        : 'Archived'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onTogglePlacementMode();
                      onClose();
                    }}
                    className="pixel-btn px-3 py-1.5 bg-[#582F44] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>{lang === 'zh' ? '调整摆放' : 'Move Slots'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onOpenUpload();
                    }}
                    className="pixel-btn px-3 py-1.5 bg-[#EA6949] text-[#F8F0E6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'zh' ? '上传新照片' : 'Upload Photo'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memories
                  .filter((m) =>
                    memoryFilter === 'all'
                      ? true
                      : memoryFilter === 'published'
                      ? Boolean(m.slotId)
                      : !m.slotId
                  )
                  .map((m) => (
                    <div
                      key={m.id}
                      className="bg-[#3D202E] border-2 border-[#1C1215] p-3 flex gap-3 items-start"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenMemory(m.id)}
                        className="w-16 h-16 shrink-0 bg-[#2C161A] border-2 border-[#1C1215] flex items-center justify-center hover:border-[#FDB644]"
                      >
                        <img
                          src={m.sprite.dataUrl || m.sprite.polaroidDataUrl}
                          alt={t(m.photo.alt, lang)}
                          className="w-12 h-12 pixelated"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onOpenMemory(m.id)}
                          className="text-left text-sm font-bold text-[#F8F0E6] hover:text-[#FDB644] truncate block w-full"
                        >
                          {t(m.title, lang)}
                        </button>
                        <div className="text-xs text-[#CCB49C] mt-0.5 truncate">
                          {m.date.value} · {t(ARCHETYPE_LABELS[m.archetype], lang)}
                          {m.slotId ? ` · ${m.slotId}` : ''}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => onOpenMemory(m.id)}
                            className="text-[#FDB644] hover:underline whitespace-nowrap"
                          >
                            {lang === 'zh' ? '查看故事' : 'Open Story'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleArchiveMemory(m.id)}
                            className="text-[#CCB49C] hover:text-[#F8F0E6] flex items-center gap-1 whitespace-nowrap"
                          >
                            <Archive className="w-3 h-3" />
                            <span>
                              {m.slotId
                                ? lang === 'zh'
                                  ? '收进箱子'
                                  : 'Archive'
                                : lang === 'zh'
                                ? '摆到房间'
                                : 'Display'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {template === 'notes' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SHOWCASE_CONTENT.skills.map((grp, i) => (
                <div
                  key={i}
                  className="p-4 border-2 border-[#1C1215] text-[#1C1215]"
                  style={{ backgroundColor: grp.color }}
                >
                  <h4 className="font-pixel text-xs font-bold pb-2 border-b border-[#1C1215]/30">
                    {t(grp.group, lang)}
                  </h4>
                  <ul className="mt-3 space-y-1.5 text-sm font-medium">
                    {grp.items.map((item, j) => (
                      <li key={j}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {template === 'contact' && (
            <div className="max-w-md mx-auto bg-[#3D202E] border-2 border-[#1C1215] p-5 space-y-4">
              <div className="text-xs text-[#CCB49C]">{t(SHOWCASE_CONTENT.contact.location, lang)}</div>
              <div className="flex items-center justify-between gap-3 bg-[#2C161A] border-2 border-[#1C1215] p-3">
                <span className="text-sm text-[#F8F0E6] truncate">{SHOWCASE_CONTENT.contact.email}</span>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="pixel-btn px-3 py-1.5 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? (lang === 'zh' ? '已复制' : 'Copied') : lang === 'zh' ? '复制' : 'Copy'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={SHOWCASE_CONTENT.contact.github}
                  target="_blank"
                  rel="noreferrer"
                  className="pixel-btn px-3 py-2.5 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={SHOWCASE_CONTENT.contact.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="pixel-btn px-3 py-2.5 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <button
                type="button"
                onClick={downloadResumeTxt}
                className="w-full pixel-btn px-4 py-2.5 bg-[#EA6949] text-[#F8F0E6] text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'zh' ? '下载纯文本简历' : 'Download Resume (.txt)'}</span>
              </button>
            </div>
          )}

          {template === 'playlist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#3D202E] border-2 border-[#1C1215]">
                <div className="flex items-center gap-3">
                  <Music className="w-6 h-6 text-[#FDB644]" />
                  <div>
                    <div className="text-sm font-bold text-[#F8F0E6]">
                      {lang === 'zh' ? '房间 Lo-fi 氛围和弦' : 'Room Lo-fi Chord Synth'}
                    </div>
                    <div className="text-xs text-[#CCB49C]">
                      {bgmPlaying
                        ? lang === 'zh'
                          ? '正在播放中'
                          : 'Now playing'
                        : lang === 'zh'
                        ? '已暂停'
                        : 'Paused'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleBgm}
                  className="pixel-btn px-4 py-2 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                >
                  {bgmPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{bgmPlaying ? (lang === 'zh' ? '暂停' : 'Pause') : lang === 'zh' ? '播放音乐' : 'Play BGM'}</span>
                </button>
              </div>
              <div className="space-y-2">
                {SHOWCASE_CONTENT.playlist.map((track, idx) => (
                  <div key={idx} className="p-3 bg-[#3D202E] border border-[#582F44] flex justify-between items-center gap-4">
                    <div>
                      <div className="text-sm font-bold text-[#F8F0E6]">{track.title}</div>
                      <div className="text-xs text-[#CCB49C]">
                        {track.artist} · {t(track.mood, lang)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {template === 'map' && (
            <div className="space-y-4">
              <div className="relative h-56 bg-[#3D202E] border-2 border-[#1C1215] overflow-hidden p-4">
                <div className="text-xs text-[#CCB49C] mb-2">
                  {lang === 'zh' ? '点击城市图钉查看我的足迹' : 'Select a city pin to view my footprint'}
                </div>
                {/* Stylized pixel world grid lines */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'linear-gradient(#FBCDA6 1px, transparent 1px), linear-gradient(90deg, #FBCDA6 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />
                {SHOWCASE_CONTENT.footprints.map((fp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedCityIdx(idx);
                    }}
                    style={{ left: `${fp.x}%`, top: `${fp.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 text-xs border-2 border-[#1C1215] whitespace-nowrap ${
                      selectedCityIdx === idx
                        ? 'bg-[#FDB644] text-[#1C1215] font-bold z-10'
                        : 'bg-[#4B243B] text-[#F8F0E6]'
                    }`}
                  >
                    {t(fp.city, lang)}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-[#3D202E] border-2 border-[#1C1215]">
                <div className="text-sm font-bold text-[#FDB644]">
                  {t(SHOWCASE_CONTENT.footprints[selectedCityIdx].city, lang)}
                </div>
                <div className="text-sm text-[#FBCDA6] mt-1">
                  {t(SHOWCASE_CONTENT.footprints[selectedCityIdx].note, lang)}
                </div>
              </div>
            </div>
          )}

          {template === 'list' && (
            <div className="space-y-3">
              {SHOWCASE_CONTENT.awards.map((aw, i) => (
                <div key={i} className="p-4 bg-[#3D202E] border-2 border-[#1C1215]">
                  <div className="flex justify-between items-baseline gap-2">
                    <h4 className="text-sm font-bold text-[#F8F0E6]">{t(aw.title, lang)}</h4>
                    <span className="text-xs text-[#FDB644] tabular-nums">{aw.year}</span>
                  </div>
                  <p className="text-xs text-[#CCB49C] mt-1">{t(aw.desc, lang)}</p>
                </div>
              ))}
            </div>
          )}

          {template === 'card' && (
            <div className="bg-[#F8F0E6] text-[#1C1215] border-2 border-[#1C1215] p-6 space-y-3">
              <div className="text-xs text-[#6B3A35] tabular-nums">{SHOWCASE_CONTENT.education.period}</div>
              <h3 className="text-lg font-bold">{t(SHOWCASE_CONTENT.education.school, lang)}</h3>
              <p className="text-sm font-medium text-[#702F53]">{t(SHOWCASE_CONTENT.education.degree, lang)}</p>
              <ul className="pt-2 space-y-1 text-sm text-[#3D202E] list-disc list-inside">
                {SHOWCASE_CONTENT.education.highlights[lang].map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          {template === 'now' && (
            <div className="space-y-4">
              <div className="text-xs text-[#FDB644] tabular-nums">
                {lang === 'zh' ? `最近更新 · ${SHOWCASE_CONTENT.now.updated}` : `Updated · ${SHOWCASE_CONTENT.now.updated}`}
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-[#3D202E] border-2 border-[#1C1215]">
                  <div className="text-xs text-[#CCB49C]">{lang === 'zh' ? '正在阅读' : 'Reading'}</div>
                  <div className="text-sm text-[#F8F0E6] mt-1">{t(SHOWCASE_CONTENT.now.reading, lang)}</div>
                </div>
                <div className="p-4 bg-[#3D202E] border-2 border-[#1C1215]">
                  <div className="text-xs text-[#CCB49C]">{lang === 'zh' ? '正在构建' : 'Building'}</div>
                  <div className="text-sm text-[#F8F0E6] mt-1">{t(SHOWCASE_CONTENT.now.building, lang)}</div>
                </div>
                <div className="p-4 bg-[#3D202E] border-2 border-[#1C1215]">
                  <div className="text-xs text-[#CCB49C]">{lang === 'zh' ? '日常习惯' : 'Daily Ritual'}</div>
                  <div className="text-sm text-[#F8F0E6] mt-1">{t(SHOWCASE_CONTENT.now.habit, lang)}</div>
                </div>
              </div>
            </div>
          )}

          {template === 'learning' && (
            <div className="space-y-4">
              {SHOWCASE_CONTENT.learning.map((item, idx) => (
                <div key={idx} className="p-4 bg-[#3D202E] border-2 border-[#1C1215] space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#F8F0E6] font-medium">{t(item.topic, lang)}</span>
                    <span className="text-[#A89060] font-pixel tabular-nums">{item.progress}%</span>
                  </div>
                  <div className="h-3 bg-[#1C1215] p-0.5">
                    <div className="h-full bg-[#A89060]" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer prev/next navigation */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-[#3D202E] border-t-2 border-[#1C1215] text-xs">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onNavigateHotspot(prevHotspot.id);
            }}
            className="text-[#FBCDA6] hover:text-[#FDB644] flex items-center gap-1.5 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t(prevHotspot.label, lang)}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onNavigateHotspot(nextHotspot.id);
            }}
            className="text-[#FBCDA6] hover:text-[#FDB644] flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>{t(nextHotspot.label, lang)}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
