export type Lang = 'zh' | 'en';

export type I18n = {
  zh: string;
  en: string;
};

export type ZoneId = 'wall' | 'shelf' | 'sill' | 'cork' | 'desk' | 'expansion';

export type ArchetypeId =
  | 'snow_globe'
  | 'postcard'
  | 'shell_bottle'
  | 'ramen_bowl'
  | 'vinyl_ticket'
  | 'polaroid_frame'
  | 'plushie'
  | 'medal'
  | 'grad_cap'
  | 'lanyard'
  | 'cake'
  | 'game_cart';

export type PanelTemplate =
  | 'about'
  | 'os'
  | 'timeline'
  | 'grid'
  | 'notes'
  | 'contact'
  | 'playlist'
  | 'map'
  | 'list'
  | 'card'
  | 'now'
  | 'learning'
  | 'cat';

export interface Hotspot {
  id: string;
  label: I18n;
  description: I18n;
  pos: { x: number; y: number };
  hitbox: { x: number; y: number; w: number; h: number };
  layer: string;
  tabOrder: number;
  side: 'left' | 'center' | 'right';
  action:
    | { type: 'panel'; template: PanelTemplate; contentId: string }
    | { type: 'toggle'; target: 'lamp' | 'bgm' }
    | { type: 'easter_egg'; id: 'frog' | 'cat' | 'mug' };
  priority: 'P0' | 'P1' | 'P2';
}

export interface Slot {
  id: string;
  zone: ZoneId;
  pos: { x: number; y: number };
  size: 'S' | 'M';
  accepts: ArchetypeId[];
  isExpansion?: boolean;
}

export interface Memory {
  id: string;
  status: 'draft' | 'published' | 'archived';
  title: I18n;
  story: I18n;
  date: { value: string; precision: 'day' | 'month' | 'year' };
  place?: I18n;
  tags: string[];
  category: string;
  archetype: ArchetypeId;
  keyColors: string[];
  photo: {
    web: string;
    thumb: string;
    width: number;
    height: number;
    alt: I18n;
  };
  sprite: {
    dataUrl: string;
    polaroidDataUrl: string;
    size: 16 | 24;
    source: 'ai' | 'fallback_polaroid' | 'preset';
  };
  slotId: string | null;
  isNew?: boolean;
  hasPeople?: boolean;
  styleAdaptation?: StyleAdaptation;
  createdAt: string;
}

export interface StyleAdaptation {
  moodName: string;
  skyTopColor: string;
  skyHorizonColor: string;
  accentColor: string;
  wallTint: string;
  lampIntensity: number; // 0.6 - 1.3
  recommendedZone: ZoneId;
  description: I18n;
}

export interface RoomThemeConfig {
  mode: 'dusk' | 'night';
  lampOn: boolean;
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  wallColor: string;
  accentColor: string;
  lampGlow: number;
  expandedShelves: boolean;
  layoutDensity: 'balanced' | 'gallery' | 'cozy';
  contrastBoost: number; // 0 to 1
  hudCompact: boolean;
  activeAdaptationLabel?: I18n;
}

export interface PhotoAnalysisResult {
  category: string;
  archetype: ArchetypeId;
  motif: string;
  key_colors: string[];
  suggested_title: I18n;
  suggested_story: I18n;
  alt_text: I18n;
  has_people: boolean;
  recommended_zone: ZoneId;
  style_adaptation: StyleAdaptation;
}

export interface DesignAuditIssue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  area: 'layout' | 'palette' | 'typography' | 'affordance' | 'adaptation';
  title: I18n;
  diagnosis: I18n;
  fixAction:
    | 'rebalance_slots'
    | 'boost_contrast'
    | 'enable_expanded_shelves'
    | 'refine_lamp_harmony'
    | 'compact_hud'
    | 'apply_photo_accent';
  fixLabel: I18n;
}

export interface DesignAuditReport {
  iteration: number;
  overallScore: number;
  dimensions: {
    pixelGridAndPalette: number;
    spatialBalance: number;
    typographyAndContrast: number;
    interactiveAffordance: number;
    adaptivePhotoSync: number;
  };
  summary: I18n;
  top3Issues: DesignAuditIssue[];
  approved: boolean;
  timestamp: string;
}
