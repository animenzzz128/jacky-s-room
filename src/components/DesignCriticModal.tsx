import React, { useState } from 'react';
import { CheckCircle2, Loader2, Play, RefreshCw, Sparkles, Wrench, X } from 'lucide-react';
import { DesignAuditIssue, DesignAuditReport, Lang, Memory, RoomThemeConfig } from '../types/room';
import { ROOM_SLOTS, t } from '../data/roomData';
import { soundEngine } from '../utils/soundEngine';

interface DesignCriticModalProps {
  lang: Lang;
  memories: Memory[];
  theme: RoomThemeConfig;
  audits: DesignAuditReport[];
  onClose: () => void;
  onAddAudit: (report: DesignAuditReport) => void;
  onApplyFixes: (fixActions: DesignAuditIssue['fixAction'][]) => {
    nextMemories: Memory[];
    nextTheme: RoomThemeConfig;
  };
}

export const DesignCriticModal: React.FC<DesignCriticModalProps> = ({
  lang,
  memories,
  theme,
  audits,
  onClose,
  onAddAudit,
  onApplyFixes,
}) => {
  const [running, setRunning] = useState(false);
  const [autoLooping, setAutoLooping] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const latestAudit = audits[audits.length - 1] || null;

  const computeZoneCounts = (mems: Memory[]) => {
    const counts: Record<string, number> = { wall: 0, shelf: 0, sill: 0, cork: 0, desk: 0, expansion: 0 };
    mems.forEach((m) => {
      if (!m.slotId) return;
      const slot = ROOM_SLOTS.find((s) => s.id === m.slotId);
      if (slot) counts[slot.zone] = (counts[slot.zone] || 0) + 1;
    });
    return counts;
  };

  const runSingleAudit = async (
    currentMems: Memory[],
    currentTheme: RoomThemeConfig,
    fixesSoFar: string[],
    iterNum: number
  ): Promise<DesignAuditReport> => {
    const res = await fetch('/api/design-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        iteration: iterNum,
        memoriesCount: currentMems.length,
        placedZones: computeZoneCounts(currentMems),
        themeConfig: currentTheme,
        recentFixesApplied: fixesSoFar,
        hasCustomPhoto: currentMems.some((m) => m.sprite.source === 'ai'),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return (await res.json()) as DesignAuditReport;
  };

  const handleManualAudit = async () => {
    soundEngine.playClick();
    setRunning(true);
    setErrorMsg(null);
    try {
      const report = await runSingleAudit(memories, theme, appliedFixes, audits.length + 1);
      onAddAudit(report);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Audit failed');
    } finally {
      setRunning(false);
    }
  };

  const handleApplyTop3AndReaudit = async () => {
    if (!latestAudit) return;
    soundEngine.playClick();
    setRunning(true);
    setErrorMsg(null);
    try {
      const actions = latestAudit.top3Issues.slice(0, 3).map((i) => i.fixAction);
      const { nextMemories, nextTheme } = onApplyFixes(actions);
      const nextFixes = Array.from(new Set([...appliedFixes, ...actions]));
      setAppliedFixes(nextFixes);

      const report = await runSingleAudit(nextMemories, nextTheme, nextFixes, audits.length + 1);
      onAddAudit(report);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Optimization failed');
    } finally {
      setRunning(false);
    }
  };

  const handleAutoIterateTo95 = async () => {
    soundEngine.playClick();
    setAutoLooping(true);
    setRunning(true);
    setErrorMsg(null);
    try {
      let curMems = memories;
      let curTheme = theme;
      let curFixes = [...appliedFixes];
      let iter = audits.length + 1;

      let report = latestAudit;
      if (!report) {
        report = await runSingleAudit(curMems, curTheme, curFixes, iter);
        onAddAudit(report);
        iter++;
      }

      // Maximum 4 refinement rounds to avoid infinite loop
      let safety = 0;
      while (report.overallScore < 9.5 && safety < 4) {
        safety++;
        const actions = report.top3Issues.slice(0, 3).map((i) => i.fixAction);
        const applied = onApplyFixes(actions);
        curMems = applied.nextMemories;
        curTheme = applied.nextTheme;
        curFixes = Array.from(new Set([...curFixes, ...actions]));
        setAppliedFixes(curFixes);

        report = await runSingleAudit(curMems, curTheme, curFixes, iter);
        onAddAudit(report);
        iter++;
      }
      soundEngine.playOpenPanel();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Auto-loop failed');
    } finally {
      setRunning(false);
      setAutoLooping(false);
    }
  };

  const dimList = latestAudit
    ? [
        { key: 'pixelGridAndPalette', label: { zh: '像素网格与色板和谐', en: 'Pixel Grid & Palette' }, val: latestAudit.dimensions.pixelGridAndPalette },
        { key: 'spatialBalance', label: { zh: '空间布局与槽位均衡', en: 'Spatial & Slot Balance' }, val: latestAudit.dimensions.spatialBalance },
        { key: 'typographyAndContrast', label: { zh: '字体排版与 AA 对比度', en: 'Typography & Contrast' }, val: latestAudit.dimensions.typographyAndContrast },
        { key: 'interactiveAffordance', label: { zh: '交互反馈与无障碍引导', en: 'Interactive Affordance' }, val: latestAudit.dimensions.interactiveAffordance },
        { key: 'adaptivePhotoSync', label: { zh: '照片摆件与风格自适应', en: 'Adaptive Photo Sync' }, val: latestAudit.dimensions.adaptivePhotoSync },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 pixel-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'zh' ? 'AI 页面设计审核与迭代引擎' : 'AI Design Critic & Optimizer'}
      onClick={onClose}
    >
      <div
        className="pixel-panel w-full md:max-w-[780px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#3D202E] border-b-2 border-[#1C1215]">
          <div>
            <h2 className="font-pixel text-sm md:text-base text-[#F8F0E6]">
              {lang === 'zh' ? '专业页面设计 AI 审核闭环 (目标 ≥ 9.5)' : 'AI Design Critic Loop (Target ≥ 9.5)'}
            </h2>
            <p className="text-xs text-[#CCB49C] mt-0.5">
              {lang === 'zh'
                ? '独立设计评审 AI 评分 0–10，定位问题最大的 3 项并实时应用修复直至 ≥ 9.5'
                : 'Independent design director AI scores 0–10, fixes top 3 issues & loops until ≥ 9.5'}
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
          {errorMsg && (
            <div className="p-3 bg-[#95424A]/40 border-2 border-[#EA6949] text-xs text-[#F8F0E6]">
              {errorMsg}
            </div>
          )}

          {!latestAudit ? (
            <div className="p-8 bg-[#3D202E] border-2 border-[#1C1215] text-center space-y-4">
              <Sparkles className="w-8 h-8 text-[#FDB644] mx-auto" />
              <div className="text-sm text-[#F8F0E6]">
                {lang === 'zh'
                  ? '点击下方按钮启动 AI 设计总监审核当前房间布局、色彩对比与照片自适应效果。'
                  : 'Run the AI Design Critic to evaluate the current room layout, contrast, and adaptive photo integration.'}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  disabled={running}
                  onClick={handleManualAudit}
                  className="pixel-btn px-4 py-2 bg-[#4B243B] text-[#F8F0E6] text-xs font-bold flex items-center gap-1.5"
                >
                  {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>{lang === 'zh' ? '运行首轮设计审核' : 'Run Initial Audit'}</span>
                </button>
                <button
                  type="button"
                  disabled={running}
                  onClick={handleAutoIterateTo95}
                  className="pixel-btn px-4 py-2 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1.5"
                >
                  {autoLooping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{lang === 'zh' ? '一键循环优化至 9.5+' : 'Auto-Iterate to ≥ 9.5'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Score Header + History trail */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#3D202E] border-2 border-[#1C1215] p-4 flex flex-col justify-between">
                  <div className="text-xs text-[#CCB49C]">
                    {lang === 'zh' ? `第 ${latestAudit.iteration} 轮总评分` : `Iteration #${latestAudit.iteration} Score`}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span
                      className={`font-pixel text-3xl tabular-nums ${
                        latestAudit.overallScore >= 9.5 ? 'text-[#A89060]' : 'text-[#FDB644]'
                      }`}
                    >
                      {latestAudit.overallScore.toFixed(1)}
                    </span>
                    <span className="text-sm text-[#CCB49C]">/ 10.0</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {latestAudit.overallScore >= 9.5 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#A89060]" />
                        <span className="text-[#F8F0E6] font-bold">
                          {lang === 'zh' ? '已达到 ≥ 9.5 发布标准' : 'Target ≥ 9.5 Achieved'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#EA6949]">
                        {lang === 'zh' ? '需修复以下 3 项并复审' : 'Apply Top 3 fixes & re-audit'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5 Dimension Bars */}
                <div className="md:col-span-2 bg-[#3D202E] border-2 border-[#1C1215] p-4 space-y-2.5">
                  {dimList.map((d) => (
                    <div key={d.key} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#FBCDA6]">{t(d.label, lang)}</span>
                        <span className="font-pixel text-[#F8F0E6] tabular-nums">{d.val.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-[#1C1215]">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, d.val * 10)}%`,
                            backgroundColor: d.val >= 9.5 ? '#A89060' : '#FDB644',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3.5 bg-[#3D202E] border border-[#582F44] text-xs md:text-sm text-[#FBCDA6]">
                {t(latestAudit.summary, lang)}
              </div>

              {/* Iteration progression */}
              {audits.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#CCB49C]">
                  <span>{lang === 'zh' ? '迭代轨迹：' : 'Audit History:'}</span>
                  {audits.map((a, i) => (
                    <span key={i} className="tabular-nums text-[#F8F0E6]">
                      #{a.iteration}: <strong className="text-[#FDB644]">{a.overallScore.toFixed(1)}</strong>
                      {i < audits.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Top 3 Issues */}
              <div className="space-y-2.5">
                <h3 className="font-pixel text-xs text-[#F8F0E6]">
                  {lang === 'zh' ? '当前问题最大的 3 项 (Top 3 Issues)' : 'Top 3 Highest-Impact Issues'}
                </h3>
                <div className="space-y-2.5">
                  {latestAudit.top3Issues.slice(0, 3).map((issue, idx) => (
                    <div key={issue.id} className="p-3.5 bg-[#3D202E] border-2 border-[#1C1215] space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#F8F0E6]">
                          0{idx + 1}. {t(issue.title, lang)}
                        </span>
                        <span className="text-xs text-[#EA6949] shrink-0">
                          {issue.area} · {issue.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[#CCB49C]">{t(issue.diagnosis, lang)}</p>
                      <div className="text-xs text-[#FDB644] pt-1">
                        {lang === 'zh' ? '修复策略：' : 'Fix: '}
                        {t(issue.fixLabel, lang)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#3D202E] border-t-2 border-[#1C1215]">
          <button
            type="button"
            disabled={running}
            onClick={handleManualAudit}
            className="pixel-btn px-3.5 py-2 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            {running && !autoLooping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{lang === 'zh' ? '重新审核当前页面' : 'Re-Audit Now'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            {latestAudit && latestAudit.overallScore < 9.5 && (
              <button
                type="button"
                disabled={running}
                onClick={handleApplyTop3AndReaudit}
                className="pixel-btn px-3.5 py-2 bg-[#EA6949] text-[#F8F0E6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '应用 Top 3 修复并复审' : 'Apply Top 3 Fixes & Re-Audit'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={running || (latestAudit?.overallScore ?? 0) >= 9.5}
              onClick={handleAutoIterateTo95}
              className="pixel-btn px-4 py-2 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1.5 disabled:opacity-45 whitespace-nowrap"
            >
              {autoLooping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{lang === 'zh' ? '自动迭代至 9.5+' : 'Auto-Loop to ≥ 9.5'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
