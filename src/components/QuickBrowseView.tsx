import React, { useState } from 'react';
import { ArrowLeft, Check, Copy, Download } from 'lucide-react';
import { Lang, Memory } from '../types/room';
import { ARCHETYPE_LABELS, SHOWCASE_CONTENT, t } from '../data/roomData';
import { soundEngine } from '../utils/soundEngine';

interface QuickBrowseViewProps {
  lang: Lang;
  memories: Memory[];
  onExit: () => void;
  onOpenMemory: (id: string) => void;
}

export const QuickBrowseView: React.FC<QuickBrowseViewProps> = ({
  lang,
  memories,
  onExit,
  onOpenMemory,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SHOWCASE_CONTENT.contact.email);
      setCopied(true);
      soundEngine.playClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#2C161A] text-[#FBCDA6] py-8 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b-2 border-[#4B243B]">
          <div>
            <h1 className="font-pixel text-xl sm:text-2xl text-[#F8F0E6]">
              {t(SHOWCASE_CONTENT.owner.name, lang)}
            </h1>
            <p className="text-sm text-[#FDB644] mt-1">{t(SHOWCASE_CONTENT.owner.role, lang)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="pixel-btn px-3.5 py-2 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#FDB644]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{SHOWCASE_CONTENT.contact.email}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onExit();
              }}
              className="pixel-btn px-4 py-2 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '回到像素小屋' : 'Back to Pixel Room'}</span>
            </button>
          </div>
        </div>

        {/* About */}
        <section className="space-y-3">
          <h2 className="font-pixel text-sm text-[#FDB644]">
            {lang === 'zh' ? '01. 关于我' : '01. About'}
          </h2>
          <p className="text-base leading-relaxed text-[#F8F0E6]">
            {t(SHOWCASE_CONTENT.owner.bio, lang)}
          </p>
        </section>

        {/* Work Experience */}
        <section className="space-y-4">
          <h2 className="font-pixel text-sm text-[#FDB644]">
            {lang === 'zh' ? '02. 工作经历' : '02. Experience'}
          </h2>
          <div className="space-y-4">
            {SHOWCASE_CONTENT.experience.map((exp) => (
              <div key={exp.id} className="bg-[#3D202E] border-2 border-[#1C1215] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-bold text-[#F8F0E6]">
                    {exp.org} · {t(exp.role, lang)}
                  </h3>
                  <span className="text-xs text-[#FDB644] tabular-nums">{exp.period}</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm text-[#FBCDA6] list-disc list-inside">
                  {exp.bullets[lang].map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section className="space-y-4">
          <h2 className="font-pixel text-sm text-[#FDB644]">
            {lang === 'zh' ? '03. 代表项目' : '03. Selected Projects'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SHOWCASE_CONTENT.projects.map((p) => (
              <div key={p.id} className="bg-[#3D202E] border-2 border-[#1C1215] p-4 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#F8F0E6]">{t(p.name, lang)}</h3>
                  <p className="text-xs text-[#CCB49C] mt-1.5 leading-relaxed">{t(p.oneLiner, lang)}</p>
                </div>
                <div className="text-xs text-[#FDB644] pt-2 border-t border-[#582F44]">
                  {p.stack.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills & Education */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="font-pixel text-sm text-[#FDB644]">
              {lang === 'zh' ? '04. 技能栈' : '04. Skills'}
            </h2>
            <div className="bg-[#3D202E] border-2 border-[#1C1215] p-4 space-y-3">
              {SHOWCASE_CONTENT.skills.map((s, i) => (
                <div key={i}>
                  <div className="text-xs font-bold text-[#F8F0E6]">{t(s.group, lang)}</div>
                  <div className="text-sm text-[#CCB49C] mt-0.5">{s.items.join(' · ')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-pixel text-sm text-[#FDB644]">
              {lang === 'zh' ? '05. 教育与奖项' : '05. Education & Honors'}
            </h2>
            <div className="bg-[#3D202E] border-2 border-[#1C1215] p-4 space-y-3">
              <div>
                <div className="text-sm font-bold text-[#F8F0E6]">
                  {t(SHOWCASE_CONTENT.education.school, lang)}
                </div>
                <div className="text-xs text-[#CCB49C] mt-0.5">
                  {t(SHOWCASE_CONTENT.education.degree, lang)} · {SHOWCASE_CONTENT.education.period}
                </div>
              </div>
              <div className="pt-2 border-t border-[#582F44] space-y-1.5">
                {SHOWCASE_CONTENT.awards.map((a, i) => (
                  <div key={i} className="text-xs text-[#FBCDA6]">
                    <span className="text-[#FDB644] tabular-nums">{a.year}</span> · {t(a.title, lang)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Memories Catalog */}
        <section className="space-y-4">
          <h2 className="font-pixel text-sm text-[#FDB644]">
            {lang === 'zh' ? '06. 照片记忆柜' : '06. Photo Memories'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {memories.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpenMemory(m.id)}
                className="text-left bg-[#3D202E] border-2 border-[#1C1215] hover:border-[#FDB644] p-3 space-y-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={m.sprite.dataUrl || m.sprite.polaroidDataUrl}
                    alt={t(m.photo.alt, lang)}
                    className="w-10 h-10 pixelated shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#F8F0E6] truncate">{t(m.title, lang)}</div>
                    <div className="text-xs text-[#CCB49C] truncate">
                      {m.date.value} · {t(ARCHETYPE_LABELS[m.archetype], lang)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <div className="pt-4 border-t-2 border-[#4B243B] flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-[#CCB49C]">{t(SHOWCASE_CONTENT.contact.location, lang)}</span>
          <a
            href={`mailto:${SHOWCASE_CONTENT.contact.email}`}
            className="pixel-btn px-4 py-2 bg-[#EA6949] text-[#F8F0E6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '邮件联系我' : 'Email Me'}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
