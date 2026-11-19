import type { LucideIcon } from 'lucide-react';
import {
  Video,
  MonitorPlay,
  Smartphone,
  Mic,
  Headphones,
  Mail,
  Newspaper,
  Clapperboard,
  Radio,
  BookOpen,
  Globe,
  Sparkles,
  Lightbulb,
  Search,
  PenTool,
  FileText,
  Feather,
  Camera,
  Scissors,
  Film,
  Sliders,
  Wand2,
  Image as ImageIcon,
  Upload,
  Calendar,
  Send,
  Share2,
  CheckCircle2,
  Music,
  Play,
} from 'lucide-react';
import type { BatchingGroup } from '../types/pws';

export interface IconOption {
  name: string;
  label: string;
  icon: LucideIcon;
}

export const AUTO_PIPELINE_COLORS = [
  '#46b1e1', // Electric Sky Blue
  '#ef4444', // Crimson Red
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
];

/**
 * Rounded-square icons available for Content Pipelines
 */
export const PIPELINE_ICONS: IconOption[] = [
  { name: 'MonitorPlay', label: 'YouTube / Video', icon: MonitorPlay },
  { name: 'Smartphone', label: 'Shorts / Reels', icon: Smartphone },
  { name: 'Mic', label: 'Podcast', icon: Mic },
  { name: 'Mail', label: 'Newsletter', icon: Mail },
  { name: 'Newspaper', label: 'Blog / Article', icon: Newspaper },
  { name: 'Clapperboard', label: 'Film / Doc', icon: Clapperboard },
  { name: 'Radio', label: 'Livestream', icon: Radio },
  { name: 'Headphones', label: 'Audio Series', icon: Headphones },
  { name: 'BookOpen', label: 'Course / Guide', icon: BookOpen },
  { name: 'Music', label: 'Music / Sound', icon: Music },
  { name: 'Globe', label: 'Social / Web', icon: Globe },
  { name: 'Sparkles', label: 'Creative Lab', icon: Sparkles },
];

/**
 * Circular icons available for Workflow Stages (grouped by creator phase)
 */
export const STAGE_ICON_CATEGORIES: {
  category: string;
  icons: IconOption[];
}[] = [
  {
    category: 'Ideate & Write',
    icons: [
      { name: 'Lightbulb', label: 'Ideate / Hook', icon: Lightbulb },
      { name: 'Search', label: 'Research', icon: Search },
      { name: 'PenTool', label: 'Script / Write', icon: PenTool },
      { name: 'FileText', label: 'Outline / Notes', icon: FileText },
      { name: 'Feather', label: 'Copy / Draft', icon: Feather },
    ],
  },
  {
    category: 'Shoot & Record',
    icons: [
      { name: 'Camera', label: 'Shoot / Photo', icon: Camera },
      { name: 'Video', label: 'A-Roll / Video', icon: Video },
      { name: 'Clapperboard', label: 'Studio Film', icon: Clapperboard },
      { name: 'Mic', label: 'Record Audio', icon: Mic },
      { name: 'Radio', label: 'Go Live', icon: Radio },
    ],
  },
  {
    category: 'Edit & Design',
    icons: [
      { name: 'Scissors', label: 'Cut / Edit', icon: Scissors },
      { name: 'Film', label: 'Assembly', icon: Film },
      { name: 'Sliders', label: 'Mix & Color', icon: Sliders },
      { name: 'Wand2', label: 'Thumbnail / FX', icon: Wand2 },
      { name: 'Image', label: 'Graphics', icon: ImageIcon },
    ],
  },
  {
    category: 'Publish & Wrap',
    icons: [
      { name: 'Upload', label: 'Export / Upload', icon: Upload },
      { name: 'Calendar', label: 'Schedule', icon: Calendar },
      { name: 'Send', label: 'Publish / Send', icon: Send },
      { name: 'Share2', label: 'Distribute', icon: Share2 },
      { name: 'CheckCircle2', label: 'Final QA', icon: CheckCircle2 },
    ],
  },
];

export const ALL_STAGE_ICONS: IconOption[] = STAGE_ICON_CATEGORIES.flatMap((c) => c.icons);

const PIPELINE_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  [...PIPELINE_ICONS, { name: 'Video', label: 'Video', icon: Video }, { name: 'Play', label: 'Play', icon: Play }].map(
    (item) => [item.name, item.icon]
  )
);

const STAGE_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ALL_STAGE_ICONS.map((item) => [item.name, item.icon])
);

export function getPipelineIconComponent(iconName?: string): LucideIcon {
  if (iconName && PIPELINE_ICON_MAP[iconName]) {
    return PIPELINE_ICON_MAP[iconName];
  }
  return MonitorPlay;
}

export function getStageIconComponent(iconName?: string, taskName?: string): LucideIcon {
  if (iconName && STAGE_ICON_MAP[iconName]) {
    return STAGE_ICON_MAP[iconName];
  }
  if (taskName) {
    const suggested = suggestStageIcon(taskName);
    if (STAGE_ICON_MAP[suggested]) {
      return STAGE_ICON_MAP[suggested];
    }
  }
  return FileText;
}

/**
 * Suggests a relevant circular Stage Icon based on the task name
 */
export function suggestStageIcon(taskName: string): string {
  const lower = taskName.toLowerCase();
  if (/hook|idea|brainstorm/.test(lower)) return 'Lightbulb';
  if (/research|deep-dive|topic/.test(lower)) return 'Search';
  if (/script|write|copy|draft|newsletter/.test(lower)) return 'PenTool';
  if (/outline|note|struct/.test(lower)) return 'FileText';
  if (/shoot|photo|a-roll|b-roll/.test(lower)) return 'Camera';
  if (/film|studio|production|video/.test(lower)) return 'Clapperboard';
  if (/record|voice|mic|interview/.test(lower)) return 'Mic';
  if (/live|stream/.test(lower)) return 'Radio';
  if (/cut|edit|trim/.test(lower)) return 'Scissors';
  if (/assembl|rough/.test(lower)) return 'Film';
  if (/audio|mix|sound|color|polish|master/.test(lower)) return 'Sliders';
  if (/thumb|packag|design|caption|fx/.test(lower)) return 'Wand2';
  if (/graphic|image|cover/.test(lower)) return 'Image';
  if (/upload|export|render/.test(lower)) return 'Upload';
  if (/schedul|calendar|plan/.test(lower)) return 'Calendar';
  if (/publish|send|launch/.test(lower)) return 'Send';
  if (/share|distribut|promo/.test(lower)) return 'Share2';
  if (/qa|review|check/.test(lower)) return 'CheckCircle2';
  return 'FileText';
}

// =====================================================================
// Smart Batching Group Auto-Recognition Algorithm
// =====================================================================

const STOP_WORDS = new Set([
  'and',
  'or',
  'the',
  'for',
  'of',
  'with',
  'a',
  'an',
  'to',
  'in',
  'on',
  'no',
  'setup',
  'rig',
  'suite',
  'flow',
  'group',
  'batch',
  'instant',
  'quick',
  'stage',
  'task',
]);

function stemToken(token: string): string {
  let t = token.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (t.length <= 3) return t;
  if (t.endsWith('ing') && t.length > 5) {
    t = t.slice(0, -3);
  } else if (t.endsWith('tion') && t.length > 5) {
    t = t.slice(0, -4);
  } else if (t.endsWith('ed') && t.length > 4) {
    t = t.slice(0, -2);
  } else if (t.endsWith('es') && t.length > 4) {
    t = t.slice(0, -2);
  } else if (t.endsWith('s') && t.length > 3) {
    t = t.slice(0, -1);
  }
  // Normalize silent trailing 'e' on stems >= 4 chars (e.g., write -> writ, package -> packag)
  if (t.endsWith('e') && t.length > 4) {
    t = t.slice(0, -1);
  }
  return t;
}

function tokenizeAndStem(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stemToken)
    .filter(Boolean);
}

const SYNONYM_CLUSTERS: string[][] = [
  ['shoot', 'film', 'camera', 'aroll', 'broll', 'video', 'record', 'podcast', 'interview', 'studio', 'mic'],
  ['edit', 'cut', 'rough', 'post', 'sound', 'audio', 'color', 'polish', 'caption', 'export', 'mix', 'master'],
  ['script', 'writ', 'hook', 'ideat', 'outlin', 'research', 'draft', 'topic', 'copy', 'newsletter'],
  ['packag', 'thumb', 'thumbnail', 'titl', 'schedul', 'publish', 'upload', 'admin', 'seo'],
];

/**
 * Automatically recognizes the most relevant BatchingGroup for a stage/task name.
 * Prioritizes direct token/stem matches (e.g. "Shoot" <-> "Shooting") before creator synonym clusters.
 */
export function matchBatchingGroup(
  taskName: string,
  batchingGroups: BatchingGroup[]
): BatchingGroup | null {
  const trimmed = taskName.trim();
  if (!trimmed) return null;

  const taskTokens = tokenizeAndStem(trimmed);
  if (taskTokens.length === 0) return null;

  const normalizedTask = trimmed.toLowerCase();
  let bestGroup: BatchingGroup | null = null;
  let bestScore = 0;

  for (const group of batchingGroups) {
    if (group.id === 'bg-none') continue;

    const groupTokens = tokenizeAndStem(group.name);
    if (groupTokens.length === 0) continue;

    let score = 0;

    // 1. Direct stem match or >=4-char prefix match
    for (const tt of taskTokens) {
      for (const gt of groupTokens) {
        if (tt === gt) {
          score += 100;
        } else if (
          tt.length >= 4 &&
          gt.length >= 4 &&
          (tt.startsWith(gt) || gt.startsWith(tt))
        ) {
          score += 80;
        }
      }
    }

    // 2. Whole-phrase substring overlap
    const normalizedGroup = group.name.toLowerCase().trim();
    if (
      normalizedGroup.length >= 3 &&
      (normalizedTask.includes(normalizedGroup) || normalizedGroup.includes(normalizedTask))
    ) {
      score += 60;
    }

    // 3. Creator synonym cluster match
    for (const cluster of SYNONYM_CLUSTERS) {
      const taskInCluster = taskTokens.some((tt) => cluster.includes(tt));
      const groupInCluster = groupTokens.some((gt) => cluster.includes(gt));
      if (taskInCluster && groupInCluster) {
        score += 25;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestGroup = group;
    }
  }

  return bestScore > 0 ? bestGroup : null;
}
