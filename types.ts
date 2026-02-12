
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export interface EnergyDefinition {
  level: EnergyLevel;
  label: string;
  description: string;
  examples: string;
  color: string;
}

export interface Tag {
  id: string;
  label: string;
  icon: string; // lucide icon name
  color: string;
}

export interface Theme {
  id: string;
  name: string;
  primary: string; // Tailwind class like 'indigo'
  primaryHex: string;
  bg: string; // Tailwind class like 'slate'
}

export interface LogEntry {
  id: string;
  timestamp: number; // Start time of the block (Unix ms)
  dateStr: string; // YYYY-MM-DD for easy querying
  hour: number; // 0-23
  minute: number; // 0 or 30 (we'll use 30min blocks for simplicity)
  energyLevel: EnergyLevel;
  isSleep: boolean;
  tags: string[]; // ids of tags like 'exercise', 'caffeine'
}

export interface DayData {
  dateStr: string;
  entries: LogEntry[];
  totalProductivity: number;
  averageEnergy: number;
}
