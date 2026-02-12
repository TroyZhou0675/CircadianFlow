
import { EnergyDefinition, Tag, Theme } from './types';

export const ENERGY_DEFINITIONS: EnergyDefinition[] = [
  { level: 5, label: "巅峰 (Peak)", description: "思维极度敏捷，处理核心难点。", examples: "创新设计、深度学习。", color: "#fcd34d" }, // Amber-300 (Sunlight)
  { level: 4, label: "高效 (High)", description: "专注度高，执行力强。", examples: "常规科研、逻辑分析。", color: "#86efac" }, // Green-300
  { level: 3, label: "平稳 (Stable)", description: "情绪平稳，处理机械任务。", examples: "资料搜索、笔记整理。", color: "#93c5fd" }, // Blue-300
  { level: 2, label: "涣散 (Distracted)", description: "易分心，适合简单琐事。", examples: "清洁、收发邮件。", color: "#fdba74" }, // Orange-300
  { level: 1, label: "枯竭 (Exhausted)", description: "极度困倦，急需休息。", examples: "无法专注，只想躺平。", color: "#fca5a5" }, // Red-300
];

export const AVAILABLE_TAGS: Tag[] = [
  { id: 'caffeine', label: '咖啡因', icon: 'coffee', color: '#f97316' },
  { id: 'exercise', label: '运动', icon: 'dumbbell', color: '#10b981' },
  { id: 'meditation', label: '冥想', icon: 'moon', color: '#a855f7' },
];

export const THEMES: Theme[] = [
  { id: 'midnight', name: '经典深夜', primary: 'indigo', primaryHex: '#6366f1', bg: 'slate' },
  { id: 'zen', name: '禅意森林', primary: 'emerald', primaryHex: '#10b981', bg: 'stone' },
  { id: 'cyber', name: '极客霓虹', primary: 'violet', primaryHex: '#8b5cf6', bg: 'neutral' },
  { id: 'sunset', name: '暮光橙红', primary: 'rose', primaryHex: '#f43f5e', bg: 'zinc' },
  { id: 'ocean', name: '深海幽蓝', primary: 'cyan', primaryHex: '#06b6d4', bg: 'slate' },
  { id: 'void', name: '极简纯黑', primary: 'slate', primaryHex: '#94a3b8', bg: 'black' },
];

export const STORAGE_KEY = 'circadian_tracker_data_v1';
