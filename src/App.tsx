import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  FileText,
  Globe,
  List,
  Move,
  Plus,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  DesignAuditIssue,
  DesignAuditReport,
  Hotspot,
  Lang,
  Memory,
  RoomThemeConfig,
} from './types/room';
import {
  createStarterMemories,
  DEFAULT_THEME_CONFIG,
  pickBestSlot,
  ROOM_HOTSPOTS,
  ROOM_SLOTS,
  SHOWCASE_CONTENT,
  t,
} from './data/roomData';
import { PixelRoomCanvas } from './components/PixelRoomCanvas';
import { HotspotPanel } from './components/HotspotPanel';
import { MemoryRevealModal } from './components/MemoryRevealModal';
import { PhotoUploadModal } from './components/PhotoUploadModal';
import { DesignCriticModal } from './components/DesignCriticModal';
import { QuickBrowseView } from './components/QuickBrowseView';
import {
  loadSavedMemories,
  loadStateValue,
  PersistedRoomMeta,
  saveAllMemories,
  saveStateValue,
} from './utils/indexedDb';
import { soundEngine } from './utils/soundEngine';

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof navigator !== 'undefined' && navigator.language.startsWith('en')) return 'en';
    return 'zh';
  });

  const [reducedMotion, setReducedMotion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(25);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [theme, setTheme] = useState<RoomThemeConfig>(() => {
    const h = new Date().getHours();
    const isNightHour = h >= 20 || h < 5;
    return { ...DEFAULT_THEME_CONFIG, mode: isNightHour ? 'night' : 'dusk' };
  });
  const [audits, setAudits] = useState<DesignAuditReport[]>([]);

  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [hoveredMemoryId, setHoveredMemoryId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCritic, setShowCritic] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [quickBrowse, setQuickBrowse] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/text';
    }
    return false;
  });

  const [placementMode, setPlacementMode] = useState(false);
  const [movingMemoryId, setMovingMemoryId] = useState<string | null>(null);

  const [soundOn, setSoundOn] = useState(false);
  const [bgmPlaying, setBgmPlaying] = useState(false);

  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [bubbleIdx, setBubbleIdx] = useState(0);
  const [dissolveFlash, setDissolveFlash] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [activeEffect, setActiveEffect] = useState({
    waving: false,
    sipping: false,
    pettingCat: false,
    frogDancing: false,
    frogClickCount: 0,
    bgmOn: false,
  });

  const [stageDims, setStageDims] = useState({ width: 960, height: 540 });
  const stageScrollRef = useRef<HTMLDivElement | null>(null);
  const lastTriggerElRef = useRef<HTMLElement | null>(null);

  const isEmbed = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('embed') === '1';
  }, []);

  // Reduced motion listener
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Smooth responsive 16:9 sizing for 960x540 cozy studio canvas
  useEffect(() => {
    const updateDims = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw < 768) {
        setStageDims({ width: 960, height: 540 });
      } else {
        const maxW = Math.min(1152, vw - 40);
        const maxH = vh - 124;
        const w = Math.max(640, Math.min(maxW, Math.floor((maxH * 16) / 9)));
        const h = Math.round((w * 9) / 16);
        setStageDims({ width: w, height: h });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Load IndexedDB memories & state + fast intro loader
  useEffect(() => {
    let mounted = true;
    const t1 = setTimeout(() => mounted && setLoadingProgress(72), 180);
    const t2 = setTimeout(() => mounted && setLoadingProgress(100), 380);

    (async () => {
      const saved = await loadSavedMemories();
      const starter = saved ?? (await createStarterMemories());
      const meta = await loadStateValue<PersistedRoomMeta>('room_meta');
      if (!mounted) return;

      setMemories(starter);
      if (!saved) {
        await saveAllMemories(starter);
      }
      if (meta) {
        setTheme(meta.themeConfig);
        setAudits(meta.audits || []);
      }

      // Check URL deep links (?item=laptop or ?memory=2025-kyoto)
      const params = new URLSearchParams(window.location.search);
      const itemParam = params.get('item');
      const memParam = params.get('memory');
      if (itemParam && ROOM_HOTSPOTS.some((h) => h.id === itemParam)) {
        setActiveHotspotId(itemParam);
      }
      if (memParam && starter.some((m) => m.id === memParam)) {
        setActiveMemoryId(memParam);
      }

      setTimeout(() => {
        if (!mounted) return;
        setLoading(false);
        setBubbleText(SHOWCASE_CONTENT.owner.bubbleLines[lang][0]);
      }, 480);
    })();

    return () => {
      mounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Center mobile horizontal scroll on character initially
  useEffect(() => {
    if (!loading && stageScrollRef.current && window.innerWidth < 768) {
      const el = stageScrollRef.current;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, [loading]);

  // Persist memories & metadata
  useEffect(() => {
    if (memories.length > 0) {
      saveAllMemories(memories);
    }
  }, [memories]);

  useEffect(() => {
    saveStateValue<PersistedRoomMeta>('room_meta', { themeConfig: theme, audits });
  }, [theme, audits]);

  // iframe postMessage bridge
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'room:ready' }, '*');
    }
    const onMsg = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'room:open' && typeof e.data.itemId === 'string') {
        setActiveHotspotId(e.data.itemId);
      }
      if (e.data.type === 'room:mute') {
        soundEngine.setEnabled(false);
        setSoundOn(false);
        setBgmPlaying(false);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Pause audio when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && bgmPlaying) {
        soundEngine.stopBgm();
        setBgmPlaying(false);
        setActiveEffect((prev) => ({ ...prev, bgmOn: false }));
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [bgmPlaying]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 3200);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    soundEngine.setEnabled(next);
    setSoundOn(next);
    if (!next) {
      setBgmPlaying(false);
      setActiveEffect((p) => ({ ...p, bgmOn: false }));
    } else {
      soundEngine.playClick();
    }
  };

  const handleToggleBgm = () => {
    const playing = soundEngine.toggleBgm();
    setSoundOn(true);
    setBgmPlaying(playing);
    setActiveEffect((p) => ({ ...p, bgmOn: playing }));
  };

  const syncUrlParam = (key: string | null, val: string | null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete('item');
    url.searchParams.delete('memory');
    if (key && val) url.searchParams.set(key, val);
    window.history.replaceState({}, '', url.toString());
  };

  const handleCloseModal = () => {
    setActiveHotspotId(null);
    setActiveMemoryId(null);
    syncUrlParam(null, null);
    if (lastTriggerElRef.current) {
      lastTriggerElRef.current.focus();
      lastTriggerElRef.current = null;
    }
  };

  const handleHotspotActivate = (hs: Hotspot, targetEl?: HTMLElement | null) => {
    if (targetEl) lastTriggerElRef.current = targetEl;

    if (hs.action.type === 'toggle' && hs.action.target === 'lamp') {
      soundEngine.playLamp();
      setDissolveFlash(true);
      setTimeout(() => setDissolveFlash(false), 180);
      setTheme((prev) => ({
        ...prev,
        mode: prev.mode === 'dusk' ? 'night' : 'dusk',
        lampOn: prev.mode === 'dusk' ? true : !prev.lampOn,
      }));
      return;
    }

    if (hs.action.type === 'easter_egg') {
      if (hs.action.id === 'frog') {
        soundEngine.playFrog();
        setActiveEffect((prev) => {
          const count = prev.frogClickCount + 1;
          const unlocked = count >= 5;
          if (count === 5) {
            showToast(
              lang === 'zh'
                ? '彩蛋解锁：青蛙戴上耳机开始摇摆了！'
                : 'Easter Egg: The frog put on headphones!'
            );
          } else if (count < 5) {
            showToast(lang === 'zh' ? `呱！（${count}/5）` : `Ribbit! (${count}/5)`);
          }
          return { ...prev, frogClickCount: count, frogDancing: unlocked || prev.frogDancing };
        });
        return;
      }
      if (hs.action.id === 'cat') {
        soundEngine.playPurr();
        setActiveEffect((p) => ({ ...p, pettingCat: true }));
        showToast(lang === 'zh' ? '小猫舒服地发出呼噜声～' : 'The cat purrs happily~');
        setTimeout(() => setActiveEffect((p) => ({ ...p, pettingCat: false })), 1600);
        return;
      }
      if (hs.action.id === 'mug') {
        soundEngine.playClick();
        const facts = SHOWCASE_CONTENT.funFacts;
        const fact = facts[Math.floor(Math.random() * facts.length)];
        setActiveEffect((p) => ({ ...p, sipping: true }));
        showToast(t(fact, lang));
        setTimeout(() => setActiveEffect((p) => ({ ...p, sipping: false })), 1200);
        return;
      }
    }

    if (hs.id === 'character') {
      soundEngine.playClick();
      const lines = SHOWCASE_CONTENT.owner.bubbleLines[lang];
      const nextIdx = (bubbleIdx + 1) % lines.length;
      setBubbleIdx(nextIdx);
      setBubbleText(lines[nextIdx]);
      setActiveEffect((p) => ({ ...p, waving: true }));
      setTimeout(() => setActiveEffect((p) => ({ ...p, waving: false })), 1500);
      if (nextIdx === 0) {
        setActiveHotspotId('character');
        syncUrlParam('item', 'character');
      }
      return;
    }

    soundEngine.playOpenPanel();
    setActiveHotspotId(hs.id);
    syncUrlParam('item', hs.id);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'room:open', itemId: hs.id }, '*');
    }
  };

  const handleOpenMemory = (memId: string, targetEl?: HTMLElement | null) => {
    if (placementMode) {
      soundEngine.playClick();
      setMovingMemoryId(memId);
      showToast(lang === 'zh' ? '已选中摆件，请点击任意空槽位边框放置' : 'Object selected — click any free slot frame to move it');
      return;
    }

    if (targetEl) lastTriggerElRef.current = targetEl;
    soundEngine.playOpenPanel();
    setMemories((prev) => prev.map((m) => (m.id === memId ? { ...m, isNew: false } : m)));
    setActiveHotspotId(null);
    setActiveMemoryId(memId);
    syncUrlParam('memory', memId);
  };

  const handlePublishMemory = (newMem: Memory, applyAdaptation: boolean) => {
    const nextMemories = [...memories, newMem];
    const shouldExpand = nextMemories.filter((m) => m.slotId).length >= 20 || theme.expandedShelves;

    setMemories(nextMemories);
    if (applyAdaptation && newMem.styleAdaptation) {
      const ad = newMem.styleAdaptation;
      setTheme((prev) => ({
        ...prev,
        skyTop: ad.skyTopColor || prev.skyTop,
        skyHorizon: ad.skyHorizonColor || prev.skyHorizon,
        accentColor: ad.accentColor || prev.accentColor,
        wallColor: ad.wallTint || prev.wallColor,
        lampGlow: ad.lampIntensity || prev.lampGlow,
        expandedShelves: shouldExpand,
        activeAdaptationLabel: ad.description,
      }));
      showToast(
        lang === 'zh'
          ? `已添加「${newMem.title.zh}」并实时优化房间配色与布局！`
          : `Added "${newMem.title.en}" & adapted room atmosphere!`
      );
    } else {
      setTheme((prev) => ({ ...prev, expandedShelves: shouldExpand }));
      showToast(
        lang === 'zh'
          ? `已将「${newMem.title.zh}」摆放到房间！`
          : `Placed "${newMem.title.en}" in your room!`
      );
    }

    setShowUpload(false);
    setActiveMemoryId(newMem.id);
  };

  const handleApplyStyleFromMemory = (mem: Memory) => {
    if (!mem.styleAdaptation) return;
    const ad = mem.styleAdaptation;
    setTheme((prev) => ({
      ...prev,
      skyTop: ad.skyTopColor || prev.skyTop,
      skyHorizon: ad.skyHorizonColor || prev.skyHorizon,
      accentColor: ad.accentColor || prev.accentColor,
      wallColor: ad.wallTint || prev.wallColor,
      lampGlow: ad.lampIntensity || prev.lampGlow,
      activeAdaptationLabel: ad.description,
    }));
    showToast(
      lang === 'zh'
        ? `已根据「${mem.title.zh}」调整房间光影与色板`
        : `Room atmosphere synced to "${mem.title.en}"`
    );
  };

  const handleToggleArchiveMemory = (memId: string) => {
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id !== memId) return m;
        if (m.slotId) {
          return { ...m, slotId: null, status: 'archived' };
        }
        const slotId = pickBestSlot(prev, 'shelf', m.archetype, theme.expandedShelves);
        return { ...m, slotId, status: slotId ? 'published' : 'archived' };
      })
    );
  };

  const handleApplyDesignFixes = (
    fixActions: DesignAuditIssue['fixAction'][]
  ): { nextMemories: Memory[]; nextTheme: RoomThemeConfig } => {
    let nextTheme = { ...theme };
    let nextMemories = [...memories];

    fixActions.forEach((action) => {
      if (action === 'boost_contrast') {
        nextTheme.contrastBoost = 1.0;
        nextTheme.wallColor = '#4B243B';
        nextTheme.accentColor = '#FDB644';
      } else if (action === 'enable_expanded_shelves') {
        nextTheme.expandedShelves = true;
      } else if (action === 'refine_lamp_harmony') {
        nextTheme.lampOn = true;
        nextTheme.lampGlow = 1.15;
        nextTheme.skyHorizon = '#EA6949';
      } else if (action === 'compact_hud') {
        nextTheme.hudCompact = true;
      } else if (action === 'apply_photo_accent') {
        const latestPhoto = nextMemories[nextMemories.length - 1];
        if (latestPhoto?.styleAdaptation) {
          nextTheme.skyHorizon = latestPhoto.styleAdaptation.skyHorizonColor || nextTheme.skyHorizon;
          nextTheme.accentColor = latestPhoto.styleAdaptation.accentColor || nextTheme.accentColor;
        }
      } else if (action === 'rebalance_slots') {
        // Distribute placed memories evenly across shelf, cork, sill, wall, desk
        const targetZones = ['shelf', 'cork', 'sill', 'wall', 'desk'];
        const usedSlots = new Set<string>();
        nextMemories = nextMemories.map((m, idx) => {
          if (!m.slotId) return m;
          const desiredZone = targetZones[idx % targetZones.length];
          const candidate =
            ROOM_SLOTS.find(
              (s) =>
                (!s.isExpansion || nextTheme.expandedShelves) &&
                s.zone === desiredZone &&
                !usedSlots.has(s.id)
            ) ||
            ROOM_SLOTS.find((s) => (!s.isExpansion || nextTheme.expandedShelves) && !usedSlots.has(s.id));
          if (candidate) {
            usedSlots.add(candidate.id);
            return { ...m, slotId: candidate.id };
          }
          return m;
        });
      }
    });

    setTheme(nextTheme);
    setMemories(nextMemories);
    return { nextMemories, nextTheme };
  };

  if (quickBrowse) {
    return (
      <QuickBrowseView
        lang={lang}
        memories={memories}
        onExit={() => setQuickBrowse(false)}
        onOpenMemory={(id) => {
          setQuickBrowse(false);
          setActiveMemoryId(id);
        }}
      />
    );
  }

  const activeHotspot = ROOM_HOTSPOTS.find((h) => h.id === activeHotspotId) || null;
  const activeMemory = memories.find((m) => m.id === activeMemoryId) || null;
  const latestAuditScore = audits[audits.length - 1]?.overallScore;

  const hoveredLabel = hoveredHotspotId
    ? t(ROOM_HOTSPOTS.find((h) => h.id === hoveredHotspotId)!.label, lang)
    : hoveredMemoryId
    ? `📷 ${memories.find((m) => m.id === hoveredMemoryId)?.date.value} · ${t(
        memories.find((m) => m.id === hoveredMemoryId)!.title,
        lang
      )}`
    : null;

  const hoveredPos = (() => {
    if (hoveredHotspotId) {
      const hs = ROOM_HOTSPOTS.find((h) => h.id === hoveredHotspotId);
      if (hs) return { x: hs.hitbox.x + hs.hitbox.w / 2, y: hs.hitbox.y };
    }
    if (hoveredMemoryId) {
      const mem = memories.find((m) => m.id === hoveredMemoryId);
      const slot = ROOM_SLOTS.find((s) => s.id === mem?.slotId);
      if (slot) return { x: slot.pos.x + 8, y: slot.pos.y };
    }
    return null;
  })();

  const freeSlots = ROOM_SLOTS.filter(
    (s) => (!s.isExpansion || theme.expandedShelves) && !memories.some((m) => m.slotId === s.id)
  );

  return (
    <div className="min-h-screen bg-[#2C161A] text-[#FBCDA6] flex flex-col justify-between select-none">
      {/* Loading Splash */}
      {loading && (
        <div
          className="fixed inset-0 z-50 bg-[#2C161A] flex flex-col items-center justify-center p-6 gap-4 cursor-pointer"
          onClick={() => setLoading(false)}
        >
          <div className="font-pixel text-base text-[#F8F0E6]">
            {lang === 'zh' ? '正在整理像素小屋…' : 'Tidying up the Pixel Study…'}
          </div>
          <div className="w-64 h-4 bg-[#1C1215] p-0.5 border-2 border-[#582F44]">
            <div
              className="h-full bg-[#FDB644] transition-all duration-150"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="text-xs text-[#CCB49C]">
            {lang === 'zh' ? '点击任意处跳过' : 'Click anywhere to skip'}
          </div>
        </div>
      )}

      {/* Top HUD Bar */}
      {!isEmbed && (
        <header className="w-full px-4 sm:px-6 py-3 bg-[#2C161A] border-b-2 border-[#1C1215] flex flex-wrap items-center justify-between gap-3 z-20">
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-pixel text-sm sm:text-base text-[#F8F0E6] whitespace-nowrap">
              {lang === 'zh' ? '像素小屋' : 'Pixel Study'}
            </span>
            {!theme.hudCompact && (
              <span className="hidden lg:inline text-xs text-[#CCB49C] whitespace-nowrap">
                {t(SHOWCASE_CONTENT.owner.role, lang)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className={`pixel-btn px-2.5 py-1.5 text-xs flex items-center gap-1.5 whitespace-nowrap ${
                soundOn ? 'bg-[#FDB644] text-[#1C1215] font-bold' : 'bg-[#3D202E] text-[#F8F0E6]'
              }`}
              title={lang === 'zh' ? '切换音效' : 'Toggle Sound'}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{lang === 'zh' ? '音效' : 'Sound'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setLang((l) => (l === 'zh' ? 'en' : 'zh'));
              }}
              className="pixel-btn px-2.5 py-1.5 bg-[#3D202E] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '中 / EN' : 'EN / 中'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowDirectory((v) => !v);
              }}
              className="pixel-btn px-2.5 py-1.5 bg-[#3D202E] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <List className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '物件清单' : 'Items'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setQuickBrowse(true);
              }}
              className="pixel-btn px-2.5 py-1.5 bg-[#4B243B] text-[#F8F0E6] text-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '快速浏览' : 'Resume View'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowUpload(true);
              }}
              className="pixel-btn px-3 py-1.5 bg-[#EA6949] text-[#F8F0E6] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '上传照片' : 'Add Photo'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowCritic(true);
              }}
              className="pixel-btn px-3 py-1.5 bg-[#FDB644] text-[#1C1215] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {lang === 'zh' ? 'AI 审核' : 'AI Audit'}
                {latestAuditScore !== undefined ? ` ${latestAuditScore.toFixed(1)}` : ''}
              </span>
            </button>
          </div>
        </header>
      )}

      {/* Placement Mode Banner */}
      {placementMode && (
        <div className="bg-[#582F44] border-b-2 border-[#1C1215] px-4 py-2 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-[#F8F0E6]">
            <Move className="w-4 h-4 text-[#FDB644]" />
            <span>
              {movingMemoryId
                ? lang === 'zh'
                  ? '请点击房间中金色边框的空槽位来放置所选摆件'
                  : 'Click any gold-outlined free slot in the room to place the object'
                : lang === 'zh'
                ? '摆放模式：先点击房间内的任意记忆摆件，再点击目标槽位'
                : 'Placement Mode: Click any memory object in the room, then click a target slot'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlacementMode(false);
              setMovingMemoryId(null);
            }}
            className="pixel-btn px-3 py-1 bg-[#FDB644] text-[#1C1215] font-bold whitespace-nowrap"
          >
            {lang === 'zh' ? '完成摆放' : 'Done'}
          </button>
        </div>
      )}

      {/* Main 480x270 Pixel Room Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 relative overflow-hidden">
        <div
          ref={stageScrollRef}
          className="w-full overflow-x-auto md:overflow-visible flex justify-start md:justify-center"
        >
          <div
            className="relative shrink-0 rounded-2xl overflow-hidden border border-[#FDB644]/25 shadow-[0_24px_64px_rgba(16,8,12,0.85)] bg-[#2C161A]"
            style={{
              width: `${stageDims.width}px`,
              height: `${stageDims.height}px`,
            }}
          >
            <PixelRoomCanvas
              theme={theme}
              memories={memories}
              hoveredHotspotId={hoveredHotspotId}
              hoveredMemoryId={hoveredMemoryId}
              focusedId={focusedId}
              activeEffect={activeEffect}
              reducedMotion={reducedMotion}
              placementMode={placementMode}
            />

            {/* Bayer dissolve lighting toggle flash */}
            {dissolveFlash && (
              <div
                className="absolute inset-0 pointer-events-none bg-[#1C1215]/70 transition-opacity duration-150"
                aria-hidden="true"
              />
            )}

            {/* Character Speech Bubble positioned gently beside character */}
            {bubbleText && !activeHotspot && !activeMemory && (
              <div
                className="absolute z-20 -translate-x-1/2 max-w-[220px] sm:max-w-[248px]"
                style={{
                  left: '33%',
                  top: '12%',
                }}
              >
                <div className="pixel-bubble px-3.5 py-2.5 text-xs leading-snug relative">
                  <button
                    type="button"
                    onClick={() => setBubbleText(null)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#95424A] text-[#F8F0E6] border border-[#1C1215] flex items-center justify-center text-[10px]"
                    aria-label="Dismiss bubble"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-[#1C1215] font-medium">{bubbleText}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBubbleText(null);
                      setActiveHotspotId('character');
                    }}
                    className="mt-1.5 text-[11px] font-bold text-[#A62B66] hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>{lang === 'zh' ? '了解更多' : 'Learn more'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive DOM Hotspot Buttons (Tab-navigable, accessible, >=44px touch on mobile) */}
            {ROOM_HOTSPOTS.map((hs) => (
              <button
                key={hs.id}
                type="button"
                tabIndex={hs.tabOrder}
                aria-label={`${t(hs.label, lang)}: ${t(hs.description, lang)}`}
                onMouseEnter={() => {
                  setHoveredHotspotId(hs.id);
                  soundEngine.playHover();
                }}
                onMouseLeave={() => setHoveredHotspotId((cur) => (cur === hs.id ? null : cur))}
                onFocus={() => setFocusedId(hs.id)}
                onBlur={() => setFocusedId((cur) => (cur === hs.id ? null : cur))}
                onClick={(e) => handleHotspotActivate(hs, e.currentTarget)}
                style={{
                  left: `${(hs.hitbox.x / 480) * 100}%`,
                  top: `${(hs.hitbox.y / 270) * 100}%`,
                  width: `${(hs.hitbox.w / 480) * 100}%`,
                  height: `${(hs.hitbox.h / 270) * 100}%`,
                }}
                className="absolute cursor-pointer bg-transparent border-0 p-0 pixel-focus-ring min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
              />
            ))}

            {/* Placed Memory Interactive Buttons */}
            {memories.map((mem) => {
              if (!mem.slotId) return null;
              const slot = ROOM_SLOTS.find((s) => s.id === mem.slotId);
              if (!slot || (slot.isExpansion && !theme.expandedShelves)) return null;
              return (
                <button
                  key={mem.id}
                  type="button"
                  aria-label={`${t(mem.title, lang)} (${mem.date.value})`}
                  onMouseEnter={() => {
                    setHoveredMemoryId(mem.id);
                    soundEngine.playHover();
                  }}
                  onMouseLeave={() => setHoveredMemoryId((cur) => (cur === mem.id ? null : cur))}
                  onFocus={() => setFocusedId(mem.id)}
                  onBlur={() => setFocusedId((cur) => (cur === mem.id ? null : cur))}
                  onClick={(e) => handleOpenMemory(mem.id, e.currentTarget)}
                  style={{
                    left: `${((slot.pos.x - 2) / 480) * 100}%`,
                    top: `${((slot.pos.y - 2) / 270) * 100}%`,
                    width: `${(20 / 480) * 100}%`,
                    height: `${(20 / 270) * 100}%`,
                  }}
                  className="absolute cursor-pointer bg-transparent border-0 p-0 pixel-focus-ring min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 z-10"
                />
              );
            })}

            {/* Free Slot Targets in Placement Mode */}
            {placementMode &&
              movingMemoryId &&
              freeSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  aria-label={`Move to slot ${slot.id}`}
                  onClick={() => {
                    soundEngine.playClick();
                    setMemories((prev) =>
                      prev.map((m) => (m.id === movingMemoryId ? { ...m, slotId: slot.id } : m))
                    );
                    setMovingMemoryId(null);
                    showToast(lang === 'zh' ? `已移动至槽位 ${slot.id}` : `Moved to slot ${slot.id}`);
                  }}
                  style={{
                    left: `${((slot.pos.x - 2) / 480) * 100}%`,
                    top: `${((slot.pos.y - 2) / 270) * 100}%`,
                    width: `${(20 / 480) * 100}%`,
                    height: `${(20 / 270) * 100}%`,
                  }}
                  className="absolute z-20 cursor-pointer border-2 border-[#FDB644] bg-[#FDB644]/20 hover:bg-[#FDB644]/45"
                />
              ))}

            {/* Hover Pixel Tooltip */}
            {hoveredLabel && hoveredPos && (
              <div
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full pb-1.5"
                style={{
                  left: `${Math.min(88, Math.max(12, (hoveredPos.x / 480) * 100))}%`,
                  top: `${Math.max(8, (hoveredPos.y / 270) * 100)}%`,
                }}
              >
                <div className="bg-[#1C1215]/90 backdrop-blur-sm text-[#F8F0E6] border border-[#FDB644]/70 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-lg">
                  {hoveredLabel}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Pan Hint */}
        <div className="md:hidden text-xs text-[#CCB49C] mt-2">
          {lang === 'zh' ? '← 左右滑动房间探索更多物件 →' : '← Swipe room left/right to explore →'}
        </div>

        {/* Toast Feedback */}
        {toastMsg && (
          <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-40 bg-[#1C1215] text-[#F8F0E6] border-2 border-[#FDB644] px-4 py-2 text-xs font-pixel shadow-lg">
            {toastMsg}
          </div>
        )}
      </main>

      {/* Bottom Subtle Status / Adaptive Strip (Clean, real user info only) */}
      <footer className="px-4 sm:px-6 py-2.5 bg-[#2C161A] border-t-2 border-[#1C1215] flex flex-wrap items-center justify-between gap-3 text-xs text-[#CCB49C]">
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            {lang === 'zh'
              ? `已展出 ${memories.filter((m) => m.slotId).length}/${
                  theme.expandedShelves ? 30 : 26
                } 枚照片摆件`
              : `${memories.filter((m) => m.slotId).length}/${
                  theme.expandedShelves ? 30 : 26
                } photo artifacts displayed`}
          </span>
          {theme.activeAdaptationLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#FDB644]">{t(theme.activeAdaptationLabel, lang)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveHotspotId('phone');
            }}
            className="hover:text-[#F8F0E6] transition-colors"
          >
            {lang === 'zh' ? '联系我' : 'Contact'}
          </button>
          <span aria-hidden="true">·</span>
          <span>Tab / Enter / Esc</span>
        </div>
      </footer>

      {/* Item Directory Drawer */}
      {showDirectory && (
        <div
          className="fixed inset-0 z-40 flex justify-end pixel-scrim"
          onClick={() => setShowDirectory(false)}
        >
          <div
            className="pixel-panel w-full max-w-sm h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#3D202E] border-b-2 border-[#1C1215]">
              <h2 className="font-pixel text-sm text-[#F8F0E6]">
                {lang === 'zh' ? '房间物件清单' : 'Room Item Directory'}
              </h2>
              <button
                type="button"
                onClick={() => setShowDirectory(false)}
                className="pixel-btn p-1 bg-[#95424A] text-[#F8F0E6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pixel-scroll p-4 space-y-2">
              {ROOM_HOTSPOTS.map((hs) => (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => {
                    setShowDirectory(false);
                    handleHotspotActivate(hs);
                  }}
                  className="w-full text-left p-3 bg-[#3D202E] hover:bg-[#4B243B] border-2 border-[#1C1215] transition-colors"
                >
                  <div className="text-xs font-bold text-[#F8F0E6]">{t(hs.label, lang)}</div>
                  <div className="text-xs text-[#CCB49C] mt-0.5">{t(hs.description, lang)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hotspot Panel Modal */}
      {activeHotspot && (
        <HotspotPanel
          hotspot={activeHotspot}
          lang={lang}
          memories={memories}
          bgmPlaying={bgmPlaying}
          onToggleBgm={handleToggleBgm}
          onClose={handleCloseModal}
          onNavigateHotspot={(id) => {
            setActiveHotspotId(id);
            syncUrlParam('item', id);
          }}
          onOpenMemory={(id) => handleOpenMemory(id)}
          onOpenUpload={() => {
            setActiveHotspotId(null);
            setShowUpload(true);
          }}
          onTogglePlacementMode={() => setPlacementMode((v) => !v)}
          onToggleArchiveMemory={handleToggleArchiveMemory}
          onOpenQuickBrowse={() => {
            setActiveHotspotId(null);
            setQuickBrowse(true);
          }}
        />
      )}

      {/* Memory Reveal Modal */}
      {activeMemory && (
        <MemoryRevealModal
          memory={activeMemory}
          memories={memories}
          lang={lang}
          reducedMotion={reducedMotion}
          onClose={handleCloseModal}
          onSelectMemory={(id) => {
            setActiveMemoryId(id);
            syncUrlParam('memory', id);
          }}
          onApplyStyleAdaptation={handleApplyStyleFromMemory}
          onToggleArchive={handleToggleArchiveMemory}
        />
      )}

      {/* Dynamic Photo Upload & Adaptive Room Modal */}
      {showUpload && (
        <PhotoUploadModal
          lang={lang}
          memories={memories}
          theme={theme}
          onClose={() => setShowUpload(false)}
          onPublishMemory={handlePublishMemory}
        />
      )}

      {/* AI Design Critic & Iterative Loop Modal */}
      {showCritic && (
        <DesignCriticModal
          lang={lang}
          memories={memories}
          theme={theme}
          audits={audits}
          onClose={() => setShowCritic(false)}
          onAddAudit={(rep) => setAudits((prev) => [...prev, rep])}
          onApplyFixes={handleApplyDesignFixes}
        />
      )}
    </div>
  );
}
