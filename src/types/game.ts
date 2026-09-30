export type HitObjectType = 'circle' | 'slider';

export interface BaseHitObject {
  id: string;
  x: number; // Normalized 0..512 (osu! field width)
  y: number; // Normalized 0..384 (osu! field height)
  time: number; // Milliseconds from start
  comboNumber: number; // 1, 2, 3...
  comboColorIndex: number;
}

export interface HitCircleObject extends BaseHitObject {
  type: 'circle';
}

export interface SliderPoint {
  x: number;
  y: number;
}

export interface SliderObject extends BaseHitObject {
  type: 'slider';
  duration: number; // Milliseconds slider lasts
  path: SliderPoint[];
  repeat: number; // 1 = single pass, 2 = back and forth
}

export type HitObject = HitCircleObject | SliderObject;

export type JudgementType = 300 | 100 | 50 | 0; // 0 = Miss

export interface ActiveJudgement {
  id: string;
  type: JudgementType;
  x: number;
  y: number;
  spawnTime: number;
}

export interface HitError {
  offset: number; // Difference in ms from perfect hit (- is early, + is late)
  timestamp: number;
  type: JudgementType;
}

export interface Beatmap {
  id: string;
  title: string;
  artist: string;
  creator: string;
  version: string;
  bpm: number;
  ar: number; // Approach Rate (1-10)
  cs: number; // Circle Size (1-10)
  od: number; // Overall Difficulty (1-10)
  hpDrain: number; // HP Drain (1-10)
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  synthTheme?: 'synthwave' | 'cyberpunk' | 'chillhop' | 'fast-techno';
  hitObjects: HitObject[];
  bgUrl?: string;
}

export interface KeyState {
  k1: boolean;
  k2: boolean;
  m1: boolean;
  m2: boolean;
  k1Count: number;
  k2Count: number;
}

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  hp: number; // 0 to 100
  hits300: number;
  hits100: number;
  hits50: number;
  misses: number;
  hitErrors: HitError[];
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  hitsoundVolume: number;
  backgroundDim: number;
  key1: string;
  key2: string;
  cursorTrail: boolean;
  showHitErrorBar: boolean;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'results' | 'editor';
